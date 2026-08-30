/**
 * Parkeringen — det som skall in i kalendern men ännu inte fått en tid.
 *
 * "Jag skall träffa Anna någon gång i veckan" är varken en händelse
 * eller en uppgift. Det är inte en händelse, för en händelse äger en
 * plats i tiden och det här har ingen. Det är inte en uppgift, för en
 * uppgift bockas av när den är gjord — och en lapp bockas inte av, den
 * BLIR något: den dras in i rutnätet och är då en händelse.
 *
 * Därför en fjärde sort. Alternativet hade varit att låta att
 * göra-listan bära dem, och kostnaden för det är att den dagliga listan
 * fylls av möten man inte kan göra något åt förrän de fått en tid.
 *
 * Lappen bär sin egen LÄNGD. En lunch är nittio minuter och ett kaffe
 * trettio, och det vet man när man skriver lappen — inte när man drar
 * den. Att alltid landa på en timme hade betytt en efterjustering per
 * lapp, varje gång.
 */

import type { Handelse, Lapp } from "./typer";
import { medMinuter, snappa, stampel, tolka } from "./tid";

/* ==================================================================
   LÄNGDEN
   ================================================================== */

/** Förvalet: en timme är det möte man oftast bokar. */
export const STANDARDLANGD = 60;

/**
 * Längderna man stegar mellan.
 *
 * En knapp som stegar genom en kort lista slår ett sifferfält här: man
 * sätter längden i förbifarten när man skriver lappen, och ett fält
 * hade krävt att man siktade, markerade och skrev. Behöver man 25
 * minuter finns fältet i händelsepanelen efter släppet.
 */
export const LANGDER = [15, 30, 45, 60, 90, 120, 180, 240];

/** Nästa längd i listan. Från den sista går det runt till den första. */
export function nastaLangd(minuter: number): number {
  const i = LANGDER.indexOf(klamMinuter(minuter));
  if (i === -1) return STANDARDLANGD;
  return LANGDER[(i + 1) % LANGDER.length];
}

/**
 * Håller längden inom ett dygn och på minst en kvart.
 *
 * Noll är inte en längd utan en punkt, och en händelse utan varaktighet
 * går inte att ta tag i när den väl ligger i rutnätet. Kvarten är samma
 * golv som blocken har där.
 */
export function klamMinuter(n: unknown): number {
  const t = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(t)) return STANDARDLANGD;
  return Math.min(1440, Math.max(15, Math.round(t)));
}

/** "30 min", "1 h", "1 h 30". Aldrig "1,5 h" — ingen tänker i decimaler. */
export function langdText(minuter: number): string {
  const m = klamMinuter(minuter);
  const timmar = Math.floor(m / 60);
  const rest = m % 60;
  if (timmar === 0) return `${rest} min`;
  if (rest === 0) return `${timmar} h`;
  return `${timmar} h ${rest}`;
}

/* ==================================================================
   ORDNINGEN
   ================================================================== */

/**
 * Nyast överst.
 *
 * Parkeringen är inte en kö man arbetar av uppifrån utan en hög man
 * lägger på. Lappen man just skrev är den man med störst sannolikhet
 * skall placera, och en lista sorterad äldst först begraver den under
 * allt man redan skjutit upp.
 */
export function sorteraLappar(lista: Lapp[]): Lapp[] {
  return [...lista].sort(
    (a, b) => b.skapad.localeCompare(a.skapad) || a.id.localeCompare(b.id)
  );
}

/* ==================================================================
   SLÄPPET
   ================================================================== */

/** Klockslaget en lapp får när den landar i en vy utan klockslag. */
export const FORVALD_TIMME = 9;

/**
 * Tiden lappen landar på.
 *
 * `minut` är minuter in på dygnet, eller null när man släppte i en vy
 * som inte har några klockslag — månadsvyn vet vilken DAG man siktade
 * på men inte vilken timme. Då blir det nio på morgonen, samma svar som
 * en dubbelklick i månadsvyn redan ger. En gissning mitt på dagen hade
 * varit lika godtycklig men svårare att förutsäga.
 */
export function slapptid(dagnyckel: string, minut: number | null): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dagnyckel)) return null;
  const dag = tolka(dagnyckel);
  if (Number.isNaN(dag.getTime())) return null;
  return medMinuter(dag, minut === null ? FORVALD_TIMME * 60 : minut);
}

/**
 * Minuten under pekaren, snäppt till kvartar.
 *
 * Skild från DOM-läsningen med flit: det som går att räkna utan en
 * webbläsare skall gå att prova utan en. `toppen` är dagkolumnens övre
 * kant i klientkoordinater — den ligger ofta ovanför fönstret, eftersom
 * rutnätet är rullat, och talet är då negativt. Det är riktigt.
 */
export function minutUnderPekaren(
  klientY: number,
  toppen: number,
  timhojd: number,
  steg = 15
): number {
  if (!Number.isFinite(timhojd) || timhojd <= 0) return 0;
  const rå = ((klientY - toppen) / timhojd) * 60;
  return Math.min(1440 - steg, Math.max(0, snappa(rå, steg)));
}

/**
 * Lappen som ett händelseutkast.
 *
 * Titel, anteckning och kalender följer med — det är hela poängen med
 * att ha skrivit lappen. Upprepning gör det inte: en lapp är en enskild
 * sak man skall få gjord, och en serie ur ett släpp vore en överraskning.
 */
export function lappUtkast(lapp: Lapp, start: Date): Partial<Handelse> {
  const slut = new Date(start.getTime() + klamMinuter(lapp.minuter) * 60000);
  return {
    titel: lapp.titel.trim() || "Utan titel",
    anteckning: lapp.anteckning,
    kalenderId: lapp.kalenderId,
    start: stampel(start),
    slut: stampel(slut),
    heldag: false,
  };
}

/* ==================================================================
   DRAGET

   Tillståndet medan en lapp är i luften. Det bor i KalenderApp och inte
   i sidopanelen, eftersom det är RUTNÄTET som ritar förhandsvisningen —
   och rutnätet är sidopanelens syskon, inte dess barn.
   ================================================================== */

export interface Slappmal {
  /** Datumnyckel, YYYY-MM-DD. */
  dagnyckel: string;
  /** Minuter in på dygnet, eller null i en vy utan klockslag. */
  minut: number | null;
}

export interface Slappning {
  /** Lappens id, så att rutnätet kan skilja två drag åt. */
  id: string;
  titel: string;
  /** Längden i minuter, för hur hög förhandsvisningen ritas. */
  minuter: number;
  ton: number;
  /** Var pekaren är. Null så länge den inte nått en dag. */
  mal: Slappmal | null;
}
