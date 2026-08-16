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
  Anteckning,
  Forekomst,
  SidData,
  Sida,
  Handelse,
  Kalender,
  Rackvidd,
  Upprepning,
  Uppgift,
} from "@/lib/typer";
import {
  LokaltLager,
  STANDARDKALENDRAR,
  andraKalender,
  normaliseraAnteckning,
  normaliseraSida,
  gravsatt,
  klamTon,
  laggTillKalender,
  levande,
  normalisera,
  normaliseraKalender,
  normaliseraUppgift,
  nu,
  nyId,
  rord,
  vaxlaKlar as vaxlaKlarPa,
  taBortKalender as taBortKalenderUr,
  type Ogonblick,
} from "@/lib/butik";
import {
  flyttaForekomst,
  kapaSerie,
  strykForekomst,
} from "@/lib/upprepning";
import { addDagar, dygnMellan, nyckel, stampel, tolka } from "@/lib/tid";
import { tolkaFangst, type Sort } from "@/lib/tolka";
import type { Session } from "@supabase/supabase-js";
import { MOLNET_FINNS, hamtaKlient } from "@/lib/supabase";
import {
  antalIvag,
  diagnostisera,
  nollstallMarkor,
  oversattRadfel,
  sammanfoga,
  sammanfogaKalendrar,
  synka,
  type Diagnos,
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
  /* --- att göra --- */
  uppgifter: Uppgift[];
  skapaUppgift(utkast: Partial<Uppgift>): Uppgift;
  sparaUppgift(u: Uppgift): void;
  vaxlaKlar(id: string): void;
  taBortUppgift(id: string): void;
  /* --- anteckningar --- */
  anteckningar: Anteckning[];
  skapaAnteckning(utkast: Partial<Anteckning>): Anteckning;
  sparaAnteckning(a: Anteckning): void;
  taBortAnteckning(id: string): void;
  vaxlaNalad(id: string): void;
  /* --- sidor under Annat --- */
  sidor: Sida[];
  /** Sidan med det id:t, eller null om den aldrig fyllts i. */
  sidaMed(id: string): Sida | null;
  /** Skriver sidans innehåll. Posten skapas första gången den sparas. */
  sparaSida(id: string, data: SidData): void;
  /* --- fångst --- */
  /** Tolkar en fri rad och skapar posten. Null om raden saknar titel. */
  fanga(text: string): Fangad | null;
  angra(): void;
  gorOm(): void;
  tomKalendern(): void;
  kalenderFor(id: string): Kalender;
  /* --- molnet --- */
  molnetFinns: boolean;
  session: Session | null;
  synkLage: SynkLage;
  synkaNu(): Promise<void>;
  synkaOmAllt(): Promise<void>;
  stallDiagnos(): Promise<Diagnos>;
  loggaIn(epost: string, losenord: string): Promise<string | null>;
  loggaUt(): Promise<void>;
}

/** Vad fångsten blev, så att anroparen kan hoppa dit. */
export interface Fangad {
  sort: Sort;
  id: string;
  titel: string;
  datum: Date | null;
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
    uppgifter: [],
    anteckningar: [],
    sidor: [],
  });
  const [laddad, setLaddad] = useState(false);

  // Gravstenar bor i lagret men får aldrig lämna butiken: gränssnittet
  // ser bara levande poster.
  const handelser = useMemo(() => levande(data.handelser), [data.handelser]);
  const kalendrar = useMemo(() => levande(data.kalendrar), [data.kalendrar]);
  const uppgifter = useMemo(() => levande(data.uppgifter), [data.uppgifter]);
  const anteckningar = useMemo(
    () => levande(data.anteckningar),
    [data.anteckningar]
  );
  const sidor = useMemo(() => levande(data.sidor), [data.sidor]);

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
        uppgifter: sparat.uppgifter,
        anteckningar: sparat.anteckningar,
        sidor: sparat.sidor,
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

  /**
   * Samma mekanik som för händelser: identiteten före och efter avgör
   * vad som stämplas, och det som försvinner ur listan blir en gravsten.
   * Att skriva om den logiken en gång till hade varit ett sätt att få
   * den fel på ett av de två ställena.
   */
  const andraUppgifter = useCallback(
    (f: (lista: Uppgift[]) => Uppgift[]) => {
      andra((o) => {
        const nya = f(o.uppgifter);
        const tidpunkt = nu();
        const fore = new Map(o.uppgifter.map((u) => [u.id, u]));
        const kvar = nya.map((u) =>
          fore.get(u.id) === u ? u : rord(u, tidpunkt)
        );
        const kvarIder = new Set(nya.map((u) => u.id));
        const gravar = o.uppgifter
          .filter((u) => !kvarIder.has(u.id) && !u.raderad)
          .map((u) => gravsatt(u, tidpunkt));
        return { ...o, uppgifter: [...kvar, ...gravar] };
      });
    },
    [andra]
  );

  const skapaUppgift = useCallback(
    (utkast: Partial<Uppgift>) => {
      const u = normaliseraUppgift({ ...utkast, id: utkast.id ?? nyId() });
      andraUppgifter((lista) => [...lista, u]);
      return u;
    },
    [andraUppgifter]
  );

  const sparaUppgift = useCallback(
    (u: Uppgift) => {
      andraUppgifter((lista) =>
        lista.some((x) => x.id === u.id)
          ? lista.map((x) => (x.id === u.id ? normaliseraUppgift(u) : x))
          : [...lista, normaliseraUppgift(u)]
      );
    },
    [andraUppgifter]
  );

  const vaxlaKlar = useCallback(
    (id: string) => {
      andraUppgifter((lista) =>
        lista.map((u) => (u.id === id ? vaxlaKlarPa(u) : u))
      );
    },
    [andraUppgifter]
  );

  const taBortUppgift = useCallback(
    (id: string) => {
      andraUppgifter((lista) => lista.filter((u) => u.id !== id));
    },
    [andraUppgifter]
  );

  /**
   * Tredje kopian av samma mekanik. Att bryta ut den till en generisk
   * hjälpare hade sparat rader men krävt att typen bar både `id` och
   * `Synkbar` genom tre lager generics — och den dagen någon behöver
   * göra något olika för en av sorterna är delningen i vägen.
   */
  const andraAnteckningar = useCallback(
    (f: (lista: Anteckning[]) => Anteckning[]) => {
      andra((o) => {
        const nya = f(o.anteckningar);
        const tidpunkt = nu();
        const fore = new Map(o.anteckningar.map((a) => [a.id, a]));
        const kvar = nya.map((a) =>
          fore.get(a.id) === a ? a : rord(a, tidpunkt)
        );
        const kvarIder = new Set(nya.map((a) => a.id));
        const gravar = o.anteckningar
          .filter((a) => !kvarIder.has(a.id) && !a.raderad)
          .map((a) => gravsatt(a, tidpunkt));
        return { ...o, anteckningar: [...kvar, ...gravar] };
      });
    },
    [andra]
  );

  const skapaAnteckning = useCallback(
    (utkast: Partial<Anteckning>) => {
      const a = normaliseraAnteckning({ ...utkast, id: utkast.id ?? nyId() });
      andraAnteckningar((lista) => [...lista, a]);
      return a;
    },
    [andraAnteckningar]
  );

  const sparaAnteckning = useCallback(
    (a: Anteckning) => {
      andraAnteckningar((lista) =>
        lista.some((x) => x.id === a.id)
          ? lista.map((x) => (x.id === a.id ? normaliseraAnteckning(a) : x))
          : [...lista, normaliseraAnteckning(a)]
      );
    },
    [andraAnteckningar]
  );

  const taBortAnteckning = useCallback(
    (id: string) => {
      andraAnteckningar((lista) => lista.filter((a) => a.id !== id));
    },
    [andraAnteckningar]
  );

  const vaxlaNalad = useCallback(
    (id: string) => {
      andraAnteckningar((lista) =>
        lista.map((a) => (a.id === id ? { ...a, nalad: !a.nalad } : a))
      );
    },
    [andraAnteckningar]
  );

  /**
   * Sidorna under Annat.
   *
   * Ingen egen `andraSidor`: en sida skrivs alltid hel, aldrig i en
   * lista som kan växa och krympa, så gravstenslogiken har ingenting
   * att göra här. Det enda som behövs är stämplingen — och den får
   * aldrig glömmas bort, annars blir sidan kvar på enheten.
   */
  const sparaSida = useCallback(
    (id: string, sidData: SidData) => {
      andra((o) => {
        const tidpunkt = nu();
        const fanns = o.sidor.some((x) => x.id === id);
        const post = rord(
          normaliseraSida({
            id,
            data: sidData,
            skapad: o.sidor.find((x) => x.id === id)?.skapad,
          }),
          tidpunkt
        );
        return {
          ...o,
          sidor: fanns
            ? o.sidor.map((x) => (x.id === id ? post : x))
            : [...o.sidor, post],
        };
      });
    },
    [andra]
  );

  const sidaMed = useCallback(
    (id: string) => sidor.find((x) => x.id === id) ?? null,
    [sidor]
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

  /**
   * Fångsten.
   *
   * En rad fri text in, en riktig post ut. Att den bor i butiken och
   * inte i paletten är avsiktligt: fångsten skall gå att nå från vilken
   * yta som helst — paletten, bottenraden, en framtida delningsmeny —
   * och alla måste ge exakt samma resultat för samma text.
   *
   * En rad utan titel skapar ingenting. "imorgon" ensamt är ett datum,
   * inte en anteckning om något, och en tom post i kalendern är värre
   * än ingen post alls.
   */
  const fanga = useCallback(
    (text: string): Fangad | null => {
      const namn = kalendrar.map((k) => k.namn);
      const f = tolkaFangst(text, namn);
      const titel = f.titel.trim();
      if (!titel) return null;

      const standard = kalendrar[0]?.id ?? "arbete";
      const kalenderId = f.kalenderNamn
        ? (kalendrar.find(
            (k) => k.namn.toLowerCase() === f.kalenderNamn!.toLowerCase()
          )?.id ?? standard)
        : standard;

      if (f.sort === "handelse" && f.start && f.slut) {
        const h = skapa({
          titel,
          start: f.start,
          slut: f.slut,
          heldag: f.heldag,
          kalenderId,
        });
        return { sort: "handelse", id: h.id, titel, datum: tolka(h.start) };
      }

      const u = skapaUppgift({
        titel,
        prioritet: f.prioritet,
        forfaller: f.forfaller,
        kalenderId,
      });
      return {
        sort: "uppgift",
        id: u.id,
        titel,
        datum: f.forfaller ? tolka(f.forfaller) : null,
      };
    },
    [kalendrar, skapa, skapaUppgift]
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
    ner: 0,
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
      // Ett spår i konsolen. När något inte kommer fram är devtools det
      // första man öppnar, och då skall det stå något där.
      console.info(
        `[kalendariet] synk klar — ${resultat.ner} ner, ${resultat.upp} upp`
      );

      // Innehållet kan ha ändrats under tiden nätverket arbetade. Därför
      // sätts resultatet inte rakt av, utan sammanfogas en gång till mot
      // det som råkar vara aktuellt just nu. En ändring som gjorts under
      // synkrundan har nyare stämpel och överlever därför.
      setData((nuvarande) => {
        const handelser = sammanfoga(
          nuvarande.handelser,
          resultat.data.handelser
        );
        const kalendrar = sammanfogaKalendrar(
          nuvarande.kalendrar,
          resultat.data.kalendrar
        );
        const uppgifter = sammanfoga(
          nuvarande.uppgifter,
          resultat.data.uppgifter
        );
        const anteckningar = sammanfoga(
          nuvarande.anteckningar,
          resultat.data.anteckningar
        );
        const sidor = sammanfoga(nuvarande.sidor, resultat.data.sidor);
        // Sammanfogningen lämnar tillbaka samma referens när ingenting
        // skilde sig. Då skall tillståndet inte röras alls: annars ritas
        // hela kalendern om var trettionde sekund utan anledning.
        if (
          handelser === nuvarande.handelser &&
          kalendrar === nuvarande.kalendrar &&
          uppgifter === nuvarande.uppgifter &&
          anteckningar === nuvarande.anteckningar &&
          sidor === nuvarande.sidor
        ) {
          return nuvarande;
        }
        return { handelser, kalendrar, uppgifter, anteckningar, sidor };
      });
      setSynkLage({
        tillstand: "vilande",
        ivag: 0,
        ner: resultat.ner,
        sist: new Date().toISOString(),
      });
    } catch (e) {
      // Ett misslyckande är inte en katastrof: allt ligger kvar lokalt
      // och försöket görs om. Felet visas men blockerar ingenting.
      console.warn("[kalendariet] synk misslyckades:", e);
      setSynkLage((l) => ({
        ...l,
        tillstand: "fel",
        meddelande: oversattRadfel((e as Error).message),
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

    // Reservlösning bakom realtidslyssnaren nedan. Trettio sekunder är
    // valt för att en enhet som missat en realtidsavisering — sovande
    // flik, tappad websocket — ändå skall komma ikapp innan man hinner
    // undra varför.
    const id = window.setInterval(() => void synkaNu(), 30000);

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

  /**
   * Realtid: molnet knackar på när en annan enhet skrivit något.
   *
   * Utan detta syns en ändring från telefonen först vid nästa
   * pollningsvarv, och en kalender som ligger uppslagen på två skärmar
   * känns trasig även när den fungerar. Aviseringen bär ingen data — den
   * säger bara "något har hänt" — och en vanlig synkrunda gör resten.
   * Slås realtid inte på i Supabase skadar det ingenting; pollningen
   * fortsätter som förut.
   */
  useEffect(() => {
    const klient = hamtaKlient();
    const anvandare = session?.user?.id;
    if (!klient || !anvandare) return;

    let timer: number | null = null;
    const knuff = () => {
      // Ett drag på den andra enheten ger en avisering per skrivning.
      // Kort fördröjning samlar ihop dem till en enda körning.
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void synkaNu(), 400);
    };

    const kanal = klient
      .channel(`kalendariet-${anvandare}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "handelser",
          filter: `agare=eq.${anvandare}`,
        },
        knuff
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kalendrar",
          filter: `agare=eq.${anvandare}`,
        },
        knuff
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "uppgifter",
          filter: `agare=eq.${anvandare}`,
        },
        knuff
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "anteckningar",
          filter: `agare=eq.${anvandare}`,
        },
        knuff
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sidor",
          filter: `agare=eq.${anvandare}`,
        },
        knuff
      )
      .subscribe();

    return () => {
      if (timer) window.clearTimeout(timer);
      klient.removeChannel(kanal);
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

  /**
   * Hämtar hem allt på nytt genom att glömma markören. Utvägen när en
   * enhet av någon anledning hamnat ur fas med molnet — inget lokalt
   * innehåll rörs, det sammanfogas som vanligt.
   */
  const synkaOmAllt = useCallback(async () => {
    const anvandare = session?.user?.id;
    if (!anvandare) return;
    nollstallMarkor(anvandare);
    await synkaNu();
  }, [session, synkaNu]);

  const stallDiagnos = useCallback(
    () => diagnostisera(session?.user?.id ?? null, session?.user?.email ?? null),
    [session]
  );

  const loggaUt = useCallback(async () => {
    const klient = hamtaKlient();
    if (!klient) return;
    await klient.auth.signOut();
    setSynkLage({
      tillstand: "utloggad",
      ivag: antalIvag(dataRef.current),
      ner: 0,
      sist: null,
    });
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
      uppgifter,
      skapaUppgift,
      sparaUppgift,
      vaxlaKlar,
      taBortUppgift,
      anteckningar,
      skapaAnteckning,
      sparaAnteckning,
      taBortAnteckning,
      vaxlaNalad,
      sidor,
      sidaMed,
      sparaSida,
      fanga,
      angra,
      gorOm,
      tomKalendern,
      kalenderFor,
      molnetFinns: MOLNET_FINNS,
      session,
      synkLage,
      synkaNu,
      synkaOmAllt,
      stallDiagnos,
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
      uppgifter,
      skapaUppgift,
      sparaUppgift,
      vaxlaKlar,
      taBortUppgift,
      anteckningar,
      skapaAnteckning,
      sparaAnteckning,
      taBortAnteckning,
      vaxlaNalad,
      sidor,
      sidaMed,
      sparaSida,
      fanga,
      angra,
      gorOm,
      tomKalendern,
      kalenderFor,
      session,
      synkLage,
      synkaNu,
      synkaOmAllt,
      stallDiagnos,
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
