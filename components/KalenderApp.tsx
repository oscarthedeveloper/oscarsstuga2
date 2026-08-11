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
import { useMobil } from "@/lib/anvandMedia";
import {
  addDagar,
  addManader,
  arSammaDag,
  dagsspann,
  isoVecka,
  klam,
  langtDatum,
  MANADER,
  startAvAr,
  startAvDag,
  startAvManad,
  startAvVecka,
  stampel,
} from "@/lib/tid";

const TIMHOJD_MIN = 26;
const TIMHOJD_MAX = 110;

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
  const mobil = useMobil();

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

  /* ---------------------------------------------------------------
     Tangentbord
     --------------------------------------------------------------- */
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
    [butik, gaTillIdag, nyHandelse, stega]
  );

  const redigerarRef = useRef(redigerar);
  redigerarRef.current = redigerar;
  const hanterarRef = useRef(hanterarKalendrar);
  hanterarRef.current = hanterarKalendrar;
  const kontoRef = useRef(konto);
  kontoRef.current = konto;
  const ladaRef = useRef(lada);
  ladaRef.current = lada;

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
    <main className="viewport-lock appram">
      <div className="border border-ink flex flex-col h-[calc(100dvh-2.4vw)] min-h-[420px] overflow-hidden bg-paper">
        <div className="hidden md:block">
          <ColophonStrip
            left={
              butik.molnetFinns
                ? "Offline först — ändringar skickas upp när nätet finns"
                : "Lokalt lager — inget lämnar den här datorn"
            }
            centre="Kalendariet"
            right=">>> Dag · Tre dagar · Vecka · Månad · År"
          />
        </div>

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

            <div className="knapp-rad shrink-0">
              <button
                type="button"
                className="knapp micro"
                onClick={() => stega(-1)}
                aria-label="Föregående"
              >
                ‹
              </button>
              <button type="button" className="knapp micro" onClick={gaTillIdag}>
                Idag
              </button>
              <button
                type="button"
                className="knapp micro"
                onClick={() => stega(1)}
                aria-label="Nästa"
              >
                ›
              </button>
            </div>

            <div className="min-w-0">
              <h1 className="display text-[0.98rem] md:text-[1.1rem] leading-none truncate">
                {rubrik}
              </h1>
              <p className="pico opacity-60 truncate">{underrubrik}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="knapp-rad hidden md:flex">
              {VYER.map((v) => (
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

            <button
              type="button"
              className="knapp micro hidden md:block"
              onClick={() => setPalett(true)}
              title="Kommandopalett (⌘K)"
            >
              ⌘K
            </button>
          </div>
        </nav>

        {/* Arbetsytan */}
        <div className="flex-1 min-h-0 flex">
          {/* Skrivbordet: sidopanelen står kvar. Smala skärmar: samma
              panel, men som en låda som skjuts in ovanpå. */}
          <Sidopanel
            peka={peka}
            vy={vy}
            forekomster={forekomster}
            onGaTill={gaTillDag}
            onOppna={oppnaHandelse}
            onNy={() => nyHandelse()}
            onHanteraKalendrar={() => setHanterarKalendrar(true)}
          />

          {lada && (
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

          <section className="flex-1 min-w-0 min-h-0 bg-paper relative">
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
          </section>
        </div>

        {/* Bottenraden — bara på mobilen. Vyväxlaren hör hemma där tummen
            når, inte uppe i ett hörn. */}
        <div className="md:hidden bottenrad shrink-0 sakeromrade-botten">
          <div className="flex items-stretch">
            {VYER.map((v) => (
              <button
                key={v.id}
                type="button"
                className="knapp pico flex-1 !border-y-0 !border-l-0 last:!border-r-0"
                data-aktiv={vy === v.id ? "1" : "0"}
                onClick={() => setVy(v.id)}
                aria-label={v.namn}
              >
                {v.kort}
              </button>
            ))}
            <button
              type="button"
              className="knapp pico px-4 !border-y-0 !border-r-0"
              data-ton="accent"
              onClick={() => nyHandelse()}
              aria-label="Ny händelse"
            >
              +
            </button>
          </div>
        </div>

        <div className="hidden md:block">
          <ColophonStrip
            left={`${butik.handelser.length} poster · ${
              butik.kalendrar.filter((k) => k.synlig).length
            } av ${butik.kalendrar.length} kalendrar synliga`}
            centre="1 · 2 · 3 · 4 · 5 växlar vy — N ny — T idag — ⌘K palett"
            right={butik.kanAngra ? "⌘Z ångrar" : "Inget att ångra"}
          />
        </div>
      </div>

      {redigerar && (
        <HandelsePanel
          forekomst={redigerar.forekomst}
          utkast={redigerar.utkast}
          onStang={() => setRedigerar(null)}
        />
      )}

      {hanterarKalendrar && (
        <KalenderPanel onStang={() => setHanterarKalendrar(false)} />
      )}

      {konto && <KontoPanel onStang={() => setKonto(false)} />}

      {palett && (
        <Kommandopalett
          kommandon={kommandon}
          forekomster={forekomster}
          onGaTill={gaTillDag}
          onOppna={oppnaHandelse}
          onStang={() => setPalett(false)}
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
