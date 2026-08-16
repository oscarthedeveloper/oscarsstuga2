"use client";

/**
 * Delproven jämförda mellan provtillfällen.
 *
 * Vändningen mot den vanliga kurvan är att X-AXELN ÄR DELPROVEN och
 * färgen är provtillfället. Då läser man vågrätt: "min DTK har gått
 * från en tredjedel till två tredjedelar, men ORD står stilla" — vilket
 * är den fråga man faktiskt har när man pluggar. Hade varje delprov
 * fått en egen kurva över tid skulle jämförelsen mellan delar kräva att
 * man höll åtta diagram i huvudet samtidigt.
 *
 * Y-AXELN ÄR ANDEL, inte råpoäng. NOG har tolv uppgifter och DTK
 * tjugofyra; ritade i råpoäng skulle DTK alltid se dubbelt så bra ut,
 * och diagrammet skulle svara på fel fråga.
 *
 * Färgen bär inte informationen ensam — teckenförklaringen under
 * diagrammet skriver ut varje termin, och råpoängen står i tabellen
 * nedanför. Den som inte skiljer färgerna åt tappar ingenting.
 */

import { PROVDELAR, terminText, type HpResultat } from "@/lib/sidor/hogskoleprov";

const B = 560;
const H = 190;
const MARGINAL = { topp: 14, hoger: 12, botten: 30, vanster: 34 };

/** Kalenderpaletten, i sin starka variant. Fler prov än så får dela. */
const TONER = [
  "var(--kal-1-stark)",
  "var(--kal-2-stark)",
  "var(--kal-3-stark)",
  "var(--kal-4-stark)",
  "var(--kal-5-stark)",
  "var(--kal-6-stark)",
];

export default function Delprovsserie({
  resultat,
}: {
  /** I terminsordning. Endast de med minst ett ifyllt delprov ritas. */
  resultat: HpResultat[];
}) {
  const medDelar = resultat.filter(
    (r) => Object.keys(r.delar).length > 0
  );

  if (medDelar.length === 0) {
    return (
      <p className="pico opacity-45 px-3 py-6 text-center leading-relaxed">
        Inga delpoäng ifyllda ännu. Fyll i dem i avsnittet nedan, så går de
        att jämföra här.
      </p>
    );
  }

  const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
  const innerH = H - MARGINAL.topp - MARGINAL.botten;
  const steg = innerB / (PROVDELAR.length - 1);
  const x = (i: number) => MARGINAL.vanster + i * steg;
  const y = (andel: number) => MARGINAL.topp + innerH - andel * innerH;

  return (
    <div>
      <svg
        viewBox={`0 0 ${B} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Andel rätt per delprov, en linje per provtillfälle"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((andel) => (
          <g key={andel}>
            <line
              x1={MARGINAL.vanster}
              x2={B - MARGINAL.hoger}
              y1={y(andel)}
              y2={y(andel)}
              stroke="var(--ink)"
              strokeWidth="1"
              opacity={andel === 0 ? 0.35 : 0.1}
            />
            <text
              x={MARGINAL.vanster - 6}
              y={y(andel) + 3}
              textAnchor="end"
              fill="var(--ink)"
              opacity="0.5"
              style={{ fontSize: 9, fontVariantNumeric: "tabular-nums" }}
            >
              {Math.round(andel * 100)}%
            </text>
          </g>
        ))}

        {/* Lodrät avdelare mellan kvantitativ och verbal del. */}
        <line
          x1={x(3.5)}
          x2={x(3.5)}
          y1={MARGINAL.topp}
          y2={MARGINAL.topp + innerH}
          stroke="var(--ink)"
          strokeWidth="1"
          opacity="0.22"
          strokeDasharray="3 3"
        />

        {PROVDELAR.map((d, i) => (
          <text
            key={d.id}
            x={x(i)}
            y={H - 16}
            textAnchor="middle"
            fill="var(--ink)"
            opacity="0.6"
            style={{ fontSize: 9, letterSpacing: "0.06em" }}
          >
            {d.id}
          </text>
        ))}
        <text
          x={x(1.5)}
          y={H - 4}
          textAnchor="middle"
          fill="var(--ink)"
          opacity="0.35"
          style={{ fontSize: 8, letterSpacing: "0.1em" }}
        >
          KVANTITATIV
        </text>
        <text
          x={x(5.5)}
          y={H - 4}
          textAnchor="middle"
          fill="var(--ink)"
          opacity="0.35"
          style={{ fontSize: 8, letterSpacing: "0.1em" }}
        >
          VERBAL
        </text>

        {medDelar.map((r, serieIndex) => {
          const ton = TONER[serieIndex % TONER.length];
          const punkter = PROVDELAR.map((d, i) => {
            const poang = r.delar[d.id];
            return poang === undefined
              ? null
              : { i, andel: poang / d.max };
          });

          /* Linjen bryts där ett delprov saknas. Att dra den rakt över
             hålet vore att påstå ett värde man inte har. */
          const segment: { i: number; andel: number }[][] = [];
          let pagaende: { i: number; andel: number }[] = [];
          for (const p of punkter) {
            if (p) pagaende.push(p);
            else {
              if (pagaende.length > 1) segment.push(pagaende);
              pagaende = [];
            }
          }
          if (pagaende.length > 1) segment.push(pagaende);

          return (
            <g key={r.id}>
              {segment.map((seg, si) => (
                <polyline
                  key={si}
                  points={seg.map((p) => `${x(p.i)},${y(p.andel)}`).join(" ")}
                  fill="none"
                  stroke={ton}
                  strokeWidth="1.5"
                />
              ))}
              {punkter.map((p) =>
                p === null ? null : (
                  <rect
                    key={p.i}
                    x={x(p.i) - 3}
                    y={y(p.andel) - 3}
                    width="6"
                    height="6"
                    fill={ton}
                    stroke="var(--ink)"
                    strokeWidth="1"
                  />
                )
              )}
            </g>
          );
        })}
      </svg>

      {/* Teckenförklaring. Utan den bär färgen informationen ensam. */}
      <div className="chiprad px-3 pb-2 pt-1">
        {medDelar.map((r, i) => (
          <span
            key={r.id}
            className="pico flex items-center gap-1.5 shrink-0"
          >
            <span
              className="inline-block w-2.5 h-2.5 border border-ink"
              style={{ background: TONER[i % TONER.length] }}
              aria-hidden="true"
            />
            {terminText(r.termin) || "Utan termin"}
          </span>
        ))}
      </div>
    </div>
  );
}
