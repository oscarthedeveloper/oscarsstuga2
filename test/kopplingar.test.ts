/**
 * Prov för kopplingarna.
 *
 * Det som mäts är att en länk hittar fram trots att den skrivits av en
 * människa: fel skiftläge, extra blanksteg, och ett mål som ännu inte
 * finns. Just de tre fallen är normala, inte undantag — man skriver
 * [[kvartalsrapporten]] när man tänker på den och skapar posten sedan.
 */

import {
  bakatlankar,
  byggRegister,
  delaText,
  hittaLankar,
  nyckelFor,
  slaUpp,
  svavandeLankar,
} from "../lib/kopplingar";
import {
  normalisera,
  normaliseraAnteckning,
  normaliseraUppgift,
} from "../lib/butik";
import type { Anteckning, Handelse, Uppgift } from "../lib/typer";

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

const h = (id: string, titel: string, anteckning = ""): Handelse =>
  normalisera({
    id,
    titel,
    anteckning,
    kalenderId: "arbete",
    start: "2026-08-12T09:00",
    slut: "2026-08-12T10:00",
  });

const u = (id: string, titel: string, anteckning = ""): Uppgift =>
  normaliseraUppgift({ id, titel, anteckning, kalenderId: "arbete" });

const a = (id: string, titel: string, brodtext = ""): Anteckning =>
  normaliseraAnteckning({ id, titel, brodtext, kalenderId: "arbete" });

process.stdout.write("\nKOPPLINGAR\n");

prov("hittar länkar i text", () => {
  lika(hittaLankar("se [[Budget]] och [[Möte med Anna]]"), [
    "Budget",
    "Möte med Anna",
  ]);
});

prov("dubbletter räknas en gång", () => {
  lika(hittaLankar("[[Budget]] igen [[budget]]"), ["Budget"]);
});

prov("tomma och trasiga länkar hoppas över", () => {
  lika(hittaLankar("[[]] [[ ]] [[ok]]"), ["ok"]);
  lika(hittaLankar("bara [[ en halv"), []);
  lika(hittaLankar(""), []);
});

prov("skiftläge och blanksteg avgör inte", () => {
  lika(nyckelFor("  Kvartals   Rapporten "), "kvartals rapporten");
});

prov("registret slår upp över alla tre sorterna", () => {
  const kalla = {
    handelser: [h("h1", "Kickoff")],
    uppgifter: [u("u1", "Boka lokal")],
    anteckningar: [a("a1", "Planering")],
  };
  const reg = byggRegister(kalla);
  lika(slaUpp(reg, "kickoff")?.slag, "handelse");
  lika(slaUpp(reg, "BOKA LOKAL")?.slag, "uppgift");
  lika(slaUpp(reg, "Planering")?.slag, "anteckning");
  lika(slaUpp(reg, "finns inte"), null);
});

prov("anteckningen vinner när titlar krockar", () => {
  const reg = byggRegister({
    handelser: [h("h1", "Budget")],
    uppgifter: [],
    anteckningar: [a("a1", "Budget")],
  });
  lika(slaUpp(reg, "budget")?.id, "a1");
});

prov("texten delas i bitar utan att tappa tecken", () => {
  const reg = byggRegister({
    handelser: [],
    uppgifter: [],
    anteckningar: [a("a1", "Budget")],
  });
  const bitar = delaText("före [[Budget]] efter", reg);
  lika(bitar.length, 3);
  lika(bitar.map((b) => (b.typ === "text" ? b.text : b.text)).join(""), "före Budget efter");
  lika(bitar[1].typ, "lank");
});

prov("länk utan mål är inte ett fel", () => {
  const bitar = delaText("se [[Finns inte]]", byggRegister({ handelser: [], uppgifter: [] }));
  const lank = bitar.find((b) => b.typ === "lank");
  lika(lank?.typ, "lank");
  if (lank?.typ === "lank") lika(lank.mal, null);
});

prov("bakåtlänkar hittar allt som pekar hit", () => {
  const kalla = {
    handelser: [h("h1", "Kickoff", "läs [[Planering]] först")],
    uppgifter: [u("u1", "Boka lokal", "enligt [[planering]]")],
    anteckningar: [a("a1", "Planering", "själva dokumentet")],
  };
  const in_ = bakatlankar(kalla, { titel: "Planering", id: "a1" });
  lika(in_.length, 2);
  lika(new Set(in_.map((r) => r.slag)), new Set(["handelse", "uppgift"]));
});

prov("en post länkar inte till sig själv", () => {
  const kalla = {
    handelser: [],
    uppgifter: [],
    anteckningar: [a("a1", "Loop", "jag nämner [[Loop]]")],
  };
  lika(bakatlankar(kalla, { titel: "Loop", id: "a1" }).length, 0);
});

prov("bakåtlänken bär meningen den stod i", () => {
  const kalla = {
    handelser: [],
    uppgifter: [],
    anteckningar: [
      a("a1", "Veckan", "måndag var lugn\nvi sköt [[Rapporten]] till mars"),
      a("a2", "Rapporten", ""),
    ],
  };
  const in_ = bakatlankar(kalla, { titel: "Rapporten", id: "a2" });
  lika(in_.length, 1);
  lika(in_[0].utdrag, "vi sköt Rapporten till mars", "rätt rad, utan hakar");
});

prov("svävande länkar listas för att kunna skapas", () => {
  const kalla = {
    handelser: [h("h1", "Kickoff", "se [[Agendan]]")],
    uppgifter: [],
    anteckningar: [a("a1", "Planering", "se [[Agendan]] och [[Planering]]")],
  };
  lika(svavandeLankar(kalla), ["Agendan"], "Planering finns ju");
});

process.stdout.write(
  `\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`
);
if (fel > 0) process.exit(1);
