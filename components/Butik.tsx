"use client";

/**
 * Butiken som React ser den.
 *
 * Komponenterna rör aldrig localStorage direkt; de anropar metoderna här.
 * Metoderna arbetar på FÖREKOMSTER och tar emot en räckvidd — "denna",
 * "framåt" eller "alla" — eftersom en händelse i en serie inte kan ändras
 * utan att man först bestämt vad ändringen skall gälla. Den regeln är
 * själva skillnaden mellan en kalender som fungerar och en som inte gör
 * det, så den ligger i lagret och inte i gränssnittet.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Forekomst,
  Handelse,
  Kalender,
  Rackvidd,
  Upprepning,
} from "@/lib/typer";
import {
  LokaltLager,
  STANDARDKALENDRAR,
  andraKalender,
  gravsatt,
  klamTon,
  laggTillKalender,
  levande,
  normalisera,
  normaliseraKalender,
  nu,
  nyId,
  rord,
  taBortKalender as taBortKalenderUr,
  type Ogonblick,
} from "@/lib/butik";
import {
  flyttaForekomst,
  kapaSerie,
  strykForekomst,
} from "@/lib/upprepning";
import { addDagar, dygnMellan, nyckel, stampel, tolka } from "@/lib/tid";
import type { Session } from "@supabase/supabase-js";
import { MOLNET_FINNS, hamtaKlient } from "@/lib/supabase";
import {
  antalIvag,
  sammanfoga,
  sammanfogaKalendrar,
  synka,
  type SynkLage,
} from "@/lib/synk";

interface ButikVarde {
  handelser: Handelse[];
  kalendrar: Kalender[];
  synligaHandelser: Handelse[];
  laddad: boolean;
  kanAngra: boolean;
  kanGorOm: boolean;
  skapa(utkast: Partial<Handelse>): Handelse;
  sparaHandelse(h: Handelse, forekomst: Forekomst | null, rackvidd: Rackvidd): void;
  flytta(f: Forekomst, nyStart: Date, nySlut: Date, rackvidd: Rackvidd): void;
  radera(f: Forekomst, rackvidd: Rackvidd): void;
  vaxlaKalender(id: string): void;
  visaEndast(id: string): void;
  visaAlla(): void;
  skapaKalender(namn: string, ton: number): Kalender;
  uppdateraKalender(id: string, delar: Partial<Omit<Kalender, "id">>): void;
  /** `flyttaTill` = null raderar kalenderns händelser i stället för att flytta dem. */
  taBortKalender(id: string, flyttaTill: string | null): void;
  antalIKalender(id: string): number;
  angra(): void;
  gorOm(): void;
  tomKalendern(): void;
  kalenderFor(id: string): Kalender;
  /* --- molnet --- */
  molnetFinns: boolean;
  session: Session | null;
  synkLage: SynkLage;
  synkaNu(): Promise<void>;
  loggaIn(epost: string, losenord: string): Promise<string | null>;
  loggaUt(): Promise<void>;
}

const Sammanhang = createContext<ButikVarde | null>(null);

export function useButik(): ButikVarde {
  const v = useContext(Sammanhang);
  if (!v) throw new Error("useButik måste ligga inuti <ButikProvider>");
  return v;
}

const TAK_HISTORIK = 60;

export default function ButikProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lager = useRef(new LokaltLager());
  // Händelser och kalendrar hålls i ETT tillstånd, inte två. Skälet är
  // ångra-historiken: att radera en kalender och flytta dess händelser är
  // en enda ändring, och den måste kunna tas tillbaka som en enda.
  const [data, setData] = useState<Ogonblick>({
    handelser: [],
    kalendrar: STANDARDKALENDRAR,
  });
  const [laddad, setLaddad] = useState(false);

  // Gravstenar bor i lagret men får aldrig lämna butiken: gränssnittet
  // ser bara levande poster.
  const handelser = useMemo(() => levande(data.handelser), [data.handelser]);
  const kalendrar = useMemo(() => levande(data.kalendrar), [data.kalendrar]);

  const historik = useRef<Ogonblick[]>([]);
  const framtid = useRef<Ogonblick[]>([]);
  const [historikVersion, setHistorikVersion] = useState(0);

  // Läsningen sker efter montering, aldrig under rendering: servern har
  // ingen localStorage och en avvikelse mellan de två ger hydreringsfel.
  useEffect(() => {
    const sparat = lager.current.las();
    if (sparat) {
      setData({
        handelser: sparat.handelser,
        kalendrar:
          sparat.kalendrar.length > 0 ? sparat.kalendrar : STANDARDKALENDRAR,
      });
    }
    // Utan sparat läge börjar kalendern tom. Ingen exempeldata sås:
    // det som står i kalendern skall vara sådant användaren själv skrivit.
    setLaddad(true);
  }, []);

  useEffect(() => {
    if (!laddad) return;
    lager.current.skriv(data);
  }, [data, laddad]);

  /** Ändrar innehållet och lägger föregående läge på ångra-stacken. */
  const andra = useCallback((f: (o: Ogonblick) => Ogonblick) => {
    setData((tidigare) => {
      const nasta = f(tidigare);
      if (nasta === tidigare) return tidigare;
      historik.current = [...historik.current, tidigare].slice(-TAK_HISTORIK);
      framtid.current = [];
      setHistorikVersion((v) => v + 1);
      return nasta;
    });
  }, []);

  /**
   * Ändring som INTE hamnar i historiken. Används för att visa och dölja
   * kalendrar: det är en inställning för ögat, inte en ändring av
   * innehållet, och ⌘Z skall inte behöva kliva bakåt genom filterklick.
   */
  const sattTyst = useCallback((f: (o: Ogonblick) => Ogonblick) => {
    setData(f);
  }, []);

  /**
   * Ändrar händelselistan och stämplar det som faktiskt rörde sig.
   *
   * Stämplingen sker här och inte hos anroparen, av ett skäl som är värt
   * att vara noggrann med: en post som ändras utan att få ny `andrad`-tid
   * blir kvar på enheten för alltid — synkmotorn ser den som redan
   * skickad. Genom att jämföra objektidentitet före och efter fångas
   * varje ändring automatiskt, och det går inte att glömma.
   *
   * Poster som försvinner ur listan blir gravstenar i stället för att
   * kastas. En post som bara raderas lokalt återuppstår vid nästa synk
   * från en enhet som ännu inte hört talas om borttagningen.
   */
  const andraHandelser = useCallback(
    (f: (lista: Handelse[]) => Handelse[]) => {
      andra((o) => {
        const nya = f(o.handelser);
        const tidpunkt = nu();
        const fore = new Map(o.handelser.map((h) => [h.id, h]));
        const kvar = nya.map((h) =>
          fore.get(h.id) === h ? h : rord(h, tidpunkt)
        );
        const kvarIder = new Set(nya.map((h) => h.id));
        const gravar = o.handelser
          .filter((h) => !kvarIder.has(h.id) && !h.raderad)
          .map((h) => gravsatt(h, tidpunkt));
        return { ...o, handelser: [...kvar, ...gravar] };
      });
    },
    [andra]
  );

  const angra = useCallback(() => {
    const forra = historik.current[historik.current.length - 1];
    if (!forra) return;
    historik.current = historik.current.slice(0, -1);
    setData((nuvarande) => {
      framtid.current = [...framtid.current, nuvarande];
      return forra;
    });
    setHistorikVersion((v) => v + 1);
  }, []);

  const gorOm = useCallback(() => {
    const nasta = framtid.current[framtid.current.length - 1];
    if (!nasta) return;
    framtid.current = framtid.current.slice(0, -1);
    setData((nuvarande) => {
      historik.current = [...historik.current, nuvarande];
      return nasta;
    });
    setHistorikVersion((v) => v + 1);
  }, []);

  const skapa = useCallback(
    (utkast: Partial<Handelse>) => {
      const h = normalisera({ ...utkast, id: utkast.id ?? nyId() });
      andraHandelser((lista) => [...lista, h]);
      return h;
    },
    [andraHandelser]
  );

  /**
   * Sparar ett redigerat formulär. Räckvidden avgör om posten skrivs över,
   * om serien kapas i två, eller om bara en förekomst bryts ut.
   */
  const sparaHandelse = useCallback(
    (h: Handelse, forekomst: Forekomst | null, rackvidd: Rackvidd) => {
      andraHandelser((lista) => {
        const original = lista.find((x) => x.id === h.id);

        // Ny post, eller en post utan serie: skriv rakt av.
        if (!original) return [...lista, normalisera(h)];
        const arSerie = !!original.upprepning && original.upprepning.frekvens !== "ingen";
        if (!arSerie || rackvidd === "alla" || !forekomst) {
          return lista.map((x) => (x.id === h.id ? normalisera(h) : x));
        }

        if (rackvidd === "denna") {
          // Bryt ut förekomsten som en fristående post, och stryk den ur
          // serien. Fristående, eftersom en enskild ändring inte skall
          // ärva seriens framtida ändringar.
          const utbruten = normalisera({
            ...h,
            id: nyId(),
            upprepning: null,
            undantag: [],
            avvikelser: {},
          });
          return [
            ...lista.map((x) =>
              x.id === original.id ? strykForekomst(x, forekomst.ursprung) : x
            ),
            utbruten,
          ];
        }

        // "framåt": kapa den gamla serien dagen innan och starta en ny.
        const kapad = kapaSerie(original, forekomst.ursprung);
        const nyserie = normalisera({
          ...h,
          id: nyId(),
          undantag: [],
          avvikelser: {},
        });
        return [
          ...lista.map((x) => (x.id === original.id ? kapad : x)),
          nyserie,
        ];
      });
    },
    [andraHandelser]
  );

  const flytta = useCallback(
    (f: Forekomst, nyStart: Date, nySlut: Date, rackvidd: Rackvidd) => {
      andraHandelser((lista) =>
        lista.flatMap((x) => {
          if (x.id !== f.handelseId) return [x];
          const arSerie = !!x.upprepning && x.upprepning.frekvens !== "ingen";

          if (!arSerie) {
            return [{ ...x, start: stampel(nyStart), slut: stampel(nySlut) }];
          }

          if (rackvidd === "denna") {
            return [flyttaForekomst(x, f.ursprung, nyStart, nySlut)];
          }

          const deltaDygn = dygnMellan(f.start, nyStart);
          const deltaMin =
            (nyStart.getHours() - f.start.getHours()) * 60 +
            (nyStart.getMinutes() - f.start.getMinutes());
          const langdMin = Math.round(
            (nySlut.getTime() - nyStart.getTime()) / 60000
          );

          if (rackvidd === "alla") {
            return [skiftSerie(x, deltaDygn, deltaMin, langdMin)];
          }

          // "framåt": den gamla serien slutar dagen innan, en ny tar vid
          // från den flyttade tidpunkten.
          const kapad = kapaSerie(x, f.ursprung);
          const ny = skiftSerie(
            { ...x, id: nyId(), undantag: [], avvikelser: {} },
            deltaDygn,
            deltaMin,
            langdMin,
            f.start
          );
          return [kapad, ny];
        })
      );
    },
    [andraHandelser]
  );

  const radera = useCallback(
    (f: Forekomst, rackvidd: Rackvidd) => {
      andraHandelser((lista) =>
        lista.flatMap((x) => {
          if (x.id !== f.handelseId) return [x];
          const arSerie = !!x.upprepning && x.upprepning.frekvens !== "ingen";
          if (!arSerie || rackvidd === "alla") return [];
          if (rackvidd === "denna") return [strykForekomst(x, f.ursprung)];
          // "framåt": kapa serien dagen före förekomsten.
          const dagenInnan = addDagar(tolka(f.ursprung), -1);
          if (dagenInnan.getTime() < tolka(x.start).getTime()) return [];
          return [kapaSerie(x, f.ursprung)];
        })
      );
    },
    [andraHandelser]
  );

  /* ---------------------------------------------------------------
     Synlighet — inställningar för ögat, inte innehåll. Utanför ⌘Z.
     --------------------------------------------------------------- */
  const vaxlaKalender = useCallback(
    (id: string) => {
      sattTyst((o) => ({
        ...o,
        kalendrar: o.kalendrar.map((x) =>
          x.id === id ? { ...x, synlig: !x.synlig } : x
        ),
      }));
    },
    [sattTyst]
  );

  const visaEndast = useCallback(
    (id: string) => {
      sattTyst((o) => ({
        ...o,
        kalendrar: o.kalendrar.map((x) => ({ ...x, synlig: x.id === id })),
      }));
    },
    [sattTyst]
  );

  const visaAlla = useCallback(() => {
    sattTyst((o) => ({
      ...o,
      kalendrar: o.kalendrar.map((x) => ({ ...x, synlig: true })),
    }));
  }, [sattTyst]);

  /* ---------------------------------------------------------------
     Kalendrarna själva
     --------------------------------------------------------------- */
  const skapaKalender = useCallback(
    (namn: string, ton: number) => {
      const id = nyId();
      andra((o) => laggTillKalender(o, namn, ton, id));
      return normaliseraKalender({
        id,
        namn: namn.trim() || "Namnlös",
        ton: klamTon(ton),
        synlig: true,
      });
    },
    [andra]
  );

  const uppdateraKalender = useCallback(
    (id: string, delar: Partial<Omit<Kalender, "id">>) => {
      andra((o) => andraKalender(o, id, delar));
    },
    [andra]
  );

  const taBortKalender = useCallback(
    (id: string, flyttaTill: string | null) => {
      andra((o) => taBortKalenderUr(o, id, flyttaTill));
    },
    [andra]
  );

  /** Hur många händelser som ligger i en viss kalender. */
  const antalIKalender = useCallback(
    (id: string) => handelser.filter((h) => h.kalenderId === id).length,
    [handelser]
  );

  /** Raderar allt innehåll. Går att ångra med ⌘Z, som allt annat. */
  const tomKalendern = useCallback(() => {
    andraHandelser(() => []);
  }, [andraHandelser]);

  /* ===============================================================
     MOLNET
     Allt här är frivilligt. Saknas nycklarna i bygget står tillståndet
     på "av" och appen beter sig exakt som en rent lokal kalender.
     =============================================================== */
  const [session, setSession] = useState<Session | null>(null);
  const [synkLage, setSynkLage] = useState<SynkLage>({
    tillstand: MOLNET_FINNS ? "utloggad" : "av",
    ivag: 0,
    sist: null,
  });

  // En ref för att synkkörningen alltid skall se det senaste innehållet,
  // även om den startade före den senaste tangenttryckningen.
  const dataRef = useRef(data);
  dataRef.current = data;
  const synkarNu = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const klient = hamtaKlient();
    if (!klient) return;
    let paplats = true;

    klient.auth.getSession().then(({ data: d }) => {
      if (paplats) setSession(d.session);
    });
    const { data: lyssnare } = klient.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });
    return () => {
      paplats = false;
      lyssnare.subscription.unsubscribe();
    };
  }, []);

  const synkaNu = useCallback(async () => {
    const klient = hamtaKlient();
    const anvandare = session?.user?.id;
    if (!klient || !anvandare || synkarNu.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSynkLage((l) => ({ ...l, tillstand: "offline" }));
      return;
    }

    synkarNu.current = true;
    setSynkLage((l) => ({ ...l, tillstand: "synkar", meddelande: undefined }));
    try {
      const resultat = await synka(dataRef.current, anvandare, klient);

      // Innehållet kan ha ändrats under tiden nätverket arbetade. Därför
      // sätts resultatet inte rakt av, utan sammanfogas en gång till mot
      // det som råkar vara aktuellt just nu. En ändring som gjorts under
      // synkrundan har nyare stämpel och överlever därför.
      setData((nuvarande) => ({
        handelser: sammanfoga(nuvarande.handelser, resultat.data.handelser),
        kalendrar: sammanfogaKalendrar(
          nuvarande.kalendrar,
          resultat.data.kalendrar
        ),
      }));
      setSynkLage({
        tillstand: "vilande",
        ivag: 0,
        sist: new Date().toISOString(),
      });
    } catch (e) {
      // Ett misslyckande är inte en katastrof: allt ligger kvar lokalt
      // och försöket görs om. Felet visas men blockerar ingenting.
      setSynkLage((l) => ({
        ...l,
        tillstand: "fel",
        meddelande: (e as Error).message,
      }));
    } finally {
      synkarNu.current = false;
    }
  }, [session]);

  /** Håller räknaren "på väg upp" aktuell och schemalägger en körning. */
  useEffect(() => {
    if (!session) {
      setSynkLage((l) =>
        l.tillstand === "av"
          ? l
          : { ...l, tillstand: "utloggad", ivag: antalIvag(data) }
      );
      return;
    }
    const ivag = antalIvag(data);
    setSynkLage((l) => ({ ...l, ivag }));
    if (ivag === 0) return;

    // Kort fördröjning så att ett drag inte blir tjugo skrivningar.
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void synkaNu(), 1500);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [data, session, synkaNu]);

  /** Synka vid inloggning, när nätet kommer tillbaka, och med jämna mellanrum. */
  useEffect(() => {
    if (!session) return;
    void synkaNu();

    const paNat = () => void synkaNu();
    const paSynlig = () => {
      if (document.visibilityState === "visible") void synkaNu();
    };
    window.addEventListener("online", paNat);
    document.addEventListener("visibilitychange", paSynlig);
    const id = window.setInterval(() => void synkaNu(), 120000);

    const paOffline = () =>
      setSynkLage((l) => ({ ...l, tillstand: "offline" }));
    window.addEventListener("offline", paOffline);

    return () => {
      window.removeEventListener("online", paNat);
      window.removeEventListener("offline", paOffline);
      document.removeEventListener("visibilitychange", paSynlig);
      window.clearInterval(id);
    };
  }, [session, synkaNu]);

  const loggaIn = useCallback(async (epost: string, losenord: string) => {
    const klient = hamtaKlient();
    if (!klient) return "Molnet är inte konfigurerat i det här bygget.";
    const { error } = await klient.auth.signInWithPassword({
      email: epost.trim(),
      password: losenord,
    });
    return error ? error.message : null;
  }, []);

  const loggaUt = useCallback(async () => {
    const klient = hamtaKlient();
    if (!klient) return;
    await klient.auth.signOut();
    setSynkLage({ tillstand: "utloggad", ivag: antalIvag(dataRef.current), sist: null });
  }, []);

  const synligaIder = useMemo(
    () => new Set(kalendrar.filter((k) => k.synlig).map((k) => k.id)),
    [kalendrar]
  );

  const synligaHandelser = useMemo(
    () => handelser.filter((h) => synligaIder.has(h.kalenderId)),
    [handelser, synligaIder]
  );

  const kalenderKarta = useMemo(
    () => new Map(kalendrar.map((k) => [k.id, k])),
    [kalendrar]
  );

  const kalenderFor = useCallback(
    (id: string) => kalenderKarta.get(id) ?? kalendrar[kalendrar.length - 1],
    [kalenderKarta, kalendrar]
  );

  const varde: ButikVarde = useMemo(
    () => ({
      handelser,
      kalendrar,
      synligaHandelser,
      laddad,
      kanAngra: historik.current.length > 0,
      kanGorOm: framtid.current.length > 0,
      skapa,
      sparaHandelse,
      flytta,
      radera,
      vaxlaKalender,
      visaEndast,
      visaAlla,
      skapaKalender,
      uppdateraKalender,
      taBortKalender,
      antalIKalender,
      angra,
      gorOm,
      tomKalendern,
      kalenderFor,
      molnetFinns: MOLNET_FINNS,
      session,
      synkLage,
      synkaNu,
      loggaIn,
      loggaUt,
    }),
    // historikVersion är med på ett hörn: den finns bara för att tvinga
    // fram en omräkning av kanAngra/kanGorOm, som bor i refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      handelser,
      kalendrar,
      synligaHandelser,
      laddad,
      historikVersion,
      skapa,
      sparaHandelse,
      flytta,
      radera,
      vaxlaKalender,
      visaEndast,
      visaAlla,
      skapaKalender,
      uppdateraKalender,
      taBortKalender,
      antalIKalender,
      angra,
      gorOm,
      tomKalendern,
      kalenderFor,
      session,
      synkLage,
      synkaNu,
      loggaIn,
      loggaUt,
    ]
  );

  return <Sammanhang.Provider value={varde}>{children}</Sammanhang.Provider>;
}

/**
 * Skjuter en hel serie i tid. Om serien är veckovis måste veckodagarna
 * följa med — annars hamnar "varje tisdag" på en onsdag som fortfarande
 * påstår sig vara tisdag.
 */
function skiftSerie(
  h: Handelse,
  deltaDygn: number,
  deltaMin: number,
  langdMin: number,
  franForekomst?: Date
): Handelse {
  const gammalStart = tolka(h.start);
  const nyStart = new Date(
    gammalStart.getFullYear(),
    gammalStart.getMonth(),
    gammalStart.getDate() + deltaDygn,
    gammalStart.getHours(),
    gammalStart.getMinutes() + deltaMin
  );
  const nySlut = new Date(nyStart.getTime() + langdMin * 60000);

  let upprepning: Upprepning | null = h.upprepning;
  if (upprepning && upprepning.frekvens === "veckovis" && deltaDygn !== 0) {
    const skift = ((deltaDygn % 7) + 7) % 7;
    upprepning = {
      ...upprepning,
      veckodagar: upprepning.veckodagar.map((v) => (v + skift) % 7),
    };
  }

  // Undantag och avvikelser pekar på gamla datum; de flyttas med.
  const flyttaNyckel = (k: string) => nyckel(addDagar(tolka(k), deltaDygn));

  const bas: Handelse = {
    ...h,
    start: stampel(nyStart),
    slut: stampel(nySlut),
    upprepning,
    undantag: h.undantag.map(flyttaNyckel),
    avvikelser: Object.fromEntries(
      Object.entries(h.avvikelser).map(([k, v]) => [flyttaNyckel(k), v])
    ),
  };

  if (franForekomst) {
    // Den nya serien skall börja vid den flyttade förekomsten, inte vid
    // den ursprungliga seriens allra första datum.
    const start = new Date(
      franForekomst.getFullYear(),
      franForekomst.getMonth(),
      franForekomst.getDate() + deltaDygn,
      franForekomst.getHours(),
      franForekomst.getMinutes() + deltaMin
    );
    return {
      ...bas,
      start: stampel(start),
      slut: stampel(new Date(start.getTime() + langdMin * 60000)),
      undantag: [],
      avvikelser: {},
    };
  }

  return bas;
}
