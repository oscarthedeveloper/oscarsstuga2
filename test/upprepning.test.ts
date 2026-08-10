/**
 * Prov för upprepningsmotorn.
 *
 * Kantfallen är valda för att de är de som brukar gå sönder: skottår,
 * månader som saknar den 31:e, sommartidsomställningar, och räknade
 * serier som bläddras till långt fram i tiden.
 *
 * Körs med `npm test`.
 */

import { expandera, veckodagIManad, veckoNummerIManad } from "../lib/upprepning";
import { normalisera } from "../lib/butik";
import { nyckel, tolka, klocka, isoVecka } from "../lib/tid";
import type { Handelse, Upprepning } from "../lib/typer";

let antal = 0;
let fel = 0;

function prov(namn: string, f: () => void) {
  antal += 1;
  try {
    f();
    process.stdout.write(`  ok   ${namn}\n`);
  } catch (e) {
    fel += 1;
    process.stdout.write(`  FEL  ${namn}\n       ${(e as Error).message}\n`);
  }
}

function lika<T>(fick: T, vantat: T, vad = "") {
  const a = JSON.stringify(fick);
  const b = JSON.stringify(vantat);
  if (a !== b) {
    throw new Error(`${vad}\n       fick    ${a}\n       väntade ${b}`);
  }
}

function gor(
  start: string,
  slut: string,
  upprepning: Partial<Upprepning> | null = null
): Handelse {
  return normalisera({
    id: "prov",
    titel: "Prov",
    start,
    slut,
    upprepning: upprepning
      ? ({
          frekvens: "ingen",
          intervall: 1,
          veckodagar: [],
          manadslage: "dag-i-manad",
          slut: { typ: "aldrig" },
          ...upprepning,
        } as Upprepning)
      : null,
  });
}

const datum = (h: Handelse, fran: string, till: string) =>
  expandera(h, tolka(fran), tolka(till)).map((f) => nyckel(f.start));

process.stdout.write("\nUpprepningsmotorn\n");

/* ---------------------------------------------------------------- */
prov("engångshändelse ger exakt en förekomst", () => {
  const h = gor("2026-08-10T09:00", "2026-08-10T10:00");
  lika(datum(h, "2026-08-01", "2026-09-01"), ["2026-08-10"]);
});

prov("engångshändelse utanför fönstret ger inget", () => {
  const h = gor("2026-08-10T09:00", "2026-08-10T10:00");
  lika(datum(h, "2026-09-01", "2026-10-01"), []);
});

prov("daglig upprepning", () => {
  const h = gor("2026-08-10T09:00", "2026-08-10T10:00", { frekvens: "daglig" });
  lika(datum(h, "2026-08-10", "2026-08-14"), [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
  ]);
});

prov("var tredje dag glider inte när man bläddrar framåt", () => {
  const h = gor("2026-01-01T09:00", "2026-01-01T10:00", {
    frekvens: "daglig",
    intervall: 3,
  });
  // 1 jan + 3n. Fasen skall vara densamma i december som i januari:
  // 1 jan + 360 dygn = 27 dec, alltså 27/12, 30/12 och 2/1 — inte 28/12.
  const d = datum(h, "2026-12-25", "2027-01-05");
  lika(d, ["2026-12-27", "2026-12-30", "2027-01-02"]);
});

prov("vardagar hoppar över helgen", () => {
  // 2026-08-10 är en måndag.
  const h = gor("2026-08-10T09:00", "2026-08-10T10:00", { frekvens: "vardag" });
  lika(datum(h, "2026-08-10", "2026-08-18"), [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-17",
  ]);
});

prov("veckovis på flera dagar", () => {
  const h = gor("2026-08-10T07:00", "2026-08-10T08:00", {
    frekvens: "veckovis",
    veckodagar: [1, 3, 5],
  });
  lika(datum(h, "2026-08-10", "2026-08-17"), [
    "2026-08-10",
    "2026-08-12",
    "2026-08-14",
  ]);
});

prov("varannan vecka behåller sin fas långt fram", () => {
  const h = gor("2026-08-12T09:00", "2026-08-12T10:00", {
    frekvens: "veckovis",
    intervall: 2,
    veckodagar: [3],
  });
  const d = datum(h, "2026-11-01", "2026-12-01");
  // Ursprunget ligger i vecka 33; varannan vecka därifrån ger jämna veckor.
  for (const k of d) {
    const v = isoVecka(tolka(k));
    lika((v - isoVecka(tolka("2026-08-12"))) % 2, 0, `vecka ${v} har fel fas`);
  }
  lika(d.length > 0, true, "ingen förekomst alls i november");
});

prov("månadsvis den 31:e hoppar över korta månader", () => {
  const h = gor("2026-01-31T09:00", "2026-01-31T10:00", {
    frekvens: "manadsvis",
  });
  lika(datum(h, "2026-01-01", "2026-06-01"), [
    "2026-01-31",
    "2026-03-31",
    "2026-05-31",
  ]);
});

prov("månadsvis på sista fredagen", () => {
  // 2026-01-30 är den sista fredagen i januari.
  const h = gor("2026-01-30T15:00", "2026-01-30T16:00", {
    frekvens: "manadsvis",
    manadslage: "veckodag-i-manad",
  });
  lika(datum(h, "2026-01-01", "2026-05-01"), [
    "2026-01-30",
    "2026-02-27",
    "2026-03-27",
    "2026-04-24",
  ]);
});

prov("månadsvis på tredje onsdagen", () => {
  // 2026-08-19 är den tredje onsdagen i augusti.
  const h = gor("2026-08-19T09:00", "2026-08-19T10:00", {
    frekvens: "manadsvis",
    manadslage: "veckodag-i-manad",
  });
  lika(datum(h, "2026-08-01", "2026-11-01"), [
    "2026-08-19",
    "2026-09-16",
    "2026-10-21",
  ]);
});

prov("årlig den 29 februari finns bara skottår", () => {
  const h = gor("2024-02-29T09:00", "2024-02-29T10:00", { frekvens: "arlig" });
  lika(datum(h, "2024-01-01", "2033-01-01"), [
    "2024-02-29",
    "2028-02-29",
    "2032-02-29",
  ]);
});

prov("slut efter antal räknas rätt även långt fram", () => {
  const h = gor("2026-08-10T09:00", "2026-08-10T10:00", {
    frekvens: "daglig",
    slut: { typ: "antal", antal: 5 },
  });
  lika(datum(h, "2026-08-01", "2026-09-01"), [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
  ]);
  // Samma serie sedd genom ett senare fönster får inte ge fler poster.
  lika(datum(h, "2026-08-13", "2026-09-01"), ["2026-08-13", "2026-08-14"]);
});

prov("slut efter antal med veckovis på tre dagar", () => {
  const h = gor("2026-08-10T09:00", "2026-08-10T10:00", {
    frekvens: "veckovis",
    veckodagar: [1, 3, 5],
    slut: { typ: "antal", antal: 4 },
  });
  lika(datum(h, "2026-08-01", "2026-09-01"), [
    "2026-08-10",
    "2026-08-12",
    "2026-08-14",
    "2026-08-17",
  ]);
});

prov("slut vid datum är inklusivt", () => {
  const h = gor("2026-08-10T09:00", "2026-08-10T10:00", {
    frekvens: "daglig",
    slut: { typ: "datum", datum: "2026-08-12" },
  });
  lika(datum(h, "2026-08-01", "2026-09-01"), [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
  ]);
});

prov("undantag stryker en förekomst", () => {
  const h = {
    ...gor("2026-08-10T09:00", "2026-08-10T10:00", { frekvens: "daglig" }),
    undantag: ["2026-08-11"],
  };
  lika(datum(h, "2026-08-10", "2026-08-13"), ["2026-08-10", "2026-08-12"]);
});

prov("avvikelse flyttar en förekomst utan att duplicera den", () => {
  const h = {
    ...gor("2026-08-10T09:00", "2026-08-10T10:00", { frekvens: "daglig" }),
    avvikelser: {
      "2026-08-11": { start: "2026-08-11T15:00", slut: "2026-08-11T16:00" },
    },
  };
  const f = expandera(h, tolka("2026-08-11"), tolka("2026-08-12"));
  lika(f.length, 1, "fel antal förekomster");
  lika(klocka(f[0].start), "15:00");
});

prov("en förekomst som flyttats in i fönstret kommer med", () => {
  const h = {
    ...gor("2026-08-10T09:00", "2026-08-10T10:00", {
      frekvens: "veckovis",
      veckodagar: [1],
    }),
    avvikelser: {
      // Måndagen den 17:e flyttad till lördagen den 22:a.
      "2026-08-17": { start: "2026-08-22T09:00", slut: "2026-08-22T10:00" },
    },
  };
  const d = datum(h, "2026-08-22", "2026-08-23");
  lika(d, ["2026-08-22"]);
});

prov("klockslaget står still över sommartidsomställningen", () => {
  // I Sverige ställs klockan om natten till sista söndagen i mars 2026,
  // som är den 29:e. Ett möte 09:00 skall ligga 09:00 även efter det.
  const h = gor("2026-03-27T09:00", "2026-03-27T10:00", { frekvens: "daglig" });
  const f = expandera(h, tolka("2026-03-27"), tolka("2026-04-01"));
  for (const x of f) {
    lika(klocka(x.start), "09:00", `fel klockslag ${nyckel(x.start)}`);
    lika(klocka(x.slut), "10:00", `fel sluttid ${nyckel(x.start)}`);
  }
  lika(f.length, 5);
});

prov("flerdygnshändelse som börjar före fönstret kommer med", () => {
  const h = gor("2026-08-08T00:00", "2026-08-12T00:00");
  const f = expandera(h, tolka("2026-08-10"), tolka("2026-08-11"));
  lika(f.length, 1);
});

prov("veckodagIManad hittar sista fredagen", () => {
  const d = veckodagIManad(2026, 1, 5, -1); // februari 2026
  lika(nyckel(d!), "2026-02-27");
});

prov("veckoNummerIManad känner igen den sista", () => {
  lika(veckoNummerIManad(tolka("2026-02-27")), -1);
  lika(veckoNummerIManad(tolka("2026-08-19")), 3);
});

prov("orimlig regel ger ändå ett ändligt svar", () => {
  const h = gor("1990-01-01T09:00", "1990-01-01T10:00", { frekvens: "daglig" });
  const f = expandera(h, tolka("2026-08-01"), tolka("2026-08-08"));
  lika(f.length, 7);
});

process.stdout.write(
  `\n${antal - fel} av ${antal} prov gick igenom.${fel ? " ✗" : " ✓"}\n\n`
);
process.exit(fel ? 1 : 0);
