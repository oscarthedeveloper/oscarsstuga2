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

/* ==================================================================
   TANGENTKOMMANDON
   ================================================================== */

export interface Markresultat {
  text: string;
  /** Var markeringen skall ligga efteråt. */
  start: number;
  slut: number;
}

/**
 * Slår på eller av en markering runt ett texturval.
 *
 * VÄXLAR, inte bara omsluter. Trycker man ⌘B en gång till på något som
 * redan är fett skall det bli magert igen — annars staplas tecknen till
 * `****ord****`, vilket varken syns som fetstil eller går att ångra utan
 * att räkna stjärnor.
 *
 * DET SVÅRA ÄR ATT STJÄRNORNA LÖPER IHOP. I Markdown betyder en löpa av
 * stjärnor olika saker beroende på hur lång den är:
 *
 *     *ord*      kursiv          löpa 1
 *     **ord**    fet             löpa 2
 *     ***ord***  fet OCH kursiv  löpa 3
 *
 * Att bara titta på om tecknet står bredvid urvalet räcker därför inte.
 * `**ord**` med ⌘I skulle då se ett `*` på varje sida, tro att kursiven
 * redan var påslagen, och ta bort ett tecken — så att fetstilen blev
 * kursiv i stället för att bli fet och kursiv.
 *
 * Reglerna som faktiskt gäller:
 *
 *   kursiv finns om löpan är UDDA  (1 eller 3)
 *   fet    finns om löpan är MINST TVÅ
 *
 * Utan markerat urval sätts ett tomt par ut med markören emellan, så att
 * man kan trycka ⌘B och sedan skriva.
 */
export function vaxlaMarkering(
  text: string,
  start: number,
  slut: number,
  tecken: string
): Markresultat {
  const c = tecken[0];
  const n = tecken.length;

  /*
   * Skala först bort markörtecken ur urvalets kanter. Markerar man
   * `**ord**` med musen ingår stjärnorna; dubbelklickar man på ordet
   * gör de inte det. Båda skall betyda samma sak.
   */
  let a = start;
  let b = slut;
  while (a < b && text[a] === c) a += 1;
  while (b > a && text[b - 1] === c) b -= 1;
  const karna = text.slice(a, b);

  // Löpan av markörtecken utanför kärnan, på var sida.
  let fore = 0;
  while (a - fore - 1 >= 0 && text[a - fore - 1] === c) fore += 1;
  let efter = 0;
  while (b + efter < text.length && text[b + efter] === c) efter += 1;
  const lopa = Math.min(fore, efter);

  const finns = c === "*" ? (n === 1 ? lopa % 2 === 1 : lopa >= 2) : lopa >= n;

  if (finns) {
    return {
      text: text.slice(0, a - n) + karna + text.slice(b + n),
      start: a - n,
      slut: b - n,
    };
  }

  return {
    text: text.slice(0, a) + tecken + karna + tecken + text.slice(b),
    start: a + n,
    slut: b + n,
  };
}

/** Vilket tecken en tangent svarar mot. Null = inte vårt kommando. */
export function teckenForTangent(tangent: string): string | null {
  switch (tangent.toLowerCase()) {
    case "b":
      return "**";
    case "i":
      return "*";
    // ⌘E för kod är samma val som GitHub gör, och ⌘K är upptaget av
    // paletten i hela appen.
    case "e":
      return "`";
    default:
      return null;
  }
}
