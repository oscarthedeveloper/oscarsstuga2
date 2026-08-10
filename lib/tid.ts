/**
 * Datumaritmetik i lokal tid.
 *
 * Hela appen räknar i väggklocka. Ett möte klockan 09:00 skall ligga på
 * 09:00 även den natt då klockan ställs om — därför byggs varje tidpunkt
 * med `new Date(år, månad, dag, timme, minut)` och aldrig genom att lägga
 * millisekunder till en tidsstämpel. Att addera 24 timmar över en
 * sommartidsövergång ger 23 eller 25 timmars dygn; att addera ett dygn
 * i kalendermening ger alltid nästa datum.
 */

export const VECKODAGAR = [
  "Söndag",
  "Måndag",
  "Tisdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lördag",
];

export const VECKODAGAR_KORT = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
export const VECKODAGAR_MINI = ["S", "M", "T", "O", "T", "F", "L"];

export const MANADER = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
];

export const MANADER_KORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

/** Veckan börjar på måndag. Index i grid: mån=0 … sön=6. */
export function veckoIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const tvasiffrigt = (n: number) => String(n).padStart(2, "0");

/** Lokal datumnyckel, YYYY-MM-DD. Aldrig toISOString — den är i UTC. */
export function nyckel(d: Date): string {
  return `${d.getFullYear()}-${tvasiffrigt(d.getMonth() + 1)}-${tvasiffrigt(
    d.getDate()
  )}`;
}

/** Lokal väggklocka, YYYY-MM-DDTHH:mm. */
export function stampel(d: Date): string {
  return `${nyckel(d)}T${tvasiffrigt(d.getHours())}:${tvasiffrigt(
    d.getMinutes()
  )}`;
}

/** Tolkar "YYYY-MM-DD" eller "YYYY-MM-DDTHH:mm" som lokal tid. */
export function tolka(s: string): Date {
  const [datumdel, tidsdel = "00:00"] = s.split("T");
  const [ar, man, dag] = datumdel.split("-").map(Number);
  const [tim, min] = tidsdel.split(":").map(Number);
  return new Date(ar, man - 1, dag, tim || 0, min || 0, 0, 0);
}

export function startAvDag(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Kalenderdygn, inte 86 400 000 ms. Klarar sommartid. */
export function addDagar(d: Date, antal: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + antal,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  );
}

/**
 * Adderar månader och klipper dagen mot målmånadens längd:
 * 31 januari + 1 månad blir 28 (eller 29) februari, inte 3 mars.
 */
export function addManader(d: Date, antal: number): Date {
  const ar = d.getFullYear();
  const man = d.getMonth() + antal;
  const maxDag = dagarIManad(
    ar + Math.floor(man / 12),
    ((man % 12) + 12) % 12
  );
  return new Date(
    ar,
    man,
    Math.min(d.getDate(), maxDag),
    d.getHours(),
    d.getMinutes()
  );
}

export function dagarIManad(ar: number, manad: number): number {
  return new Date(ar, manad + 1, 0).getDate();
}

export function arSammaDag(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function arHelg(d: Date): boolean {
  const v = d.getDay();
  return v === 0 || v === 6;
}

export function arVardag(d: Date): boolean {
  const v = d.getDay();
  return v >= 1 && v <= 5;
}

/** Måndagen i datumets vecka, kl 00:00. */
export function startAvVecka(d: Date): Date {
  return addDagar(startAvDag(d), -veckoIndex(d));
}

export function startAvManad(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startAvAr(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

/**
 * ISO 8601-veckonummer. Torsdagen i veckan avgör vilket år veckan hör
 * till, vilket är varför 1 januari ibland ligger i vecka 52 föregående år.
 */
export function isoVecka(d: Date): number {
  const t = startAvDag(d);
  // Flytta till veckans torsdag.
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const forstaTorsdag = new Date(t.getFullYear(), 0, 4);
  forstaTorsdag.setDate(
    forstaTorsdag.getDate() + 3 - ((forstaTorsdag.getDay() + 6) % 7)
  );
  const dygn = Math.round(
    (startAvDag(t).getTime() - startAvDag(forstaTorsdag).getTime()) / 86400000
  );
  return 1 + Math.round(dygn / 7);
}

/** Året som ISO-veckan tillhör (kan skilja sig från kalenderåret). */
export function isoVeckoAr(d: Date): number {
  const t = startAvDag(d);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  return t.getFullYear();
}

/** Minuter sedan midnatt, uträknat på väggklockan. */
export function minuterInPaDagen(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Hela kalenderdygn mellan två datum, tecknat. */
export function dygnMellan(a: Date, b: Date): number {
  const ms = startAvDag(b).getTime() - startAvDag(a).getTime();
  // Avrundning krävs: sommartid gör vissa dygn 23 eller 25 timmar långa.
  return Math.round(ms / 86400000);
}

export function klocka(d: Date): string {
  return `${tvasiffrigt(d.getHours())}:${tvasiffrigt(d.getMinutes())}`;
}

/** "09:00" men utan onödig nolla: "9" och "9.30". Används i trånga block. */
export function klockaKort(d: Date): string {
  const t = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${t}` : `${t}.${tvasiffrigt(m)}`;
}

export function minuterTillText(minuter: number): string {
  const t = Math.floor(minuter / 60);
  const m = minuter % 60;
  if (t === 0) return `${m} min`;
  if (m === 0) return `${t} h`;
  return `${t} h ${m} min`;
}

/** "10 augusti 2026" */
export function langtDatum(d: Date): string {
  return `${d.getDate()} ${MANADER[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}

/** "Mån 10 aug" */
export function kortDatum(d: Date): string {
  return `${VECKODAGAR_KORT[d.getDay()]} ${d.getDate()} ${MANADER_KORT[
    d.getMonth()
  ].toLowerCase()}`;
}

/** Sant om två halvöppna intervall [aS,aE) och [bS,bE) skär varandra. */
export function overlappar(aS: Date, aE: Date, bS: Date, bE: Date): boolean {
  return aS.getTime() < bE.getTime() && bS.getTime() < aE.getTime();
}

/** Avrundar minuter till närmaste steg (15 min som standard). */
export function snappa(minuter: number, steg = 15): number {
  return Math.round(minuter / steg) * steg;
}

/**
 * Midnatt på `dag` plus ett antal minuter. Värden över 1440 rullar över
 * till nästa dygn av sig själva, vilket är precis vad ett block som dras
 * förbi midnatt behöver.
 */
export function medMinuter(dag: Date, minuter: number): Date {
  return new Date(dag.getFullYear(), dag.getMonth(), dag.getDate(), 0, minuter);
}

/** Klämmer ett tal till [lag, hog]. */
export function klam(v: number, lag: number, hog: number): number {
  return Math.max(lag, Math.min(hog, v));
}

/** Radda upp n dygn från och med `start`. */
export function dagsspann(start: Date, antal: number): Date[] {
  const d0 = startAvDag(start);
  return Array.from({ length: antal }, (_, i) => addDagar(d0, i));
}

/**
 * Sex rader à sju dagar som täcker månaden — alltid 42 rutor, så att
 * rutnätet inte hoppar i höjd mellan månader.
 */
export function manadsrutnat(peka: Date): Date[] {
  const forsta = startAvManad(peka);
  const start = startAvVecka(forsta);
  return Array.from({ length: 42 }, (_, i) => addDagar(start, i));
}
