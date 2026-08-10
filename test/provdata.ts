/**
 * Provfixtur.
 *
 * Innehållet låg tidigare i lagret som automatisk sådd, men en kalender
 * skall starta tom — det som står i den skall vara skrivet av den som
 * äger den. Här får materialet i stället tjäna som underlag för
 * renderingsproven, där det behövs något att rita.
 *
 * Datumen räknas relativt ett inskickat "idag", så att veckan alltid ser
 * likadan ut oavsett när provet körs.
 */

import type { Handelse } from "../lib/typer";
import { normalisera } from "../lib/butik";
import { STANDARD_UPPREPNING } from "../lib/upprepning";
import { addDagar, nyckel, startAvDag } from "../lib/tid";

/** Ett dygnsspann material att rita prov mot. */
export function provdata(idag: Date): Handelse[] {
  const d0 = startAvDag(idag);
  const mandag = addDagar(d0, -((idag.getDay() + 6) % 7));

  const gor = (
    dagOffset: number,
    fran: string,
    till: string,
    titel: string,
    kalenderId: string,
    extra: Partial<Handelse> = {}
  ): Handelse => {
    const dag = addDagar(mandag, dagOffset);
    return normalisera({
      titel,
      kalenderId,
      start: `${nyckel(dag)}T${fran}`,
      slut: `${nyckel(dag)}T${till}`,
      ...extra,
    });
  };

  return [
    gor(0, "08:30", "09:00", "Veckostart", "arbete", {
      upprepning: {
        ...STANDARD_UPPREPNING,
        frekvens: "veckovis",
        veckodagar: [1],
      },
      anteckning: "Genomgång av veckans leveranser.",
      plats: "Rum 4",
    }),
    gor(0, "07:00", "07:45", "Löprunda", "traning", {
      upprepning: {
        ...STANDARD_UPPREPNING,
        frekvens: "veckovis",
        veckodagar: [1, 3, 5],
      },
    }),
    gor(0, "12:00", "13:00", "Lunch", "privat", {
      upprepning: { ...STANDARD_UPPREPNING, frekvens: "vardag" },
    }),
    gor(1, "10:00", "11:30", "Fornsvenska — paradigmarbete", "studier", {
      anteckning: "Starka verb, klass III. Noreen §512.",
    }),
    // Krockar med paradigmarbetet ovan — visar hur kolumnpackningen delar
    // bredden mellan två block som ligger på samma tid.
    gor(1, "10:30", "11:00", "Samtal med handledare", "arbete"),
    gor(1, "14:00", "15:00", "Avstämning design", "arbete"),
    gor(2, "09:00", "10:00", "Handskriftsseminarium", "studier", {
      upprepning: {
        ...STANDARD_UPPREPNING,
        frekvens: "veckovis",
        intervall: 2,
        veckodagar: [3],
      },
      plats: "Carolina Rediviva",
    }),
    gor(2, "13:00", "17:00", "Djupt arbete", "arbete"),
    gor(2, "15:00", "15:30", "Kort avstämning", "arbete"),
    gor(3, "11:00", "11:45", "Tandläkare", "privat"),
    gor(3, "22:30", "24:00", "Nattpass — korrektur", "studier", {
      anteckning: "Sträcker sig till midnatt; provar blocket vid dygnsgränsen.",
    }),
    gor(4, "09:00", "09:30", "Veckoslut", "arbete", {
      upprepning: {
        ...STANDARD_UPPREPNING,
        frekvens: "veckovis",
        veckodagar: [5],
      },
    }),
    gor(4, "18:30", "22:00", "Middag hos Ingrid", "privat"),
    normalisera({
      titel: "Resa till Visby",
      kalenderId: "resor",
      heldag: true,
      start: `${nyckel(addDagar(mandag, 5))}T00:00`,
      slut: `${nyckel(addDagar(mandag, 8))}T00:00`,
      anteckning: "Gotlands fornsal, tre dagar.",
    }),
    normalisera({
      titel: "Månadsrapport",
      kalenderId: "arbete",
      start: `${nyckel(new Date(d0.getFullYear(), d0.getMonth(), 1))}T16:00`,
      slut: `${nyckel(new Date(d0.getFullYear(), d0.getMonth(), 1))}T17:00`,
      upprepning: {
        ...STANDARD_UPPREPNING,
        frekvens: "manadsvis",
        manadslage: "dag-i-manad",
      },
    }),
    normalisera({
      titel: "Sista fredagen — retrospektiv",
      kalenderId: "arbete",
      start: `${nyckel(sistaFredagen(d0))}T15:00`,
      slut: `${nyckel(sistaFredagen(d0))}T16:00`,
      upprepning: {
        ...STANDARD_UPPREPNING,
        frekvens: "manadsvis",
        manadslage: "veckodag-i-manad",
      },
    }),
  ];
}

function sistaFredagen(d: Date): Date {
  const sista = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const back = (sista.getDay() - 5 + 7) % 7;
  return new Date(d.getFullYear(), d.getMonth(), sista.getDate() - back);
}
