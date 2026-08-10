"use client";

/**
 * Årsvyn — tolv minimånader som ett uppslag.
 *
 * Vyn är till för att se mönster, inte enskilda möten: därför visas ingen
 * text alls, bara en densitetsmarkering under varje datum. Att försöka
 * klämma in titlar i en ruta på tio pixlar ger bara grå gröt.
 */

import { Fragment, useMemo } from "react";
import type { Forekomst } from "@/lib/typer";
import {
  addDagar,
  arHelg,
  arSammaDag,
  isoVecka,
  MANADER,
  nyckel,
  startAvVecka,
  VECKODAGAR_MINI,
  dagarIManad,
} from "@/lib/tid";

export interface ArsProps {
  peka: Date;
  forekomster: Forekomst[];
  onGaTillDag(d: Date): void;
  onGaTillManad(d: Date): void;
}

export default function ArsVy({
  peka,
  forekomster,
  onGaTillDag,
  onGaTillManad,
}: ArsProps) {
  const ar = peka.getFullYear();
  const nu = new Date();

  /** Antal förekomster per dygn. Räknas en gång för hela året. */
  const tathet = useMemo(() => {
    const karta = new Map<string, number>();
    for (const f of forekomster) {
      let d = new Date(
        f.start.getFullYear(),
        f.start.getMonth(),
        f.start.getDate()
      );
      const slut = f.slut;
      let varv = 0;
      while (d < slut && varv++ < 400) {
        const k = nyckel(d);
        karta.set(k, (karta.get(k) ?? 0) + 1);
        d = addDagar(d, 1);
      }
      // En händelse som slutar exakt vid midnatt räknas inte in i nästa dygn.
      if (varv === 0) {
        const k = nyckel(f.start);
        karta.set(k, (karta.get(k) ?? 0) + 1);
      }
    }
    return karta;
  }, [forekomster]);

  const summaPerManad = useMemo(() => {
    const per = new Array(12).fill(0);
    tathet.forEach((antal, k) => {
      const [a, m] = k.split("-").map(Number);
      if (a === ar) per[m - 1] += antal;
    });
    return per;
  }, [tathet, ar]);

  return (
    <div className="h-full min-h-0 overflow-y-auto tunnskroll p-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_, m) => (
          <MiniManad
            key={m}
            ar={ar}
            manad={m}
            nu={nu}
            tathet={tathet}
            summa={summaPerManad[m]}
            onGaTillDag={onGaTillDag}
            onGaTillManad={onGaTillManad}
          />
        ))}
      </div>
    </div>
  );
}

function MiniManad({
  ar,
  manad,
  nu,
  tathet,
  summa,
  onGaTillDag,
  onGaTillManad,
}: {
  ar: number;
  manad: number;
  nu: Date;
  tathet: Map<string, number>;
  summa: number;
  onGaTillDag(d: Date): void;
  onGaTillManad(d: Date): void;
}) {
  const forsta = new Date(ar, manad, 1);
  const rutor = useMemo(() => {
    const start = startAvVecka(forsta);
    const antalRader = Math.ceil(
      (((forsta.getDay() + 6) % 7) + dagarIManad(ar, manad)) / 7
    );
    return Array.from({ length: antalRader * 7 }, (_, i) => addDagar(start, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ar, manad]);

  return (
    <div
      className="cf border border-ink bg-panel p-2"
      style={{ ["--cf" as string]: "5px" }}
    >
      <span className="cf-in" aria-hidden="true" />
      <div className="flex items-baseline justify-between mb-1.5 gap-2">
        <button
          type="button"
          className="display text-[1.05rem] leading-none hover:text-accent transition-colors"
          onClick={() => onGaTillManad(forsta)}
        >
          {MANADER[manad]}
        </button>
        <span className="pico opacity-50 tabnum">
          {summa} {summa === 1 ? "post" : "poster"}
        </span>
      </div>

      <div className="grid grid-cols-8 gap-x-0.5">
        <span className="pico opacity-35 text-center leading-[1.6]">V</span>
        {VECKODAGAR_MINI.slice(1)
          .concat(VECKODAGAR_MINI[0])
          .map((v, i) => (
            <span
              key={i}
              className="pico opacity-45 text-center leading-[1.6]"
            >
              {v}
            </span>
          ))}

        {rutor.map((d, i) => {
          const visaVecka = i % 7 === 0;
          const utanfor = d.getMonth() !== manad;
          const antal = tathet.get(nyckel(d)) ?? 0;
          return (
            <Fragment key={nyckel(d)}>
              {visaVecka && (
                <span className="pico opacity-30 text-center self-center tabnum">
                  {isoVecka(d)}
                </span>
              )}
              <button
                type="button"
                className="minidag tabnum"
                data-idag={arSammaDag(d, nu) ? "1" : "0"}
                data-utanfor={utanfor ? "1" : "0"}
                data-helg={arHelg(d) ? "1" : "0"}
                onClick={() => onGaTillDag(d)}
                title={`${d.getDate()}/${d.getMonth() + 1} — ${antal} ${
                  antal === 1 ? "post" : "poster"
                }`}
              >
                {d.getDate()}
                {antal > 0 && !utanfor && (
                  <span
                    className="minidag-punkt"
                    style={{ width: Math.min(3 + antal, 9) }}
                  />
                )}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
