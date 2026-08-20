/**
 * Fornsvenska — egenstudier.
 *
 * Sidans tyngdpunkt är REGISTRET: vilka läromedel, utgåvor,
 * examensarbeten och avhandlingar som behöver skaffas fram. Att göra och
 * idéer ligger vid sidan av, avsiktligt små, och rör bara hemsidan.
 *
 * Att göra-listan här är EGEN och inte kopplad till appens uppgifter.
 * Det är ett val med en känd kostnad — de här sysslorna får inga datum,
 * ingen fångst med ⌘K och syns inte i söket — och en känd vinst:
 * projektstoket förorenar inte den dagliga listan.
 */

/* ==================================================================
   LÄGEN
   ================================================================== */

export type Lage = "behovs" | "har" | "last";

/**
 * Ordningen är ett flöde, inte en uppräkning. Den bär två saker:
 * lägesmätarens fyllnad, och vad "nästa läge" betyder när man trycker.
 */
export const LAGEN: { id: Lage; namn: string; kort: string }[] = [
  { id: "behovs", namn: "Behövs", kort: "BEH" },
  { id: "har", namn: "Har", kort: "HAR" },
  { id: "last", namn: "Läst", kort: "LÄST" },
];

export const lagesIndex = (l: Lage): number =>
  Math.max(0, LAGEN.findIndex((x) => x.id === l));

/** Nästa läge i flödet. Från sista går det runt till första. */
export function nastaLage(l: Lage): Lage {
  return LAGEN[(lagesIndex(l) + 1) % LAGEN.length].id;
}

/* ==================================================================
   DATAMODELLEN
   ================================================================== */

export interface Verk {
  id: string;
  /**
   * Kort stabil nyckel, "FSV-014".
   *
   * Finns för att kunna hänvisa till en post utanför appen — i en
   * anteckning, i ett utkast, i ett meddelande till ett bibliotek. Ett
   * slumpat id duger inte till det, och titeln är för lång och ändrar
   * sig. Koden sätts en gång och rörs aldrig.
   */
  kod: string;
  titel: string;
  forfattare: string;
  /**
   * Vad det är för slags arbete. FRI TEXT med flit: akademiska
   * källtyper låter sig inte listas i en rullgardin — examensarbete,
   * licentiatavhandling, diplomarbete, utgåva, faksimil, särtryck — och
   * en lista som saknar just din typ tvingar fram fel val.
   */
  slag: string;
  /** Fri text: "1904", "ca 1350", "1925–28". */
  ar: string;
  lage: Lage;
  /** Var den står att finna: DiVA, Libris, Litteraturbanken, antikvariat. */
  plats: string;
  url: string;
  anteckning: string;
}

export interface Syssla {
  id: string;
  text: string;
  klar: boolean;
}

export interface Ide {
  id: string;
  text: string;
  /** Datumnyckel när den fångades. */
  skapad: string;
  /** En använd idé bockas av i stället för att raderas — man vill se
      vad man redan tänkt på, annars fångar man samma sak igen. */
  anvand: boolean;
}

export interface FornsvenskaData {
  verk: Verk[];
  sysslor: Syssla[];
  ideer: Ide[];
  /** Löpnumret nästa verk får. Räknas aldrig ned. */
  nastaKod: number;
}

export const TOM_FSV: FornsvenskaData = {
  verk: [],
  sysslor: [],
  ideer: [],
  nastaKod: 1,
};

/* ==================================================================
   KODEN
   ================================================================== */

export const KODPREFIX = "FSV";

export function formateraKod(nummer: number): string {
  return `${KODPREFIX}-${String(Math.max(1, Math.round(nummer))).padStart(3, "0")}`;
}

/**
 * Nästa lediga löpnummer.
 *
 * Räknaren i lagret är sanningen, men den kan ha hamnat efter: två
 * enheter som lägger till varsitt verk offline får samma nummer, och
 * den som synkar sist skulle annars skriva en dubblett. Därför tas
 * alltid det största av räknaren och det högsta använda numret.
 */
export function nastaLedigaKod(data: FornsvenskaData): number {
  let hogst = 0;
  for (const v of data.verk) {
    const m = v.kod.match(/(\d+)\s*$/);
    if (m) hogst = Math.max(hogst, Number(m[1]));
  }
  return Math.max(data.nastaKod, hogst + 1, 1);
}

/* ==================================================================
   TOLKNING
   ================================================================== */

const arObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const text = (x: unknown): string => (typeof x === "string" ? x : "");

function lista<T>(
  x: unknown,
  tolk: (rad: Record<string, unknown>, i: number) => T
): T[] {
  if (!Array.isArray(x)) return [];
  return x.filter(arObjekt).map(tolk);
}

const idFor = (rad: Record<string, unknown>, prefix: string, i: number): string =>
  text(rad.id) || `${prefix}${i}`;

function tolkaLage(x: unknown): Lage {
  const l = text(x);
  return LAGEN.some((y) => y.id === l) ? (l as Lage) : "behovs";
}

/**
 * Bara adresser vi vågar sätta i ett href.
 *
 * En godtycklig sträng här hamnar i en länk som användaren klickar på,
 * och `javascript:` i ett href är exakt det man inte vill ha i ett fält
 * som synkas mellan enheter. Http och https räcker för ett bibliotek.
 */
export function trygsamUrl(rå: unknown): string {
  const s = text(rå).trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : "";
}

export function tolkaFsvData(rå: unknown): FornsvenskaData {
  if (!arObjekt(rå)) return TOM_FSV;

  const verk = lista(rå.verk, (v, i) => ({
    id: idFor(v, "v", i),
    kod: text(v.kod) || formateraKod(i + 1),
    titel: text(v.titel),
    forfattare: text(v.forfattare),
    slag: text(v.slag),
    ar: text(v.ar),
    lage: tolkaLage(v.lage),
    plats: text(v.plats),
    url: trygsamUrl(v.url),
    anteckning: text(v.anteckning),
  }));

  const raknare = Number(rå.nastaKod);

  return {
    verk,
    sysslor: lista(rå.sysslor, (s, i) => ({
      id: idFor(s, "s", i),
      text: text(s.text),
      klar: s.klar === true,
    })),
    ideer: lista(rå.ideer, (d, i) => ({
      id: idFor(d, "i", i),
      text: text(d.text),
      skapad: /^\d{4}-\d{2}-\d{2}$/.test(text(d.skapad)) ? text(d.skapad) : "",
      anvand: d.anvand === true,
    })),
    nastaKod: Number.isFinite(raknare) && raknare > 0 ? Math.round(raknare) : 1,
  };
}

/* ==================================================================
   RÄKNEVERK
   ================================================================== */

export interface Rakning {
  behovs: number;
  har: number;
  last: number;
  totalt: number;
}

export function rakna(data: FornsvenskaData): Rakning {
  const ut: Rakning = { behovs: 0, har: 0, last: 0, totalt: data.verk.length };
  for (const v of data.verk) ut[v.lage] += 1;
  return ut;
}

/** Andelen av registret som är genomarbetat, 0–1. */
export function andelLast(r: Rakning): number {
  return r.totalt === 0 ? 0 : r.last / r.totalt;
}

/* ==================================================================
   FILTER
   ================================================================== */

/**
 * Filtrerar registret.
 *
 * Frågan söks i titel, författare, slag, plats och kod — men inte i
 * anteckningen. Anteckningarna är långa och innehåller ofta ord som
 * finns i halva registret, och en fritextsökning som träffar allt är
 * ingen sökning.
 */
export function filtreraVerk(
  data: FornsvenskaData,
  fraga: string,
  lage: Lage | null
): Verk[] {
  const termer = fraga.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return data.verk.filter((v) => {
    if (lage && v.lage !== lage) return false;
    if (termer.length === 0) return true;
    const halm = [v.titel, v.forfattare, v.slag, v.plats, v.kod, v.ar]
      .join(" ")
      .toLowerCase();
    return termer.every((t) => halm.includes(t));
  });
}

/**
 * Registrets ordning: det som behövs först, sedan i kodordning.
 *
 * Sidan finns för att svara på vad som återstår att skaffa, så det som
 * återstår ligger överst. Inom samma läge är kodordningen den enda som
 * inte flyttar sig när man rättar en titel.
 */
export function sorteraVerk(verk: Verk[]): Verk[] {
  return [...verk].sort(
    (a, b) =>
      lagesIndex(a.lage) - lagesIndex(b.lage) || a.kod.localeCompare(b.kod)
  );
}

/* ==================================================================
   KÄLLHÄNVISNING
   ================================================================== */

/**
 * En rad att kopiera in i ett arbete eller på hemsidan.
 *
 * Byggd ur de fält som faktiskt är ifyllda, och tomma delar utelämnas
 * helt i stället för att lämna kvar sina skiljetecken. En hänvisning med
 * ". ." i mitten ser slarvigare ut än ingen alls.
 */
export function kallhanvisning(v: Verk): string {
  const delar: string[] = [];

  const forfattare = v.forfattare.trim();
  const ar = v.ar.trim();
  if (forfattare && ar) delar.push(`${forfattare} (${ar})`);
  else if (forfattare) delar.push(forfattare);
  else if (ar) delar.push(`(${ar})`);

  if (v.titel.trim()) delar.push(v.titel.trim());
  if (v.slag.trim()) delar.push(v.slag.trim());
  if (v.plats.trim()) delar.push(v.plats.trim());

  const rad = delar.join(". ");
  const url = v.url.trim();
  if (!rad) return url;
  return url ? `${rad}. ${url}` : `${rad}.`;
}
