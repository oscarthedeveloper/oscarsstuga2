/**
 * Kolumnpackning för överlappande händelser.
 *
 * Algoritmen är den som Google Calendar och Outlook använder, i tre steg:
 *
 *   1. Dela upp dagens förekomster i KLUSTER — grupper som hänger ihop
 *      genom överlapp. Två block i olika kluster kan aldrig krocka, så de
 *      får räknas var för sig.
 *   2. Ge varje block den första kolumn där föregående block redan slutat.
 *      Antalet kolumner i klustret blir då bredden alla måste dela på.
 *   3. Låt varje block VÄXA åt höger så länge ingen granne står i vägen.
 *      Utan det steget blir ett ensamt möte på eftermiddagen lika smalt
 *      som de tre som krockade på förmiddagen, vilket ser fel ut.
 *
 * Blocken får dessutom en liten överlappning i sidled (se SPILL), så att
 * kanterna syns när de ligger tätt — annars smälter 1px-ramarna ihop till
 * ett grått fält.
 */

import type { Forekomst, Layout } from "./typer";

/** Minsta som krävs för att kunna packas: en nyckel och ett tidsspann. */
export interface Packbar {
  nyckel: string;
  start: Date;
  slut: Date;
}

/** Hur mycket varje block tillåts krypa in över grannen till höger. */
const SPILL = 0.06;

/** Minsta längd ett block räknas som vid layout, i millisekunder.
 *  Ett femminutersmöte skall inte kunna gömma sig helt under ett annat. */
const MINSTA = 12 * 60000;

interface Post {
  f: Packbar;
  start: number;
  slut: number;
  kolumn: number;
  spann: number;
}

export function laggUt(forekomster: Packbar[]): Map<string, Layout> {
  const ut = new Map<string, Layout>();
  if (forekomster.length === 0) return ut;

  const poster: Post[] = forekomster
    .map((f) => ({
      f,
      start: f.start.getTime(),
      slut: Math.max(f.slut.getTime(), f.start.getTime() + MINSTA),
      kolumn: -1,
      spann: 1,
    }))
    .sort((a, b) => a.start - b.start || b.slut - a.slut);

  // Steg 1 — klustra.
  let kluster: Post[] = [];
  let klusterSlut = -Infinity;

  const avslutaKluster = () => {
    if (kluster.length > 0) packa(kluster, ut);
    kluster = [];
    klusterSlut = -Infinity;
  };

  for (const p of poster) {
    if (p.start >= klusterSlut && kluster.length > 0) avslutaKluster();
    kluster.push(p);
    klusterSlut = Math.max(klusterSlut, p.slut);
  }
  avslutaKluster();

  return ut;
}

function packa(kluster: Post[], ut: Map<string, Layout>) {
  // Steg 2 — tilldela kolumner.
  const kolumner: Post[][] = [];
  for (const p of kluster) {
    let placerad = false;
    for (let i = 0; i < kolumner.length; i++) {
      const sist = kolumner[i][kolumner[i].length - 1];
      if (sist.slut <= p.start) {
        kolumner[i].push(p);
        p.kolumn = i;
        placerad = true;
        break;
      }
    }
    if (!placerad) {
      p.kolumn = kolumner.length;
      kolumner.push([p]);
    }
  }

  const antal = kolumner.length;

  // Steg 3 — växa åt höger.
  for (const p of kluster) {
    let spann = 1;
    for (let i = p.kolumn + 1; i < antal; i++) {
      const krockar = kolumner[i].some(
        (q) => q.start < p.slut && p.start < q.slut
      );
      if (krockar) break;
      spann += 1;
    }
    p.spann = spann;
  }

  for (const p of kluster) {
    const enhet = 1 / antal;
    const vanster = p.kolumn * enhet;
    // Blocket får krypa in över grannen — utom det längst till höger,
    // som annars skulle sticka ut ur kolumnen.
    const nårKanten = p.kolumn + p.spann >= antal;
    const bredd = enhet * p.spann + (nårKanten ? 0 : enhet * SPILL);
    ut.set(p.f.nyckel, {
      vanster,
      bredd: Math.min(bredd, 1 - vanster),
      lager: p.kolumn,
    });
  }
}

/**
 * Packar heldagshändelser i vågräta band över en dagsrad, likt Tetris:
 * varje band fylls från vänster, och en händelse hamnar i första bandet
 * där den inte krockar med något redan utlagt.
 */
export interface Band {
  nyckel: string;
  forekomst: Forekomst;
  /** Kolumnindex i dagsspannet, 0-baserat. */
  fran: number;
  /** Exklusivt. */
  till: number;
  rad: number;
  /** Sant om händelsen fortsätter utanför det synliga spannet. */
  klipptVanster: boolean;
  klipptHoger: boolean;
}

export function laggUtBand(
  poster: { forekomst: Forekomst; fran: number; till: number }[],
  antalKolumner: number
): { band: Band[]; rader: number } {
  const sorterade = [...poster].sort(
    (a, b) => a.fran - b.fran || b.till - b.fran - (a.till - a.fran)
  );

  // Varje rad håller reda på vilka kolumner som är upptagna.
  const rader: boolean[][] = [];
  const band: Band[] = [];

  for (const p of sorterade) {
    const fran = Math.max(0, p.fran);
    const till = Math.min(antalKolumner, p.till);
    if (till <= fran) continue;

    let radIndex = rader.findIndex((rad) => {
      for (let i = fran; i < till; i++) if (rad[i]) return false;
      return true;
    });
    if (radIndex === -1) {
      radIndex = rader.length;
      rader.push(new Array(antalKolumner).fill(false));
    }
    for (let i = fran; i < till; i++) rader[radIndex][i] = true;

    band.push({
      nyckel: p.forekomst.nyckel,
      forekomst: p.forekomst,
      fran,
      till,
      rad: radIndex,
      klipptVanster: p.fran < 0,
      klipptHoger: p.till > antalKolumner,
    });
  }

  return { band, rader: rader.length };
}
