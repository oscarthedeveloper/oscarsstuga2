"use client";

/**
 * Tidsrutnätet — den gemensamma motorn bakom dagsvyn, tredagarsvyn och
 * veckovyn. De tre skiljer sig bara i hur många dygn som ligger i spannet,
 * så de delar all geometri, all layout och all dragfunktion.
 *
 * Interaktionen bygger på pointer-händelser i stället för HTML5:s
 * drag-and-drop. Skälet är att dra-och-släpp-API:et inte kan följa musen
 * kontinuerligt: det ger bara `dragover` med grov upplösning, kan inte
 * visa ett block som glider mjukt i femtonminutersteg, och beter sig
 * olika i varje webbläsare. Med `setPointerCapture` följer blocket muspekaren
 * exakt, samma kod gäller för mus, penna och finger, och vi kan rita vår
 * egen förhandsvisning.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Forekomst, Layout } from "@/lib/typer";
import { useMobil } from "@/lib/anvandMedia";
import { laggUt, laggUtBand, type Packbar } from "@/lib/layout";
import {
  addDagar,
  arHelg,
  arSammaDag,
  dygnMellan,
  klam,
  klocka,
  klockaKort,
  kortDatum,
  medMinuter,
  minuterInPaDagen,
  minuterTillText,
  nyckel,
  snappa,
  startAvDag,
  VECKODAGAR_KORT,
} from "@/lib/tid";

/**
 * Layout-effekter finns inte på servern. Next renderar klientkomponenter
 * en gång på servern innan de hydreras, så en rå useLayoutEffect skulle
 * ge en varning vid varje sidladdning. Den här växeln väljer rätt krok
 * utan att beteendet i webbläsaren ändras.
 */
const useLayoutEffektNarDetFinns =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const DYGN_MIN = 1440;
const STEG = 15; // minsta rörelse vid drag, i minuter
const TROSKEL = 4; // px innan ett klick räknas som ett drag
const RULLTROSKEL = 9; // px som avslöjar att fingret rullar, inte drar
const LANGTRYCK = 420; // ms innan ett finger tar över gesten
const MINSTA_LANGD = 15; // minuter

export interface RutnatProps {
  dagar: Date[];
  forekomster: Forekomst[];
  timhojd: number;
  vald: string | null;
  onValj(f: Forekomst | null): void;
  onOppna(f: Forekomst): void;
  onFlytta(f: Forekomst, nyStart: Date, nySlut: Date): void;
  onSkapa(start: Date, slut: Date, heldag: boolean): void;
  /** Visar veckonummer i huvudet. */
  visaVecka?: boolean;
}

interface Segment extends Packbar {
  f: Forekomst;
  franMin: number;
  tillMin: number;
  fortsatterFore: boolean;
  fortsatterEfter: boolean;
}

type Drag =
  | {
      typ: "flytta";
      f: Forekomst;
      greppMin: number; // hur långt in i blocket man tog tag
      langdMin: number;
      start: Date;
      slut: Date;
      aktiv: boolean;
    }
  | {
      typ: "langd";
      kant: "topp" | "botten";
      f: Forekomst;
      start: Date;
      slut: Date;
      aktiv: boolean;
    }
  | {
      typ: "rita";
      ankare: Date;
      start: Date;
      slut: Date;
      aktiv: boolean;
    };

export default function TidsRutnat({
  dagar,
  forekomster,
  timhojd,
  vald,
  onValj,
  onOppna,
  onFlytta,
  onSkapa,
  visaVecka,
}: RutnatProps) {
  const rutnatRef = useRef<HTMLDivElement | null>(null);
  const skrollRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [nu, setNu] = useState(() => new Date());
  // Bara veckovyn blir riktigt trång; en och tre dagar har gott om plats.
  const smal = useMobil() && dagar.length > 3;

  // Nu-linjen tickar en gång i minuten. Oftare vore slöseri; mer sällan
  // gör att linjen syns stå still.
  useEffect(() => {
    const id = window.setInterval(() => setNu(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  // Rulla till arbetsdagens början vid första ritningen, inte till 00:00.
  const harRullat = useRef(false);
  useLayoutEffektNarDetFinns(() => {
    if (harRullat.current || !skrollRef.current) return;
    harRullat.current = true;
    const mal = arSammaDag(dagar[0], nu) || dagar.some((d) => arSammaDag(d, nu))
      ? Math.max(0, (minuterInPaDagen(nu) / 60) * timhojd - 160)
      : (7 / 1) * timhojd;
    skrollRef.current.scrollTop = mal;
  }, [dagar, nu, timhojd]);

  const dagStart = dagar[0];
  const dagSlut = addDagar(startAvDag(dagar[dagar.length - 1]), 1);

  /* ---------------------------------------------------------------
     Uppdelning: heldagsremsan respektive rutnätet
     --------------------------------------------------------------- */
  const { remsposter, tidsposter } = useMemo(() => {
    const rem: { forekomst: Forekomst; fran: number; till: number }[] = [];
    const tid: Forekomst[] = [];
    for (const f of forekomster) {
      const langdTim = (f.slut.getTime() - f.start.getTime()) / 3600000;
      if (f.heldag || langdTim >= 24) {
        rem.push({
          forekomst: f,
          fran: dygnMellan(dagStart, f.start),
          // Ett heldagsspann slutar 00:00 dagen efter; sista rutan skall
          // ändå färgas, därför avrundas uppåt på minuten.
          till:
            dygnMellan(dagStart, f.slut) +
            (minuterInPaDagen(f.slut) > 0 ? 1 : 0),
        });
      } else {
        tid.push(f);
      }
    }
    return { remsposter: rem, tidsposter: tid };
  }, [forekomster, dagStart]);

  const { band, rader } = useMemo(
    () => laggUtBand(remsposter, dagar.length),
    [remsposter, dagar.length]
  );

  /* ---------------------------------------------------------------
     Segment per dygn — ett möte 23:00–01:00 ritas som två block
     --------------------------------------------------------------- */
  const segmentPerDag = useMemo(() => {
    const karta = new Map<string, Segment[]>();
    for (const d of dagar) karta.set(nyckel(d), []);

    const ersatt = drag && drag.aktiv ? dragForekomst(drag) : null;

    for (const f0 of tidsposter) {
      // Den förekomst som dras ritas på sin nya plats, inte sin gamla.
      const f =
        ersatt && ersatt.nyckel === f0.nyckel
          ? { ...f0, start: ersatt.start, slut: ersatt.slut }
          : f0;

      for (const d of dagar) {
        const dygnStart = startAvDag(d);
        const dygnEnd = addDagar(dygnStart, 1);
        if (f.slut <= dygnStart || f.start >= dygnEnd) continue;
        const franMin = f.start <= dygnStart ? 0 : minuterInPaDagen(f.start);
        const tillMin =
          f.slut >= dygnEnd ? DYGN_MIN : minuterInPaDagen(f.slut) || DYGN_MIN;
        const lista = karta.get(nyckel(d));
        if (!lista) continue;
        lista.push({
          nyckel: `${f.nyckel}@${nyckel(d)}`,
          f: f as Forekomst,
          start: medMinuter(dygnStart, franMin),
          slut: medMinuter(dygnStart, Math.max(tillMin, franMin + 5)),
          franMin,
          tillMin,
          fortsatterFore: f.start < dygnStart,
          fortsatterEfter: f.slut > dygnEnd,
        });
      }
    }
    return karta;
  }, [tidsposter, dagar, drag]);

  const layoutPerDag = useMemo(() => {
    const karta = new Map<string, Map<string, Layout>>();
    segmentPerDag.forEach((segment, dagnyckel) => {
      karta.set(dagnyckel, laggUt(segment));
    });
    return karta;
  }, [segmentPerDag]);

  /* ---------------------------------------------------------------
     Geometri: från muspekare till tidpunkt
     --------------------------------------------------------------- */
  const punktTillTid = useCallback(
    (klientX: number, klientY: number) => {
      const el = rutnatRef.current;
      if (!el) return null;
      const rekt = el.getBoundingClientRect();
      const kolumnbredd = rekt.width / dagar.length;
      const kolumn = klam(
        Math.floor((klientX - rekt.left) / kolumnbredd),
        0,
        dagar.length - 1
      );
      const minuter = ((klientY - rekt.top) / timhojd) * 60;
      return { dag: startAvDag(dagar[kolumn]), minuter, kolumn };
    },
    [dagar, timhojd]
  );

  /** Rullar rutnätet när pekaren närmar sig kanten under ett drag. */
  const kantrullning = useCallback((klientY: number) => {
    const box = skrollRef.current;
    if (!box) return;
    const rekt = box.getBoundingClientRect();
    const zon = 44;
    if (klientY < rekt.top + zon) {
      box.scrollTop -= Math.max(4, (rekt.top + zon - klientY) / 3);
    } else if (klientY > rekt.bottom - zon) {
      box.scrollTop += Math.max(4, (klientY - (rekt.bottom - zon)) / 3);
    }
  }, []);

  /* ---------------------------------------------------------------
     Dragmaskineriet

     På en mus börjar draget direkt: knappen nere betyder drag, och
     rullning sker med hjulet. På en pekskärm finns ingen sådan skillnad
     — fingret som drar ett block och fingret som rullar rutnätet ser
     likadana ut i början. Därför krävs ett LÅNGTRYCK innan draget tar
     över. Rör sig fingret innan dess är det en rullning och vi släpper
     gesten till webbläsaren.
     --------------------------------------------------------------- */
  const startpunkt = useRef<{ x: number; y: number } | null>(null);
  const vantande = useRef<{
    timer: number;
    el: HTMLElement;
    pekare: number;
    tidigareTouchAction: string;
  } | null>(null);
  const [armerad, setArmerad] = useState<string | null>(null);

  const avbrytVantan = useCallback(() => {
    const v = vantande.current;
    if (!v) return;
    window.clearTimeout(v.timer);
    v.el.style.touchAction = v.tidigareTouchAction;
    vantande.current = null;
  }, []);

  /**
   * Tar hand om skillnaden mellan mus och finger. `borja` körs när draget
   * faktiskt skall inledas — omedelbart för en mus, efter långtryck för
   * ett finger.
   */
  const grip = useCallback(
    (e: React.PointerEvent, markering: string | null, borja: () => void) => {
      const el = e.currentTarget as HTMLElement;
      startpunkt.current = { x: e.clientX, y: e.clientY };

      if (e.pointerType === "mouse") {
        el.setPointerCapture(e.pointerId);
        borja();
        return;
      }

      const tidigareTouchAction = el.style.touchAction;
      const timer = window.setTimeout(() => {
        vantande.current = null;
        // Först nu tas gesten över. Att sätta touch-action här hinner
        // spärra rullningen eftersom fingret stått stilla — hade en pan
        // redan börjat vore det för sent.
        el.style.touchAction = "none";
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // Fingret kan ha lyfts under tiden; då finns inget att fånga.
          el.style.touchAction = tidigareTouchAction;
          return;
        }
        setArmerad(markering);
        navigator.vibrate?.(12);
        borja();
      }, LANGTRYCK);

      vantande.current = { timer, el, pekare: e.pointerId, tidigareTouchAction };
    },
    []
  );

  const paBlockNed = useCallback(
    (e: React.PointerEvent, seg: Segment, kant?: "topp" | "botten") => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const punkt = punktTillTid(e.clientX, e.clientY);
      if (!punkt) return;
      onValj(seg.f);

      const f = seg.f;
      const langdMin = Math.round(
        (f.slut.getTime() - f.start.getTime()) / 60000
      );

      grip(e, seg.f.nyckel, () => {
        if (kant) {
          setDrag({
            typ: "langd",
            kant,
            f,
            start: f.start,
            slut: f.slut,
            aktiv: false,
          });
          return;
        }
        // Greppunkten mäts som avstånd från händelsens verkliga början —
        // inte från segmentets — så att ett block som sträcker sig över
        // midnatt inte hoppar när man tar tag i dess andra halva.
        const pekartid = medMinuter(punkt.dag, punkt.minuter);
        const greppMin = (pekartid.getTime() - f.start.getTime()) / 60000;
        setDrag({
          typ: "flytta",
          f,
          greppMin: klam(greppMin, 0, langdMin),
          langdMin,
          start: f.start,
          slut: f.slut,
          // Ett finger som redan hållit still i en halv sekund menar
          // allvar: draget är aktivt direkt, utan tröskel.
          aktiv: e.pointerType !== "mouse",
        });
      });
    },
    [grip, onValj, punktTillTid]
  );

  const paTomtNed = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const punkt = punktTillTid(e.clientX, e.clientY);
      if (!punkt) return;
      onValj(null);
      const ankare = medMinuter(
        punkt.dag,
        klam(snappa(punkt.minuter, STEG), 0, DYGN_MIN - STEG)
      );
      grip(e, null, () => {
        setDrag({
          typ: "rita",
          ankare,
          start: ankare,
          slut: new Date(ankare.getTime() + 30 * 60000),
          aktiv: e.pointerType !== "mouse",
        });
      });
    },
    [grip, onValj, punktTillTid]
  );

  const paRorelse = useCallback(
    (e: React.PointerEvent) => {
      // Fingret rörde sig innan långtrycket gick igenom: det var en
      // rullning. Släpp gesten till webbläsaren utan att göra något.
      if (vantande.current && startpunkt.current) {
        const langt =
          Math.abs(e.clientX - startpunkt.current.x) > RULLTROSKEL ||
          Math.abs(e.clientY - startpunkt.current.y) > RULLTROSKEL;
        if (langt) {
          avbrytVantan();
          startpunkt.current = null;
        }
        return;
      }

      if (!drag || !startpunkt.current) return;
      const rord =
        Math.abs(e.clientX - startpunkt.current.x) > TROSKEL ||
        Math.abs(e.clientY - startpunkt.current.y) > TROSKEL;
      if (!drag.aktiv && !rord) return;

      kantrullning(e.clientY);
      const punkt = punktTillTid(e.clientX, e.clientY);
      if (!punkt) return;

      setDrag((d) => {
        if (!d) return d;
        if (d.typ === "flytta") {
          const pekartid = medMinuter(punkt.dag, punkt.minuter);
          const rå = new Date(pekartid.getTime() - d.greppMin * 60000);
          // Snäpp mot kvartar räknat på väggklockan, inte på tidsstämpeln:
          // det senare skulle glida en timme vid sommartidsomställning.
          const start = medMinuter(
            startAvDag(rå),
            snappa(minuterInPaDagen(rå), STEG)
          );
          return {
            ...d,
            aktiv: true,
            start,
            slut: new Date(start.getTime() + d.langdMin * 60000),
          };
        }
        if (d.typ === "langd") {
          const min = snappa(punkt.minuter, STEG);
          if (d.kant === "topp") {
            const grans = new Date(d.slut.getTime() - MINSTA_LANGD * 60000);
            const ny = medMinuter(punkt.dag, min);
            return { ...d, aktiv: true, start: ny > grans ? grans : ny };
          }
          const grans = new Date(d.start.getTime() + MINSTA_LANGD * 60000);
          const ny = medMinuter(punkt.dag, min);
          return { ...d, aktiv: true, slut: ny < grans ? grans : ny };
        }
        // rita
        const min = klam(snappa(punkt.minuter, STEG), 0, DYGN_MIN);
        const pekare = medMinuter(punkt.dag, min);
        const fram = pekare.getTime() >= d.ankare.getTime();
        const start = fram ? d.ankare : pekare;
        const slut = fram ? pekare : d.ankare;
        const langd = Math.max(MINSTA_LANGD, (slut.getTime() - start.getTime()) / 60000);
        return {
          ...d,
          aktiv: true,
          start,
          slut: new Date(start.getTime() + langd * 60000),
        };
      });
    },
    [avbrytVantan, drag, kantrullning, punktTillTid]
  );

  const paUpp = useCallback(
    (e: React.PointerEvent, seg?: Segment) => {
      const el = e.currentTarget as HTMLElement;

      // Fingret lyftes innan långtrycket gick igenom: en vanlig tryckning.
      if (vantande.current) {
        avbrytVantan();
        startpunkt.current = null;
        if (seg) onOppna(seg.f);
        return;
      }

      if (el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      el.style.touchAction = "";
      setArmerad(null);
      startpunkt.current = null;
      const d = drag;
      setDrag(null);
      if (!d) return;

      if (!d.aktiv) {
        // Ingen rörelse: det var ett klick, inte ett drag.
        if (d.typ === "flytta" || d.typ === "langd") onOppna(d.f);
        return;
      }

      // Ett armerat finger som aldrig rörde sig skall inte skapa en
      // trettiominuters händelse ur tomma intet.
      if (d.typ === "rita" && d.slut.getTime() - d.start.getTime() <= 0) {
        return;
      }

      if (d.typ === "rita") {
        onSkapa(d.start, d.slut, false);
        return;
      }
      const oforandrat =
        d.start.getTime() === d.f.start.getTime() &&
        d.slut.getTime() === d.f.slut.getTime();
      if (!oforandrat) onFlytta(d.f, d.start, d.slut);
    },
    [avbrytVantan, drag, onFlytta, onOppna, onSkapa]
  );

  // Timern får inte överleva komponenten.
  useEffect(() => () => avbrytVantan(), [avbrytVantan]);

  // Ett avbrutet drag (Esc, systemdialog) får inte lämna kvar ett block
  // som hänger fast vid muspekaren.
  useEffect(() => {
    if (!drag) return;
    const paTangent = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        avbrytVantan();
        startpunkt.current = null;
        setArmerad(null);
        setDrag(null);
      }
    };
    window.addEventListener("keydown", paTangent);
    document.body.classList.add("drar-pagar");
    return () => {
      window.removeEventListener("keydown", paTangent);
      document.body.classList.remove("drar-pagar");
    };
  }, [avbrytVantan, drag]);

  /* ---------------------------------------------------------------
     Ritning
     --------------------------------------------------------------- */
  const tat = timhojd < 40;
  const nuSynlig = dagar.some((d) => arSammaDag(d, nu));
  const nuTopp = (minuterInPaDagen(nu) / 60) * timhojd;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Dagshuvud */}
      <div className="flex shrink-0 border-b border-ink bg-paper">
        <div
          className="shrink-0 border-r border-ink flex items-end justify-center pb-1"
          style={{ width: "var(--rannil)" }}
        >
          {visaVecka ? (
            <span className="pico opacity-55">Vecka</span>
          ) : (
            <span className="pico opacity-55">Tid</span>
          )}
        </div>
        <div className="flex-1 flex min-w-0">
          {dagar.map((d) => {
            const idag = arSammaDag(d, nu);
            return (
              /*
               * Dagshuvudet byter riktning med bredden. Sju kolumner på en
               * telefon ger runt femtio pixlar var — datum och veckodag
               * bredvid varandra får då inte plats och siffran klipps.
               * Staplade ryms båda, och "Idag" behöver inget eget ord när
               * siffran ändå bär accentfärgen.
               */
              <div
                key={nyckel(d)}
                data-idag={idag ? "1" : "0"}
                data-helg={arHelg(d) ? "1" : "0"}
                className="dagkolumn daghuvud flex-1"
              >
                <span className="daghuvud-veckodag nano opacity-70">
                  {smal
                    ? VECKODAGAR_KORT[d.getDay()].slice(0, 2)
                    : VECKODAGAR_KORT[d.getDay()]}
                </span>
                <span className="daghuvud-tal display tabnum">
                  {d.getDate()}
                </span>
                {idag && !smal && (
                  <span className="pico ml-auto text-accent">Idag</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Heldagsremsa */}
      <div className="flex shrink-0 heldagsremsa">
        <div
          className="shrink-0 border-r border-ink flex items-start justify-end pr-1.5 pt-1"
          style={{ width: "var(--rannil)" }}
        >
          <span className="pico opacity-55">Heldag</span>
        </div>
        <div
          className="flex-1 relative min-w-0"
          style={{ minHeight: 24, height: Math.max(24, rader * 19 + 6) }}
        >
          <div className="absolute inset-0 flex">
            {dagar.map((d) => (
              <div
                key={nyckel(d)}
                data-helg={arHelg(d) ? "1" : "0"}
                data-idag={arSammaDag(d, nu) ? "1" : "0"}
                className="dagkolumn flex-1"
              />
            ))}
          </div>
          {band.map((b) => {
            const bredd = 100 / dagar.length;
            return (
              <button
                key={b.nyckel}
                type="button"
                className="heldag-block absolute"
                data-ton={b.forekomst.ton}
                data-vald={vald === b.forekomst.nyckel ? "1" : "0"}
                style={{
                  left: `calc(${b.fran * bredd}% + 2px)`,
                  width: `calc(${(b.till - b.fran) * bredd}% - 4px)`,
                  top: b.rad * 19 + 3,
                  height: 17,
                }}
                onClick={() => {
                  onValj(b.forekomst);
                  onOppna(b.forekomst);
                }}
                title={b.forekomst.handelse.titel}
              >
                {b.klipptVanster && "‹ "}
                {b.forekomst.handelse.titel}
                {b.klipptHoger && " ›"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rullande rutnät */}
      <div ref={skrollRef} className="flex-1 min-h-0 overflow-y-auto tunnskroll">
        <div className="flex" style={{ height: 24 * timhojd }}>
          {/* Timrännil */}
          <div
            className="shrink-0 border-r border-ink relative bg-paper"
            style={{ width: "var(--rannil)" }}
          >
            {Array.from({ length: 24 }, (_, t) => (
              <div
                key={t}
                className="absolute right-1.5 pico opacity-60 tabnum"
                style={{ top: t * timhojd - 4 }}
              >
                {t === 0 ? "" : `${String(t).padStart(2, "0")}:00`}
              </div>
            ))}
            {nuSynlig && (
              <div
                className="absolute right-0 px-1 text-[0.52rem] leading-none tabnum bg-accent text-ink"
                style={{ top: nuTopp - 5 }}
              >
                {klocka(nu)}
              </div>
            )}
          </div>

          {/* Dagskolumnerna */}
          <div
            ref={rutnatRef}
            className="flex-1 flex min-w-0 tidsrutnat relative"
            data-tat={tat ? "1" : "0"}
            style={{ ["--timhojd" as string]: `${timhojd}px` }}
          >
            {dagar.map((d) => {
              const dn = nyckel(d);
              const segment = segmentPerDag.get(dn) ?? [];
              const layout = layoutPerDag.get(dn);
              const idag = arSammaDag(d, nu);
              return (
                <div
                  key={dn}
                  className="dagkolumn flex-1"
                  data-helg={arHelg(d) ? "1" : "0"}
                  data-idag={idag ? "1" : "0"}
                  onPointerDown={paTomtNed}
                  onPointerMove={paRorelse}
                  onPointerUp={(e) => paUpp(e)}
                  onPointerCancel={(e) => paUpp(e)}
                >
                  {segment.map((seg) => {
                    const l = layout?.get(seg.nyckel);
                    const dras =
                      drag?.aktiv &&
                      drag.typ !== "rita" &&
                      drag.f.nyckel === seg.f.nyckel;
                    const topp = (seg.franMin / 60) * timhojd;
                    const hojd = Math.max(
                      13,
                      ((seg.tillMin - seg.franMin) / 60) * timhojd - 1
                    );
                    const kort = hojd < 30;
                    return (
                      <div
                        key={seg.nyckel}
                        role="button"
                        tabIndex={0}
                        className="handelse"
                        data-ton={seg.f.ton}
                        data-vald={vald === seg.f.nyckel ? "1" : "0"}
                        data-dras={dras ? "1" : "0"}
                        data-kort={kort ? "1" : "0"}
                        data-armerad={armerad === seg.f.nyckel ? "1" : "0"}
                        data-over={l?.over ? "1" : "0"}
                        style={{
                          top: topp,
                          height: hojd,
                          left: `calc(${(l?.vanster ?? 0) * 100}% + 1px)`,
                          width: `calc(${(l?.bredd ?? 1) * 100}% - 2px)`,
                          /* Trappans djup styr staplingen. Som CSS-variabel
                             och inte som inline z-index — ett inline-värde
                             hade slagit ut :hover och [data-vald], som
                             behöver kunna lyfta blocket över de andra. */
                          ["--lager" as string]: l?.lager ?? 0,
                        }}
                        onPointerDown={(e) => paBlockNed(e, seg)}
                        onPointerMove={paRorelse}
                        onPointerUp={(e) => paUpp(e, seg)}
                        onPointerCancel={(e) => paUpp(e)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOppna(seg.f);
                          }
                        }}
                        title={`${seg.f.handelse.titel} — ${klocka(
                          seg.f.start
                        )}–${klocka(seg.f.slut)}`}
                      >
                        {!seg.fortsatterFore && (
                          <span
                            className="grepp"
                            data-kant="topp"
                            onPointerDown={(e) => paBlockNed(e, seg, "topp")}
                            onPointerMove={paRorelse}
                            onPointerUp={(e) => paUpp(e)}
                          />
                        )}
                        <span className="handelse-titel">
                          {seg.f.serie && "↻ "}
                          {seg.f.handelse.titel}
                        </span>
                        {hojd > 26 || kort ? (
                          <span className="handelse-tid">
                            {kort
                              ? klockaKort(seg.f.start)
                              : `${klocka(seg.f.start)}–${klocka(seg.f.slut)}`}
                          </span>
                        ) : null}
                        {hojd > 58 && seg.f.handelse.plats && (
                          <span className="handelse-tid">
                            {seg.f.handelse.plats}
                          </span>
                        )}
                        {!seg.fortsatterEfter && (
                          <span
                            className="grepp"
                            data-kant="botten"
                            onPointerDown={(e) => paBlockNed(e, seg, "botten")}
                            onPointerMove={paRorelse}
                            onPointerUp={(e) => paUpp(e)}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Markeringen för en ny händelse */}
                  {drag?.typ === "rita" &&
                    drag.aktiv &&
                    arSammaDag(drag.start, d) && (
                      <div
                        className="nyritning"
                        style={{
                          top: (minuterInPaDagen(drag.start) / 60) * timhojd,
                          height: Math.max(
                            13,
                            ((drag.slut.getTime() - drag.start.getTime()) /
                              3600000) *
                              timhojd
                          ),
                          left: 1,
                          right: 1,
                        }}
                      >
                        <span className="handelse-tid !opacity-100">
                          {klocka(drag.start)}–{klocka(drag.slut)}
                        </span>
                      </div>
                    )}

                  {idag && (
                    <div className="nulinje" style={{ top: nuTopp }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Avläsning under drag — visar exakt tid utan att man behöver
          gissa ur rutnätet. */}
      {drag?.aktiv && (
        <div className="shrink-0 border-t border-ink bg-ink text-paper px-3 py-1 flex items-center justify-between">
          <span className="pico">
            {drag.typ === "rita"
              ? "Ny händelse"
              : drag.typ === "langd"
              ? "Ändrar längd"
              : "Flyttar"}
          </span>
          <span className="micro tabnum">
            {kortDatum(drag.start)} · {klocka(drag.start)}–{klocka(drag.slut)} ·{" "}
            {minuterTillText(
              Math.round((drag.slut.getTime() - drag.start.getTime()) / 60000)
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function dragForekomst(d: Drag): { nyckel: string; start: Date; slut: Date } | null {
  if (d.typ === "rita") return null;
  return { nyckel: d.f.nyckel, start: d.start, slut: d.slut };
}
