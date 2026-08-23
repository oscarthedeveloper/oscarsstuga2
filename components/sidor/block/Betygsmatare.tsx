"use client";

/**
 * Betyget som fem celler.
 *
 * Stjärnor undviks med flit. En stjärna är en gäst i den här appen —
 * den är rund, den är en ikon, och den är hämtad ur ett annat
 * formspråk. Fem fyrkanter säger samma sak med husets vokabulär, och de
 * kan dessutom fyllas delvis, vilket en stjärna inte kan utan att bli
 * en halv stjärna som ser ut som ett ritfel.
 *
 * Talet står ALLTID skrivet bredvid. Fyllnaden är översikten; siffran
 * är det man faktiskt läser av, och skillnaden mellan 3,6 och 3,8 syns
 * inte i en cell men är hela skillnaden mellan två viner.
 */

import { betygstext, klam } from "@/lib/sidor/viner";

const CELLER = 5;

export default function Betygsmatare({
  varde,
  onVarde,
  etikett,
  storlek = "liten",
}: {
  varde: number | null;
  /** Utelämnas i visningsläge. Med den blir cellerna knappar. */
  onVarde?: (n: number | null) => void;
  etikett: string;
  storlek?: "liten" | "stor";
}) {
  const n = varde === null ? 0 : klam(varde, 0, CELLER);

  return (
    <span className="betygsrad" data-storlek={storlek}>
      <span
        className="betygsmatare"
        role={onVarde ? undefined : "img"}
        aria-label={
          onVarde
            ? undefined
            : `${etikett}: ${varde === null ? "inget betyg" : `${betygstext(varde)} av 5`}`
        }
      >
        {Array.from({ length: CELLER }, (_, i) => {
          /* Cellens fyllnad är den del av betyget som faller inom just
             den cellen. 3,6 ger fyra fyllda och en till 60 procent. */
          const fyllnad = klam(n - i, 0, 1);
          const cell = (
            <span className="betygscell">
              <span style={{ width: `${fyllnad * 100}%` }} />
            </span>
          );
          if (!onVarde) return <span key={i}>{cell}</span>;
          return (
            <button
              key={i}
              type="button"
              /* Ett tryck på cellen man redan står på tömmer betyget.
                 Utan det går ett satt betyg inte att ta tillbaka, bara
                 att ändra — och ett betyg man satte av misstag skulle
                 ligga kvar för alltid. */
              onClick={() => onVarde(varde === i + 1 ? null : i + 1)}
              aria-label={`Sätt ${i + 1} av 5 för ${etikett}`}
              title={`${i + 1} av 5`}
            >
              {cell}
            </button>
          );
        })}
      </span>
      <span className="betygstal tabnum">{betygstext(varde)}</span>
    </span>
  );
}
