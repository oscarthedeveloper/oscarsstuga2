"use client";

/**
 * Ett fält för en kommaskild lista som går att skriva mellanslag i.
 *
 * DETTA ÄR SAMMA SJUKA SOM KOMMATECKNET I `Talfalt`, och den är värd att
 * skriva ut en gång till eftersom den ser olika ut men är en och samma.
 * Ett vanligt kontrollerat fält som tolkar värdet vid varje
 * tangenttryckning gör det omöjligt att skriva "nötkött, pasta": efter
 * kommat är texten "nötkött, " som tolkas till listan ["nötkött"], som
 * ritas tillbaka som "nötkött" — och både kommat och mellanslaget är
 * borta innan man hunnit skriva bokstaven efter. Samma sak drabbar varje
 * mellanslag i slutet av ett ord.
 *
 * Lösningen är densamma: fältet äger sin RÅA TEXT medan man skriver, och
 * skickar bara ut den tolkade listan. Texten skrivs om utifrån först när
 * det inkommande värdet inte längre stämmer med det man har skrivit —
 * alltså när någon annan ändrat, inte när man själv håller på.
 */

import { useEffect, useRef, useState } from "react";
import { skrivLista, tolkaLista } from "@/lib/sidor/viner";

const samma = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export default function Listfalt({
  varden,
  onVarden,
  etikett,
  platshallare,
  className = "falt",
}: {
  varden: string[];
  onVarden(rader: string[]): void;
  etikett: string;
  platshallare?: string;
  className?: string;
}) {
  const [text, setText] = useState(() => skrivLista(varden));
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    // Bara när det inkommande värdet säger något annat än det man skrivit.
    // "nötkött, " tolkas till ["nötkött"], så en halvskriven post räknas
    // som i takt och skrivs inte om mitt i inmatningen.
    if (!samma(tolkaLista(textRef.current), varden)) {
      setText(skrivLista(varden));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varden]);

  return (
    <input
      className={className}
      placeholder={platshallare}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onVarden(tolkaLista(e.target.value));
      }}
      onBlur={() => {
        // Vid tappat fokus är inmatningen färdig, och ett hängande komma
        // eller dubbla mellanslag skall inte ligga kvar och se ut som en
        // post man glömt skriva.
        setText(skrivLista(varden));
      }}
      aria-label={etikett}
    />
  );
}
