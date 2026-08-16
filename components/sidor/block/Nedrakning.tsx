"use client";

/**
 * Ett datum med nedräkning.
 *
 * Nedräkningen är hela värdet: "17 oktober" säger ingenting om hur
 * bråttom det är, "om 66 dygn" säger allt. Datumet står kvar bredvid,
 * eftersom man behöver båda för att planera.
 */

import { kortDatum, tolka } from "@/lib/tid";
import { dygnKvar, nedrakningstext } from "@/lib/sidor/hogskoleprov";

export default function Nedrakning({
  datum,
  idag,
}: {
  /** Datumnyckel YYYY-MM-DD. Tom sträng ritar ingenting. */
  datum: string;
  idag?: Date;
}) {
  const dygn = dygnKvar(datum, idag);
  if (dygn === null) return null;

  const passerat = dygn < 0;
  // Accent bara på det som är nära OCH kvar. Ett passerat datum är inte
  // brådskande, det är historia.
  const bradskar = dygn >= 0 && dygn <= 14;

  return (
    <span className="flex items-baseline gap-2 min-w-0">
      <span className="pico tabnum opacity-55 shrink-0">
        {kortDatum(tolka(datum))}
      </span>
      <span
        className="pico tabnum shrink-0"
        style={{
          color: bradskar ? "var(--accent)" : undefined,
          opacity: passerat ? 0.4 : 1,
        }}
      >
        {nedrakningstext(dygn)}
      </span>
    </span>
  );
}
