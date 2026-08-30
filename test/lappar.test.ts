/**
 * Prov för parkeringen.
 *
 * Lappen är den enda posten i appen som är tänkt att FÖRSVINNA när den
 * lyckas: den dras in i rutnätet, blir en händelse, och är därmed
 * förbrukad. Tyngdpunkten ligger därför på översättningen — att titel,
 * kalender och längd verkligen följer med — och på räkningen från
 * pekarens y-läge till ett klockslag, som är det enda på vägen som kan
 * bli tyst fel.
 */

import {
  FORVALD_TIMME,
  LANGDER,
  STANDARDLANGD,
  klamMinuter,
  langdText,
  lappUtkast,
  minutUnderPekaren,
  nastaLangd,
  slapptid,
  sorteraLappar,
} from "../lib/lappar";
import {
  klamLangd,
  normaliseraLapp,
  stadaGravstenar,
  taBortKalender,
  STANDARDKALENDRAR,
  type Ogonblick,
} from "../lib/butik";
import type { Lapp } from "../lib/typer";
import { stampel } from "../lib/tid";

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

const lapp = (delar: Partial<Lapp> = {}): Lapp =>
  normaliseraLapp({
    id: "l1",
    titel: "Träffa Anna",
    minuter: 60,
    kalenderId: "privat",
    skapad: "2026-08-10T09:00:00.000Z",
    ...delar,
  });

process.stdout.write("\nPARKERINGEN\n");

/* --- längden ------------------------------------------------------ */

prov("längden hålls inom ett dygn och på minst en kvart", () => {
  // Noll är inte en längd utan en punkt, och en händelse utan
  // varaktighet går inte att ta tag i när den väl ligger i rutnätet.
  lika(klamMinuter(60), 60);
  lika(klamMinuter(0), 15);
  lika(klamMinuter(-30), 15);
  lika(klamMinuter(5000), 1440);
  lika(klamMinuter("strunt"), STANDARDLANGD);
  lika(klamMinuter(undefined), STANDARDLANGD);
  // Lagret har sin egen kopia av regeln, och de två måste hålla ihop.
  for (const n of [0, 15, 60, 5000, -1]) lika(klamLangd(n), klamMinuter(n));
});

prov("längden skrivs som man säger den", () => {
  // Aldrig "1,5 h" — ingen tänker i decimaler om en timme och en halv.
  lika(langdText(30), "30 min");
  lika(langdText(60), "1 h");
  lika(langdText(90), "1 h 30");
  lika(langdText(120), "2 h");
  lika(langdText(15), "15 min");
});

prov("längdknappen stegar runt", () => {
  lika(nastaLangd(15), 30);
  lika(nastaLangd(60), 90);
  lika(nastaLangd(LANGDER[LANGDER.length - 1]), LANGDER[0], "sista går runt");
  // Ett värde utanför listan — t.ex. satt för hand i händelsepanelen och
  // tillbakaskrivet — får inte låsa knappen. Då börjar den om på förvalet.
  lika(nastaLangd(37), STANDARDLANGD);
});

/* --- ordningen ---------------------------------------------------- */

prov("nyast överst", () => {
  // Parkeringen är en hög man lägger på, inte en kö man arbetar av
  // uppifrån. Lappen man just skrev är den man skall placera.
  const lista = [
    lapp({ id: "gammal", skapad: "2026-08-01T09:00:00.000Z" }),
    lapp({ id: "ny", skapad: "2026-08-20T09:00:00.000Z" }),
    lapp({ id: "mitten", skapad: "2026-08-10T09:00:00.000Z" }),
  ];
  lika(sorteraLappar(lista).map((l) => l.id), ["ny", "mitten", "gammal"]);
});

prov("lika gamla lappar ligger stilla", () => {
  // Två lappar skapade samma millisekund får inte byta plats mellan två
  // renderingar — en lista som hoppar går inte att sikta i.
  const lista = [lapp({ id: "b" }), lapp({ id: "a" })];
  lika(sorteraLappar(lista).map((l) => l.id), ["a", "b"]);
  lika(sorteraLappar(lista).map((l) => l.id), ["a", "b"]);
});

/* --- släpptiden --------------------------------------------------- */

prov("minuten under pekaren snäpps till kvartar", () => {
  // 52 bildpunkter per timme är förvalet i rutnätet.
  lika(minutUnderPekaren(52, 0, 52), 60, "en timme ned");
  lika(minutUnderPekaren(26, 0, 52), 30);
  lika(minutUnderPekaren(30, 0, 52), 30, "34,6 minuter snäpps till 30");
  lika(minutUnderPekaren(0, 0, 52), 0);
});

prov("en rullad kolumn har negativ överkant", () => {
  // Rutnätet är rullat, så kolumnens övre kant ligger ofta ovanför
  // fönstret. Talet är då negativt, och det är riktigt.
  lika(minutUnderPekaren(100, -412, 52), 585, "9,45 in på dygnet");
});

prov("pekaren kan inte hamna utanför dygnet", () => {
  // Drar man ovanför rutnätets överkant eller nedanför dess nederkant
  // skall lappen landa på dygnets första respektive sista kvart — inte
  // på gårdagen eller på ett klockslag som inte finns.
  lika(minutUnderPekaren(-500, 0, 52), 0);
  lika(minutUnderPekaren(99999, 0, 52), 1425);
});

prov("en timhöjd på noll ger noll och inte NaN", () => {
  // Ett NaN i ett SVG- eller stilattribut ritar tyst ingenting alls.
  lika(minutUnderPekaren(100, 0, 0), 0);
  lika(minutUnderPekaren(100, 0, Number.NaN), 0);
});

prov("släppet blir ett klockslag på rätt dag", () => {
  const t = slapptid("2026-08-14", 585);
  lika(stampel(t!), "2026-08-14T09:45");
});

prov("en vy utan klockslag ger nio på morgonen", () => {
  // Månadsvyn vet vilken DAG man siktade på men inte vilken timme. En
  // gissning mitt på dagen hade varit lika godtycklig men svårare att
  // förutsäga; nio är samma svar som en dubbelklick där redan ger.
  const t = slapptid("2026-08-14", null);
  lika(stampel(t!), `2026-08-14T0${FORVALD_TIMME}:00`);
});

prov("en dagnyckel som inte är ett datum ger ingen tid alls", () => {
  // Hellre att ingenting händer än en händelse på ett gissat datum.
  lika(slapptid("", 60), null);
  lika(slapptid("i somras", 60), null);
  lika(slapptid("2026-08", 60), null);
});

/* --- översättningen till en händelse ------------------------------ */

prov("titel, anteckning och kalender följer med", () => {
  // Det är hela poängen med att ha skrivit lappen.
  const u = lappUtkast(
    lapp({ titel: "Lunch med Erik", anteckning: "Boka bord", minuter: 90 }),
    new Date(2026, 7, 14, 12, 0)
  );
  lika(u.titel, "Lunch med Erik");
  lika(u.anteckning, "Boka bord");
  lika(u.kalenderId, "privat");
  lika(u.start, "2026-08-14T12:00");
  lika(u.slut, "2026-08-14T13:30", "lappens längd, inte en timme");
  lika(u.heldag, false);
});

prov("en lapp blir aldrig en serie", () => {
  // En lapp är en enskild sak man skall få gjord, och en upprepning ur
  // ett släpp vore en överraskning.
  lika(lappUtkast(lapp(), new Date(2026, 7, 14, 9, 0)).upprepning, undefined);
});

prov("en namnlös lapp blir en namnlös händelse och inte tom", () => {
  lika(lappUtkast(lapp({ titel: "   " }), new Date(2026, 7, 14, 9)).titel, "Utan titel");
});

prov("längden överlever ett släpp över midnatt", () => {
  // `medMinuter` rullar över av sig själv, och det skall den få göra.
  const u = lappUtkast(
    lapp({ minuter: 120 }),
    new Date(2026, 7, 14, 23, 30)
  );
  lika(u.start, "2026-08-14T23:30");
  lika(u.slut, "2026-08-15T01:30");
});

/* --- lagret ------------------------------------------------------- */

prov("en lapp ur trasig data blir ritbar", () => {
  const l = normaliseraLapp({});
  lika(l.titel, "");
  lika(l.minuter, STANDARDLANGD);
  lika(l.kalenderId, "arbete");
  lika(l.raderad, null);
  lika(l.synkad, false);
});

prov("gravstenar städas som för alla andra sorter", () => {
  const o: Ogonblick = {
    handelser: [],
    kalendrar: [],
    uppgifter: [],
    anteckningar: [],
    sidor: [],
    lappar: [
      normaliseraLapp({ id: "levande" }),
      normaliseraLapp({
        id: "gammal",
        raderad: "2026-01-01T00:00:00.000Z",
        synkad: true,
      }),
      normaliseraLapp({
        id: "fersk",
        raderad: "2026-08-10T00:00:00.000Z",
        synkad: true,
      }),
    ],
  };
  const kvar = stadaGravstenar(o, new Date("2026-08-12T00:00:00Z"));
  lika(kvar.lappar.map((l) => l.id), ["levande", "fersk"]);
});

prov("lapparna följer med när en kalender tas bort", () => {
  // De delar kalender med händelserna. Glöms de bort blir de osynliga
  // men ligger kvar i lagret.
  const o: Ogonblick = {
    handelser: [],
    kalendrar: STANDARDKALENDRAR,
    uppgifter: [],
    anteckningar: [],
    sidor: [],
    lappar: [normaliseraLapp({ id: "l1", kalenderId: "privat" })],
  };
  const flyttad = taBortKalender(o, "privat", "arbete");
  lika(flyttad.lappar[0].kalenderId, "arbete");
  lika(flyttad.lappar[0].raderad, null);

  const raderad = taBortKalender(o, "privat", null);
  lika(raderad.lappar[0].kalenderId, "privat", "kalendern rörs inte");
  lika(raderad.lappar[0].raderad !== null, true, "lappen gravsätts");
});

process.stdout.write(
  `\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`
);
if (fel > 0) process.exit(1);
