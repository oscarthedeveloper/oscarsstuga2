"use client";

/**
 * Fältet där man skriver HÖST25.
 *
 * Samma mekanik som Talfalt och av samma skäl: texten ägs av fältet
 * medan man skriver. Skrev fältet om sig själv vid varje tecken skulle
 * "h" genast bli ogiltigt och suddas, och man kom aldrig till "höst25".
 *
 * Vid tappat fokus skrivs texten om till kanonisk form, så att listan
 * ser likadan ut oavsett om man skrev "ht25", "H 2025" eller "HÖST25".
 */

import { useEffect, useRef, useState } from "react";
import {
  terminText,
  tolkaTermin,
  type Termin,
} from "@/lib/sidor/hogskoleprov";

export default function Terminfalt({
  termin,
  onTermin,
}: {
  termin: Termin | null;
  onTermin(t: Termin | null): void;
}) {
  const [text, setText] = useState(() => terminText(termin));
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    const egen = tolkaTermin(textRef.current);
    const lika =
      egen === termin ||
      (!!egen && !!termin && egen.sasong === termin.sasong && egen.ar === termin.ar);
    if (!lika) setText(terminText(termin));
  }, [termin]);

  const giltig = text.trim() === "" || tolkaTermin(text) !== null;

  return (
    <input
      className="falt !w-[6.5rem]"
      placeholder="HÖST25"
      value={text}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      // Ett ogiltigt värde ropas inte ut med rött. Man är mitt i att
      // skriva det nästan hela tiden, och en varning som lyser under
      // halva inmatningen slutar man se.
      style={giltig ? undefined : { opacity: 0.55 }}
      onChange={(e) => {
        setText(e.target.value);
        onTermin(tolkaTermin(e.target.value));
      }}
      onBlur={() => setText(terminText(termin))}
      aria-label="Provtillfälle, till exempel HÖST25"
    />
  );
}
