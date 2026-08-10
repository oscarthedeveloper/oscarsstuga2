"use client";

/**
 * Sidopanelen — bläckfärgad, som dokumentvyns sidebar på Fornsvenska.
 * Innehåller minimånad, kalenderfilter och dagens lista.
 */

import { useMemo } from "react";
import type { Forekomst, Vy } from "@/lib/typer";
import { useButik } from "./Butik";
import {
  addDagar,
  addManader,
  arHelg,
  arSammaDag,
  isoVecka,
  klocka,
  MANADER,
  manadsrutnat,
  nyckel,
  startAvDag,
  VECKODAGAR_MINI,
} from "@/lib/tid";

export interface SidopanelProps {
  peka: Date;
  vy: Vy;
  forekomster: Forekomst[];
  onGaTill(d: Date): void;
  onOppna(f: Forekomst): void;
  onNy(): void;
  onHanteraKalendrar(): void;
  /** Sant när panelen visas som utfällbar låda på en smal skärm. */
  lada?: boolean;
  onStang?(): void;
}

export default function Sidopanel({
  peka,
  forekomster,
  onGaTill,
  onOppna,
  onNy,
  onHanteraKalendrar,
  lada,
  onStang,
}: SidopanelProps) {
  const { kalendrar, vaxlaKalender, visaEndast, visaAlla, antalIKalender } =
    useButik();
  const nu = new Date();
  const rutor = useMemo(() => manadsrutnat(peka), [peka]);

  const tathet = useMemo(() => {
    const karta = new Map<string, number>();
    for (const f of forekomster) {
      let d = startAvDag(f.start);
      let varv = 0;
      while (d < f.slut && varv++ < 400) {
        karta.set(nyckel(d), (karta.get(nyckel(d)) ?? 0) + 1);
        d = addDagar(d, 1);
      }
    }
    return karta;
  }, [forekomster]);

  const dagensPoster = useMemo(() => {
    const d0 = startAvDag(peka);
    const d1 = addDagar(d0, 1);
    return forekomster
      .filter((f) => f.start < d1 && f.slut > d0)
      .sort(
        (a, b) =>
          Number(b.heldag) - Number(a.heldag) ||
          a.start.getTime() - b.start.getTime()
      )
      .slice(0, 14);
  }, [forekomster, peka]);

  return (
    <aside
      className={
        lada
          ? "sidopanel h-full flex flex-col min-h-0 border-r border-ink"
          : "sidopanel w-[218px] shrink-0 border-r border-ink hidden lg:flex flex-col min-h-0"
      }
    >
      {lada && (
        <div className="shrink-0 h-[34px] px-2.5 flex items-center justify-between border-b border-[rgb(253_251_239/0.25)]">
          <span className="micro">Kalendariet</span>
          <button
            type="button"
            className="micro hover:text-accent transition-colors"
            onClick={onStang}
          >
            Stäng ✕
          </button>
        </div>
      )}
      <div className="p-2.5 shrink-0">
        <button
          type="button"
          className="knapp micro w-full !bg-accent !text-ink !border-ink"
          onClick={onNy}
        >
          + Ny händelse
        </button>
      </div>

      {/* Minimånad */}
      <div className="px-2.5 pb-2.5 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="micro">
            {MANADER[peka.getMonth()].slice(0, 3)} {peka.getFullYear()}
          </span>
          <div className="knapp-rad">
            <button
              type="button"
              className="knapp pico !px-1.5"
              onClick={() => onGaTill(addManader(peka, -1))}
              aria-label="Föregående månad"
            >
              ‹
            </button>
            <button
              type="button"
              className="knapp pico !px-1.5"
              onClick={() => onGaTill(addManader(peka, 1))}
              aria-label="Nästa månad"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-y-px">
          <span className="pico opacity-30 text-center">V</span>
          {VECKODAGAR_MINI.slice(1)
            .concat(VECKODAGAR_MINI[0])
            .map((v, i) => (
              <span key={i} className="pico opacity-40 text-center">
                {v}
              </span>
            ))}
          {rutor.map((d, i) => (
            <MiniRuta
              key={nyckel(d)}
              d={d}
              i={i}
              peka={peka}
              nu={nu}
              antal={tathet.get(nyckel(d)) ?? 0}
              onGaTill={onGaTill}
            />
          ))}
        </div>
      </div>

      {/* Kalenderfilter */}
      <div className="px-2.5 pb-2 shrink-0 border-t border-[rgb(253_251_239/0.2)] pt-2.5">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="pico opacity-60">Kalendrar</span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              className="pico opacity-50 hover:opacity-100"
              onClick={visaAlla}
            >
              Visa alla
            </button>
            <button
              type="button"
              className="pico opacity-50 hover:opacity-100"
              onClick={onHanteraKalendrar}
              title="Lägg till, byt namn eller ta bort kalendrar"
            >
              Hantera
            </button>
          </span>
        </div>
        {kalendrar.map((k) => (
          <button
            key={k.id}
            type="button"
            className="kalenderrad"
            data-pa={k.synlig ? "1" : "0"}
            onClick={(e) => {
              // Alt-klick isolerar en kalender — snabbaste vägen till
              // "visa bara arbetet".
              if (e.altKey) visaEndast(k.id);
              else vaxlaKalender(k.id);
            }}
            title={
              k.synlig ? "Dölj (alt-klick isolerar)" : "Visa (alt-klick isolerar)"
            }
          >
            <span
              className="kalenderprick"
              style={{ background: `var(--kal-${k.ton + 1})` }}
            />
            <span className="truncate">{k.namn}</span>
            <span className="ml-auto pico opacity-45 tabnum shrink-0">
              {antalIKalender(k.id)}
            </span>
          </button>
        ))}
        <button
          type="button"
          className="kalenderrad opacity-45 hover:opacity-90"
          onClick={onHanteraKalendrar}
        >
          <span className="kalenderprick !border-dashed" />
          Ny kalender…
        </button>
      </div>

      {/* Dagens lista */}
      <div className="flex-1 min-h-0 overflow-y-auto tunnskroll border-t border-[rgb(253_251_239/0.2)] px-2.5 py-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="pico opacity-60">
            {arSammaDag(peka, nu) ? "Idag" : "Vald dag"}
          </span>
          <span className="pico opacity-40 tabnum">v {isoVecka(peka)}</span>
        </div>
        {dagensPoster.length === 0 && (
          <p className="pico opacity-40 leading-relaxed">Ingenting inbokat.</p>
        )}
        {dagensPoster.map((f) => (
          <button
            key={f.nyckel}
            type="button"
            className="w-full text-left flex items-start gap-1.5 py-1 opacity-75 hover:opacity-100 transition-opacity"
            onClick={() => onOppna(f)}
          >
            <span
              className="mt-1 shrink-0"
              style={{
                width: 6,
                height: 6,
                background: `var(--kal-${f.ton + 1}-stark)`,
              }}
            />
            <span className="min-w-0">
              <span className="block text-[0.58rem] leading-[1.35] truncate">
                {f.serie && "↻ "}
                {f.handelse.titel}
              </span>
              <span className="block text-[0.52rem] leading-[1.4] opacity-60 tabnum">
                {f.heldag ? "Heldag" : `${klocka(f.start)}–${klocka(f.slut)}`}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function MiniRuta({
  d,
  i,
  peka,
  nu,
  antal,
  onGaTill,
}: {
  d: Date;
  i: number;
  peka: Date;
  nu: Date;
  antal: number;
  onGaTill(d: Date): void;
}) {
  const utanfor = d.getMonth() !== peka.getMonth();
  const vald = arSammaDag(d, peka);
  const idag = arSammaDag(d, nu);
  return (
    <>
      {i % 7 === 0 && (
        <span className="pico opacity-25 text-center self-center tabnum">
          {isoVecka(d)}
        </span>
      )}
      <button
        type="button"
        onClick={() => onGaTill(d)}
        className="relative aspect-square flex items-center justify-center text-[0.55rem] leading-none tabnum transition-colors"
        style={{
          opacity: utanfor ? 0.28 : arHelg(d) ? 0.72 : 0.92,
          background: idag
            ? "var(--accent)"
            : vald
            ? "var(--paper)"
            : "transparent",
          color: idag || vald ? "var(--ink)" : "var(--paper)",
          outline: vald && !idag ? "1px solid var(--paper)" : "none",
        }}
      >
        {d.getDate()}
        {antal > 0 && !utanfor && !idag && !vald && (
          <span
            className="absolute bottom-[1px] left-1/2 -translate-x-1/2 bg-current"
            style={{ width: 3, height: 2, opacity: 0.6 }}
          />
        )}
      </button>
    </>
  );
}
