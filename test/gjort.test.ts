/**
 * Prov för gjort-remsan.
 *
 * Remsan bär fri text och räknar ingenting på den, så det finns inga
 * uträkningar att få fel. Det som KAN bli fel är ordningen, dagens
 * gräns och tolkningen av ett datum som inte är ett datum — och en rad
 * som hamnar på fel dag eller inte syns alls ser inte ut som ett fel
 * utan som att man glömde skriva in den.
 */

import {
  arDagnyckel,
  gjortForDag,
  gjortPerDag,
  rensaText,
  svit,
} from "../lib/gjort";
import {
  normaliseraGjort,
  stadaGravstenar,
  taBortKalender,
  STANDARDKALENDRAR,
  type Ogonblick,
} from "../lib/butik";
import type { Gjort } from "../lib/typer";

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
  if (JSON.stringify(fick) !== JSON.stringify(vantat)) {
    throw new Error(
      `${vad}\n       fick    ${JSON.stringify(fick)}\n       väntade ${JSON.stringify(vantat)}`
    );
  }
}

const g = (id: string, datum: string, text: string, skapad: string): Gjort =>
  normaliseraGjort({ id, datum, text, skapad, kalenderId: "traning" });

const LISTA: Gjort[] = [
  g("c", "2026-08-12", "Styrketräning", "2026-08-12T20:00:00.000Z"),
  g("a", "2026-08-12", "Sprungit", "2026-08-12T07:00:00.000Z"),
  g("b", "2026-08-12", "1,45 h HP-plugg", "2026-08-12T12:00:00.000Z"),
  g("d", "2026-08-13", "Läst 40 sidor av X", "2026-08-13T21:00:00.000Z"),
  g("e", "2026-08-15", "Simmat", "2026-08-15T09:00:00.000Z"),
];

process.stdout.write("\nGJORT\n");

/* --- dagen -------------------------------------------------------- */

prov("dagens rader kommer i den ordning de skrevs", () => {
  // Äldst först, till skillnad från parkeringen. Remsan läses från
  // vänster som en rad, och ordningen man skrev ned dem i är oftast
  // ordningen de skedde i.
  lika(gjortForDag(LISTA, "2026-08-12").map((x) => x.text), [
    "Sprungit",
    "1,45 h HP-plugg",
    "Styrketräning",
  ]);
});

prov("flera på samma dag, och inget läcker mellan dagar", () => {
  lika(gjortForDag(LISTA, "2026-08-12").length, 3);
  lika(gjortForDag(LISTA, "2026-08-13").map((x) => x.id), ["d"]);
  lika(gjortForDag(LISTA, "2026-08-14"), [], "en tom dag är tom");
});

prov("uppslagstabellen ger samma svar som filtreringen", () => {
  // Tabellen byggs en gång per ritning i stället för en gång per
  // dagkolumn. Skiljer de sig åt ritas remsan fel bara ibland, vilket
  // är den värsta sortens fel.
  const karta = gjortPerDag(LISTA);
  for (const dag of ["2026-08-12", "2026-08-13", "2026-08-15"]) {
    lika(
      (karta.get(dag) ?? []).map((x) => x.id),
      gjortForDag(LISTA, dag).map((x) => x.id),
      dag
    );
  }
  lika(karta.get("2026-08-14"), undefined);
  lika([...karta.keys()].sort(), ["2026-08-12", "2026-08-13", "2026-08-15"]);
});

prov("lika gamla rader ligger stilla", () => {
  // Två rader skrivna samma millisekund får inte byta plats mellan två
  // renderingar — en remsa som hoppar går inte att sikta i.
  const samtidiga = [
    g("b", "2026-08-12", "Andra", "2026-08-12T07:00:00.000Z"),
    g("a", "2026-08-12", "Första", "2026-08-12T07:00:00.000Z"),
  ];
  lika(gjortForDag(samtidiga, "2026-08-12").map((x) => x.id), ["a", "b"]);
  lika(gjortForDag(samtidiga, "2026-08-12").map((x) => x.id), ["a", "b"]);
});

/* --- texten ------------------------------------------------------- */

prov("bara ytterkanterna städas", () => {
  // "1,45 h" skall stå kvar precis som det skrevs. Ett fält som rättar
  // sitt eget innehåll är ett fält man slutar lita på.
  lika(rensaText("  Sprungit  "), "Sprungit");
  lika(rensaText("1,45 h  HP-plugg"), "1,45 h HP-plugg", "dubbla mellanrum");
  lika(rensaText("1,45h HP-plugg"), "1,45h HP-plugg", "innehållet rörs inte");
  lika(rensaText("Läst 40 sidor av X"), "Läst 40 sidor av X");
  lika(rensaText("   "), "");
  lika(rensaText(null), "");
});

/* --- datumet ------------------------------------------------------ */

prov("bara en dagnyckel duger som dag", () => {
  lika(arDagnyckel("2026-08-12"), true);
  lika(arDagnyckel("2026-08"), false);
  lika(arDagnyckel("i somras"), false);
  lika(arDagnyckel(null), false);
});

prov("ett datum som inte är ett datum blir tomt, inte idag", () => {
  // Tomt är ärligare än ett påhittat "idag": raden syns inte i remsan,
  // men den ligger kvar i lagret och går att rätta. Ett gissat datum
  // hade lagt något man gjorde i mars på dagens rad.
  lika(normaliseraGjort({ datum: "i somras" }).datum, "");
  lika(normaliseraGjort({}).datum, "");
  lika(normaliseraGjort({ datum: "2026-08-12" }).datum, "2026-08-12");
  // Och en rad utan dag hamnar inte på någon dag.
  lika(gjortForDag([normaliseraGjort({ id: "x" })], ""), []);
});

/* --- sviten ------------------------------------------------------- */

prov("sviten räknas bakåt och bryts av första tomma dagen", () => {
  lika(svit(LISTA, "2026-08-13"), 2, "13:e och 12:e");
  lika(svit(LISTA, "2026-08-12"), 1);
  lika(svit(LISTA, "2026-08-15"), 1, "14:e är tom, så sviten är en dag");
  lika(svit(LISTA, "2026-08-14"), 0, "en tom dag ger ingen svit alls");
});

prov("sviten tål skräp och tar aldrig evigheter", () => {
  lika(svit(LISTA, "strunt"), 0);
  lika(svit([], "2026-08-13"), 0);
  // Taket finns för att en lista som täcker varje dag sedan urminnes
  // tider inte skall snurra i onödan.
  const varje: Gjort[] = [];
  const d = new Date("2026-08-13T00:00:00");
  for (let i = 0; i < 20; i++) {
    const nyckel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    varje.push(g(`x${i}`, nyckel, "Sprungit", "2026-01-01T00:00:00.000Z"));
    d.setDate(d.getDate() - 1);
  }
  lika(svit(varje, "2026-08-13"), 20);
  lika(svit(varje, "2026-08-13", 5), 5, "taket hejdar räkningen");
});

prov("sviten går över månadsskiftet", () => {
  const over = [
    g("a", "2026-09-01", "Sprungit", "2026-09-01T07:00:00.000Z"),
    g("b", "2026-08-31", "Sprungit", "2026-08-31T07:00:00.000Z"),
    g("c", "2026-08-30", "Sprungit", "2026-08-30T07:00:00.000Z"),
  ];
  lika(svit(over, "2026-09-01"), 3);
});

/* --- lagret ------------------------------------------------------- */

prov("en rad ur trasig data blir ritbar", () => {
  const x = normaliseraGjort({});
  lika(x.text, "");
  lika(x.kalenderId, "arbete");
  lika(x.raderad, null);
  lika(x.synkad, false);
});

prov("gravstenar städas som för alla andra sorter", () => {
  const o: Ogonblick = {
    handelser: [],
    kalendrar: [],
    uppgifter: [],
    anteckningar: [],
    sidor: [],
    lappar: [],
    gjort: [
      normaliseraGjort({ id: "levande", datum: "2026-08-12" }),
      normaliseraGjort({
        id: "gammal",
        raderad: "2026-01-01T00:00:00.000Z",
        synkad: true,
      }),
    ],
  };
  const kvar = stadaGravstenar(o, new Date("2026-08-12T00:00:00Z"));
  lika(kvar.gjort.map((x) => x.id), ["levande"]);
});

prov("raderna följer med när en kalender tas bort", () => {
  // De delar kalender med händelserna. Glöms de bort blir de osynliga
  // men ligger kvar i lagret.
  const o: Ogonblick = {
    handelser: [],
    kalendrar: STANDARDKALENDRAR,
    uppgifter: [],
    anteckningar: [],
    sidor: [],
    lappar: [],
    gjort: [normaliseraGjort({ id: "x", kalenderId: "traning", datum: "2026-08-12" })],
  };
  const flyttad = taBortKalender(o, "traning", "privat");
  lika(flyttad.gjort[0].kalenderId, "privat");
  lika(flyttad.gjort[0].raderad, null);

  const raderad = taBortKalender(o, "traning", null);
  lika(raderad.gjort[0].raderad !== null, true, "raden gravsätts");
});

process.stdout.write(
  `\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`
);
if (fel > 0) process.exit(1);
