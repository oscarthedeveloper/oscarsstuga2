/**
 * Datamodellen. Allt som skrivs till lagret är serialiserbart JSON —
 * inga Date-objekt lagras, eftersom de förlorar tidszonen vid en rundtur
 * genom JSON.stringify. Tidpunkter skrivs som lokal väggklocka
 * ("2026-08-10T09:00") och tolkas alltid i besökarens egen zon.
 */

export type Vy = "dag" | "tredag" | "vecka" | "manad" | "ar";

export const VYER: { id: Vy; namn: string; kort: string; tangent: string }[] = [
  { id: "dag", namn: "Dag", kort: "D", tangent: "1" },
  { id: "tredag", namn: "Tre dagar", kort: "3D", tangent: "2" },
  { id: "vecka", namn: "Vecka", kort: "V", tangent: "3" },
  { id: "manad", namn: "Månad", kort: "M", tangent: "4" },
  { id: "ar", namn: "År", kort: "Å", tangent: "5" },
];

/** Hur ofta en serie återkommer. */
export type Frekvens =
  | "ingen"
  | "daglig"
  | "vardag"
  | "veckovis"
  | "manadsvis"
  | "arlig";

/** Månadsupprepning kan räknas från månadens början eller dess veckodagar. */
export type ManadsLage = "dag-i-manad" | "veckodag-i-manad";

export type Slut =
  | { typ: "aldrig" }
  | { typ: "datum"; datum: string } // YYYY-MM-DD, inklusive
  | { typ: "antal"; antal: number };

export interface Upprepning {
  frekvens: Frekvens;
  /** Var n:te dag/vecka/månad/år. Alltid ≥ 1. */
  intervall: number;
  /** 0 = söndag … 6 = lördag. Används av "veckovis". */
  veckodagar: number[];
  /** Hur "månadsvis" räknas ut. */
  manadslage: ManadsLage;
  slut: Slut;
}

/**
 * Fälten som synkmotorn behöver på varje post.
 *
 * `andrad` är postens logiska ändringstid och den enda nyckel som avgör
 * vem som vinner när två enheter skrivit samtidigt: senaste ändringen tar
 * hela posten. Den sätts av den enhet som gjorde ändringen, inte av
 * servern, eftersom ändringen kan ha skett offline för flera dygn sedan.
 *
 * `raderad` är en gravsten. En borttagen post försvinner inte ur lagret
 * utan markeras — annars skulle den återuppstå vid nästa synk från en
 * enhet som ännu inte hört talas om borttagningen.
 *
 * `synkad` är lokal och skickas aldrig upp. Falskt betyder "har ändringar
 * som molnet inte sett".
 */
export interface Synkbar {
  /** ISO-tidsstämpel i UTC. */
  andrad: string;
  /** ISO-tidsstämpel i UTC, eller null om posten lever. */
  raderad: string | null;
  synkad: boolean;
}

export interface Kalender extends Synkbar {
  id: string;
  namn: string;
  /** 0–5, pekar in i --kal-1…--kal-6. */
  ton: number;
  synlig: boolean;
}

/**
 * En händelse i lagret. Om `upprepning` är satt beskriver `start`/`slut`
 * seriens FÖRSTA förekomst; övriga räknas fram av upprepningsmotorn.
 */
export interface Handelse extends Synkbar {
  id: string;
  titel: string;
  anteckning: string;
  plats: string;
  /** Lokal väggklocka, "YYYY-MM-DDTHH:mm". */
  start: string;
  /** Exklusivt slut. Heldagshändelser slutar 00:00 dagen efter sista dagen. */
  slut: string;
  heldag: boolean;
  kalenderId: string;
  upprepning: Upprepning | null;
  /**
   * Datumnycklar (YYYY-MM-DD) för förekomster som strukits ur serien.
   * Nyckeln är förekomstens URSPRUNGLIGA startdatum, inte det flyttade.
   */
  undantag: string[];
  /**
   * Förekomster som brutits ur mönstret. Nyckeln är ursprungsdatumet;
   * värdet är den nya väggklockan för just den förekomsten.
   */
  avvikelser: Record<string, { start: string; slut: string }>;
  skapad: string;
}

/**
 * En uträknad förekomst. Detta är vad vyerna ritar — aldrig Handelse
 * direkt, eftersom en serie ger många förekomster ur samma post.
 */
export interface Forekomst {
  /** Stabil nyckel: `${handelseId}#${ursprung}`. */
  nyckel: string;
  handelseId: string;
  handelse: Handelse;
  start: Date;
  slut: Date;
  /** Ursprungsdatumets nyckel, YYYY-MM-DD. Identifierar förekomsten i serien. */
  ursprung: string;
  /** Sant om händelsen har en upprepningsregel. */
  serie: boolean;
  heldag: boolean;
  ton: number;
}

/**
 * En uppgift på att göra-listan.
 *
 * Uppgifter och händelser är medvetet SKILDA saker. En händelse äger en
 * plats i tiden — den börjar och slutar. En uppgift äger bara en avsikt;
 * den kan ha ett datum då den senast bör vara gjord, men den upptar
 * ingen tid i rutnätet. Att pressa in dem i samma tabell hade betytt
 * halva fält tomma i varje rad och en modell som ljuger om vad den är.
 *
 * Kalendern delas däremot: en uppgift kategoriseras med samma Arbete,
 * Privat, Studier som händelserna, och ärver därmed färg och filter.
 */
export interface Uppgift extends Synkbar {
  id: string;
  titel: string;
  anteckning: string;
  /** 1 = starkast. Se PRIORITETER. */
  prioritet: Prioritet;
  kalenderId: string;
  klar: boolean;
  /** När den bockades av, för sortering och för att kunna ångra. */
  klarVid: string | null;
  /** Sista dag, som lokal datumnyckel YYYY-MM-DD. Frivillig. */
  forfaller: string | null;
  skapad: string;
}

export type Prioritet = 1 | 2 | 3;

export const PRIORITETER: {
  varde: Prioritet;
  namn: string;
  kort: string;
}[] = [
  { varde: 1, namn: "Styrka 1 — först", kort: "1" },
  { varde: 2, namn: "Styrka 2 — sedan", kort: "2" },
  { varde: 3, namn: "Styrka 3 — när det finns tid", kort: "3" },
];

/** Hur långt en ändring av en serie skall slå. */
export type Rackvidd = "denna" | "framat" | "alla";

export interface Layout {
  /** 0–1, andel av kolumnbredden. */
  vanster: number;
  bredd: number;
  /** Överlappande block läggs i lager så kanterna syns. */
  lager: number;
}

export const TON_NAMN = [
  "Guld",
  "Ärg",
  "Terrakotta",
  "Blyerts",
  "Mossa",
  "Ametist",
];

export const TON_VAR = [
  "var(--kal-1-stark)",
  "var(--kal-2-stark)",
  "var(--kal-3-stark)",
  "var(--kal-4-stark)",
  "var(--kal-5-stark)",
  "var(--kal-6-stark)",
];
