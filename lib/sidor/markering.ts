/**
 * Lätt textmarkering: **fet**, *kursiv* och `kod`.
 *
 * Avsiktligt en delmängd av Markdown och ingenting mer. Skälet är att
 * varje tecken som får en betydelse är ett tecken man inte längre kan
 * skriva utan att tänka — och den som skriver om språk skriver ofta om
 * just tecken. Tre former räcker för att markera ett uttryck, en
 * grundform och en ändelse, vilket är vad anteckningarna behöver.
 *
 * Funktionen lämnar tillbaka BITAR och inte märkspråk. Texten är
 * användarens egen: bygger man en HTML-sträng måste den saneras, och den
 * dagen saneringen har ett hål är det ett hål i något som visas för den
 * som skrev det. Bitar renderas av React och kan inte bli märkspråk av
 * misstag.
 */

export type Markslag = "text" | "fet" | "kursiv" | "kod";

export interface Markbit {
  slag: Markslag;
  text: string;
}

/*
 * Ordningen i alternationen är betydelsefull: ** måste prövas före *,
 * annars läses **fet** som en kursiv stjärna följd av en till.
 *
 * Innehållet får inte innehålla sitt eget avgränsningstecken, vilket
 * gör att en ensam stjärna mitt i en mening aldrig råkar öppna en
 * markering som sedan sträcker sig genom halva stycket.
 */
const MONSTER = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;

export function delaMarkering(text: string): Markbit[] {
  if (!text) return [];
  const ut: Markbit[] = [];
  let sist = 0;

  for (const m of text.matchAll(MONSTER)) {
    const i = m.index ?? 0;
    if (i > sist) ut.push({ slag: "text", text: text.slice(sist, i) });
    if (m[1] !== undefined) ut.push({ slag: "fet", text: m[1] });
    else if (m[2] !== undefined) ut.push({ slag: "kursiv", text: m[2] });
    else ut.push({ slag: "kod", text: m[3] });
    sist = i + m[0].length;
  }

  if (sist < text.length) ut.push({ slag: "text", text: text.slice(sist) });
  return ut;
}

/** Texten utan markeringstecken. För utdrag och sökning. */
export function renText(text: string): string {
  return delaMarkering(text)
    .map((b) => b.text)
    .join("");
}
