"use client";

/**
 * En talserie över tid, ritad som en trappa med punkter.
 *
 * SVG för hand i stället för ett diagrambibliotek. Skälet är inte
 * sparsamhet med beroenden utan att biblioteken ritar i sitt eget
 * formspråk: rundade hörn, tonade ytor, egna typsnitt. Appen har fem
 * färger och hårfina 1px-linjer, och en graf som bryter mot det ser ut
 * som en gäst.
 *
 * Diagrammet skalas i bredd men har fast höjd i sitt koordinatsystem;
 * `preserveAspectRatio="none"` undviks eftersom det skulle sträcka
 * texten. I stället ritas allt i en fast ruta och skalas med CSS.
 */

export interface Punkt {
  /** Under axeln, t.ex. "apr 26". */
  etikett: string;
  varde: number;
}

const B = 560; // bredd i koordinatsystemet
const H = 150; // höjd
const MARGINAL = { topp: 16, hoger: 10, botten: 26, vanster: 34 };

export default function Serie({
  punkter,
  hogsta,
  mal = null,
  malEtikett = "Mål",
  skrivTal = (v) => v.toFixed(2),
}: {
  punkter: Punkt[];
  /** Skalans topp, t.ex. 2.0 för normerad poäng. */
  hogsta: number;
  /** Vågrät accentlinje att sikta på. */
  mal?: number | null;
  malEtikett?: string;
  /** Hur talen skrivs. Utan den blir det punkt i en svensk app. */
  skrivTal?: (v: number) => string;
}) {
  if (punkter.length === 0) {
    return (
      <p className="pico opacity-45 px-3 py-6 text-center leading-relaxed">
        Inga resultat ännu. Lägg till ditt första provtillfälle nedan.
      </p>
    );
  }

  const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
  const innerH = H - MARGINAL.topp - MARGINAL.botten;

  /* En ensam punkt får ligga i mitten. Att dela med noll ger NaN, och
     ett NaN i ett SVG-attribut ritar tyst ingenting alls. */
  const x = (i: number) =>
    MARGINAL.vanster +
    (punkter.length === 1 ? innerB / 2 : (i / (punkter.length - 1)) * innerB);
  const y = (v: number) =>
    MARGINAL.topp + innerH - (Math.max(0, Math.min(v, hogsta)) / hogsta) * innerH;

  const linje = punkter.map((p, i) => `${x(i)},${y(p.varde)}`).join(" ");
  const sista = punkter.length - 1;

  // Fyra vågräta hjälplinjer räcker för att kunna läsa av en nivå.
  const nivaer = [0, 0.25, 0.5, 0.75, 1].map((andel) => ({
    andel,
    varde: andel * hogsta,
  }));

  return (
    <svg
      viewBox={`0 0 ${B} ${H}`}
      className="w-full h-auto block"
      role="img"
      aria-label={`Utveckling: ${punkter
        .map((p) => `${p.etikett} ${skrivTal(p.varde)}`)
        .join(", ")}`}
    >
      {nivaer.map((n) => (
        <g key={n.andel}>
          <line
            x1={MARGINAL.vanster}
            x2={B - MARGINAL.hoger}
            y1={y(n.varde)}
            y2={y(n.varde)}
            stroke="var(--ink)"
            strokeWidth="1"
            opacity={n.andel === 0 ? 0.35 : 0.1}
          />
          <text
            x={MARGINAL.vanster - 6}
            y={y(n.varde) + 3}
            textAnchor="end"
            fill="var(--ink)"
            opacity="0.5"
            style={{ fontSize: 9, fontVariantNumeric: "tabular-nums" }}
          >
            {skrivTal(n.varde)}
          </text>
        </g>
      ))}

      {mal !== null && mal > 0 && mal <= hogsta && (
        <g>
          <line
            x1={MARGINAL.vanster}
            x2={B - MARGINAL.hoger}
            y1={y(mal)}
            y2={y(mal)}
            stroke="var(--accent)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={B - MARGINAL.hoger}
            y={y(mal) - 4}
            textAnchor="end"
            fill="var(--accent)"
            style={{ fontSize: 9, letterSpacing: "0.08em" }}
          >
            {malEtikett} {skrivTal(mal)}
          </text>
        </g>
      )}

      <polyline
        points={linje}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.5"
      />

      {punkter.map((p, i) => (
        <g key={`${p.etikett}-${i}`}>
          {/* Fyrkantiga punkter, som allt annat i appen. */}
          <rect
            x={x(i) - 3}
            y={y(p.varde) - 3}
            width="6"
            height="6"
            fill={i === sista ? "var(--accent)" : "var(--paper)"}
            stroke="var(--ink)"
            strokeWidth="1"
          />
          <text
            x={x(i)}
            y={y(p.varde) - 8}
            textAnchor="middle"
            fill="var(--ink)"
            style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
          >
            {skrivTal(p.varde)}
          </text>
          <text
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fill="var(--ink)"
            opacity="0.55"
            style={{ fontSize: 9, letterSpacing: "0.06em" }}
          >
            {p.etikett}
          </text>
        </g>
      ))}
    </svg>
  );
}
