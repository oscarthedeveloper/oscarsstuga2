"use client";

/**
 * Samlingen som en enda stapel.
 *
 * En ringgraf hade varit den vanliga lösningen och är fel här av samma
 * skäl som i Privatekonomi: ögat jämför vinklar sämre än längder, och
 * frågan är just om det spanska är mer än det italienska. En stapel
 * svarar på det direkt.
 *
 * Teckenförklaringen står alltid utskriven med antal. Färgen bär aldrig
 * informationen ensam — stapeln är översikten, listan är det läsbara.
 */

import type { Del } from "@/lib/sidor/viner";

/**
 * Delar som får egen färg innan resten slås ihop.
 *
 * En stapel med tjugofem segment är inte en översikt utan en rand, och
 * med sex färger blir den sjunde ändå en upprepning. Resten samlas
 * därför i ett rastrerat segment som säger vad det är — inte utelämnas,
 * eftersom en stapel som tyst hoppar över svansen ser ut som en
 * fullständig bild av något den inte beskriver.
 */
const HOGST = 6;

export default function Delstapel({
  delar,
  tomText,
}: {
  delar: Del[];
  tomText: string;
}) {
  if (delar.length === 0) {
    return <p className="pico opacity-45 px-3 py-4 leading-relaxed">{tomText}</p>;
  }

  const framme = delar.slice(0, HOGST);
  const svans = delar.slice(HOGST);
  const ovrigt = svans.reduce((s, d) => s + d.antal, 0);
  const totalt = delar.reduce((s, d) => s + d.antal, 0);

  const andel = (n: number) =>
    totalt === 0 ? "" : `${Math.round((n / totalt) * 100)} %`;

  return (
    <div className="px-3 py-3">
      <div
        className="fordelning"
        role="img"
        aria-label={`Fördelning: ${delar
          .map((d) => `${d.namn} ${d.antal}`)
          .join(", ")}`}
      >
        {framme.map((d) => (
          <span
            key={d.id}
            data-ton={d.ton}
            style={{ flexGrow: d.antal, flexBasis: 0 }}
            title={`${d.namn} — ${d.antal} (${andel(d.antal)})`}
          />
        ))}
        {ovrigt > 0 && (
          <span
            data-ofordelat="1"
            style={{ flexGrow: ovrigt, flexBasis: 0 }}
            title={`Övriga ${svans.length} — ${ovrigt}`}
          />
        )}
      </div>

      <div className="chiprad mt-2 gap-x-3 gap-y-1 flex-wrap">
        {framme.map((d) => (
          <span key={d.id} className="pico flex items-center gap-1.5 shrink-0">
            <span
              className="inline-block w-2.5 h-2.5 border border-ink shrink-0"
              style={{ background: `var(--kal-${d.ton + 1})` }}
              aria-hidden="true"
            />
            {d.namn}
            <span className="tabnum opacity-55">{d.antal}</span>
            <span className="tabnum opacity-35">{andel(d.antal)}</span>
          </span>
        ))}
        {ovrigt > 0 && (
          <span
            className="pico flex items-center gap-1.5 shrink-0"
            title={svans.map((d) => `${d.namn} ${d.antal}`).join(", ")}
          >
            <span
              className="inline-block w-2.5 h-2.5 border border-ink shrink-0"
              style={{
                background:
                  "repeating-linear-gradient(45deg, rgb(17 17 17 / 0.28) 0 1px, transparent 1px 5px)",
              }}
              aria-hidden="true"
            />
            Övriga {svans.length}
            <span className="tabnum opacity-55">{ovrigt}</span>
            <span className="tabnum opacity-35">{andel(ovrigt)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
