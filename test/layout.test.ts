/**
 * Prov för layouten av överlappande händelser.
 *
 * Sedan trappan ersatte den delade bredden är det två egenskaper som
 * måste hålla, och de drar åt olika håll:
 *
 *   Varje block skall nå högerkanten — annars är det ingen trappa utan
 *   bara smalare block.
 *
 *   Ett block som INTE krockar med något skall ligga orört i vänsterkant
 *   i full bredd — annars straffas hela dagen för en krock på morgonen,
 *   vilket var hela felet med den gamla uträkningen.
 */

import { laggUt, type Packbar } from "../lib/layout";

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

function nara(fick: number, vantat: number, vad = "", tol = 0.0001) {
  if (Math.abs(fick - vantat) > tol) {
    throw new Error(`${vad}\n       fick ${fick}, väntade ${vantat}`);
  }
}

/** Ett block klockan `fran`–`till` samma dag. */
const b = (nyckel: string, fran: string, till: string): Packbar => ({
  nyckel,
  start: new Date(`2026-08-12T${fran}:00`),
  slut: new Date(`2026-08-12T${till}:00`),
});

const TRAPPSTEG = 0.18;

process.stdout.write("\nLAYOUT — TRAPPAN\n");

prov("ensam händelse tar hela bredden och täcker inget", () => {
  const ut = laggUt([b("a", "09:00", "10:00")]);
  lika(ut.get("a"), { vanster: 0, bredd: 1, lager: 1, over: false });
});

prov("händelser som inte krockar ligger båda i vänsterkant", () => {
  const ut = laggUt([b("a", "09:00", "10:00"), b("b", "11:00", "12:00")]);
  lika(ut.get("a")?.vanster, 0);
  lika(ut.get("b")?.vanster, 0);
  lika(ut.get("a")?.bredd, 1);
  lika(ut.get("b")?.bredd, 1);
});

prov("två som krockar bildar en trappa, den första överst", () => {
  const ut = laggUt([b("a", "09:00", "10:00"), b("b", "09:00", "10:00")]);
  const a = ut.get("a")!;
  const b2 = ut.get("b")!;
  nara(a.vanster, 0, "den första ligger kvar i kanten");
  nara(b2.vanster, TRAPPSTEG, "den andra skjuts in ett steg");
  lika(a.lager > b2.lager, true, "den som börjar först skall ligga överst");
  lika(a.over, true, "den översta täcker något och skall släppa igenom");
  lika(b2.over, false, "den understa har inget under sig");
});

prov("vid samma start ligger det kortaste mötet överst", () => {
  // Arbetsdagens vanligaste fall: ett halvtimmesmöte inne i ett pass.
  const ut = laggUt([b("pass", "09:00", "11:00"), b("mote", "09:00", "09:30")]);
  const pass = ut.get("pass")!;
  const mote = ut.get("mote")!;
  lika(mote.lager > pass.lager, true, "det korta mötet skall ligga överst");
  lika(mote.over, true, "och släppa igenom passet under");
  lika(pass.over, false);
  // Passet behåller vänsterkanten och full bredd — det är bakgrunden.
  lika(pass.vanster, 0);
  lika(pass.bredd, 1);
  nara(mote.vanster, TRAPPSTEG, "mötet skjuts in ett steg");
});

prov("tre möten i samma pass staplas kortast överst", () => {
  const ut = laggUt([
    b("pass", "09:00", "12:00"),
    b("lang", "09:00", "11:00"),
    b("kort", "09:00", "09:15"),
  ]);
  const z = (n: string) => ut.get(n)!.lager;
  lika(z("kort") > z("lang") && z("lang") > z("pass"), true);
  lika(ut.get("pass")!.over, false, "understa täcker ingen");
});

prov("starttiden väger tyngre än längden", () => {
  // Ett kort möte som börjar SENARE skall inte hoppa upp över ett
  // långt som redan var igång.
  const ut = laggUt([b("lang", "09:00", "11:00"), b("kort", "10:00", "10:15")]);
  lika(ut.get("lang")!.lager > ut.get("kort")!.lager, true);
});

prov("den som börjar tidigast ligger överst oavsett spår", () => {
  const ut = laggUt([
    b("tidig", "09:00", "11:00"),
    b("mitten", "09:30", "11:00"),
    b("sen", "10:00", "11:00"),
  ]);
  const z = (n: string) => ut.get(n)!.lager;
  lika(z("tidig") > z("mitten") && z("mitten") > z("sen"), true);
  lika(ut.get("sen")!.over, false, "den understa täcker ingen");
});

prov("genomskinlighet bara när något faktiskt ligger under", () => {
  // A 09–10 och B 09:30–10:30 krockar; C 10:15–11 rör inte A alls.
  const ut = laggUt([
    b("a", "09:00", "10:00"),
    b("b", "09:30", "10:30"),
    b("c", "10:15", "11:00"),
  ]);
  lika(ut.get("a")!.over, true, "A ligger över B");
  lika(ut.get("b")!.over, true, "B ligger över C");
  lika(ut.get("c")!.over, false, "C har inget under sig");
});

prov("varje block når högerkanten", () => {
  const ut = laggUt([
    b("a", "09:00", "11:00"),
    b("b", "09:30", "11:00"),
    b("c", "10:00", "11:00"),
  ]);
  for (const [nyckel, l] of ut) {
    nara(l.vanster + l.bredd, 1, `${nyckel} slutar inte vid kanten`);
  }
});

prov("spår återanvänds — ett senare möte skjuts inte in i onödan", () => {
  // A 09–10 och B 09:30–10:30 krockar. C 10:15–11 krockar bara med B,
  // och skall därför ärva A:s spår i stället för att bli ett tredje.
  const ut = laggUt([
    b("a", "09:00", "10:00"),
    b("b", "09:30", "10:30"),
    b("c", "10:15", "11:00"),
  ]);
  lika(ut.get("a")?.vanster, 0);
  nara(ut.get("b")!.vanster, TRAPPSTEG);
  lika(ut.get("c")?.vanster, 0, "C skall ligga i samma spår som A");
  lika(ut.get("c")?.bredd, 1);
});

prov("en krock på morgonen krymper inte eftermiddagen", () => {
  const ut = laggUt([
    b("a", "09:00", "10:00"),
    b("b", "09:00", "10:00"),
    b("c", "09:00", "10:00"),
    b("sen", "14:00", "15:00"),
  ]);
  const sen = ut.get("sen")!;
  lika({ vanster: sen.vanster, bredd: sen.bredd, over: sen.over }, {
    vanster: 0,
    bredd: 1,
    over: false,
  });
});

prov("många krockar trycker ihop stegen i stället för att svämma över", () => {
  const manga = Array.from({ length: 8 }, (_, i) =>
    b(`x${i}`, "09:00", "10:00")
  );
  const ut = laggUt(manga);
  const inskjut = [...ut.values()].map((l) => l.vanster);
  lika(Math.max(...inskjut) <= 0.72 + 0.0001, true, "trappan går ut ur kolumnen");
  lika(Math.min(...ut.values().next().value ? inskjut : [0]) >= 0, true);
  // Det understa blocket behåller alltid en läsbar bit.
  const smalast = Math.min(...[...ut.values()].map((l) => l.bredd));
  lika(smalast >= 0.28 - 0.0001, true, `smalaste blocket blev ${smalast}`);
});

prov("ett femminutersmöte gömmer sig inte helt", () => {
  // MINSTA ger korta block en golvlängd vid uträkningen, så att de
  // räknas som krockande och får ett eget spår.
  const ut = laggUt([b("lang", "09:00", "10:00"), b("kort", "09:02", "09:07")]);
  lika(ut.get("kort")!.vanster > 0, true, "det korta blocket fick inget eget spår");
});

prov("tom lista ger tom layout", () => {
  lika(laggUt([]).size, 0);
});

prov("ordningen på indata spelar ingen roll", () => {
  const ett = laggUt([b("a", "09:00", "10:00"), b("b", "09:30", "10:30")]);
  const tva = laggUt([b("b", "09:30", "10:30"), b("a", "09:00", "10:00")]);
  lika(ett.get("a"), tva.get("a"));
  lika(ett.get("b"), tva.get("b"));
});

process.stdout.write(
  `\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`
);
if (fel > 0) process.exit(1);
