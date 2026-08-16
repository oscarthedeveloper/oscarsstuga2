/**
 * Högskoleprovet och vägen till läkarprogrammet.
 *
 * All uträkning ligger här, utan React, av samma skäl som
 * upprepningsmotorn gör det: det går att provköra, och sidan blir en
 * ritning av ett svar i stället för ett ställe där svaret räknas ut.
 *
 * TOLKNINGEN ÄR DEFENSIV. Innehållet kommer ur en JSONB-kolumn som
 * databasen inte kontrollerar, kan ha skrivits av ett äldre bygge, och
 * kan ha synkats ned halvvägs. `tolkaHpData` tar därför emot `unknown`
 * och lämnar alltid tillbaka något ritbart. En sida som kastar för att
 * ett fält bytt namn är en sida man har tappat.
 */

import { nyckel, startAvDag, tolka } from "../tid";

/* ==================================================================
   PROVETS FORM
   ================================================================== */

export type Provdel =
  | "XYZ"
  | "KVA"
  | "NOG"
  | "DTK"
  | "ORD"
  | "LÄS"
  | "MEK"
  | "ELF";

export type Provdelsgrupp = "kvantitativ" | "verbal";

/**
 * Delproven, med antalet uppgifter i hela provet.
 *
 * Provet har fem provpass om fyrtio uppgifter, varav ETT är ett
 * utprövningspass som inte räknas. Kvar blir två kvantitativa och två
 * verbala pass — därför är maxpoängen dubbelt så många som antalet
 * uppgifter i ett enskilt pass, och summan 160.
 */
export const PROVDELAR: {
  id: Provdel;
  namn: string;
  grupp: Provdelsgrupp;
  max: number;
}[] = [
  { id: "XYZ", namn: "Matematisk problemlösning", grupp: "kvantitativ", max: 24 },
  { id: "KVA", namn: "Kvantitativa jämförelser", grupp: "kvantitativ", max: 20 },
  { id: "NOG", namn: "Kvantitativa resonemang", grupp: "kvantitativ", max: 12 },
  { id: "DTK", namn: "Diagram, tabeller och kartor", grupp: "kvantitativ", max: 24 },
  { id: "ORD", namn: "Ordförståelse", grupp: "verbal", max: 20 },
  { id: "LÄS", namn: "Svensk läsförståelse", grupp: "verbal", max: 20 },
  { id: "MEK", namn: "Meningskomplettering", grupp: "verbal", max: 20 },
  { id: "ELF", namn: "Engelsk läsförståelse", grupp: "verbal", max: 20 },
];

/** Högsta normerade poäng provet kan ge. */
export const HOGSTA_NORMERAT = 2.0;

/* ==================================================================
   DATAMODELLEN
   ================================================================== */

/**
 * Provtillfället identifieras av TERMIN, inte av datum.
 *
 * Högskoleprovet ges två gånger om året, och ingen minns vilken lördag i
 * oktober man skrev. "HÖST25" är hur man tänker på det, hur man talar om
 * det, och dessutom allt uträkningen behöver: två prov samma termin
 * finns inte.
 *
 * Att kräva ett fullt datum var att kräva en uppgift man måste slå upp
 * för att kunna fylla i ett fält — och ett formulär man måste researcha
 * fylls inte i.
 */
export type Sasong = "var" | "host";

export interface Termin {
  sasong: Sasong;
  /** Fyrsiffrigt år. */
  ar: number;
}

export interface HpResultat {
  id: string;
  /** Provtillfället. Null tills det fyllts i. */
  termin: Termin | null;
  /** Normerad poäng 0,00–2,00. Null tills beskedet kommit. */
  normerat: number | null;
  /** Råpoäng per delprov. Frivilligt och ofta ofullständigt. */
  delar: Partial<Record<Provdel, number>>;
  anteckning: string;
}

export interface ViktigtDatum {
  id: string;
  datum: string;
  vad: string;
}

/** Ett lärosäte att mäta sig mot. */
export interface Larosate {
  id: string;
  namn: string;
  /** Vilken antagningsomgång siffran gäller, t.ex. "HT2026". */
  termin: string;
  /** Antagningspoäng i högskoleprovsgruppen. Null = ej ifylld. */
  poang: number | null;
}

export interface HpData {
  /** Eget mål i normerad poäng. */
  mal: number | null;
  resultat: HpResultat[];
  datum: ViktigtDatum[];
  larosaten: Larosate[];
}

export const TOM_HP: HpData = {
  mal: null,
  resultat: [],
  datum: [],
  larosaten: [],
};

/* ==================================================================
   TOLKNING
   ================================================================== */

const arObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const text = (x: unknown): string => (typeof x === "string" ? x : "");

/**
 * Tal inom [lag, hog], annars null. Sträng duger — fälten är textfält.
 *
 * Tomt och saknat måste bli NULL och inte noll, och det är inte en
 * detalj. `Number("")` är 0 i JavaScript, så ett delprov man inte fyllt
 * i blev noll rätt — vilket gjorde det till den svagaste delen varje
 * gång och pekade ut fel sak att öva på. Samma sak gjorde ett tomt
 * målfält till målet 0,00, som alltid är uppnått.
 */
export function tal(x: unknown, lag: number, hog: number): number | null {
  if (typeof x === "number") {
    return Number.isFinite(x) && x >= lag && x <= hog ? x : null;
  }
  // Bara text tolkas vidare. Listor och objekt blir 0 respektive NaN
  // genom Number(), och 0:an är den farliga av de två.
  if (typeof x !== "string") return null;
  const rensad = x.trim().replace(",", ".");
  if (rensad === "") return null;
  const n = Number(rensad);
  if (!Number.isFinite(n)) return null;
  if (n < lag || n > hog) return null;
  return n;
}

/* ==================================================================
   TERMIN
   ================================================================== */

/**
 * Tolkar en termin ur fri text.
 *
 * Alla former man rimligen skriver går fram: HÖST25, host 2025, H25,
 * HT25, VÅR26, var26, V26, VT2026. Prickarna över bokstäverna får
 * saknas — man skriver in det här på en telefon, och att bli avvisad för
 * ett å är inte ett fel man vill bli rättad för.
 *
 * Tvåsiffrigt år tolkas som 2000-talet. Provet gavs första gången 1977,
 * men en app som skall gissa om "77" betyder 1977 eller 2077 gissar fel
 * för någon oavsett vad den väljer — fyra siffror finns för det fallet.
 */
export function tolkaTermin(rå: string): Termin | null {
  const m = rå
    .trim()
    .toLowerCase()
    .match(/^(v(?:år|ar|t)?|h(?:öst|ost|t)?)\s*-?\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const sasong: Sasong = m[1].startsWith("v") ? "var" : "host";
  const rått = Number(m[2]);
  const ar = m[2].length === 2 ? 2000 + rått : rått;
  if (ar < 1900 || ar > 2200) return null;
  return { sasong, ar };
}

export function terminText(t: Termin | null): string {
  if (!t) return "";
  return `${t.sasong === "host" ? "HÖST" : "VÅR"}${String(t.ar).slice(2)}`;
}

/** Sorterbart tal. Våren kommer före hösten samma år. */
export function terminOrdning(t: Termin | null): number {
  if (!t) return Number.POSITIVE_INFINITY;
  return t.ar * 2 + (t.sasong === "host" ? 1 : 0);
}

function tolkaTerminVarde(rå: unknown): Termin | null {
  if (typeof rå === "string") return tolkaTermin(rå);
  if (!arObjekt(rå)) return null;
  const sasong = text(rå.sasong);
  const ar = tal(rå.ar, 1900, 2200);
  if ((sasong !== "var" && sasong !== "host") || ar === null) return null;
  return { sasong, ar: Math.round(ar) };
}

/**
 * Migrering från den tid då ett resultat bar ett fullt datum.
 *
 * Månaden avgör: provet ges i mars eller april och i oktober eller
 * november, så allt före juli är en vårtermin.
 */
function terminUrDatum(rå: unknown): Termin | null {
  const d = datumtext(rå);
  if (!d) return null;
  const ar = Number(d.slice(0, 4));
  const manad = Number(d.slice(5, 7));
  return { sasong: manad <= 6 ? "var" : "host", ar };
}

/** Datumnyckel om den ser ut som en, annars tom sträng. */
const datumtext = (x: unknown): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(text(x)) ? text(x) : "";

function lista<T>(x: unknown, tolk: (rad: Record<string, unknown>, i: number) => T): T[] {
  if (!Array.isArray(x)) return [];
  return x.filter(arObjekt).map((rad, i) => tolk(rad, i));
}

/** Id:t måste finnas för att React-listan skall vara stabil. */
const idFor = (rad: Record<string, unknown>, prefix: string, i: number): string =>
  text(rad.id) || `${prefix}${i}`;

export function tolkaHpData(rå: unknown): HpData {
  if (!arObjekt(rå)) return TOM_HP;

  return {
    mal: tal(rå.mal, 0, HOGSTA_NORMERAT),
    resultat: lista(rå.resultat, (rad, i) => ({
      id: idFor(rad, "r", i),
      // Gamla poster bar ett datum. Det läses fortfarande, en gång, och
      // skrivs tillbaka som termin nästa gång sidan sparas.
      termin: tolkaTerminVarde(rad.termin) ?? terminUrDatum(rad.datum),
      normerat: tal(rad.normerat, 0, HOGSTA_NORMERAT),
      delar: tolkaDelar(rad.delar),
      anteckning: text(rad.anteckning),
    })),
    datum: lista(rå.datum, (rad, i) => ({
      id: idFor(rad, "d", i),
      datum: datumtext(rad.datum),
      vad: text(rad.vad),
    })),
    larosaten: lista(rå.larosaten, (rad, i) => ({
      id: idFor(rad, "l", i),
      namn: text(rad.namn),
      termin: text(rad.termin),
      poang: tal(rad.poang, 0, HOGSTA_NORMERAT),
    })),
  };
}

function tolkaDelar(rå: unknown): Partial<Record<Provdel, number>> {
  if (!arObjekt(rå)) return {};
  const ut: Partial<Record<Provdel, number>> = {};
  for (const d of PROVDELAR) {
    const n = tal(rå[d.id], 0, d.max);
    if (n !== null) ut[d.id] = n;
  }
  return ut;
}

/* ==================================================================
   UTRÄKNINGAR
   ================================================================== */

/** Resultaten i terminsordning. Ofullständiga rader ligger kvar sist. */
export function sorteradeResultat(data: HpData): HpResultat[] {
  return [...data.resultat].sort(
    (a, b) =>
      terminOrdning(a.termin) - terminOrdning(b.termin) ||
      a.id.localeCompare(b.id)
  );
}

/**
 * Det senaste resultatet som faktiskt har en poäng.
 *
 * Ett inskrivet provtillfälle utan normering är ett kommande prov, inte
 * ett sämre resultat, och får aldrig se ut som ett tapp i kurvan.
 */
export function senasteResultat(data: HpData): HpResultat | null {
  const med = sorteradeResultat(data).filter((r) => r.normerat !== null);
  return med.length > 0 ? med[med.length - 1] : null;
}

/** Bästa noterade poängen — det är den som gäller vid antagning. */
export function bastaResultat(data: HpData): HpResultat | null {
  let bast: HpResultat | null = null;
  for (const r of data.resultat) {
    if (r.normerat === null) continue;
    if (!bast || r.normerat > bast.normerat!) bast = r;
  }
  return bast;
}

export interface Avstand {
  id: string;
  etikett: string;
  /** Vad som krävs. Null när siffran inte är ifylld. */
  krav: number | null;
  /** Ditt bästa minus kravet. Null när något saknas. */
  skillnad: number | null;
  racker: boolean;
}

/**
 * Avståndet mellan din bästa poäng och det som krävs.
 *
 * Sidans huvudsvar. Jämförelsen sker mot BÄSTA och inte mot senaste,
 * eftersom det är den bästa poängen som räknas vid antagningen —
 * ett sämre omprov tar inte bort ett bra.
 */
export function avstand(data: HpData): Avstand[] {
  const bast = bastaResultat(data)?.normerat ?? null;
  const rad = (id: string, etikett: string, krav: number | null): Avstand => ({
    id,
    etikett,
    krav,
    skillnad: bast !== null && krav !== null ? avrunda(bast - krav) : null,
    racker: bast !== null && krav !== null && bast >= krav,
  });

  const ut = data.larosaten.map((l) =>
    rad(l.id, [l.namn, l.termin].filter(Boolean).join(" · ") || "Namnlöst", l.poang)
  );
  if (data.mal !== null) ut.push(rad("mal", "Eget mål", data.mal));
  return ut;
}

/** Två decimaler. Normerad poäng anges så, och flyttal skräpar annars. */
export function avrunda(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Poäng som text, med svenskt decimalkomma.
 *
 * `toFixed` ger alltid punkt. Att låta den slinka ut i gränssnittet gör
 * appen tvåspråkig i siffror: man skriver in 1,45 och får tillbaka 1.45
 * på raden under. Det ser ut som att inmatningen inte togs emot.
 */
export function poangtext(n: number | null, streck = "—"): string {
  return n === null ? streck : n.toFixed(2).replace(".", ",");
}

/** Skillnad med utskrivet tecken: "+0,10" eller "−0,15". */
export function skillnadstext(n: number | null): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2).replace(".", ",")}`;
}

export interface Delresultat {
  del: Provdel;
  namn: string;
  grupp: Provdelsgrupp;
  poang: number | null;
  max: number;
  /** 0–1. Null när delen inte är ifylld. */
  andel: number | null;
}

export function delresultat(r: HpResultat | null): Delresultat[] {
  return PROVDELAR.map((d) => {
    const poang = r?.delar[d.id] ?? null;
    return {
      del: d.id,
      namn: d.namn,
      grupp: d.grupp,
      poang,
      max: d.max,
      andel: poang === null ? null : poang / d.max,
    };
  });
}

/**
 * Den svagaste ifyllda delen, mätt i ANDEL av maxpoängen och inte i
 * råpoäng. NOG har tolv uppgifter och DTK tjugofyra; sex rätt betyder
 * helt olika saker i de två, och en jämförelse i råpoäng hade pekat ut
 * fel del att öva på varje gång.
 */
export function svagasteDelen(r: HpResultat | null): Delresultat | null {
  const ifyllda = delresultat(r).filter((d) => d.andel !== null);
  if (ifyllda.length === 0) return null;
  return ifyllda.reduce((a, b) => (b.andel! < a.andel! ? b : a));
}

/** Summan av råpoängen i en grupp, och gruppens maxpoäng. */
export function gruppsumma(
  r: HpResultat | null,
  grupp: Provdelsgrupp
): { poang: number; max: number; ifyllda: number } {
  const delar = delresultat(r).filter((d) => d.grupp === grupp);
  return {
    poang: delar.reduce((s, d) => s + (d.poang ?? 0), 0),
    max: delar.reduce((s, d) => s + d.max, 0),
    ifyllda: delar.filter((d) => d.poang !== null).length,
  };
}

/* ==================================================================
   DATUM
   ================================================================== */

/** Dygn kvar till datumet. Negativt betyder att det passerat. */
export function dygnKvar(datumnyckel: string, idag = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datumnyckel)) return null;
  const mal = startAvDag(tolka(datumnyckel));
  const nu = startAvDag(idag);
  return Math.round((mal.getTime() - nu.getTime()) / 86400000);
}

export function nedrakningstext(dygn: number | null): string {
  if (dygn === null) return "";
  if (dygn === 0) return "Idag";
  if (dygn === 1) return "Imorgon";
  if (dygn === -1) return "Igår";
  if (dygn > 0) return `Om ${dygn} dygn`;
  return `För ${Math.abs(dygn)} dygn sedan`;
}

/** Kommande datum först, passerade sist och i omvänd ordning. */
export function sorteradeDatum(
  data: HpData,
  idag = new Date()
): ViktigtDatum[] {
  const idagsnyckel = nyckel(startAvDag(idag));
  const kommande = data.datum
    .filter((d) => d.datum && d.datum >= idagsnyckel)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const passerade = data.datum
    .filter((d) => d.datum && d.datum < idagsnyckel)
    .sort((a, b) => b.datum.localeCompare(a.datum));
  const utan = data.datum.filter((d) => !d.datum);
  return [...kommande, ...passerade, ...utan];
}
