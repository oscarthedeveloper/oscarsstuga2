"use client";

/**
 * Månadens fördelning som en enda stapel.
 *
 * En ringgraf hade varit den vanliga lösningen och är fel här: ögat
 * jämför vinklar sämre än längder, och det man vill se är just om
 * sparandet är större än nöjena. En stapel svarar på det direkt.
 *
 * Det ofördelade får ett eget segment i stället för att utelämnas. En
 * stapel som alltid är full döljer sidans viktigaste fråga — finns det
 * pengar kvar som ännu inte fått en plats?
 */

import { kronor, procent } from "@/lib/sidor/ekonomi";

export interface Del {
  id: string;
  namn: string;
  belopp: number;
  ton: number;
}

export default function Fordelningsstapel({
  delar,
  kvar,
  inkomst,
}: {
  delar: Del[];
  /** Ofördelat. Negativt betyder övertrasserat. */
  kvar: number | null;
  inkomst: number | null;
}) {
  const over = kvar !== null && kvar < 0;
  const synliga = delar.filter((d) => d.belopp > 0);

  if (synliga.length === 0 && !kvar) {
    return (
      <p className="pico opacity-45 px-3 py-4 leading-relaxed">
        Fyll i inkomst och belopp, så ritas fördelningen här.
      </p>
    );
  }

  return (
    <div className="px-3 py-3">
      {/* Segmenten skalas av flex, så stapeln fylls alltid helt. Vid
          övertrassering syns det därför inte i proportionerna — bara på
          ramen, som byter till accent. Utan den signalen ser en
          övertrasserad månad ut precis som en perfekt fördelad. */}
      <div
        className="fordelning"
        data-over={over ? "1" : "0"}
        role="img"
        aria-label={etikett(synliga, kvar)}
      >
        {synliga.map((d) => (
          <span
            key={d.id}
            data-ton={d.ton}
            style={{ flexGrow: d.belopp, flexBasis: 0 }}
            title={`${d.namn} ${kronor(d.belopp)} kr`}
          />
        ))}
        {kvar !== null && kvar > 0 && (
          <span
            data-ofordelat="1"
            style={{ flexGrow: kvar, flexBasis: 0 }}
            title={`Ofördelat ${kronor(kvar)} kr`}
          />
        )}
      </div>

      {/* Teckenförklaring med belopp och andel. Färgen bär aldrig
          informationen ensam — det är listan som är läsbar, stapeln som
          är översikten. */}
      <div className="chiprad mt-2 gap-x-3 gap-y-1 flex-wrap">
        {synliga.map((d) => (
          <span key={d.id} className="pico flex items-center gap-1.5 shrink-0">
            <span
              className="inline-block w-2.5 h-2.5 border border-ink shrink-0"
              style={{ background: `var(--kal-${d.ton + 1})` }}
              aria-hidden="true"
            />
            {d.namn}
            <span className="tabnum opacity-55">{kronor(d.belopp)}</span>
            <span className="tabnum opacity-35">
              {procent(inkomst ? d.belopp / inkomst : null, "")}
            </span>
          </span>
        ))}
        {kvar !== null && kvar !== 0 && (
          <span
            className="pico flex items-center gap-1.5 shrink-0"
            style={over ? { color: "var(--accent)" } : undefined}
          >
            <span
              className="inline-block w-2.5 h-2.5 border border-ink shrink-0"
              style={{
                background: over ? "var(--accent)" : "transparent",
              }}
              aria-hidden="true"
            />
            {over ? "Övertrasserat" : "Ofördelat"}
            <span className="tabnum">{kronor(Math.abs(kvar))}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function etikett(delar: Del[], kvar: number | null): string {
  const rader = delar.map((d) => `${d.namn} ${Math.round(d.belopp)} kronor`);
  if (kvar !== null && kvar > 0) rader.push(`ofördelat ${Math.round(kvar)}`);
  return `Fördelning: ${rader.join(", ")}`;
}
