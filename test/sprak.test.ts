/**
 * Prov för språkbiblioteket.
 *
 * Tre saker bär det och provas därför hårdast:
 *
 *   TOLKNINGEN, som tar emot `unknown` ur en JSONB-kolumn databasen inte
 *   kontrollerar. Ett bibliotek som vägrar öppna för att ett block har
 *   fel form är ett bibliotek man har tappat.
 *
 *   TRÄDSTÄDNINGEN. Tar man bort en hylla utan att ta med mapparna blir
 *   de kvar i lagret utan väg fram till dem — osynliga, synkade och
 *   växande.
 *
 *   MARKERINGEN, där en ensam stjärna i en mening om grammatik inte får
 *   öppna en kursivering som sträcker sig genom halva stycket.
 */

import {
  bladI,
  bladMed,
  flytta,
  hyllaMed,
  klamTon,
  mappMed,
  mapparI,
  nyttBlock,
  taBortHylla,
  taBortMapp,
  tolkaBlock,
  tolkaOmslag,
  tolkaSprakData,
  TOM_SPRAK,
  type SprakData,
} from "../lib/sidor/sprak";
import { delaMarkering, renText } from "../lib/sidor/markering";
import { dataUrlByte } from "../lib/bild";

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

/** Ett litet bibliotek att fråga på. */
const BIBLIOTEK: SprakData = tolkaSprakData({
  hyllor: [
    { id: "it", namn: "Italienska", ton: 2 },
    { id: "de", namn: "Tyska", ton: 3 },
  ],
  mappar: [
    { id: "verb", hyllaId: "it", titel: "Verb", bihang: "A2–B1" },
    { id: "idiom", hyllaId: "it", titel: "Idiom", bihang: "" },
    { id: "kasus", hyllaId: "de", titel: "Kasus", bihang: "" },
  ],
  blad: [
    { id: "konj", mappId: "verb", titel: "Konjunktiv", block: [] },
    { id: "pres", mappId: "verb", titel: "Presens", block: [] },
    { id: "dat", mappId: "kasus", titel: "Dativ", block: [] },
  ],
});

process.stdout.write("\nSPRÅKBIBLIOTEKET\n");

/* --- tolkningen --------------------------------------------------- */

prov("skräp in ger ett tomt men användbart bibliotek", () => {
  for (const skrap of [null, undefined, 0, "nej", [], true]) {
    lika(tolkaSprakData(skrap), TOM_SPRAK, `föll på ${JSON.stringify(skrap)}`);
  }
});

prov("poster utan id får ett stabilt sådant", () => {
  const d = tolkaSprakData({ hyllor: [{ namn: "Italienska" }, {}] });
  lika(d.hyllor.map((h) => h.id), ["h0", "h1"]);
});

prov("tonen kläms till paletten", () => {
  lika(klamTon(0), 0);
  lika(klamTon(5), 5);
  lika(klamTon(6), 0, "sex toner finns, inte sju");
  lika(klamTon(-1), 5);
  lika(klamTon("x"), 0);
});

prov("alla tio blocktyperna tolkas", () => {
  const typer = [
    "text",
    "rubrik",
    "tabell",
    "flikar",
    "ruta",
    "bojning",
    "ordpar",
    "parallell",
    "belagg",
    "fakta",
  ];
  const block = tolkaBlock(typer.map((typ, i) => ({ id: `b${i}`, typ })));
  lika(block.map((b) => b.typ), typer);
});

prov("okänd blocktyp faller bort i stället för att krascha", () => {
  const block = tolkaBlock([
    { id: "a", typ: "text", text: "kvar" },
    { id: "b", typ: "hologram" },
    { id: "c", typ: "rubrik", text: "också kvar" },
  ]);
  lika(block.map((b) => b.id), ["a", "c"]);
});

prov("halva block fylls i med tomma värden", () => {
  const block = tolkaBlock([{ typ: "tabell" }, { typ: "ruta" }]);
  lika(block[0], {
    id: "bl0",
    typ: "tabell",
    rubrik: "",
    rubriker: [],
    rader: [],
    framhavda: [],
  });
  lika(block[1], { id: "bl1", typ: "ruta", slag: "info", titel: "", text: "" });
});

prov("okänt rutslag blir info", () => {
  const block = tolkaBlock([{ typ: "ruta", slag: "katastrof" }]);
  lika(block[0].typ === "ruta" && block[0].slag, "info");
});

prov("tabellceller som inte är text blir tomma strängar", () => {
  const block = tolkaBlock([
    { typ: "tabell", rubriker: ["A", 5, null], rader: [["x", { }], "inte en rad"] },
  ]);
  lika(block[0], {
    id: "bl0",
    typ: "tabell",
    rubrik: "",
    rubriker: ["A", "", ""],
    rader: [["x", ""]],
    framhavda: [],
  });
});

prov("framhävda rader som pekar utanför tabellen avvisas", () => {
  // Ett index som pekar på en rad som inte finns skulle framhäva fel
  // rad — eller ingen — och det syns bara om man råkar titta.
  const block = tolkaBlock([
    { typ: "tabell", rubriker: ["A"], rader: [["x"], ["y"]], framhavda: [0, 5, -1, 1.5, "nej"] },
  ]);
  lika(block[0].typ === "tabell" && block[0].framhavda, [0]);
});

prov("belägg och faktarad tolkas", () => {
  const block = tolkaBlock([
    { typ: "belagg", citat: "Land skal", kalla: "Upplandslagen" },
    { typ: "fakta", rader: [{ etikett: "Kasus", varde: "Dativ" }, "nej"] },
  ]);
  lika(block[0], {
    id: "bl0",
    typ: "belagg",
    citat: "Land skal",
    kalla: "Upplandslagen",
    kommentar: "",
  });
  lika(block[1], {
    id: "bl1",
    typ: "fakta",
    rader: [{ etikett: "Kasus", varde: "Dativ" }],
  });
});

prov("bladets underrubrik och utkastmärke tolkas", () => {
  const d = tolkaSprakData({
    blad: [
      { id: "a", mappId: "m", titel: "Dativ", underrubrik: "Indirekt objekt", utkast: true },
      { id: "b", mappId: "m", titel: "Genitiv" },
      { id: "c", mappId: "m", titel: "X", utkast: "ja" },
    ],
  });
  lika(d.blad[0].underrubrik, "Indirekt objekt");
  lika(d.blad[0].utkast, true);
  lika(d.blad[1].underrubrik, "");
  lika(d.blad[1].utkast, false, "saknat märke är inget utkast");
  lika(d.blad[2].utkast, false, "bara sant boolskt värde räknas");
});

prov("omslag godtar bara riktiga bild-URL:er", () => {
  const o = tolkaOmslag({
    bra: "data:image/jpeg;base64,AAAA",
    ond: "javascript:alert(1)",
    tom: "",
    fel: 42,
  });
  lika(Object.keys(o), ["bra"]);
});

/* --- trädet ------------------------------------------------------- */

prov("trädfrågor", () => {
  lika(mapparI(BIBLIOTEK, "it").map((m) => m.id), ["verb", "idiom"]);
  lika(bladI(BIBLIOTEK, "verb").map((b) => b.id), ["konj", "pres"]);
  lika(hyllaMed(BIBLIOTEK, "de")?.namn, "Tyska");
  lika(mappMed(BIBLIOTEK, "kasus")?.titel, "Kasus");
  lika(bladMed(BIBLIOTEK, "dat")?.titel, "Dativ");
  lika(hyllaMed(BIBLIOTEK, "finns-ej"), null);
});

prov("borttagen hylla tar med sig mappar och blad", () => {
  const kvar = taBortHylla(BIBLIOTEK, "it");
  lika(kvar.hyllor.map((h) => h.id), ["de"]);
  lika(kvar.mappar.map((m) => m.id), ["kasus"], "mapparna blev kvar");
  lika(kvar.blad.map((b) => b.id), ["dat"], "bladen blev kvar");
});

prov("borttagen mapp tar med sig sina blad", () => {
  const kvar = taBortMapp(BIBLIOTEK, "verb");
  lika(kvar.mappar.map((m) => m.id), ["idiom", "kasus"]);
  lika(kvar.blad.map((b) => b.id), ["dat"]);
  lika(kvar.hyllor.length, 2, "hyllorna rördes inte");
});

/* --- ordningen ---------------------------------------------------- */

prov("flytt ett steg", () => {
  lika(flytta(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
  lika(flytta(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
});

prov("flytt utanför kanten gör ingenting", () => {
  const lista = ["a", "b", "c"];
  lika(flytta(lista, 0, -1), lista);
  lika(flytta(lista, 2, 1), lista);
  lika(flytta(lista, -1, 1), lista);
  lika(flytta(lista, 9, -1), lista);
});

prov("nytt böjningsblock kommer med italienska personer ifyllda", () => {
  const b = nyttBlock("bojning", "x");
  lika(b.typ, "bojning");
  if (b.typ === "bojning") {
    lika(b.rader.map((r) => r.etikett), [
      "io",
      "tu",
      "lui/lei",
      "noi",
      "voi",
      "loro",
    ]);
  }
});

prov("okänd blocktyp ger ett textblock", () => {
  lika(nyttBlock("hologram" as never, "x").typ, "text");
});

/* --- markeringen -------------------------------------------------- */

prov("fet, kursiv och kod", () => {
  lika(delaMarkering("en **fet** och en *kursiv* och `kod`"), [
    { slag: "text", text: "en " },
    { slag: "fet", text: "fet" },
    { slag: "text", text: " och en " },
    { slag: "kursiv", text: "kursiv" },
    { slag: "text", text: " och " },
    { slag: "kod", text: "kod" },
  ]);
});

prov("dubbla stjärnor vinner över enkla", () => {
  lika(delaMarkering("**fet**"), [{ slag: "fet", text: "fet" }]);
});

prov("en ensam stjärna öppnar ingen markering", () => {
  // Vanligt i grammatik: * märker ut en ogrammatisk form.
  lika(delaMarkering("*ho andato är fel"), [
    { slag: "text", text: "*ho andato är fel" },
  ]);
});

prov("markering sträcker sig aldrig över en radbrytning", () => {
  lika(delaMarkering("*en\nrad*"), [{ slag: "text", text: "*en\nrad*" }]);
});

prov("tom text ger inga bitar", () => {
  lika(delaMarkering(""), []);
});

prov("ren text tar bort tecknen", () => {
  lika(renText("**credo** che *sia* `bene`"), "credo che sia bene");
});

/* --- bilden ------------------------------------------------------- */

prov("data-URL:ens storlek uppskattas", () => {
  // Fyra base64-tecken är tre byte.
  lika(dataUrlByte("data:image/jpeg;base64,AAAABBBB"), 6);
  lika(dataUrlByte("inte en url"), 0);
});

process.stdout.write(
  `\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`
);
if (fel > 0) process.exit(1);
