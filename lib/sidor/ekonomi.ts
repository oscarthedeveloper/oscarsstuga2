/**
 * Privatekonomi — månadsplanering.
 *
 * Sidan är gjord för ritualen strax före löning: pengarna kommer in och
 * skall fördelas. Den handlar därför om KATEGORIER och aldrig om enskilda
 * utgifter. En tröja för 349 kronor hör inte hemma här; "Nöjen 2 000"
 * gör det.
 *
 * Tre saker hänger ihop och måste hållas isär:
 *
 *   KATEGORIERNA lever ovanför månaderna. Att de är gemensamma är hela
 *   förutsättningen för att kunna jämföra augusti med juli — hade varje
 *   månad haft sina egna rader vore "samma kategori" bara en förhoppning
 *   om att man stavat likadant.
 *
 *   MÅNADEN bär ett belopp per kategori: PLAN före löning och UTFALL
 *   efter månadens slut. Utfallet är frivilligt; en månad man aldrig
 *   summerade är inte en trasig månad.
 *
 *   MALLEN fyller i en ny månad. Ritualen skall vara att justera, inte
 *   att börja om från ett tomt papper varje gång.
 */

import { MANADER } from "../tid";

/* ==================================================================
   DATAMODELLEN
   ================================================================== */

export interface Kategori {
  id: string;
  namn: string;
  /**
   * Räknas mot sparmålet.
   *
   * Skilt från namnet med flit. "Buffert" och "Pension" är sparande,
   * "Sparkonto för resa" likaså — och en sida som gissar på ordet
   * "spar" i namnet gissar fel för någon.
   */
  sparande: boolean;
  /** 0–5, pekar in i kalenderpaletten. Bär färgen i diagrammen. */
  ton: number;
}

export interface Post {
  kategoriId: string;
  /** Planerat belopp i kronor. Null = inte satt. */
  plan: number | null;
  /** Vad det faktiskt blev. Null tills månaden summerats. */
  utfall: number | null;
}

export interface Manad {
  /** "YYYY-MM". Är också sorteringsnyckel. */
  id: string;
  inkomst: number | null;
  poster: Post[];
  anteckning: string;
}

export interface Mall {
  inkomst: number | null;
  poster: { kategoriId: string; plan: number | null }[];
}

export interface Sparmal {
  namn: string;
  belopp: number | null;
  /** Vad som redan låg undan när du började följa målet här. */
  start: number | null;
}

export interface EkonomiData {
  kategorier: Kategori[];
  manader: Manad[];
  mall: Mall;
  mal: Sparmal;
}

export const TOM_EKONOMI: EkonomiData = {
  kategorier: [],
  manader: [],
  mall: { inkomst: null, poster: [] },
  mal: { namn: "", belopp: null, start: null },
};

/* ==================================================================
   BELOPP
   ================================================================== */

/**
 * Tolkar ett belopp ur ett textfält.
 *
 * Mellanrum stryks, både vanliga och hårda: man skriver "7 500" precis
 * som beloppet visas, och ett fält som vägrar sin egen utskrift är ett
 * fält man slutar lita på. Komma duger som decimaltecken, och ett
 * avslutande "kr" får finnas kvar.
 *
 * Tomt blir NULL och inte noll. Skillnaden är hela poängen: en kategori
 * utan siffra är ofylld, en kategori med noll är medvetet nollad, och
 * bara det senare skall räknas in i en summa som ser färdig ut.
 */
export function tolkaKrona(rå: unknown): number | null {
  if (typeof rå === "number") {
    return Number.isFinite(rå) ? rå : null;
  }
  if (typeof rå !== "string") return null;
  const rensad = rå
    .replace(/ /g, "")
    .replace(/\s/g, "")
    .replace(/kr\.?$/i, "")
    .replace(",", ".");
  if (rensad === "" || rensad === "-") return null;
  const n = Number(rensad);
  return Number.isFinite(n) ? n : null;
}

/** "7 500" — hårt mellanrum, så att beloppet aldrig bryts över en rad. */
export function kronor(n: number | null, streck = "—"): string {
  if (n === null) return streck;
  const avrundat = Math.round(n);
  const tecken = avrundat < 0 ? "−" : "";
  const siffror = String(Math.abs(avrundat)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    " "
  );
  return `${tecken}${siffror}`;
}

/** Med tecken utsatt: "+380" eller "−1 300". */
export function kronorMedTecken(n: number | null, streck = "—"): string {
  if (n === null) return streck;
  const avrundat = Math.round(n);
  if (avrundat === 0) return "0";
  return `${avrundat > 0 ? "+" : "−"}${kronor(Math.abs(avrundat))}`;
}

export function procent(andel: number | null, streck = "—"): string {
  if (andel === null || !Number.isFinite(andel)) return streck;
  return `${Math.round(andel * 100)} %`;
}

/* ==================================================================
   MÅNADSNYCKLAR
   ================================================================== */

export function manadsNyckel(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function manadsText(id: string): string {
  const m = id.match(/^(\d{4})-(\d{2})$/);
  if (!m) return id;
  const index = Number(m[2]) - 1;
  const namn = MANADER[index] ?? id;
  return `${namn} ${m[1]}`;
}

export function nastaManad(id: string): string {
  const m = id.match(/^(\d{4})-(\d{2})$/);
  if (!m) return id;
  const ar = Number(m[1]);
  const manad = Number(m[2]);
  return manad === 12
    ? `${ar + 1}-01`
    : `${ar}-${String(manad + 1).padStart(2, "0")}`;
}

export function foregaendeManad(id: string): string {
  const m = id.match(/^(\d{4})-(\d{2})$/);
  if (!m) return id;
  const ar = Number(m[1]);
  const manad = Number(m[2]);
  return manad === 1
    ? `${ar - 1}-12`
    : `${ar}-${String(manad - 1).padStart(2, "0")}`;
}

/* ==================================================================
   TOLKNING
   ================================================================== */

const arObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const text = (x: unknown): string => (typeof x === "string" ? x : "");

function lista<T>(
  x: unknown,
  tolk: (rad: Record<string, unknown>, i: number) => T | null
): T[] {
  if (!Array.isArray(x)) return [];
  const ut: T[] = [];
  for (let i = 0; i < x.length; i++) {
    const rad = x[i];
    if (!arObjekt(rad)) continue;
    const tolkad = tolk(rad, i);
    if (tolkad !== null) ut.push(tolkad);
  }
  return ut;
}

export function klamTon(n: unknown): number {
  const t = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(t)) return 0;
  return ((Math.round(t) % 6) + 6) % 6;
}

export function tolkaEkonomiData(rå: unknown): EkonomiData {
  if (!arObjekt(rå)) return TOM_EKONOMI;

  const kategorier = lista(rå.kategorier, (k, i) => ({
    id: text(k.id) || `k${i}`,
    namn: text(k.namn),
    sparande: k.sparande === true,
    ton: klamTon(k.ton),
  }));
  const kanda = new Set(kategorier.map((k) => k.id));

  /* En post mot en kategori som inte finns går inte att rita, inte att
     summera och inte att rätta. Den faller bort tyst. */
  const poster = (x: unknown): Post[] =>
    lista(x, (p) => {
      const kategoriId = text(p.kategoriId);
      if (!kanda.has(kategoriId)) return null;
      return {
        kategoriId,
        plan: tolkaKrona(p.plan),
        utfall: tolkaKrona(p.utfall),
      };
    });

  const manader = lista(rå.manader, (m) => {
    const id = text(m.id);
    if (!/^\d{4}-\d{2}$/.test(id)) return null;
    return {
      id,
      inkomst: tolkaKrona(m.inkomst),
      poster: poster(m.poster),
      anteckning: text(m.anteckning),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const råMall = arObjekt(rå.mall) ? rå.mall : {};
  const råMal = arObjekt(rå.mal) ? rå.mal : {};

  return {
    kategorier,
    manader,
    mall: {
      inkomst: tolkaKrona(råMall.inkomst),
      poster: lista(råMall.poster, (p) => {
        const kategoriId = text(p.kategoriId);
        if (!kanda.has(kategoriId)) return null;
        return { kategoriId, plan: tolkaKrona(p.plan) };
      }),
    },
    mal: {
      namn: text(råMal.namn),
      belopp: tolkaKrona(råMal.belopp),
      start: tolkaKrona(råMal.start),
    },
  };
}

/* ==================================================================
   MÅNADENS MATEMATIK
   ================================================================== */

const summa = (tal: (number | null)[]): number =>
  tal.reduce<number>((s, n) => s + (n ?? 0), 0);

export function summaPlan(m: Manad): number {
  return summa(m.poster.map((p) => p.plan));
}

export function summaUtfall(m: Manad): number {
  return summa(m.poster.map((p) => p.utfall));
}

/** Sant om månaden har minst ett ifyllt utfall. */
export function harUtfall(m: Manad): boolean {
  return m.poster.some((p) => p.utfall !== null);
}

/**
 * Kronor kvar att fördela.
 *
 * Sidans viktigaste tal. Positivt betyder att något ännu inte fått en
 * plats; negativt att man lovat bort mer än som kommer in. Null när
 * inkomsten inte är ifylld — då är talet inte noll utan okänt, och en
 * nolla där hade sett ut som ett svar.
 */
export function kvarAttFordela(m: Manad): number | null {
  return m.inkomst === null ? null : m.inkomst - summaPlan(m);
}

export function andelAvInkomst(belopp: number | null, m: Manad): number | null {
  if (belopp === null || m.inkomst === null || m.inkomst === 0) return null;
  return belopp / m.inkomst;
}

/** Utfall minus plan. Positivt betyder att det gick åt mer än tänkt. */
export function avvikelse(p: Post): number | null {
  return p.plan === null || p.utfall === null ? null : p.utfall - p.plan;
}

export function postFor(m: Manad, kategoriId: string): Post | null {
  return m.poster.find((p) => p.kategoriId === kategoriId) ?? null;
}

export function manadMed(data: EkonomiData, id: string | null): Manad | null {
  return data.manader.find((m) => m.id === id) ?? null;
}

/** Skillnaden i plan mot månaden innan. Null om den inte finns. */
export function motForegaende(
  data: EkonomiData,
  manadId: string,
  kategoriId: string
): number | null {
  const denna = manadMed(data, manadId);
  const forra = manadMed(data, foregaendeManad(manadId));
  if (!denna || !forra) return null;
  const a = postFor(denna, kategoriId)?.plan ?? null;
  const b = postFor(forra, kategoriId)?.plan ?? null;
  if (a === null || b === null) return null;
  return a - b;
}

/* ==================================================================
   SPARANDET
   ================================================================== */

export function arSparande(data: EkonomiData, kategoriId: string): boolean {
  return data.kategorier.some((k) => k.id === kategoriId && k.sparande);
}

/** Planerat sparande i en månad. */
export function sparandePlan(data: EkonomiData, m: Manad): number {
  return summa(
    m.poster.filter((p) => arSparande(data, p.kategoriId)).map((p) => p.plan)
  );
}

/** Faktiskt sparande i en månad. */
export function sparandeUtfall(data: EkonomiData, m: Manad): number {
  return summa(
    m.poster.filter((p) => arSparande(data, p.kategoriId)).map((p) => p.utfall)
  );
}

/** Andelen av inkomsten som läggs undan. */
export function sparkvot(data: EkonomiData, m: Manad): number | null {
  return andelAvInkomst(sparandePlan(data, m), m);
}

export interface Framsteg {
  /** Vad som ligger undan: startbeloppet plus alla faktiska månader. */
  undanlagt: number;
  mal: number | null;
  /** 0–1, eller null när målet saknas. Kan överstiga 1. */
  andel: number | null;
  kvar: number | null;
}

/**
 * Framstegen mot sparmålet.
 *
 * Räknas på UTFALL och inte på plan. Ett mål som kryper närmare för att
 * man planerat att spara är inget mål, det är en önskelista — och den
 * som ser sig vara framme utan att vara det har blivit lurad av sitt
 * eget verktyg.
 */
export function framsteg(data: EkonomiData): Framsteg {
  const undanlagt =
    (data.mal.start ?? 0) +
    data.manader.reduce((s, m) => s + sparandeUtfall(data, m), 0);
  const mal = data.mal.belopp;
  return {
    undanlagt,
    mal,
    andel: mal === null || mal <= 0 ? null : undanlagt / mal,
    kvar: mal === null ? null : Math.max(0, mal - undanlagt),
  };
}

/**
 * Genomsnittligt sparande per månad.
 *
 * Räknas på de månader som har ett ifyllt utfall. Har ingen månad
 * summerats ännu används den senaste månadens PLAN i stället — en
 * prognos byggd på avsikt är svagare än en byggd på utfall, men bättre
 * än ingen prognos alls den första månaden.
 */
export function genomsnittligtSparande(data: EkonomiData): number | null {
  const med = data.manader.filter(harUtfall);
  if (med.length > 0) {
    const s = med.reduce((t, m) => t + sparandeUtfall(data, m), 0);
    return s / med.length;
  }
  const senaste = data.manader[data.manader.length - 1];
  if (!senaste) return null;
  const plan = sparandePlan(data, senaste);
  return plan > 0 ? plan : null;
}

export interface Prognos {
  /** Månader kvar till målet. */
  manader: number;
  /** Månadsnyckeln då målet nås. */
  manadsId: string;
  takt: number;
}

/**
 * När målet nås med nuvarande takt.
 *
 * Null när takten är noll eller negativ — då nås målet aldrig, och ett
 * datum långt fram i tiden vore en lögn med tre decimalers precision.
 */
export function prognos(
  data: EkonomiData,
  fran: string = manadsNyckel(new Date())
): Prognos | null {
  const f = framsteg(data);
  if (f.kvar === null) return null;
  if (f.kvar === 0) return { manader: 0, manadsId: fran, takt: 0 };

  const takt = genomsnittligtSparande(data);
  if (takt === null || takt <= 0) return null;

  const manader = Math.ceil(f.kvar / takt);
  // Ett tak, så att en försumbar takt inte ger ett årtal på fem siffror.
  if (manader > 1200) return null;

  let id = fran;
  for (let i = 0; i < manader; i++) id = nastaManad(id);
  return { manader, manadsId: id, takt };
}

/* ==================================================================
   MÅNADER OCH MALL
   ================================================================== */

/**
 * En ny månad, ifylld ur mallen.
 *
 * Kategorier som saknas i mallen kommer med som tomma poster i stället
 * för att utelämnas. En kategori som inte syns är en kategori man glömmer
 * att fördela till, och hela sidan finns för att ingenting skall glömmas
 * bort just den kvarten före löning.
 */
export function manadUrMall(data: EkonomiData, id: string): Manad {
  const iMallen = new Map(data.mall.poster.map((p) => [p.kategoriId, p.plan]));
  return {
    id,
    inkomst: data.mall.inkomst,
    poster: data.kategorier.map((k) => ({
      kategoriId: k.id,
      plan: iMallen.get(k.id) ?? null,
      utfall: null,
    })),
    anteckning: "",
  };
}

/** Nästa månad att lägga upp: efter den sista, annars innevarande. */
export function nastaLedigaManad(
  data: EkonomiData,
  idag: Date = new Date()
): string {
  const sista = data.manader[data.manader.length - 1];
  const nu = manadsNyckel(idag);
  if (!sista) return nu;
  const efter = nastaManad(sista.id);
  // Ligger historiken redan i framtiden är nästa lediga den efter den —
  // inte innevarande månad, som ju redan finns.
  return efter > nu ? efter : nu > sista.id ? nu : efter;
}
