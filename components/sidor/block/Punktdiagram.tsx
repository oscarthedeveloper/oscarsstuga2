"use client";

/**
 * Ett punktdiagram: varje vin en fyrkant, två frågor på en gång.
 *
 * SVG för hand i stället för ett diagrambibliotek, av samma skäl som
 * talserien på högskoleprovssidan: biblioteken ritar i sitt eget
 * formspråk — rundade hörn, tonade ytor, egna typsnitt — och appen har
 * fem färger och hårfina 1px-linjer. En graf som bryter mot det ser ut
 * som en gäst.
 *
 * Samma block ritar både betyg mot pris och smakkartan. Att skriva två
 * nästan lika diagram hade varit två chanser att få rutnätet, axlarna
 * och punkternas storlek olika — och två diagram som nästan liknar
 * varandra läses långsammare än två som är identiska.
 */

import type { Punkt } from "@/lib/sidor/viner";

export interface Axel {
  /** Etikett vid axelns låga ände. */
  lag: string;
  /** Etikett vid axelns höga ände. */
  hog: string;
  min: number;
  max: number;
  /**
   * Hur talen vid hjälplinjerna skrivs. Ritas bara för LODRÄTA axeln —
   * vågrätt står orden i hörnen, och tal där hade krockat med dem.
   * Utelämnas när axeln är ordnad och inte talad.
   */
  skrivTal?: (v: number) => string;
  /**
   * Antal steg mellan hjälplinjerna.
   *
   * Finns för att en femgradig skala skall graderas i hela steg. Med
   * grundvärdet fyra hamnar linjerna på 0, 1,3, 2,5, 3,8 och 5 — tal
   * som är riktiga men som ingen tänker i. Fem steg ger 0 till 5.
   */
  steg?: number;
}

const B = 480; // bredd i koordinatsystemet
const H = 300; // höjd
const MARGINAL = { topp: 14, hoger: 14, botten: 30, vanster: 40 };

export default function Punktdiagram({
  punkter,
  xAxel,
  yAxel,
  tomText,
}: {
  punkter: Punkt[];
  xAxel: Axel;
  yAxel: Axel;
  tomText: string;
}) {
  if (punkter.length === 0) {
    return (
      <p className="pico opacity-45 px-3 py-6 leading-relaxed">{tomText}</p>
    );
  }

  const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
  const innerH = H - MARGINAL.topp - MARGINAL.botten;

  /* Ett spann på noll ger division med noll, och ett NaN i ett
     SVG-attribut ritar tyst ingenting alls — inget felmeddelande, bara
     en tom ruta man får leta efter i en timme. */
  const spann = (a: Axel) => (a.max - a.min === 0 ? 1 : a.max - a.min);

  const x = (v: number) =>
    MARGINAL.vanster + ((v - xAxel.min) / spann(xAxel)) * innerB;
  const y = (v: number) =>
    MARGINAL.topp + innerH - ((v - yAxel.min) / spann(yAxel)) * innerH;

  const andelar = (a: Axel) => {
    const steg = Math.max(1, Math.round(a.steg ?? 4));
    return Array.from({ length: steg + 1 }, (_, i) => i / steg);
  };
  const vidX = (a: number) => xAxel.min + a * spann(xAxel);
  const vidY = (a: number) => yAxel.min + a * spann(yAxel);

  return (
    <div className="px-2.5 pt-2 pb-2.5">
      <svg
        viewBox={`0 0 ${B} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Punktdiagram, ${xAxel.hog} mot ${yAxel.hog}: ${punkter
          .map((p) => p.etikett)
          .join("; ")}`}
      >
        {/* Rutnätet. Lika svagt som ett millimeterpapper — det skall gå
            att läsa av en nivå, inte att räkna rutor. */}
        {andelar(yAxel).map((a) => (
          <g key={`v-${a}`}>
            <line
              x1={MARGINAL.vanster}
              x2={B - MARGINAL.hoger}
              y1={y(vidY(a))}
              y2={y(vidY(a))}
              stroke="var(--ink)"
              strokeWidth="1"
              opacity={a === 0 ? 0.35 : 0.1}
            />
            {yAxel.skrivTal && (
              <text
                x={MARGINAL.vanster - 6}
                y={y(vidY(a)) + 3}
                textAnchor="end"
                fill="var(--ink)"
                opacity="0.5"
                style={{ fontSize: 9, fontVariantNumeric: "tabular-nums" }}
              >
                {yAxel.skrivTal(vidY(a))}
              </text>
            )}
          </g>
        ))}
        {andelar(xAxel).map((a) => (
          <line
            key={`l-${a}`}
            y1={MARGINAL.topp}
            y2={MARGINAL.topp + innerH}
            x1={x(vidX(a))}
            x2={x(vidX(a))}
            stroke="var(--ink)"
            strokeWidth="1"
            opacity={a === 0 ? 0.35 : 0.1}
          />
        ))}

        {/* Punkterna. Fyrkantiga, som allt annat i appen. Titeln ger
            vinets namn vid beröring — färgen säger bara vilken sorts
            vin det är, aldrig vilket. */}
        {punkter.map((p) => (
          <rect
            key={p.id}
            x={x(p.x) - (p.framhavd ? 5 : 3.5)}
            y={y(p.y) - (p.framhavd ? 5 : 3.5)}
            width={p.framhavd ? 10 : 7}
            height={p.framhavd ? 10 : 7}
            fill={`var(--kal-${p.ton + 1})`}
            stroke={p.framhavd ? "var(--accent)" : "var(--ink)"}
            strokeWidth={p.framhavd ? 2 : 1}
          >
            <title>{p.etikett}</title>
          </rect>
        ))}

        {/* Axelorden i hörnen. En axel märkt med ord i båda ändar
            behöver ingen rubrik ovanför diagrammet. */}
        <text
          x={MARGINAL.vanster}
          y={H - 8}
          fill="var(--ink)"
          opacity="0.55"
          style={{ fontSize: 9, letterSpacing: "0.08em" }}
        >
          {xAxel.lag}
        </text>
        <text
          x={B - MARGINAL.hoger}
          y={H - 8}
          textAnchor="end"
          fill="var(--ink)"
          opacity="0.55"
          style={{ fontSize: 9, letterSpacing: "0.08em" }}
        >
          {xAxel.hog}
        </text>
        <text
          x={-(MARGINAL.topp + innerH)}
          y={11}
          transform="rotate(-90)"
          fill="var(--ink)"
          opacity="0.55"
          style={{ fontSize: 9, letterSpacing: "0.08em" }}
        >
          {yAxel.lag}
        </text>
        <text
          x={-MARGINAL.topp}
          y={11}
          textAnchor="end"
          transform="rotate(-90)"
          fill="var(--ink)"
          opacity="0.55"
          style={{ fontSize: 9, letterSpacing: "0.08em" }}
        >
          {yAxel.hog}
        </text>
      </svg>
    </div>
  );
}
