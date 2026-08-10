"use client";

/**
 * Månadsvyn — sex rader à sju dygn, alltid 42 rutor. Antalet rutor hålls
 * fast för att rutnätet inte skall hoppa i höjd mellan februari och mars.
 *
 * Här dras händelser mellan dygn, inte mellan klockslag: klockslaget följer
 * med oförändrat. Det är den enda rimliga tolkningen — i en ruta som är
 * ett dygn hög finns ingen upplösning att sikta med.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Forekomst } from "@/lib/typer";
import { laggUtBand } from "@/lib/layout";
import {
  addDagar,
  arHelg,
  arSammaDag,
  dygnMellan,
  isoVecka,
  klockaKort,
  MANADER,
  manadsrutnat,
  nyckel,
  startAvDag,
  tolka,
  VECKODAGAR_KORT,
} from "@/lib/tid";

const RADHOJD = 19;
const TOPPMARGINAL = 24;

export interface ManadsProps {
  peka: Date;
  forekomster: Forekomst[];
  vald: string | null;
  onValj(f: Forekomst | null): void;
  onOppna(f: Forekomst): void;
  onFlytta(f: Forekomst, nyStart: Date, nySlut: Date): void;
  onSkapa(start: Date, slut: Date, heldag: boolean): void;
  onGaTillDag(d: Date): void;
}

export default function ManadsVy({
  peka,
  forekomster,
  vald,
  onValj,
  onOppna,
  onFlytta,
  onSkapa,
  onGaTillDag,
}: ManadsProps) {
  const dagar = useMemo(() => manadsrutnat(peka), [peka]);
  const rutorRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{
    f: Forekomst;
    fran: string;
    over: string | null;
  } | null>(null);
  const [nu, setNu] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNu(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const veckor = useMemo(
    () => Array.from({ length: 6 }, (_, i) => dagar.slice(i * 7, i * 7 + 7)),
    [dagar]
  );

  /** Vilket dygn ligger under pekaren? Läses ur DOM via data-attribut. */
  const dagUnder = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const ruta = el?.closest?.("[data-dagnyckel]") as HTMLElement | null;
    return ruta?.dataset.dagnyckel ?? null;
  }, []);

  const paNed = useCallback(
    (e: React.PointerEvent, f: Forekomst, dagnyckel: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      onValj(f);
      setDrag({ f, fran: dagnyckel, over: null });
    },
    [onValj]
  );

  const paRorelse = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      const over = dagUnder(e.clientX, e.clientY);
      setDrag((d) => (d && d.over !== over ? { ...d, over } : d));
    },
    [drag, dagUnder]
  );

  const paUpp = useCallback(
    (e: React.PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      if (el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      const d = drag;
      setDrag(null);
      if (!d) return;
      if (!d.over || d.over === d.fran) {
        onOppna(d.f);
        return;
      }
      // Skillnaden mäts i hela dygn; klockslaget rörs inte.
      const skift = dygnMellan(tolka(d.fran), tolka(d.over));
      const nyStart = addDagar(d.f.start, skift);
      const nySlut = addDagar(d.f.slut, skift);
      onFlytta(d.f, nyStart, nySlut);
    },
    [drag, onFlytta, onOppna]
  );

  useEffect(() => {
    if (!drag) return;
    const paTangent = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrag(null);
    };
    window.addEventListener("keydown", paTangent);
    return () => window.removeEventListener("keydown", paTangent);
  }, [drag]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Veckodagshuvud */}
      <div className="flex shrink-0 border-b border-ink bg-paper">
        <div
          className="shrink-0 border-r border-ink flex items-center justify-center"
          style={{ width: "var(--rannil)" }}
        >
          <span className="pico opacity-55">V</span>
        </div>
        {VECKODAGAR_KORT.slice(1)
          .concat(VECKODAGAR_KORT[0])
          .map((namn) => (
            <div
              key={namn}
              className="flex-1 py-1.5 text-center border-l border-ink/15 first:border-l-0"
            >
              <span className="pico opacity-70">{namn}</span>
            </div>
          ))}
      </div>

      {/* Rutnätet */}
      <div ref={rutorRef} className="flex-1 min-h-0 flex flex-col">
        {veckor.map((vecka, vi) => (
          <div key={vi} className="flex-1 flex min-h-0">
            <button
              type="button"
              onClick={() => onGaTillDag(vecka[0])}
              className="shrink-0 border-r border-t border-ink/15 flex items-start justify-center pt-1.5 hover:bg-ink hover:text-paper transition-colors"
              style={{ width: "var(--rannil)" }}
              title={`Gå till vecka ${isoVecka(vecka[0])}`}
            >
              <span className="pico tabnum opacity-70">
                {isoVecka(vecka[0])}
              </span>
            </button>
            <VeckoRad
              vecka={vecka}
              peka={peka}
              nu={nu}
              forekomster={forekomster}
              vald={vald}
              drag={drag}
              onValj={onValj}
              onOppna={onOppna}
              onSkapa={onSkapa}
              onGaTillDag={onGaTillDag}
              paNed={paNed}
              paRorelse={paRorelse}
              paUpp={paUpp}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function VeckoRad({
  vecka,
  peka,
  nu,
  forekomster,
  vald,
  drag,
  onValj,
  onOppna,
  onSkapa,
  onGaTillDag,
  paNed,
  paRorelse,
  paUpp,
}: {
  vecka: Date[];
  peka: Date;
  nu: Date;
  forekomster: Forekomst[];
  vald: string | null;
  drag: { f: Forekomst; fran: string; over: string | null } | null;
  onValj(f: Forekomst | null): void;
  onOppna(f: Forekomst): void;
  onSkapa(start: Date, slut: Date, heldag: boolean): void;
  onGaTillDag(d: Date): void;
  paNed(e: React.PointerEvent, f: Forekomst, dagnyckel: string): void;
  paRorelse(e: React.PointerEvent): void;
  paUpp(e: React.PointerEvent): void;
}) {
  const radRef = useRef<HTMLDivElement | null>(null);
  const [platser, setPlatser] = useState(4);

  const veckoStart = startAvDag(vecka[0]);
  const veckoSlut = addDagar(veckoStart, 7);

  // Flerdygnshändelser läggs som sammanhängande band över veckan;
  // endagshändelser blir ettdagsband. Samma packning för båda, så att
  // ordningen inom en dag är stabil oavsett längd.
  const poster = useMemo(() => {
    const ut: { forekomst: Forekomst; fran: number; till: number }[] = [];
    for (const f of forekomster) {
      if (f.slut <= veckoStart || f.start >= veckoSlut) continue;
      const fran = dygnMellan(veckoStart, f.start);
      const slutDygn = dygnMellan(veckoStart, f.slut);
      // Ett heldagsspann slutar 00:00 dagen efter — den sista rutan skall
      // ändå räknas med, men bara om det finns tid kvar av dygnet.
      const till =
        f.slut.getHours() === 0 && f.slut.getMinutes() === 0
          ? Math.max(fran + 1, slutDygn)
          : slutDygn + 1;
      ut.push({ forekomst: f, fran, till });
    }
    return ut;
  }, [forekomster, veckoStart, veckoSlut]);

  const { band } = useMemo(() => laggUtBand(poster, 7), [poster]);

  // Hur många band ryms innan raden måste skriva "+3 till"?
  useEffect(() => {
    const el = radRef.current;
    if (!el) return;
    const mat = () => {
      const h = el.clientHeight - TOPPMARGINAL;
      setPlatser(Math.max(1, Math.floor(h / RADHOJD)));
    };
    mat();
    const obs = new ResizeObserver(mat);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const synligaRader = Math.max(1, platser - (band.some((b) => b.rad >= platser) ? 1 : 0));

  const overskott = useMemo(() => {
    const per = new Array(7).fill(0);
    for (const b of band) {
      if (b.rad < synligaRader) continue;
      for (let i = b.fran; i < b.till; i++) per[i] += 1;
    }
    return per;
  }, [band, synligaRader]);

  return (
    <div ref={radRef} className="flex-1 relative min-w-0">
      <div className="absolute inset-0 flex">
        {vecka.map((d) => {
          const dn = nyckel(d);
          const utanfor = d.getMonth() !== peka.getMonth();
          const idag = arSammaDag(d, nu);
          return (
            <div
              key={dn}
              data-dagnyckel={dn}
              data-utanfor={utanfor ? "1" : "0"}
              data-helg={arHelg(d) ? "1" : "0"}
              data-idag={idag ? "1" : "0"}
              data-slappmal={drag && drag.over === dn && drag.over !== drag.fran ? "1" : "0"}
              className="manadsruta flex-1"
              onDoubleClick={() => {
                const start = new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate(),
                  9,
                  0
                );
                onSkapa(start, new Date(start.getTime() + 3600000), false);
              }}
              onClick={() => onValj(null)}
            >
              <div className="flex items-start justify-between px-1.5 pt-1 shrink-0">
                <button
                  type="button"
                  className="manadsruta-tal tabnum hover:text-accent transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGaTillDag(d);
                  }}
                  title="Öppna dagen"
                >
                  {d.getDate()}
                </button>
                {d.getDate() === 1 && (
                  <span className="pico opacity-55 pt-0.5">
                    {MANADER[d.getMonth()].slice(0, 3)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Banden ovanpå rutnätet */}
      <div className="absolute inset-0 pointer-events-none">
        {band
          .filter((b) => b.rad < synligaRader)
          .map((b) => {
            const bredd = 100 / 7;
            const dras = drag?.f.nyckel === b.forekomst.nyckel;
            const flerdygn = b.till - b.fran > 1;
            const heldagsaktig = b.forekomst.heldag || flerdygn;
            return (
              <button
                key={b.nyckel}
                type="button"
                className={
                  heldagsaktig
                    ? "heldag-block absolute pointer-events-auto"
                    : "absolute pointer-events-auto flex items-center gap-1.5 px-1 text-left w-full overflow-hidden"
                }
                data-ton={b.forekomst.ton}
                data-vald={vald === b.forekomst.nyckel ? "1" : "0"}
                style={{
                  left: `calc(${b.fran * bredd}% + 3px)`,
                  width: `calc(${(b.till - b.fran) * bredd}% - 6px)`,
                  top: TOPPMARGINAL + b.rad * RADHOJD,
                  height: RADHOJD - 3,
                  opacity: dras ? 0.45 : 1,
                  cursor: "grab",
                  touchAction: "none",
                }}
                onPointerDown={(e) =>
                  paNed(e, b.forekomst, nyckel(addDagar(veckoStart, b.fran)))
                }
                onPointerMove={paRorelse}
                onPointerUp={paUpp}
                onPointerCancel={paUpp}
                title={b.forekomst.handelse.titel}
              >
                {heldagsaktig ? (
                  <>
                    {b.klipptVanster && "‹ "}
                    {b.forekomst.serie && "↻ "}
                    {b.forekomst.handelse.titel}
                    {b.klipptHoger && " ›"}
                  </>
                ) : (
                  <>
                    <span
                      className="shrink-0"
                      style={{
                        width: 6,
                        height: 6,
                        background: `var(--kal-${b.forekomst.ton + 1}-stark)`,
                      }}
                    />
                    <span className="text-[0.55rem] leading-none tabnum opacity-65 shrink-0">
                      {klockaKort(b.forekomst.start)}
                    </span>
                    <span className="text-[0.58rem] leading-none truncate">
                      {b.forekomst.handelse.titel}
                    </span>
                  </>
                )}
              </button>
            );
          })}

        {overskott.map((antal, i) =>
          antal > 0 ? (
            <button
              key={i}
              type="button"
              className="absolute pointer-events-auto pico opacity-70 hover:opacity-100 hover:text-accent px-1 text-left"
              style={{
                left: `calc(${i * (100 / 7)}% + 4px)`,
                top: TOPPMARGINAL + synligaRader * RADHOJD,
                height: RADHOJD - 3,
              }}
              onClick={() => onGaTillDag(addDagar(veckoStart, i))}
            >
              +{antal} till
            </button>
          ) : null
        )}
      </div>
    </div>
  );
}
