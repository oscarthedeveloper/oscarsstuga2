"use client";

/**
 * Kopplingsrutan.
 *
 * Samma två listor överallt: vad posten pekar på, och vad som pekar på
 * den. Att den bor i en egen komponent och inte i varje panel är inte
 * bara sparade rader — det är garantin att en anteckning, en händelse
 * och en uppgift beter sig LIKADANT. Kopplingarna är det som gör de tre
 * sorterna till en väv, och en väv där trådarna fungerar olika beroende
 * på vilken ände man håller i är ingen väv.
 *
 * Rutan visas bara när det finns något att visa. En tom rubrik som säger
 * "Kopplingar: inga" är krom som tar plats från innehållet varje gång
 * man öppnar något, för att någon enstaka gång berätta något man redan
 * ser.
 */

import { useMemo } from "react";
import { useButik } from "./Butik";
import { bakatlankar, byggRegister, hittaLankar, slaUpp, type Mal } from "@/lib/kopplingar";

const MARKE: Record<Mal["slag"], string> = {
  handelse: "H",
  uppgift: "U",
  anteckning: "A",
};

export default function Kopplingar({
  id,
  titel,
  text,
  onOppnaMal,
  onSkapa,
  kompakt = false,
}: {
  /** Postens id — behövs för att den inte skall länka till sig själv. */
  id: string;
  /** Postens titel — det bakåtlänkarna matchar mot. */
  titel: string;
  /** Fritexten som kan innehålla [[länkar]]. */
  text: string;
  onOppnaMal(mal: Mal): void;
  /** Finns målet inte kan det skapas. Utelämnas den går länken inte att följa. */
  onSkapa?(titel: string): void;
  kompakt?: boolean;
}) {
  const butik = useButik();

  const kalla = useMemo(
    () => ({
      handelser: butik.handelser,
      uppgifter: butik.uppgifter,
      anteckningar: butik.anteckningar,
    }),
    [butik.handelser, butik.uppgifter, butik.anteckningar]
  );

  const register = useMemo(() => byggRegister(kalla), [kalla]);

  const utgaende = useMemo(
    () =>
      hittaLankar(text).map((t) => ({ titel: t, mal: slaUpp(register, t) })),
    [text, register]
  );

  const inkommande = useMemo(
    () => bakatlankar(kalla, { titel, id }),
    [kalla, titel, id]
  );

  if (utgaende.length === 0 && inkommande.length === 0) return null;

  return (
    <div className={kompakt ? "" : "border-t border-ink/20 pt-2 mt-1"}>
      {utgaende.length > 0 && (
        <div className="mb-2">
          <p className="pico opacity-45 mb-1">Pekar på</p>
          <div className="chiprad">
            {utgaende.map(({ titel: t, mal }) => (
              <button
                key={t}
                type="button"
                className="knapp pico flex items-center gap-1.5"
                data-finns={mal ? "1" : "0"}
                disabled={!mal && !onSkapa}
                onClick={() => (mal ? onOppnaMal(mal) : onSkapa?.(t))}
                title={mal ? `Öppna ${t}` : `Skapa anteckningen ${t}`}
              >
                <span className="opacity-55">{mal ? MARKE[mal.slag] : "+"}</span>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {inkommande.length > 0 && (
        <div>
          <p className="pico opacity-45 mb-1">Nämns i {inkommande.length}</p>
          {inkommande.map((r) => (
            <button
              key={`${r.slag}-${r.id}`}
              type="button"
              className="baklank"
              onClick={() => onOppnaMal(r)}
            >
              <span className="palett-marke" aria-hidden="true">
                {MARKE[r.slag]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.titel}</span>
                {r.utdrag && <span className="palett-under">{r.utdrag}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
