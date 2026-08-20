"use client";

/**
 * Sparandet månad för månad, plan mot utfall.
 *
 * Staplar och inte en kurva: värdena är belopp per avgränsad månad, inte
 * en storhet som glider mellan dem. En kurva mellan juli och augusti
 * antyder att det fanns värden däremellan.
 *
 * Planen ritas som en tom ram och utfallet som en fylld stapel inuti
 * den. Två staplar sida vid sida hade tvingat ögat att jämföra över ett
 * mellanrum; så här läses skillnaden direkt — utfallet syns rakt av som
 * hur högt det står i förhållande till ramen.
 */

import { kronor, manadsText } from "@/lib/sidor/ekonomi";

export interface Stapel {
  id: string;
  /** Kort etikett under stapeln, t.ex. "aug". */
  etikett: string;
  plan: number;
  /** Null när månaden inte summerats. */
  utfall: number | null;
}

const B = 560;
const H = 170;
const MARGINAL = { topp: 14, hoger: 10, botten: 26, vanster: 46 };

export default function Manadsstapel({
  staplar,
  mal = null,
}: {
  staplar: Stapel[];
  /** Vågrät accentlinje: det man siktar på att lägga undan per månad. */
  mal?: number | null;
}) {
  if (staplar.length === 0) {
    return (
      <p className="pico opacity-45 px-3 py-6 text-center leading-relaxed">
        Lägg upp en månad, så ritas sparandet här.
      </p>
    );
  }

  const hogsta = Math.max(
    1,
    ...staplar.map((s) => Math.max(s.plan, s.utfall ?? 0)),
    mal ?? 0
  );
  const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
  const innerH = H - MARGINAL.topp - MARGINAL.botten;
  const bredd = innerB / staplar.length;
  /* Stapeln fyller två tredjedelar av sitt fack. Mer och de växer ihop,
     mindre och de ser ut att sakna sammanhang. */
  const stapelBredd = Math.max(6, bredd * 0.62);

  const y = (v: number) => MARGINAL.topp + innerH - (v / hogsta) * innerH;
  const x = (i: number) => MARGINAL.vanster + i * bredd + (bredd - stapelBredd) / 2;

  return (
    <svg
      viewBox={`0 0 ${B} ${H}`}
      className="w-full h-auto block"
      role="img"
      aria-label={`Sparande per månad: ${staplar
        .map(
          (s) =>
            `${manadsText(s.id)} plan ${Math.round(s.plan)}${
              s.utfall === null ? "" : `, utfall ${Math.round(s.utfall)}`
            }`
        )
        .join("; ")}`}
    >
      {[0, 0.5, 1].map((andel) => (
        <g key={andel}>
          <line
            x1={MARGINAL.vanster}
            x2={B - MARGINAL.hoger}
            y1={y(andel * hogsta)}
            y2={y(andel * hogsta)}
            stroke="var(--ink)"
            strokeWidth="1"
            opacity={andel === 0 ? 0.35 : 0.1}
          />
          <text
            x={MARGINAL.vanster - 6}
            y={y(andel * hogsta) + 3}
            textAnchor="end"
            fill="var(--ink)"
            opacity="0.5"
            style={{ fontSize: 9, fontVariantNumeric: "tabular-nums" }}
          >
            {kronor(andel * hogsta)}
          </text>
        </g>
      ))}

      {mal !== null && mal > 0 && (
        <line
          x1={MARGINAL.vanster}
          x2={B - MARGINAL.hoger}
          y1={y(mal)}
          y2={y(mal)}
          stroke="var(--accent)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}

      {staplar.map((s, i) => {
        const topp = y(s.plan);
        const hojd = MARGINAL.topp + innerH - topp;
        return (
          <g key={s.id}>
            {/* Planen: en tom ram. */}
            <rect
              x={x(i)}
              y={topp}
              width={stapelBredd}
              height={Math.max(1, hojd)}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1"
            />
            {/* Utfallet: fylld inuti ramen. */}
            {s.utfall !== null && (
              <rect
                x={x(i)}
                y={y(s.utfall)}
                width={stapelBredd}
                height={Math.max(1, MARGINAL.topp + innerH - y(s.utfall))}
                fill="var(--ink)"
              />
            )}
            <text
              x={x(i) + stapelBredd / 2}
              y={H - 8}
              textAnchor="middle"
              fill="var(--ink)"
              opacity="0.55"
              style={{ fontSize: 9, letterSpacing: "0.06em" }}
            >
              {s.etikett}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
