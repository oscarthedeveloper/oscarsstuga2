"use client";

/**
 * Appens skal: navigering, vyval, tangentbord och limmet mellan butiken
 * och vyerna.
 *
 * Ett medvetet val: fönstret som händelserna expanderas i är alltid något
 * vidare än det som visas. Då slipper vyn räkna om vid varje litet
 * bläddringssteg, och en händelse som börjar strax utanför kanten finns
 * redan uträknad när den blir synlig.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Forekomst, Handelse, Vy } from "@/lib/typer";
import { VYER } from "@/lib/typer";
import { useButik } from "./Butik";
import { expanderaAlla } from "@/lib/upprepning";
import ColophonStrip from "./ColophonStrip";
import Marke from "./Marke";
import Sidopanel from "./Sidopanel";
import TidsRutnat from "./vyer/TidsRutnat";
import ManadsVy from "./vyer/ManadsVy";
import ArsVy from "./vyer/ArsVy";
import HandelsePanel from "./HandelsePanel";
import KalenderPanel from "./KalenderPanel";
import Kommandopalett, { type Kommando } from "./Kommandopalett";
import KontoPanel, { HamtaKnapp, KontoKnapp, MolnRemsa } from "./Konto";
import AttGora from "./AttGora";
import Anteckningar from "./Anteckningar";
import type { Traff } from "@/lib/sok";
import type { Mal } from "@/lib/kopplingar";
import type { Fangad } from "./Butik";
import { useMobil, useTangentbord } from "@/lib/anvandMedia";
import {
  addDagar,
  addManader,
  arSammaDag,
  dagsspann,
  isoVecka,
  klam,
  kortDatum,
  langtDatum,
  MANADER,
  startAvAr,
  startAvDag,
  startAvManad,
  startAvVecka,
  stampel,
  tolka,
} from "@/lib/tid";

const TIMHOJD_MIN = 26;
const TIMHOJD_MAX = 110;

type Sida = "kalender" | "attgora" | "anteckningar";

/** En begäran om att öppna en post. `n` gör varje begäran unik. */
export interface Peka {
  id: string;
  n: number;
}

/** Hur länge fångstkvittot ligger kvar innan det tonar bort. */
const KVITTO_MS = 6000;

export default function KalenderApp() {
  const butik = useButik();
  const [vy, setVy] = useState<Vy>("vecka");
  const [peka, setPeka] = useState<Date>(() => startAvDag(new Date()));
  const [timhojd, setTimhojd] = useState(52);
  const [vald, setVald] = useState<string | null>(null);
  const [redigerar, setRedigerar] = useState<{
    forekomst: Forekomst | null;
    utkast: Partial<Handelse> | null;
  } | null>(null);
  const [palett, setPalett] = useState(false);
  const [hanterarKalendrar, setHanterarKalendrar] = useState(false);
  const [lada, setLada] = useState(false);
  const [konto, setKonto] = useState(false);
  /*
   * Kalendern och att göra-listan är två sidor av samma app, inte två
   * appar. De delar butik, kalendrar, synk och tangentbord — därför är
   * det ett vylägesbyte och inte en egen adress. Skalet, panelerna och
   * det pågående tillståndet överlever bytet.
   */
  const [sida, setSida] = useState<Sida>("kalender");
  /*
   * Post som en sökträff eller en länk pekat ut, att öppna på sin sida.
   *
   * Räknaren `n` finns för att samma post skall gå att öppna två gånger.
   * Med bara ett id blir andra försöket en tilldelning av det värde som
   * redan står där, React ser ingen ändring, och sökningen gör tyst
   * ingenting — vilket ser ut precis som en trasig sökfunktion.
   */
  const [oppnaUppgift, setOppnaUppgift] = useState<Peka | null>(null);
  const [oppnaAnteckning, setOppnaAnteckning] = useState<Peka | null>(null);
  const pekning = useRef(0);
  const pekaPa = useCallback((id: string): Peka => {
    pekning.current += 1;
    return { id, n: pekning.current };
  }, []);
  /*
   * Kvittot efter en fångst.
   *
   * Fångsten skall inte flytta vyn. Skriver man in tre saker i rad mitt
   * i en veckoplanering är det planeringen man tittar på, och att kastas
   * till en annan dag för varje rad gör funktionen obrukbar. Remsan säger
   * i stället vad som hände och erbjuder resan — den som vill går dit.
   */
  const [kvitto, setKvitto] = useState<Fangad | null>(null);
  /* Bottenradens plusknapp kan inte nå textfältet inne i AttGora. Den
     räknar upp en signal i stället, och fältet tar fokus när den ändras. */
  const [fokusera, setFokusera] = useState(0);
  const mobil = useMobil();
  useTangentbord();

  /*
   * Första gången appen öppnas i ett bygge som HAR molnnycklar men saknar
   * session öppnas kontopanelen av sig själv. Att bara visa en liten
   * knapp räckte inte: appen fungerar perfekt utan inloggning, så det
   * finns ingenting som får en att leta efter den.
   */
  const harFragat = useRef(false);
  useEffect(() => {
    if (harFragat.current || !butik.laddad || !butik.molnetFinns) return;
    if (butik.session) return;
    if (window.localStorage.getItem("kalendariet.harfragat") === "1") return;
    harFragat.current = true;
    window.localStorage.setItem("kalendariet.harfragat", "1");
    setKonto(true);
  }, [butik.laddad, butik.molnetFinns, butik.session]);

  // Veckovyn är rätt förstaval på en skärm, men sju kolumner på en telefon
  // blir sju remsor som ingen kan läsa. Byte sker en gång, vid första
  // mätningen av skärmen, och aldrig mot ett aktivt val.
  const harBytt = useRef(false);
  useEffect(() => {
    if (harBytt.current || !mobil) return;
    harBytt.current = true;
    setVy("dag");
  }, [mobil]);

  /* ---------------------------------------------------------------
     Vilket spann visar vyn?
     --------------------------------------------------------------- */
  const spann = useMemo(() => {
    switch (vy) {
      case "dag":
        return { fran: startAvDag(peka), antal: 1 };
      case "tredag":
        return { fran: startAvDag(peka), antal: 3 };
      case "vecka":
        return { fran: startAvVecka(peka), antal: 7 };
      case "manad": {
        const forsta = startAvManad(peka);
        return { fran: startAvVecka(forsta), antal: 42 };
      }
      case "ar":
        return { fran: startAvAr(peka), antal: 366 };
    }
  }, [vy, peka]);

  const dagar = useMemo(
    () => dagsspann(spann.fran, Math.min(spann.antal, 7)),
    [spann]
  );

  const fonster = useMemo(() => {
    // Marginal åt båda håll: flerdygnshändelser och nyss bläddrade dagar.
    const fran = addDagar(spann.fran, -8);
    const till = addDagar(spann.fran, spann.antal + 8);
    return { fran, till };
  }, [spann]);

  const forekomster = useMemo(() => {
    const lista = expanderaAlla(
      butik.synligaHandelser,
      fonster.fran,
      fonster.till
    );
    // Tonen bor på kalendern, inte på händelsen; den fylls i här så att
    // vyerna slipper slå upp den.
    return lista.map((f) => ({
      ...f,
      ton: butik.kalenderFor(f.handelse.kalenderId).ton,
    }));
  }, [butik, fonster]);

  /* ---------------------------------------------------------------
     Navigering
     --------------------------------------------------------------- */
  const stega = useCallback(
    (riktning: number) => {
      setPeka((p) => {
        switch (vy) {
          case "dag":
            return addDagar(p, riktning);
          case "tredag":
            return addDagar(p, riktning * 3);
          case "vecka":
            return addDagar(p, riktning * 7);
          case "manad":
            return addManader(startAvManad(p), riktning);
          case "ar":
            return new Date(p.getFullYear() + riktning, p.getMonth(), 1);
        }
      });
    },
    [vy]
  );

  const gaTillIdag = useCallback(() => setPeka(startAvDag(new Date())), []);

  /* ---------------------------------------------------------------
     Svep i sidled — bläddra en period

     Knappar räcker inte på en telefon. Att bläddra en vecka är den
     vanligaste handlingen i en kalender, och den skall inte kräva att
     man siktar på en knapp: fingret drar åt vänster och nästa vecka
     kommer. Steget följer vyn, precis som pilarna gör.

     Gesten läses PÅ SLÄPPET och inget preventDefault sker under vägen.
     Det är avgörande: hade rörelsen fångats medan den pågick skulle
     rutnätets lodräta rullning dö, och rullningen är det man gör
     oftast. Här är svepet en tolkning i efterhand av en rörelse
     webbläsaren redan skött.
     --------------------------------------------------------------- */
  const svep = useRef<{ x: number; y: number; tid: number } | null>(null);

  /** Minsta vågräta sträcka som räknas som ett svep. */
  const SVEP_MIN = 60;

  const svepStart = useCallback(
    (e: React.TouchEvent) => {
      // Blocken äger sina egna gester: långtryck armerar och drar dem.
      const mal = e.target as HTMLElement | null;
      if (
        e.touches.length !== 1 ||
        sida !== "kalender" ||
        document.body.classList.contains("drar-pagar") ||
        mal?.closest(".handelse, .heldag-block, .grepp, .nyritning")
      ) {
        svep.current = null;
        return;
      }
      const t = e.touches[0];
      svep.current = { x: t.clientX, y: t.clientY, tid: Date.now() };
    },
    [sida]
  );

  const svepSlut = useCallback(
    (e: React.TouchEvent) => {
      const start = svep.current;
      svep.current = null;
      if (!start || document.body.classList.contains("drar-pagar")) return;

      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;

      // Vågrätt måste vinna tydligt över lodrätt, annars blir varje
      // snedställd rullning ett veckohopp.
      if (Math.abs(dx) < SVEP_MIN || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      if (Date.now() - start.tid > 800) return;

      // Svep åt vänster för framåt — innehållet drar med fingret.
      stega(dx < 0 ? 1 : -1);

      /*
       * Släppet kan annars också bli ett klick på det som råkade ligga
       * under fingret när det stannade. Ett enda klick sväljs, en gång,
       * i fångstfasen — utan detta öppnar ett svep över årsvyn en dag
       * man aldrig siktade på.
       */
      const svalj = (klick: Event) => {
        klick.preventDefault();
        klick.stopPropagation();
      };
      window.addEventListener("click", svalj, { capture: true, once: true });
      window.setTimeout(
        () => window.removeEventListener("click", svalj, { capture: true }),
        400
      );
    },
    [stega]
  );

  const gaTillDag = useCallback((d: Date) => setPeka(startAvDag(d)), []);

  const oppnaDag = useCallback((d: Date) => {
    setPeka(startAvDag(d));
    setVy("dag");
  }, []);

  /* ---------------------------------------------------------------
     Händelseoperationer
     --------------------------------------------------------------- */
  const oppnaHandelse = useCallback((f: Forekomst) => {
    setVald(f.nyckel);
    setRedigerar({ forekomst: f, utkast: null });
  }, []);

  /**
   * Öppnar en händelse man bara känner till id och dag för.
   *
   * Vyerna ritar FÖREKOMSTER, inte händelser, så panelen behöver en
   * sådan. Den räknas fram genom att expandera just den här händelsen
   * över ett litet fönster kring dagen — billigare än att leta i hela
   * den expanderade listan, och fungerar även när träffen ligger utanför
   * det fönster vyn råkar visa just nu.
   */
  const oppnaHandelseVid = useCallback(
    (handelseId: string, dag: Date | null) => {
      const h = butik.handelser.find((x) => x.id === handelseId);
      if (!h) return;
      const d = startAvDag(dag ?? tolka(h.start));
      setSida("kalender");
      setPeka(d);
      setVy("dag");
      const traffar = expanderaAlla([h], addDagar(d, -1), addDagar(d, 2));
      const f = traffar[0];
      if (!f) return;
      const ton = butik.kalenderFor(h.kalenderId).ton;
      setVald(f.nyckel);
      setRedigerar({ forekomst: { ...f, ton }, utkast: null });
    },
    [butik]
  );

  /** En sökträff — kan ligga på vilken av de tre sidorna som helst. */
  const oppnaTraff = useCallback(
    (t: Traff) => {
      if (t.slag === "handelse") {
        oppnaHandelseVid(t.id, t.datum);
      } else if (t.slag === "uppgift") {
        setSida("attgora");
        setOppnaUppgift(pekaPa(t.id));
      } else {
        setSida("anteckningar");
        setOppnaAnteckning(pekaPa(t.id));
      }
    },
    [oppnaHandelseVid, pekaPa]
  );

  /** Målet för en [[koppling]]. Samma resa, annan startpunkt. */
  const oppnaMal = useCallback(
    (mal: Mal) => {
      if (mal.slag === "handelse") {
        oppnaHandelseVid(mal.id, null);
      } else if (mal.slag === "uppgift") {
        setSida("attgora");
        setOppnaUppgift(pekaPa(mal.id));
      } else {
        setSida("anteckningar");
        setOppnaAnteckning(pekaPa(mal.id));
      }
    },
    [oppnaHandelseVid, pekaPa]
  );

  /**
   * Skapar anteckningen en [[länk]] pekade på men som inte fanns.
   *
   * Utan den här vägen fungerar svävande länkar bara inifrån
   * anteckningsvyn, och löftet att kopplingarna är desamma överallt är
   * inte sant: skriver man [[kvartalsrapporten]] i ett mötes anteckning
   * blir chipset en död knapp i stället för en väg framåt.
   */
  const skapaLankadAnteckning = useCallback(
    (titel: string) => {
      const a = butik.skapaAnteckning({
        titel,
        kalenderId: butik.kalendrar[0]?.id ?? "arbete",
      });
      setRedigerar(null);
      setSida("anteckningar");
      setOppnaAnteckning(pekaPa(a.id));
    },
    [butik, pekaPa]
  );

  const nyAnteckning = useCallback(() => {
    setSida("anteckningar");
    setFokusera((n) => n + 1);
  }, []);

  const nyHandelse = useCallback(
    (start?: Date, slut?: Date, heldag = false) => {
      const s =
        start ??
        (() => {
          const nu = new Date();
          const bas = arSammaDag(peka, nu)
            ? new Date(nu.getFullYear(), nu.getMonth(), nu.getDate(), nu.getHours() + 1)
            : new Date(peka.getFullYear(), peka.getMonth(), peka.getDate(), 9);
          return bas;
        })();
      const e = slut ?? new Date(s.getTime() + 3600000);
      setRedigerar({
        forekomst: null,
        utkast: { start: stampel(s), slut: stampel(e), heldag },
      });
    },
    [peka]
  );

  /**
   * Flytt via drag. En serie kan inte flyttas utan att man bestämt
   * räckvidden, så frågan ställs i en liten ruta i stället för att appen
   * gissar. Enstaka händelser flyttas direkt.
   */
  const [flyttfraga, setFlyttfraga] = useState<{
    f: Forekomst;
    start: Date;
    slut: Date;
  } | null>(null);

  const flytta = useCallback(
    (f: Forekomst, nyStart: Date, nySlut: Date) => {
      if (f.serie) {
        setFlyttfraga({ f, start: nyStart, slut: nySlut });
        return;
      }
      butik.flytta(f, nyStart, nySlut, "alla");
    },
    [butik]
  );

  /* Kvittot tonar bort av sig själv. Ett meddelande man måste stänga är
     ett meddelande till, inte ett mindre. */
  useEffect(() => {
    if (!kvitto) return;
    const id = window.setTimeout(() => setKvitto(null), KVITTO_MS);
    return () => window.clearTimeout(id);
  }, [kvitto]);

  /* ---------------------------------------------------------------
     Tangentbord
     --------------------------------------------------------------- */
  const kvarAttGora = useMemo(
    () => butik.uppgifter.filter((u) => !u.klar).length,
    [butik.uppgifter]
  );

  const valdForekomst = useMemo(
    () => forekomster.find((f) => f.nyckel === vald) ?? null,
    [forekomster, vald]
  );

  const kommandon: Kommando[] = useMemo(
    () => [
      ...VYER.map((v) => ({
        id: `vy-${v.id}`,
        namn: `Visa ${v.namn.toLowerCase()}`,
        grupp: "Vy",
        tangent: v.tangent,
        utfor: () => setVy(v.id),
      })),
      {
        id: "idag",
        namn: "Gå till idag",
        grupp: "Navigering",
        tangent: "T",
        utfor: gaTillIdag,
      },
      {
        id: "nasta",
        namn: "Nästa period",
        grupp: "Navigering",
        tangent: "→",
        utfor: () => stega(1),
      },
      {
        id: "forra",
        namn: "Föregående period",
        grupp: "Navigering",
        tangent: "←",
        utfor: () => stega(-1),
      },
      {
        id: "ny",
        namn: "Ny händelse",
        grupp: "Händelser",
        tangent: "N",
        utfor: () => nyHandelse(),
      },
      {
        id: "angra",
        namn: "Ångra",
        grupp: "Redigering",
        tangent: "⌘Z",
        utfor: butik.angra,
      },
      {
        id: "gorom",
        namn: "Gör om",
        grupp: "Redigering",
        tangent: "⇧⌘Z",
        utfor: butik.gorOm,
      },
      {
        id: "sida-kalender",
        namn: "Visa kalendern",
        grupp: "Sidor",
        utfor: () => setSida("kalender"),
      },
      {
        id: "sida-attgora",
        namn: "Visa att göra",
        grupp: "Sidor",
        utfor: () => setSida("attgora"),
      },
      {
        id: "sida-anteckningar",
        namn: "Visa anteckningar",
        grupp: "Sidor",
        utfor: () => setSida("anteckningar"),
      },
      {
        id: "ny-anteckning",
        namn: "Ny anteckning",
        grupp: "Anteckningar",
        utfor: nyAnteckning,
      },
      {
        id: "hamta-om",
        namn: "Hämta om allt från molnet",
        grupp: "Molnet",
        utfor: () => void butik.synkaOmAllt(),
      },
      {
        id: "synka",
        namn: "Synka nu",
        grupp: "Molnet",
        utfor: () => void butik.synkaNu(),
      },
      {
        id: "hantera-kalendrar",
        namn: "Hantera kalendrar — lägg till, byt namn, ta bort",
        grupp: "Kalendrar",
        utfor: () => setHanterarKalendrar(true),
      },
      {
        id: "visa-alla",
        namn: "Visa alla kalendrar",
        grupp: "Filter",
        utfor: butik.visaAlla,
      },
      ...butik.kalendrar.map((k) => ({
        id: `kal-${k.id}`,
        namn: `Växla kalendern ${k.namn}`,
        grupp: "Filter",
        utfor: () => butik.vaxlaKalender(k.id),
      })),
      {
        id: "zoom-in",
        namn: "Zooma in rutnätet",
        grupp: "Vy",
        tangent: "+",
        utfor: () => setTimhojd((h) => klam(h + 10, TIMHOJD_MIN, TIMHOJD_MAX)),
      },
      {
        id: "zoom-ut",
        namn: "Zooma ut rutnätet",
        grupp: "Vy",
        tangent: "−",
        utfor: () => setTimhojd((h) => klam(h - 10, TIMHOJD_MIN, TIMHOJD_MAX)),
      },
      {
        id: "tom",
        namn: "Töm kalendern",
        grupp: "Data",
        utfor: () => {
          if (butik.handelser.length === 0) return;
          if (
            window.confirm(
              `Radera alla ${butik.handelser.length} poster? Går att ångra med ⌘Z.`
            )
          ) {
            butik.tomKalendern();
          }
        },
      },
    ],
    [butik, gaTillIdag, nyAnteckning, nyHandelse, stega]
  );

  const redigerarRef = useRef(redigerar);
  redigerarRef.current = redigerar;
  const hanterarRef = useRef(hanterarKalendrar);
  hanterarRef.current = hanterarKalendrar;
  const kontoRef = useRef(konto);
  kontoRef.current = konto;
  const ladaRef = useRef(lada);
  ladaRef.current = lada;
  const sidaRef = useRef(sida);
  sidaRef.current = sida;

  useEffect(() => {
    const paTangent = (e: KeyboardEvent) => {
      const mal = e.target as HTMLElement | null;
      const iFalt =
        mal &&
        (mal.tagName === "INPUT" ||
          mal.tagName === "TEXTAREA" ||
          mal.tagName === "SELECT" ||
          mal.isContentEditable);

      // Paletten når man alltid, även från ett fält.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalett(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (iFalt) return;
        e.preventDefault();
        if (e.shiftKey) butik.gorOm();
        else butik.angra();
        return;
      }
      if (iFalt || redigerarRef.current || hanterarRef.current) return;
      if (kontoRef.current || ladaRef.current) return;

      // Att göra-sidan har inga vyer att växla mellan och inget datum
      // att bläddra i. Att låta tangenterna verka i bakgrunden vore ett
      // sätt att hamna någon helt annanstans utan att förstå varför.
      if (sidaRef.current !== "kalender") {
        // N betyder "nytt" på alla tre sidorna — bara olika sorts nytt.
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          setFokusera((n) => n + 1);
        }
        return;
      }

      const v = VYER.find((x) => x.tangent === e.key);
      if (v) {
        setVy(v.id);
        return;
      }

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          stega(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          stega(-1);
          break;
        case "t":
        case "T":
          gaTillIdag();
          break;
        case "n":
        case "N":
          e.preventDefault();
          nyHandelse();
          break;
        case "+":
          setTimhojd((h) => klam(h + 8, TIMHOJD_MIN, TIMHOJD_MAX));
          break;
        case "-":
          setTimhojd((h) => klam(h - 8, TIMHOJD_MIN, TIMHOJD_MAX));
          break;
        case "Escape":
          setVald(null);
          break;
        case "Backspace":
        case "Delete":
          if (valdForekomst) {
            e.preventDefault();
            if (valdForekomst.serie) oppnaHandelse(valdForekomst);
            else butik.radera(valdForekomst, "alla");
          }
          break;
        case "Enter":
          if (valdForekomst) {
            e.preventDefault();
            oppnaHandelse(valdForekomst);
          }
          break;
      }
    };
    window.addEventListener("keydown", paTangent);
    return () => window.removeEventListener("keydown", paTangent);
  }, [butik, gaTillIdag, nyHandelse, oppnaHandelse, stega, valdForekomst]);

  /* ---------------------------------------------------------------
     Rubrik
     --------------------------------------------------------------- */
  const rubrik = useMemo(() => {
    switch (vy) {
      case "dag":
        return langtDatum(peka);
      case "tredag": {
        const sista = addDagar(peka, 2);
        return peka.getMonth() === sista.getMonth()
          ? `${peka.getDate()}–${sista.getDate()} ${MANADER[
              peka.getMonth()
            ].toLowerCase()} ${peka.getFullYear()}`
          : `${langtDatum(peka)} – ${langtDatum(sista)}`;
      }
      case "vecka": {
        const m = startAvVecka(peka);
        const s = addDagar(m, 6);
        return m.getMonth() === s.getMonth()
          ? `${m.getDate()}–${s.getDate()} ${MANADER[
              m.getMonth()
            ].toLowerCase()} ${m.getFullYear()}`
          : `${m.getDate()} ${MANADER[m.getMonth()]
              .slice(0, 3)
              .toLowerCase()} – ${s.getDate()} ${MANADER[s.getMonth()]
              .slice(0, 3)
              .toLowerCase()} ${s.getFullYear()}`;
      }
      case "manad":
        return `${MANADER[peka.getMonth()]} ${peka.getFullYear()}`;
      case "ar":
        return String(peka.getFullYear());
    }
  }, [vy, peka]);

  const underrubrik = useMemo(() => {
    if (vy === "ar") return `${forekomster.length} poster i fönstret`;
    if (vy === "manad") return `Vecka ${isoVecka(startAvVecka(peka))} och framåt`;
    return `Vecka ${isoVecka(vy === "vecka" ? startAvVecka(peka) : peka)}`;
  }, [vy, peka, forekomster.length]);

  /* ---------------------------------------------------------------
     Ritning
     --------------------------------------------------------------- */
  return (
    <main
      className="viewport-lock appram"
      /* Bottenraden är två våningar på kalendersidan och en på de andra.
         Kvittot måste lägga sig ovanför den, och kan inte gissa. */
      style={{
        ["--bottenrad" as string]: sida === "kalender" ? "74px" : "42px",
      }}
    >
      <div className="border border-ink flex flex-col h-[calc(100dvh-2.4vw)] min-h-[420px] overflow-hidden bg-paper">
        {/* Säger rakt ut när ingenting synkas. Två tysta lägen — bygge
            utan nycklar, och enhet utan inloggning — ser annars ut precis
            som en fungerande kalender. */}
        <MolnRemsa onOppna={() => setKonto(true)} />

        {/* Navigering */}
        <nav className="h-[50px] md:h-[52px] shrink-0 bg-azure border-b border-ink flex items-center justify-between px-2 md:px-3 gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* På mobilen ersätter lådknappen märket: sidopanelen får
                inte ta plats från kalendern, men måste vara nåbar. */}
            <button
              type="button"
              className="knapp micro lg:hidden shrink-0"
              onClick={() => setLada(true)}
              aria-label="Kalendrar och minimånad"
            >
              ☰
            </button>
            <span className="hidden lg:flex items-center gap-2 shrink-0">
              <Marke />
              <span className="display text-ink text-[1.25rem] leading-none">
                Kalendariet
              </span>
            </span>

            {sida === "kalender" && (
              <div className="knapp-rad shrink-0">
                {/* Pilarna göms på telefonen. De ligger kvar i
                    bottenraden, inom tummens räckvidd, och två uppsättningar
                    av samma knapp här uppe åt bara bredd från rubriken —
                    som är det enda som säger var i tiden man befinner sig. */}
                <button
                  type="button"
                  className="knapp micro hidden md:block"
                  onClick={() => stega(-1)}
                  aria-label="Föregående"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="knapp micro"
                  onClick={gaTillIdag}
                >
                  Idag
                </button>
                <button
                  type="button"
                  className="knapp micro hidden md:block"
                  onClick={() => stega(1)}
                  aria-label="Nästa"
                >
                  ›
                </button>
              </div>
            )}

            <div className="min-w-0">
              <h1 className="display text-[0.98rem] md:text-[1.1rem] leading-none truncate">
                {sida === "kalender"
                  ? rubrik
                  : sida === "attgora"
                    ? "Att göra"
                    : "Anteckningar"}
              </h1>
              <p className="pico opacity-60 truncate">
                {sida === "kalender"
                  ? underrubrik
                  : sida === "attgora"
                    ? `${kvarAttGora} kvar`
                    : `${butik.anteckningar.length} ${
                        butik.anteckningar.length === 1
                          ? "anteckning"
                          : "anteckningar"
                      }`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sidväxeln göms på telefonen — bottenraden har den redan,
                och navigeringsraden rymmer inte båda. */}
            <div className="knapp-rad hidden md:flex">
              <button
                type="button"
                className="knapp micro"
                data-aktiv={sida === "kalender" ? "1" : "0"}
                onClick={() => setSida("kalender")}
              >
                Kalender
              </button>
              <button
                type="button"
                className="knapp micro"
                data-aktiv={sida === "attgora" ? "1" : "0"}
                onClick={() => setSida("attgora")}
              >
                Att göra
                {kvarAttGora > 0 && (
                  <span className="tabnum"> {kvarAttGora}</span>
                )}
              </button>
              <button
                type="button"
                className="knapp micro"
                data-aktiv={sida === "anteckningar" ? "1" : "0"}
                onClick={() => setSida("anteckningar")}
              >
                Anteckningar
              </button>
            </div>

            <div className="knapp-rad hidden md:flex">
              {sida === "kalender" &&
                VYER.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="knapp micro"
                    data-aktiv={vy === v.id ? "1" : "0"}
                    onClick={() => setVy(v.id)}
                    title={`${v.namn} (${v.tangent})`}
                  >
                    {v.namn}
                  </button>
                ))}
            </div>

            <HamtaKnapp />
            <KontoKnapp onOppna={() => setKonto(true)} />

            {/* Paletten är fångstens och sökets enda ingång, och därmed
                det viktigaste appen har. Att gömma knappen bakom md:
                gjorde båda oåtkomliga på en telefon — där man oftast har
                en tanke att fånga och minst tålamod att leta. */}
            <button
              type="button"
              className="knapp micro"
              onClick={() => setPalett(true)}
              title="Fånga, sök eller styr (⌘K)"
              aria-label="Fånga, sök eller styr"
            >
              <span className="hidden md:inline">⌘K</span>
              <span className="md:hidden">⌕</span>
            </button>
          </div>
        </nav>

        {/* Arbetsytan */}
        <div className="flex-1 min-h-0 flex">
          {/* Skrivbordet: sidopanelen står kvar. Smala skärmar: samma
              panel, men som en låda som skjuts in ovanpå. Minimånaden och
              dagens lista hör kalendern till och tar bara plats på
              att göra-sidan. */}
          {sida === "kalender" && (
          <Sidopanel
            peka={peka}
            vy={vy}
            forekomster={forekomster}
            onGaTill={gaTillDag}
            onOppna={oppnaHandelse}
            onNy={() => nyHandelse()}
            onHanteraKalendrar={() => setHanterarKalendrar(true)}
          />
          )}

          {sida === "kalender" && lada && (
            <>
              <div
                className="lada-overlay lg:hidden"
                onClick={() => setLada(false)}
              />
              <div className="sidolada lg:hidden" data-oppen="1">
                <Sidopanel
                  lada
                  peka={peka}
                  vy={vy}
                  forekomster={forekomster}
                  onGaTill={(d) => {
                    gaTillDag(d);
                    setLada(false);
                  }}
                  onOppna={(f) => {
                    setLada(false);
                    oppnaHandelse(f);
                  }}
                  onNy={() => {
                    setLada(false);
                    nyHandelse();
                  }}
                  onHanteraKalendrar={() => {
                    setLada(false);
                    setHanterarKalendrar(true);
                  }}
                  onStang={() => setLada(false)}
                />
              </div>
            </>
          )}

          <section
            className="flex-1 min-w-0 min-h-0 bg-paper relative"
            onTouchStart={svepStart}
            onTouchEnd={svepSlut}
            onTouchCancel={() => {
              svep.current = null;
            }}
          >
            {sida === "anteckningar" ? (
              <Anteckningar
                fokusera={fokusera}
                oppna={oppnaAnteckning}
                onOppnaMal={oppnaMal}
              />
            ) : sida === "attgora" ? (
              <AttGora
                fokusera={fokusera}
                oppna={oppnaUppgift}
                onOppnaMal={oppnaMal}
                onSkapaLank={skapaLankadAnteckning}
              />
            ) : (
            <>
            {/* Anvisning för den tomma kalendern. Den ligger ovanpå rutnätet
                men släpper igenom alla pekarhändelser, så att man kan börja
                dra upp sin första händelse rakt igenom den. */}
            {butik.laddad && butik.handelser.length === 0 && vy !== "ar" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div
                  className="cf bg-panel border border-ink px-4 py-3 max-w-[300px]"
                  style={{ ["--cf" as string]: "9px" }}
                >
                  <span className="cf-in" aria-hidden="true" />
                  <p className="micro mb-1.5">Kalendern är tom</p>
                  <p className="pico opacity-60 leading-[1.8]">
                    Dra upp ett spann i rutnätet för att skapa en händelse.
                    <br />
                    Eller tryck <b>N</b> för en ny, <b>⌘K</b> för paletten.
                  </p>
                </div>
              </div>
            )}

            {!butik.laddad ? (
              <div className="h-full flex items-center justify-center">
                <p className="micro opacity-45">Läser kalendern…</p>
              </div>
            ) : vy === "ar" ? (
              <ArsVy
                peka={peka}
                forekomster={forekomster}
                onGaTillDag={oppnaDag}
                onGaTillManad={(d) => {
                  setPeka(startAvManad(d));
                  setVy("manad");
                }}
              />
            ) : vy === "manad" ? (
              <ManadsVy
                peka={peka}
                forekomster={forekomster}
                vald={vald}
                onValj={(f) => setVald(f?.nyckel ?? null)}
                onOppna={oppnaHandelse}
                onFlytta={flytta}
                onSkapa={(s, e, heldag) => nyHandelse(s, e, heldag)}
                onGaTillDag={oppnaDag}
              />
            ) : (
              <TidsRutnat
                key={vy}
                dagar={dagar}
                forekomster={forekomster}
                timhojd={timhojd}
                vald={vald}
                visaVecka={vy === "vecka"}
                onValj={(f) => setVald(f?.nyckel ?? null)}
                onOppna={oppnaHandelse}
                onFlytta={flytta}
                onSkapa={(s, e, heldag) => nyHandelse(s, e, heldag)}
              />
            )}
            </>
            )}
          </section>
        </div>

        {/* Bottenraden — bara på mobilen. Vyväxlaren hör hemma där tummen
            når, inte uppe i ett hörn.

            Två våningar på kalendersidan, och det är ett medvetet köp av
            höjd. Med tre sidor räckte en rad inte till: fem vyer plus tre
            sidor plus en nyknapp blir nio träffytor på en telefonbredd,
            och nio knappar i rad är noll knappar man träffar. Vyraden är
            därför smalare — den bär bara bokstäver — och sidraden ligger
            underst där tummen vilar. */}
        <div className="md:hidden bottenrad shrink-0 sakeromrade-botten">
          {sida === "kalender" && (
            <div className="flex items-stretch bottenrad-vyer">
              {/* Pilarna flankerar vyväxlaren, och det är hela idén: de
                  läser som "föregående/nästa" kring "vilken period", och
                  steget följer automatiskt vyn man står i — en dag i
                  dagsvyn, ett år i årsvyn. Här nere når tummen dem också,
                  vilket den aldrig gjorde uppe i navigeringsraden. */}
              <button
                type="button"
                className="knapp pico !px-3 shrink-0 !border-x-0 !border-t-0"
                onClick={() => stega(-1)}
                aria-label="Föregående period"
              >
                ‹
              </button>
              {VYER.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="knapp pico flex-1 !border-x-0 !border-t-0"
                  data-aktiv={vy === v.id ? "1" : "0"}
                  onClick={() => setVy(v.id)}
                  aria-label={v.namn}
                >
                  {v.kort}
                </button>
              ))}
              <button
                type="button"
                className="knapp pico !px-3 shrink-0 !border-x-0 !border-t-0"
                onClick={() => stega(1)}
                aria-label="Nästa period"
              >
                ›
              </button>
            </div>
          )}

          <div className="flex items-stretch">
            <button
              type="button"
              className="knapp pico flex-1 !border-y-0 !border-l-0"
              data-aktiv={sida === "kalender" ? "1" : "0"}
              onClick={() => setSida("kalender")}
            >
              Kalender
            </button>
            <button
              type="button"
              className="knapp pico flex-1 !border-y-0"
              data-aktiv={sida === "attgora" ? "1" : "0"}
              onClick={() => setSida("attgora")}
            >
              Att göra
              {kvarAttGora > 0 && <span className="tabnum"> {kvarAttGora}</span>}
            </button>
            <button
              type="button"
              className="knapp pico flex-1 !border-y-0"
              data-aktiv={sida === "anteckningar" ? "1" : "0"}
              onClick={() => setSida("anteckningar")}
            >
              Anteckn.
            </button>
            <button
              type="button"
              className="knapp pico px-4 !border-y-0 !border-r-0"
              data-ton="accent"
              onClick={() => {
                if (sida === "kalender") nyHandelse();
                else setFokusera((n) => n + 1);
              }}
              aria-label={
                sida === "kalender"
                  ? "Ny händelse"
                  : sida === "attgora"
                    ? "Ny uppgift"
                    : "Ny anteckning"
              }
            >
              +
            </button>
          </div>
        </div>

        {/* Remsan behålls som designelement men bär bara det som
            faktiskt hjälper. Posträknare och "Inget att ångra" sa
            ingenting man kan handla på. */}
        <div className="hidden md:block">
          <ColophonStrip
            centre={
              sida === "kalender"
                ? "1 · 2 · 3 · 4 · 5 växlar vy — N ny — T idag — ⌘K fånga & sök"
                : sida === "attgora"
                  ? "⌘K fånga & sök — N nytt — klicka en rad för att redigera"
                  : "⌘K fånga & sök — N ny — [[titel]] länkar till annat"
            }
          />
        </div>
      </div>

      {redigerar && (
        <HandelsePanel
          forekomst={redigerar.forekomst}
          utkast={redigerar.utkast}
          onStang={() => setRedigerar(null)}
          onOppnaMal={(mal) => {
            setRedigerar(null);
            oppnaMal(mal);
          }}
          onSkapaLank={skapaLankadAnteckning}
        />
      )}

      {hanterarKalendrar && (
        <KalenderPanel onStang={() => setHanterarKalendrar(false)} />
      )}

      {konto && <KontoPanel onStang={() => setKonto(false)} />}

      {palett && (
        <Kommandopalett
          kommandon={kommandon}
          onGaTill={gaTillDag}
          onOppnaTraff={oppnaTraff}
          onFangad={setKvitto}
          onStang={() => setPalett(false)}
        />
      )}

      {kvitto && (
        <FangstKvitto
          fangad={kvitto}
          onGa={() => {
            if (kvitto.sort === "handelse") {
              oppnaHandelseVid(kvitto.id, kvitto.datum);
            } else {
              setSida("attgora");
              setOppnaUppgift(pekaPa(kvitto.id));
            }
            setKvitto(null);
          }}
          onStang={() => setKvitto(null)}
        />
      )}

      {flyttfraga && (
        <FlyttFraga
          onVal={(r) => {
            butik.flytta(flyttfraga.f, flyttfraga.start, flyttfraga.slut, r);
            setFlyttfraga(null);
          }}
          onAvbryt={() => setFlyttfraga(null)}
        />
      )}
    </main>
  );
}

/**
 * Kvittot efter en fångst.
 *
 * Remsan finns för att fångsten annars är osynlig: man skriver en rad,
 * paletten stängs, och ingenting på skärmen ändrar sig — posten hamnade
 * på en annan dag eller en annan sida. Utan kvitto blir det första man
 * gör att leta rätt på den för att kontrollera att den kom fram, och då
 * har snabbheten inte tjänat någonting.
 *
 * Den ligger ovanför bottenraden på telefonen så att den inte skymmer
 * navigeringen, och försvinner av sig själv.
 */
function FangstKvitto({
  fangad,
  onGa,
  onStang,
}: {
  fangad: Fangad;
  onGa(): void;
  onStang(): void;
}) {
  return (
    <div className="fangstkvitto sakeromrade-botten">
      <div className="bg-ink text-paper border border-ink flex items-center gap-2 px-2.5 py-1.5 max-w-[92vw]">
        {/* Sortordet är det första som får gå när bredden tryter: att
            posten skapades och NÄR den ligger är viktigare än vilken av
            de två sorterna det blev. */}
        <span className="pico opacity-70 shrink-0 hidden sm:inline">
          {fangad.sort === "handelse" ? "Händelse" : "Uppgift"}
        </span>
        <span className="micro truncate normal-case">{fangad.titel}</span>
        {fangad.datum && (
          <span className="pico opacity-70 shrink-0 tabnum">
            {kortDatum(fangad.datum)}
          </span>
        )}
        <button
          type="button"
          className="knapp pico shrink-0 !bg-transparent !text-paper !border-paper/40"
          onClick={onGa}
        >
          Visa
        </button>
        <button
          type="button"
          className="knapp pico shrink-0 !bg-transparent !text-paper !border-paper/40"
          onClick={onStang}
          aria-label="Stäng"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/** Samma fråga som i redigeringspanelen, men för ett drag. */
function FlyttFraga({
  onVal,
  onAvbryt,
}: {
  onVal(r: "denna" | "framat" | "alla"): void;
  onAvbryt(): void;
}) {
  return (
    <div className="palett-overlay !items-center !pt-0" onClick={onAvbryt}>
      <div
        className="cf bg-panel border border-ink p-3 w-[300px]"
        style={{ ["--cf" as string]: "8px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="cf-in" aria-hidden="true" />
        <p className="micro mb-1">Flytta — vad skall det gälla?</p>
        <p className="pico opacity-55 mb-2.5 leading-relaxed">
          Händelsen ingår i en serie.
        </p>
        <div className="flex flex-col gap-1">
          {(
            [
              ["denna", "Endast denna händelse"],
              ["framat", "Denna och alla senare"],
              ["alla", "Hela serien"],
            ] as const
          ).map(([r, namn]) => (
            <button
              key={r}
              type="button"
              className="knapp micro text-left"
              onClick={() => onVal(r)}
            >
              {namn}
            </button>
          ))}
          <button
            type="button"
            className="knapp pico mt-1 opacity-70"
            onClick={onAvbryt}
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
