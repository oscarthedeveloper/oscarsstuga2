/**
 * Upprepningsmotorn.
 *
 * Modellen är avsiktligt en delmängd av RFC 5545 (iCalendar RRULE) —
 * samma begrepp, samma kantfall, men bara de regler en människa faktiskt
 * ställer in i ett gränssnitt. Att följa RRULE:s semantik från början gör
 * att serierna kan exporteras till .ics utan att räknas om.
 *
 * Två saker är värda att veta om implementationen:
 *
 * 1. Förekomster räknas ALLTID fram från seriens ursprung, aldrig från
 *    fönstrets början. "Var tredje vecka" måste veta vilken vecka som är
 *    vecka noll, annars glider serien när användaren bläddrar. Motorn
 *    hoppar däremot fram till strax före fönstret innan den börjar samla,
 *    så kostnaden blir konstant och inte proportionell mot avståndet.
 *
 * 2. Varje förekomst identifieras av sitt URSPRUNGSDATUM — det datum
 *    mönstret pekar ut — även om just den förekomsten flyttats. Det är
 *    därför en flyttad förekomst inte dyker upp två gånger, och därför en
 *    struken förekomst förblir struken när serien i övrigt ändras.
 */

import type { Forekomst, Handelse, Upprepning } from "./typer";
import {
  addDagar,
  addManader,
  arVardag,
  dagarIManad,
  dygnMellan,
  nyckel,
  overlappar,
  stampel,
  startAvDag,
  tolka,
  veckoIndex,
} from "./tid";

/** Spärr mot oändliga loopar vid trasiga regler. */
const TAK = 4000;

export const STANDARD_UPPREPNING: Upprepning = {
  frekvens: "ingen",
  intervall: 1,
  veckodagar: [],
  manadslage: "dag-i-manad",
  slut: { typ: "aldrig" },
};

/**
 * Läsbar beskrivning av regeln — "Var tredje tisdag", "Månadsvis på
 * tredje onsdagen". Regeln skall gå att förstå utan att öppna formuläret.
 */
export function beskrivUpprepning(u: Upprepning | null, start: Date): string {
  if (!u || u.frekvens === "ingen") return "Upprepas inte";

  const n = u.intervall;
  const ordningstal = (x: number) =>
    ["", "", "andra", "tredje", "fjärde", "femte", "sjätte"][x] ?? `${x}:e`;
  const varje = (ental: string, flertal: string) =>
    n === 1 ? `Varje ${ental}` : `Var ${ordningstal(n)} ${flertal}`;

  let bas: string;
  switch (u.frekvens) {
    case "daglig":
      bas = varje("dag", "dag");
      break;
    case "vardag":
      bas = "Varje vardag (mån–fre)";
      break;
    case "veckovis": {
      const dagar = [...u.veckodagar].sort(
        (a, b) => ((a + 6) % 7) - ((b + 6) % 7)
      );
      const namn = dagar.map(
        (d) => ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"][d]
      );
      const lista =
        namn.length === 0
          ? ["måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag"][
              veckoIndex(start)
            ]
          : namn.length === 1
          ? namn[0]
          : `${namn.slice(0, -1).join(", ")} och ${namn[namn.length - 1]}`;
      bas = n === 1 ? `Varje ${lista}` : `Var ${ordningstal(n)} vecka på ${lista}`;
      break;
    }
    case "manadsvis":
      if (u.manadslage === "veckodag-i-manad") {
        const v = veckoNummerIManad(start);
        const namn = [
          "söndagen",
          "måndagen",
          "tisdagen",
          "onsdagen",
          "torsdagen",
          "fredagen",
          "lördagen",
        ][start.getDay()];
        const ord =
          v === -1
            ? "sista"
            : ["", "första", "andra", "tredje", "fjärde"][v] ?? `${v}:e`;
        bas = `${varje("månad", "månad")} på ${ord} ${namn}`;
      } else {
        bas = `${varje("månad", "månad")} den ${start.getDate()}:e`;
      }
      break;
    case "arlig":
      bas = `${varje("år", "år")} den ${start.getDate()}/${start.getMonth() + 1}`;
      break;
    default:
      bas = "Upprepas inte";
  }

  if (u.slut.typ === "datum") {
    return `${bas}, till ${u.slut.datum}`;
  }
  if (u.slut.typ === "antal") {
    return `${bas}, ${u.slut.antal} gånger`;
  }
  return bas;
}

/**
 * Vilken förekomst av sin veckodag datumet är i månaden: 1–5, eller -1
 * om det är den sista i månaden. Sista räknas separat eftersom "sista
 * fredagen" är fjärde i vissa månader och femte i andra.
 */
export function veckoNummerIManad(d: Date): number {
  const nr = Math.floor((d.getDate() - 1) / 7) + 1;
  const arSista = d.getDate() + 7 > dagarIManad(d.getFullYear(), d.getMonth());
  return arSista ? -1 : nr;
}

/** Datumet för den n:te veckodagen i en månad. n = -1 ger den sista. */
export function veckodagIManad(
  ar: number,
  manad: number,
  veckodag: number,
  n: number
): Date | null {
  if (n === -1) {
    const sista = new Date(ar, manad, dagarIManad(ar, manad));
    const back = (sista.getDay() - veckodag + 7) % 7;
    return new Date(ar, manad, sista.getDate() - back);
  }
  const forsta = new Date(ar, manad, 1);
  const fram = (veckodag - forsta.getDay() + 7) % 7;
  const dag = 1 + fram + (n - 1) * 7;
  if (dag > dagarIManad(ar, manad)) return null;
  return new Date(ar, manad, dag);
}

/**
 * Räknar fram seriens startdatum (utan klockslag) inom ett fönster.
 * Returnerar datum i stigande ordning.
 */
function serieDatum(
  u: Upprepning,
  ursprung: Date,
  fran: Date,
  till: Date
): Date[] {
  const ut: Date[] = [];
  const intervall = Math.max(1, Math.floor(u.intervall) || 1);
  const ursprungsdag = startAvDag(ursprung);
  const franDag = startAvDag(fran);
  const tillDag = startAvDag(till);

  // Hur många förekomster serien får ge totalt, om den är räknad.
  const maxAntal = u.slut.typ === "antal" ? Math.max(1, u.slut.antal) : Infinity;
  const slutDatum =
    u.slut.typ === "datum" ? startAvDag(tolka(u.slut.datum)) : null;

  // `raknare` är förekomstens ordningsnummer i serien, för slut-på-antal.
  let raknare = 0;
  let varv = 0;

  const taEmot = (d: Date): boolean => {
    // Returnerar false när serien tagit slut och loopen skall brytas.
    raknare += 1;
    if (raknare > maxAntal) return false;
    if (slutDatum && d.getTime() > slutDatum.getTime()) return false;
    if (d.getTime() < ursprungsdag.getTime()) return true;
    if (d.getTime() > tillDag.getTime()) return false;
    if (d.getTime() >= franDag.getTime()) ut.push(d);
    return true;
  };

  switch (u.frekvens) {
    case "daglig": {
      // Hoppa fram till första förekomsten i eller strax före fönstret.
      const gap = Math.max(0, dygnMellan(ursprungsdag, franDag));
      const hopp = Math.floor(gap / intervall);
      raknare = hopp; // förekomster som passerats utan att samlas
      let d = addDagar(ursprungsdag, hopp * intervall);
      while (varv++ < TAK) {
        if (!taEmot(d)) break;
        d = addDagar(d, intervall);
      }
      break;
    }

    case "vardag": {
      // Mån–fre, utan intervall: "varje vardag" betyder just varje.
      let d = ursprungsdag.getTime() < franDag.getTime() ? franDag : ursprungsdag;
      // Antalsgränsen kräver att vi vet hur många vardagar som passerats.
      if (u.slut.typ === "antal" && d.getTime() > ursprungsdag.getTime()) {
        raknare = raknaVardagar(ursprungsdag, d);
      }
      d = startAvDag(d);
      while (varv++ < TAK) {
        if (arVardag(d)) {
          if (!taEmot(d)) break;
        }
        if (d.getTime() > tillDag.getTime()) break;
        d = addDagar(d, 1);
      }
      break;
    }

    case "veckovis": {
      const dagar =
        u.veckodagar.length > 0
          ? Array.from(new Set(u.veckodagar)).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
          : [ursprung.getDay()];

      // Vecka noll är ursprungets vecka; intervallet räknas i hela veckor
      // från den, oavsett vilken veckodag ursprunget råkar ligga på.
      const veckoStart = addDagar(ursprungsdag, -veckoIndex(ursprungsdag));
      const veckorTillFran = Math.max(
        0,
        Math.floor(dygnMellan(veckoStart, franDag) / 7)
      );
      let block = Math.floor(veckorTillFran / intervall);

      // Antalsgränsen: fulla intervallblock som passerats gav |dagar| var.
      if (u.slut.typ === "antal" && block > 0) {
        raknare = block * dagar.length;
        // Ursprungsveckan kan ha börjat mitt i sin egen dagslista.
        raknare -= dagar.filter(
          (v) => ((v + 6) % 7) < veckoIndex(ursprungsdag)
        ).length;
      }

      let brutet = false;
      while (varv++ < TAK && !brutet) {
        const manda = addDagar(veckoStart, block * intervall * 7);
        if (manda.getTime() > tillDag.getTime()) break;
        for (const v of dagar) {
          const d = addDagar(manda, (v + 6) % 7);
          if (d.getTime() < ursprungsdag.getTime()) continue;
          if (!taEmot(d)) {
            brutet = true;
            break;
          }
        }
        block += 1;
      }
      break;
    }

    case "manadsvis": {
      const manaderTillFran = Math.max(
        0,
        (franDag.getFullYear() - ursprungsdag.getFullYear()) * 12 +
          (franDag.getMonth() - ursprungsdag.getMonth())
      );
      let steg = Math.floor(manaderTillFran / intervall);
      raknare = steg;

      const veckodag = ursprung.getDay();
      const veckoNr = veckoNummerIManad(ursprungsdag);
      const monadsdag = ursprungsdag.getDate();

      while (varv++ < TAK) {
        const peka = addManader(
          new Date(ursprungsdag.getFullYear(), ursprungsdag.getMonth(), 1),
          steg * intervall
        );
        let d: Date | null;
        if (u.manadslage === "veckodag-i-manad") {
          d = veckodagIManad(peka.getFullYear(), peka.getMonth(), veckodag, veckoNr);
        } else {
          // Den 31:e finns inte varje månad. RRULE hoppar över sådana
          // månader helt hellre än att glida till den 1:a eller 28:e.
          const langd = dagarIManad(peka.getFullYear(), peka.getMonth());
          d = monadsdag > langd
            ? null
            : new Date(peka.getFullYear(), peka.getMonth(), monadsdag);
        }
        if (d) {
          if (!taEmot(d)) break;
        } else {
          // Överhoppad månad räknas inte som en förekomst.
          raknare -= 1;
        }
        if (peka.getTime() > tillDag.getTime()) break;
        steg += 1;
      }
      break;
    }

    case "arlig": {
      const arTillFran = Math.max(
        0,
        franDag.getFullYear() - ursprungsdag.getFullYear()
      );
      let steg = Math.floor(arTillFran / intervall);
      raknare = steg;
      const manad = ursprungsdag.getMonth();
      const dag = ursprungsdag.getDate();

      while (varv++ < TAK) {
        const ar = ursprungsdag.getFullYear() + steg * intervall;
        // Den 29 februari finns bara skottår. Samma regel som ovan:
        // hoppa över året i stället för att flytta till den 28:e eller 1:a.
        const finns = dag <= dagarIManad(ar, manad);
        if (finns) {
          if (!taEmot(new Date(ar, manad, dag))) break;
        } else {
          raknare -= 1;
        }
        if (ar > tillDag.getFullYear()) break;
        steg += 1;
      }
      break;
    }

    default:
      break;
  }

  return ut;
}

function raknaVardagar(fran: Date, till: Date): number {
  const dygn = dygnMellan(fran, till);
  if (dygn <= 0) return 0;
  const helaVeckor = Math.floor(dygn / 7);
  let antal = helaVeckor * 5;
  let d = addDagar(fran, helaVeckor * 7);
  while (d.getTime() < startAvDag(till).getTime()) {
    if (arVardag(d)) antal += 1;
    d = addDagar(d, 1);
  }
  return antal;
}

/**
 * Räknar ut alla förekomster av en händelse som skär fönstret
 * [fran, till). Fönstret vidgas bakåt med händelsens längd, så att ett
 * flerdygnsmöte som började före fönstret ändå kommer med.
 */
export function expandera(
  h: Handelse,
  fran: Date,
  till: Date
): Forekomst[] {
  const start = tolka(h.start);
  const slut = tolka(h.slut);
  const langdDygn = Math.max(0, dygnMellan(start, slut));
  const timme = start.getHours();
  const minut = start.getMinutes();
  const slutTimme = slut.getHours();
  const slutMinut = slut.getMinutes();

  const bygg = (dag: Date): Forekomst | null => {
    const urs = nyckel(dag);
    if (h.undantag.includes(urs)) return null;

    const avvikelse = h.avvikelser[urs];
    let s: Date;
    let e: Date;
    if (avvikelse) {
      s = tolka(avvikelse.start);
      e = tolka(avvikelse.slut);
    } else {
      s = new Date(dag.getFullYear(), dag.getMonth(), dag.getDate(), timme, minut);
      // Slutet byggs av väggklockan plus antal dygn, inte av en
      // millisekunddifferens — annars glider mötet en timme vid omställning.
      e = new Date(
        dag.getFullYear(),
        dag.getMonth(),
        dag.getDate() + langdDygn,
        slutTimme,
        slutMinut
      );
    }
    if (e.getTime() <= s.getTime()) {
      // Skydd mot trasig data: ge alltid blocket en mätbar höjd.
      e = new Date(s.getTime() + 30 * 60000);
    }
    if (!overlappar(s, e, fran, till)) return null;
    return {
      nyckel: `${h.id}#${urs}`,
      handelseId: h.id,
      handelse: h,
      start: s,
      slut: e,
      ursprung: urs,
      serie: !!h.upprepning && h.upprepning.frekvens !== "ingen",
      heldag: h.heldag,
      ton: 0, // fylls i av lagret, som känner kalendern
    };
  };

  if (!h.upprepning || h.upprepning.frekvens === "ingen") {
    const f = bygg(startAvDag(start));
    return f ? [f] : [];
  }

  // Vidga bakåt så flerdygnshändelser och flyttade förekomster hinner med.
  const marginal = Math.max(langdDygn + 1, 1);
  const sokFran = addDagar(fran, -marginal);
  const datum = serieDatum(h.upprepning, start, sokFran, till);

  const ut: Forekomst[] = [];
  for (const d of datum) {
    const f = bygg(d);
    if (f) ut.push(f);
  }

  // En förekomst kan ha flyttats IN i fönstret från ett datum utanför det.
  // Dessa fångas inte av datumlistan ovan, så avvikelserna gås igenom var
  // för sig. Antalet avvikelser är i praktiken litet.
  const sedda = new Set(ut.map((f) => f.ursprung));
  for (const urs of Object.keys(h.avvikelser)) {
    if (sedda.has(urs)) continue;
    const f = bygg(tolka(urs));
    if (f) ut.push(f);
  }

  ut.sort((a, b) => a.start.getTime() - b.start.getTime());
  return ut;
}

/** Expanderar en hel lista och sorterar resultatet kronologiskt. */
export function expanderaAlla(
  handelser: Handelse[],
  fran: Date,
  till: Date
): Forekomst[] {
  const ut: Forekomst[] = [];
  for (const h of handelser) ut.push(...expandera(h, fran, till));
  ut.sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() ||
      b.slut.getTime() - a.slut.getTime() ||
      a.handelse.titel.localeCompare(b.handelse.titel, "sv")
  );
  return ut;
}

/**
 * Bygger en upprepningsregel som beskriver "samma veckodag varje vecka"
 * för ett givet datum — används när man slår på veckovis i formuläret.
 */
export function veckovisFor(d: Date): Upprepning {
  return {
    ...STANDARD_UPPREPNING,
    frekvens: "veckovis",
    veckodagar: [d.getDay()],
  };
}

/** Datumnyckeln för en flyttad förekomst behåller ursprunget. */
export function flyttaForekomst(
  h: Handelse,
  ursprung: string,
  nyStart: Date,
  nySlut: Date
): Handelse {
  return {
    ...h,
    avvikelser: {
      ...h.avvikelser,
      [ursprung]: { start: stampel(nyStart), slut: stampel(nySlut) },
    },
  };
}

/** Stryker en enskild förekomst ur en serie. */
export function strykForekomst(h: Handelse, ursprung: string): Handelse {
  const avvikelser = { ...h.avvikelser };
  delete avvikelser[ursprung];
  return {
    ...h,
    undantag: Array.from(new Set([...h.undantag, ursprung])),
    avvikelser,
  };
}

/**
 * Kapar en serie strax före ett datum. Används när en ändring skall gälla
 * "denna och framåt": den gamla serien avslutas dagen innan, och en ny
 * serie tar vid — precis som iCalendar-klienter gör.
 */
export function kapaSerie(h: Handelse, fransDatum: string): Handelse {
  if (!h.upprepning) return h;
  const dagenInnan = addDagar(tolka(fransDatum), -1);
  return {
    ...h,
    upprepning: {
      ...h.upprepning,
      slut: { typ: "datum", datum: nyckel(dagenInnan) },
    },
    undantag: h.undantag.filter((u) => u < fransDatum),
    avvikelser: Object.fromEntries(
      Object.entries(h.avvikelser).filter(([k]) => k < fransDatum)
    ),
  };
}
