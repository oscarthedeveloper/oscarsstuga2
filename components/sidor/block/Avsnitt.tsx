"use client";

/**
 * Ett avsnitt på en sida: ram, etikett och plats för en handling.
 *
 * Sidorna under Annat ser olika ut i grunden — det är hela poängen —
 * men de delar vokabulär. Att avsnittsramen bor här och inte skrivs om
 * på varje sida är skillnaden mellan en avdelning och en samling
 * lösryckta vyer.
 */

import type { ReactNode } from "react";

export default function Avsnitt({
  rubrik,
  bihang,
  atgard,
  children,
}: {
  rubrik: string;
  /** Kort förklaring till höger om rubriken. */
  bihang?: string;
  /** Knapp längst till höger, t.ex. "Ny rad". */
  atgard?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="sidavsnitt">
      <div className="sidrubrik">
        <h2 className="micro">{rubrik}</h2>
        {bihang && (
          <span className="pico opacity-45 truncate hidden sm:inline">
            {bihang}
          </span>
        )}
        <span className="flex-1" />
        {atgard}
      </div>
      {children}
    </section>
  );
}
