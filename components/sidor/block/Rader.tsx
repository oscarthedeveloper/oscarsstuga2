"use client";

/**
 * En redigerbar lista.
 *
 * Varje sida under Annat har flera listor man fyller i för hand, och
 * de delar exakt samma mekanik: lägg till en rad, ändra fält, ta bort.
 * Att skriva den mekaniken en gång per lista vore fyra chanser att få
 * den olika — och en rad som raderas på fel sätt på ett ställe är
 * precis den sortens fel man upptäcker för sent.
 *
 * Fälten i raden ritas av anroparen. Det är avsiktligt: det är DÄR
 * sidorna skiljer sig åt, och en generisk fältbeskrivning hade gjort
 * alla listor likadana.
 */

import type { ReactNode } from "react";

export interface HarId {
  id: string;
}

export default function Rader<T extends HarId>({
  rader,
  rita,
  onTaBort,
  tomText,
}: {
  rader: T[];
  /** Fälten för en rad. */
  rita(rad: T): ReactNode;
  onTaBort(id: string): void;
  tomText: string;
}) {
  if (rader.length === 0) {
    return (
      <p className="pico opacity-45 px-3 py-4 leading-relaxed">{tomText}</p>
    );
  }

  return (
    <div>
      {rader.map((rad) => (
        <div key={rad.id} className="sidrad">
          {rita(rad)}
          <span className="flex-1" />
          <button
            type="button"
            className="knapp pico shrink-0"
            onClick={() => onTaBort(rad.id)}
            aria-label="Ta bort raden"
            title="Ta bort raden"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
