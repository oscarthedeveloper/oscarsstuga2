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

/**
 * En anteckning.
 *
 * Det tredje benet. Händelsen äger en plats i tiden, uppgiften en
 * avsikt — anteckningen äger det man vet. Att pressa in den i någon av
 * de andra hade betytt en uppgift som aldrig kan bockas av, eller en
 * händelse utan varaktighet.
 *
 * `datum` är frivilligt och gör skillnaden mellan de två sorters
 * anteckningar man faktiskt skriver: dagboken, som hör till en bestämd
 * dag och dyker upp i kalendern bredvid den dagens möten, och den
 * fristående, som hör till ett ämne och inte till ett datum alls.
 * Samma post, samma tabell — skillnaden är att fältet är satt.
 *
 * Kalendern delas med händelser och uppgifter, så att en anteckning
 * märkt Arbete ärver samma färg och samma filter som mötet den handlar om.
 */
export interface Anteckning extends Synkbar {
  id: string;
  titel: string;
  /** Fri text. Får innehålla [[haklänkar]] till andra poster. */
  brodtext: string;
  kalenderId: string;
  /** Datumnyckel YYYY-MM-DD om anteckningen hör till en dag, annars null. */
  datum: string | null;
  /** Nålade ligger överst i listan, oavsett ålder. */
  nalad: boolean;
  skapad: string;
}

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

/**
 * En sida under Annat.
 *
 * Avdelningen finns för det som inte går att pressa in i EN kategori: en
 * väg till läkarprogrammet är varken en händelse, en uppgift eller en
 * anteckning, utan lite av varje sett ur ett bestämt perspektiv.
 *
 * Varje sida ritas av en EGEN komponent med egen utformning, eftersom
 * innehållet är olika i grunden — ett block­system hade gjort alla sidor
 * lika, vilket är precis motsatsen till poängen. Registret i
 * `components/sidor/register.tsx` kopplar id till komponent.
 *
 * `id` ÄR registernyckeln, inte ett slumpat id. Det ger en trevlig
 * egenskap gratis: två enheter som öppnar sidan var för sig skapar
 * samma post, och sammanfogningen blir en vanlig senaste-vinner i
 * stället för två dubbletter man får städa för hand.
 *
 * `data` ägs av sidans komponent, inte av lagret. Lagret vet bara att
 * det är JSON, och sidan tolkar den själv — se `tolkaHpData` för hur en
 * sida läser gammal eller trasig data utan att krascha.
 */
export interface Sida extends Synkbar {
  id: string;
  data: SidData;
  skapad: string;
}

/** Sidans eget innehåll. Måste vara serialiserbart, i övrigt fritt. */
export type SidData = Record<string, unknown>;

export interface Layout {
  /** 0–1, andel av kolumnbredden. */
  vanster: number;
  bredd: number;
  /**
   * Staplingsordning. HÖGRE ligger överst, och den som börjar först får
   * det högsta värdet — mötet som inleder timmen är det man läser, och
   * det som ansluter senare lägger sig under.
   */
  lager: number;
  /**
   * Sant när blocket täcker något annat. Bara då görs ytan genomskinlig:
   * ett block utan något under sig skulle annars släppa igenom rutnätets
   * linjer, vilket ser ut som ett fel snarare än som ett djup.
   */
  over: boolean;
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
