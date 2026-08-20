"use client";

/**
 * Ett sifferfält som går att skriva komma i.
 *
 * DETTA ÄR INTE EN DETALJ. Ett vanligt kontrollerat fält som tolkar
 * värdet vid varje tangenttryckning gör det omöjligt att skriva 1,70:
 * efter kommat är texten "1," som tolkas till talet 1, som ritas
 * tillbaka som "1" — och kommat är borta innan man hunnit skriva
 * siffran efter. Samma sak drabbar en inledande nolla och ett
 * avslutande minustecken.
 *
 * Lösningen är att fältet äger sin RÅA TEXT medan man skriver, och bara
 * skickar ut det tolkade värdet. Texten skrivs om utifrån först när det
 * inkommande värdet inte längre stämmer med det man har skrivit — alltså
 * när någon annan ändrat, inte när man själv håller på.
 */

import { useEffect, useRef, useState } from "react";

/** Samma tolkning som lagret gör. Komma och punkt duger båda. */
export function tolka(rå: string): number | null {
  const rensad = rå.trim().replace(",", ".");
  if (rensad === "") return null;
  const n = Number(rensad);
  return Number.isFinite(n) ? n : null;
}

/** Svensk decimalkomma ut, eftersom det är så man skriver in det. */
export function skriv(varde: number | null): string {
  return varde === null ? "" : String(varde).replace(".", ",");
}

export default function Talfalt({
  varde,
  onVarde,
  etikett,
  platshallare = "—",
  className = "falt talfalt",
  tolkTal = tolka,
  skrivTal = skriv,
}: {
  varde: number | null;
  onVarde(n: number | null): void;
  etikett: string;
  platshallare?: string;
  className?: string;
  /**
   * Egen tolkning och utskrift.
   *
   * Finns för belopp, som skrivs "7 500" med mellanrum och därför kräver
   * andra regler än en normerad poäng. Mekaniken — att fältet äger sin
   * råa text medan man skriver — är densamma, och den skall inte skrivas
   * en gång till för varje sorts tal. Det vore två chanser att få
   * kommateckensbuggen tillbaka.
   */
  tolkTal?(rå: string): number | null;
  skrivTal?(varde: number | null): string;
}) {
  const [text, setText] = useState(() => skrivTal(varde));
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    // Bara när det inkommande värdet säger något annat än det man skrivit.
    // "1," tolkas till 1, så en halvskriven decimal räknas som i takt och
    // skrivs inte om mitt i inmatningen.
    if (tolkTal(textRef.current) !== varde) setText(skrivTal(varde));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varde]);

  return (
    <input
      className={className}
      inputMode="decimal"
      placeholder={platshallare}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onVarde(tolkTal(e.target.value));
      }}
      onBlur={() => {
        // Vid tappat fokus är inmatningen färdig, och skräp som "1,,"
        // eller "abc" skall inte ligga kvar och se ut som ett värde.
        setText(skrivTal(varde));
      }}
      aria-label={etikett}
    />
  );
}
