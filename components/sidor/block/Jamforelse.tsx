"use client";

/**
 * Rad för rad: vad som krävs, och hur långt du har kvar.
 *
 * Skillnaden skrivs alltid med tecken — "+0,10" och "−0,15" — och
 * aldrig bara som en färg. En röd siffra utan tecken kräver att man
 * minns åt vilket håll skalan går, och det gör man inte klockan sju på
 * morgonen.
 */

import {
  poangtext,
  skillnadstext,
  type Avstand,
} from "@/lib/sidor/hogskoleprov";

export default function Jamforelse({
  rader,
  harPoang,
}: {
  rader: Avstand[];
  /** Falskt när inget eget resultat är ifyllt ännu. */
  harPoang: boolean;
}) {
  if (rader.length === 0) {
    return (
      <p className="pico opacity-45 px-3 py-4 leading-relaxed">
        Lägg till ett lärosäte nedan, eller sätt ett eget mål, så räknas
        avståndet ut här.
      </p>
    );
  }

  return (
    <div>
      {rader.map((r) => (
        <div key={r.id} className="sidrad">
          <span className="text-[0.78rem] min-w-0 flex-1 truncate">
            {r.etikett}
          </span>
          <span className="pico opacity-45 shrink-0">Krävs</span>
          <span className="medeltal shrink-0">{poangtext(r.krav)}</span>
          <span
            className="utfall micro tabnum shrink-0 w-[4.5rem] text-right"
            data-racker={r.racker ? "1" : "0"}
          >
            {r.skillnad === null
              ? harPoang
                ? "—"
                : "?"
              : skillnadstext(r.skillnad)}
          </span>
        </div>
      ))}
    </div>
  );
}
