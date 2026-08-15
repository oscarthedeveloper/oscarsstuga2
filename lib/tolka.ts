/**
 * Fångsttolken.
 *
 * Hela poängen med en andrahjärna är att den tar emot utan att först
 * ställa frågor. Formuläret i HandelsePanel är rätt när man vill vara
 * noggrann, men fel i det ögonblick en tanke dyker upp: fyra fält och
 * två väljare senare är tanken borta. Tolken tar därför en enda rad fri
 * text och räknar ut resten.
 *
 * Tre regler styr uträkningen:
 *
 * 1. TOLKEN GISSAR ALDRIG I HEMLIGHET. Allt den känt igen lämnas tillbaka
 *    i `delar`, och paletten visar det innan något sparas. En tolkning man
 *    ser går att lita på; en osynlig gör det inte.
 *
 * 2. KLOCKSLAG AVGÖR SORTEN. Ett klockslag betyder att saken äger en plats
 *    i tiden — alltså en händelse. Ett datum utan klockslag betyder att
 *    något skall vara gjort senast då — alltså en uppgift. "Möte kl 14 på
 *    torsdag" blir en händelse, "ring tandläkaren på torsdag" en uppgift.
 *    Regeln går att köra över med `möte:` eller `uppgift:` först i raden.
 *
 * 3. DET SOM INTE KÄNNS IGEN ÄR TITELN. Tolken plockar bort de bitar den
 *    förstått och lämnar resten orörd. Står det något konstigt kvar blir
 *    det en titel, inte ett fel.
 */

import type { Prioritet } from "./typer";
import {
  MANADER,
  MANADER_KORT,
  VECKODAGAR,
  VECKODAGAR_KORT,
  addDagar,
  addManader,
  klocka,
  kortDatum,
  medMinuter,
  minuterTillText,
  nyckel,
  stampel,
  startAvDag,
} from "./tid";

export type Sort = "handelse" | "uppgift";

/** En bit av inmatningen som tolken känt igen. Visas som kvitto. */
export interface Del {
  slag: "sort" | "datum" | "tid" | "langd" | "styrka" | "kalender";
  /** Vad som stod i texten. */
  text: string;
  /** Vad det blev. */
  tolkning: string;
}

export interface Fangst {
  sort: Sort;
  titel: string;
  /** Lokal väggklocka, "YYYY-MM-DDTHH:mm". Endast för händelser. */
  start: string | null;
  slut: string | null;
  heldag: boolean;
  /** Datumnyckel "YYYY-MM-DD". Endast för uppgifter. */
  forfaller: string | null;
  prioritet: Prioritet;
  /** Namnet som stod efter #. Anroparen slår upp id:t. */
  kalenderNamn: string | null;
  delar: Del[];
  /** Sant om raden bara är text, utan något tolkat. */
  tom: boolean;
}

type Tagare = (
  re: RegExp,
  /** Körs på träffen innan den konsumeras. Falskt = leta vidare. */
  giltig?: (m: RegExpExecArray) => boolean
) => RegExpExecArray | null;

/** Standardlängd på en händelse utan angivet slut. */
const STANDARDLANGD_MIN = 60;

/** Det som konsumerats ersätts med blanksteg — då fungerar \b som vanligt. */
const ATEN = " ";

export function tolkaFangst(
  text: string,
  kalendernamn: string[] = [],
  nuTid: Date = new Date()
): Fangst {
  const kvar = Array.from(text);
  const delar: Del[] = [];
  const idag = startAvDag(nuTid);

  /** Nuvarande text med det som redan konsumerats utstruket. */
  const arbets = () => kvar.join("");

  /**
   * Kör en regel mot det som är kvar och äter upp träffen.
   *
   * `giltig` är inte en bekvämlighet utan en nödvändighet. En regel som
   * ser rätt ut kan ändå vara betydelselös — "3 stolar" har formen av
   * "3 mars" men "stolar" är ingen månad. Utan kontrollen INNAN texten
   * konsumeras försvinner orden ur titeln ändå, och raden "boka 3 stolar"
   * blir bara "boka". Därför söks strängen igenom tills en träff hittas
   * som både matchar och betyder något; först då äts den upp.
   */
  const ta: Tagare = (re, giltig) => {
    const s = arbets();
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = g.exec(s)) !== null) {
      if (m[0].length === 0) {
        g.lastIndex += 1;
        continue;
      }
      if (!giltig || giltig(m)) {
        for (let i = m.index; i < m.index + m[0].length; i++) kvar[i] = ATEN;
        return m;
      }
    }
    return null;
  };

  /* --- 1. Uttalad sort ------------------------------------------- */
  let tvingadSort: Sort | null = null;
  const sortM = ta(
    /(?:^|\s)(uppgift|todo|att\s*göra|händelse|handelse|möte|mote)\s*:\s*/i
  );
  if (sortM) {
    const ord = sortM[1].toLowerCase();
    tvingadSort =
      ord === "uppgift" || ord === "todo" || ord.startsWith("att")
        ? "uppgift"
        : "handelse";
    delar.push({
      slag: "sort",
      text: sortM[1],
      tolkning: tvingadSort === "uppgift" ? "Uppgift" : "Händelse",
    });
  }

  /* --- 2. Kalender: #namn ---------------------------------------- */
  let kalenderNamn: string | null = null;
  const kalM = ta(/(?:^|\s)#([\p{L}\p{N}_-]+)/u);
  if (kalM) {
    const sokt = kalM[1].toLowerCase();
    // Prefixmatchning mot de kalendrar som faktiskt finns. "#arb" räcker.
    const traff = kalendernamn.find((n) => n.toLowerCase().startsWith(sokt));
    kalenderNamn = traff ?? kalM[1];
    delar.push({
      slag: "kalender",
      text: `#${kalM[1]}`,
      tolkning: kalenderNamn,
    });
  }

  /* --- 3. Styrka: !1 !2 !3 --------------------------------------- */
  let prioritet: Prioritet = 2;
  const priM = ta(/(?:^|\s)!([123])(?=\s|$)/);
  if (priM) {
    prioritet = Number(priM[1]) as Prioritet;
    delar.push({
      slag: "styrka",
      text: `!${priM[1]}`,
      tolkning: `Styrka ${priM[1]}`,
    });
  }

  /* --- 4. Heldag -------------------------------------------------- */
  let heldag = false;
  const heldagM = ta(/(?:^|\s)heldag(?=\s|$)/i);
  if (heldagM) {
    heldag = true;
    delar.push({ slag: "tid", text: "heldag", tolkning: "Hela dagen" });
  }

  /* --- 5. Klockslag ----------------------------------------------
     Spann först, annars äter den enkla regeln upp starten och lämnar
     slutet som skräp i titeln.

     Ett spann utan "kl" kräver att vänstersidan har minuter utskrivna.
     Utan det villkoret blir "köp 2-3 liter mjölk" ett möte 02:00–03:00,
     och den sortens gissning är värre än ingen tolkning alls.       */
  let startMin: number | null = null;
  let slutMin: number | null = null;

  const bådaKlockslag = (m: RegExpExecArray) =>
    klockslag(m[1], m[2]) !== null && klockslag(m[3], m[4]) !== null;

  const spannMedKl = ta(
    /\bkl\.?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|–|—|till)\s*(\d{1,2})(?:[:.](\d{2}))?(?=\s|$)/i,
    bådaKlockslag
  );
  const spann =
    spannMedKl ??
    ta(
      /\b(\d{1,2})[:.](\d{2})\s*(?:-|–|—|till)\s*(\d{1,2})(?:[:.](\d{2}))?(?=\s|$)/,
      bådaKlockslag
    );

  if (spann) {
    const a = klockslag(spann[1], spann[2]);
    const b = klockslag(spann[3], spann[4]);
    if (a !== null && b !== null) {
      startMin = a;
      // Ett slut före sin start har passerat midnatt: 23–01 är två timmar.
      slutMin = b <= a ? b + 1440 : b;
      delar.push({
        slag: "tid",
        text: spann[0].trim(),
        tolkning: `${minuterTillKlocka(startMin)}–${minuterTillKlocka(slutMin)}`,
      });
    }
  } else {
    const ettKlockslag = (m: RegExpExecArray) => klockslag(m[1], m[2]) !== null;
    const enkel =
      ta(/\bkl\.?\s*(\d{1,2})(?:[:.](\d{2}))?(?=\s|$)/i, ettKlockslag) ??
      ta(/\b(\d{1,2}):(\d{2})(?=\s|$)/, ettKlockslag);
    if (enkel) {
      const a = klockslag(enkel[1], enkel[2]);
      if (a !== null) {
        startMin = a;
        delar.push({
          slag: "tid",
          text: enkel[0].trim(),
          tolkning: minuterTillKlocka(a),
        });
      }
    }
  }

  /* --- 6. Längd: "i 2 timmar", "90 min", "en halvtimme" ----------- */
  let langdMin: number | null = null;
  const halv = ta(/\b(?:i\s+)?(?:en\s+)?halvtimme\b/i);
  if (halv) {
    langdMin = 30;
    delar.push({ slag: "langd", text: halv[0].trim(), tolkning: "30 min" });
  } else {
    const tim = ta(
      /\b(?:i\s+)?(\d{1,3})(?:[.,](\d))?\s*(?:h|tim|timme|timmar)\b/i
    );
    const min = ta(/\b(?:i\s+)?(\d{1,3})\s*(?:min|minut|minuter)\b/i);
    let summa = 0;
    if (tim) summa += Number(tim[1]) * 60 + (tim[2] ? Number(tim[2]) * 6 : 0);
    if (min) summa += Number(min[1]);
    if (summa > 0) {
      langdMin = summa;
      const rat = [tim?.[0].trim(), min?.[0].trim()].filter(Boolean).join(" ");
      delar.push({ slag: "langd", text: rat, tolkning: minuterTillText(summa) });
    }
  }

  /* --- 7. Datum --------------------------------------------------- */
  const datum = tolkaDatumdel(ta, idag);
  if (datum) delar.push(datum.del);

  /* --- 8. Titeln är det som blev över ----------------------------- */
  const titel = stada(arbets());

  /* --- 9. Sätt ihop ----------------------------------------------- */
  const harTid = startMin !== null;
  const sort: Sort = tvingadSort ?? (harTid || heldag ? "handelse" : "uppgift");

  const fangst: Fangst = {
    sort,
    titel,
    start: null,
    slut: null,
    heldag: false,
    forfaller: null,
    prioritet,
    kalenderNamn,
    delar,
    tom: delar.length === 0,
  };

  if (sort === "uppgift") {
    fangst.forfaller = datum ? nyckel(datum.dag) : null;
    return fangst;
  }

  /* Händelse. */
  if (heldag) {
    const dag = datum?.dag ?? idag;
    fangst.heldag = true;
    fangst.start = stampel(dag);
    fangst.slut = stampel(addDagar(dag, 1));
    return fangst;
  }

  /*
   * Utan datum blir det idag — om klockslaget inte redan passerat. Har
   * det gjort det menar man nästan alltid imorgon: ingen skriver in ett
   * möte som var för tre timmar sedan. Gissningen står i kvittot, så den
   * kan aldrig överraska någon.
   */
  let dag = datum?.dag ?? idag;
  if (!datum && startMin !== null) {
    const passerat = nuTid.getHours() * 60 + nuTid.getMinutes() > startMin;
    if (passerat) {
      dag = addDagar(idag, 1);
      delar.push({
        slag: "datum",
        text: "—",
        tolkning: `${kortDatum(dag)} (tiden har passerat idag)`,
      });
    }
  }

  const s = startMin ?? 9 * 60;
  const e = slutMin ?? s + (langdMin ?? STANDARDLANGD_MIN);
  fangst.start = stampel(medMinuter(dag, s));
  fangst.slut = stampel(medMinuter(dag, e));
  return fangst;
}

/* ==================================================================
   DATUM
   ================================================================== */

/**
 * Plockar ut ett datum ur texten. Reglerna prövas i fallande
 * bestämdhet: "2026-12-24" före "24 dec" före "på fredag", så att den
 * mest exakta formen vinner när flera skulle kunna matcha.
 */
function tolkaDatumdel(ta: Tagare, idag: Date): { dag: Date; del: Del } | null {
  const svar = (dag: Date, text: string): { dag: Date; del: Del } => ({
    dag,
    del: { slag: "datum", text: text.trim(), tolkning: kortDatum(dag) },
  });

  /* ISO: 2026-12-24 */
  const iso = ta(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, (m) =>
    giltigDel(Number(m[1]), Number(m[2]), Number(m[3]))
  );
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (giltigt(d)) return svar(d, iso[0]);
  }

  /* 24/12 eller 24/12 2026 */
  const snett = ta(/\b(\d{1,2})\/(\d{1,2})(?:\s+(\d{4}))?\b/, (m) =>
    giltigDel(
      m[3] ? Number(m[3]) : idag.getFullYear(),
      Number(m[2]),
      Number(m[1])
    )
  );
  if (snett) {
    const ar = snett[3] ? Number(snett[3]) : idag.getFullYear();
    const d = new Date(ar, Number(snett[2]) - 1, Number(snett[1]));
    if (giltigt(d)) {
      // Utan årtal menar man nästan alltid framåt. Ett datum som redan
      // varit tolkas som nästa år.
      const rullad =
        !snett[3] && d.getTime() < idag.getTime()
          ? new Date(ar + 1, Number(snett[2]) - 1, Number(snett[1]))
          : d;
      return svar(rullad, snett[0]);
    }
  }

  /* "den 24 december", "24 dec", "3 mars 2027" */
  const medManad = ta(
    /\b(?:den\s+)?(\d{1,2})(?::e|:a)?\s+([\p{L}]{3,})\.?(?:\s+(\d{4}))?\b/u,
    // "3 stolar" har formen av "3 mars". Bara riktiga månadsnamn duger.
    (m) => manadsIndex(m[2]) !== -1 && Number(m[1]) >= 1 && Number(m[1]) <= 31
  );
  if (medManad) {
    const index = manadsIndex(medManad[2]);
    if (index !== -1) {
      const ar = medManad[3] ? Number(medManad[3]) : idag.getFullYear();
      const d = new Date(ar, index, Number(medManad[1]));
      if (giltigt(d)) {
        const rullad =
          !medManad[3] && d.getTime() < idag.getTime()
            ? new Date(ar + 1, index, Number(medManad[1]))
            : d;
        return svar(rullad, medManad[0]);
      }
    }
  }

  /* Namngivna dagar */
  const idagM = ta(/(?:^|\s)idag(?=\s|$)/i);
  if (idagM) return svar(idag, idagM[0]);

  const imorgonM = ta(/(?:^|\s)(?:imorgon|i\s+morgon|imorron)(?=\s|$)/i);
  if (imorgonM) return svar(addDagar(idag, 1), imorgonM[0]);

  const overM = ta(/(?:^|\s)(?:övermorgon|overmorgon)(?=\s|$)/i);
  if (overM) return svar(addDagar(idag, 2), overM[0]);

  const igarM = ta(/(?:^|\s)(?:igår|igar|i\s+går)(?=\s|$)/i);
  if (igarM) return svar(addDagar(idag, -1), igarM[0]);

  /* "om 3 dagar", "om en vecka", "om 2 månader" */
  const om = ta(
    /(?:^|\s)om\s+(\d{1,3}|en|ett|två|tre)\s+(dag|dagar|vecka|veckor|månad|månader|manad|manader)(?=\s|$)/i
  );
  if (om) {
    const antal = raknerord(om[1]);
    const enhet = om[2].toLowerCase();
    if (enhet.startsWith("dag")) return svar(addDagar(idag, antal), om[0]);
    if (enhet.startsWith("veck")) return svar(addDagar(idag, antal * 7), om[0]);
    return svar(addManader(idag, antal), om[0]);
  }

  /* "nästa vecka" */
  const nastaVecka = ta(/(?:^|\s)nästa\s+vecka(?=\s|$)/i);
  if (nastaVecka) return svar(addDagar(idag, 7), nastaVecka[0]);

  /*
   * Veckodagar. "på fredag" är närmaste kommande fredag, och infaller
   * den idag menar man idag. "nästa fredag" hoppar över den och tar
   * veckan därpå — det är så ordet används, även om det strikt taget
   * är tvetydigt.
   */
  const veckodag = ta(
    /(?:^|\s)(?:(nästa|nasta)\s+)?(?:på\s+|i\s+)?(söndag|sondag|måndag|mandag|tisdag|onsdag|torsdag|fredag|lördag|lordag|sön|mån|man|tis|ons|tor|fre|lör|lor)(?=\s|$)/i,
    (m) => veckodagsIndex(m[2]) !== -1
  );
  if (veckodag) {
    const index = veckodagsIndex(veckodag[2]);
    if (index !== -1) {
      let steg = (index - idag.getDay() + 7) % 7;
      if (veckodag[1]) steg += 7;
      return svar(addDagar(idag, steg), veckodag[0]);
    }
  }

  return null;
}

/* ==================================================================
   SMÅDELAR
   ================================================================== */

function klockslag(timme: string, minut?: string): number | null {
  const t = Number(timme);
  const m = minut ? Number(minut) : 0;
  if (!Number.isFinite(t) || t > 23 || m > 59) return null;
  return t * 60 + m;
}

function minuterTillKlocka(minuter: number): string {
  const m = ((minuter % 1440) + 1440) % 1440;
  return klocka(medMinuter(new Date(2000, 0, 1), m));
}

function manadsIndex(ord: string): number {
  const o = ord.toLowerCase().replace(/\.$/, "");
  for (let i = 0; i < MANADER.length; i++) {
    if (MANADER[i].toLowerCase() === o) return i;
    if (MANADER_KORT[i].toLowerCase() === o) return i;
  }
  // Prefix sist: "mar" skall inte fastna på "maj" före "mars".
  for (let i = 0; i < MANADER.length; i++) {
    if (o.length >= 3 && MANADER[i].toLowerCase().startsWith(o)) return i;
  }
  return -1;
}

function veckodagsIndex(ord: string): number {
  const o = utanDiakriter(ord.toLowerCase());
  for (let i = 0; i < VECKODAGAR.length; i++) {
    if (utanDiakriter(VECKODAGAR[i].toLowerCase()) === o) return i;
    if (utanDiakriter(VECKODAGAR_KORT[i].toLowerCase()) === o) return i;
  }
  return -1;
}

/** "lördag" och "lordag" skall båda gå fram. */
function utanDiakriter(s: string): string {
  return s.replace(/[åä]/g, "a").replace(/ö/g, "o");
}

function raknerord(s: string): number {
  const ord: Record<string, number> = { en: 1, ett: 1, två: 2, tre: 3 };
  const n = ord[s.toLowerCase()];
  if (n) return n;
  const tal = Number(s);
  return Number.isFinite(tal) && tal > 0 ? tal : 1;
}

/** Sant om år/månad/dag beskriver en dag som faktiskt finns. */
function giltigDel(ar: number, manad: number, dag: number): boolean {
  if (manad < 1 || manad > 12 || dag < 1 || dag > 31) return false;
  const d = new Date(ar, manad - 1, dag);
  return giltigt(d) && d.getMonth() === manad - 1 && d.getDate() === dag;
}

function giltigt(d: Date): boolean {
  return !Number.isNaN(d.getTime()) && d.getFullYear() > 1900;
}

/**
 * Städar titeln efter att bitarna plockats ut.
 *
 * Kvar blir ofta ett ensamt bindeord som pekade på det som togs bort —
 * "lunch med Anna på" när "torsdag" ätits upp. De orden stryks i
 * kanterna, men aldrig inuti: "möte om budget" skall behålla sitt "om".
 */
function stada(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  t = t.replace(/^(?:på|i|den|kl\.?|om|till|-|–|,)\s+/i, "");
  t = t.replace(/\s+(?:på|i|den|kl\.?|om|till|-|–|,)$/i, "");
  return t.replace(/\s+/g, " ").trim();
}
