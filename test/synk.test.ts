/**
 * Prov för synkmotorn.
 *
 * Det som mäts är sammanfogningen — den punkt där data faktiskt kan gå
 * förlorad. Nätverkslagret är inte med; det är tunt och utbytbart, medan
 * regeln om vem som vinner är det som avgör om kalendern går att lita på.
 *
 * Scenarierna är skrivna som berättelser om två enheter, eftersom det är
 * så felen uppstår i verkligheten: telefonen i tunnelbanan och datorn på
 * kontoret ändrar samma möte, och först en timme senare möts de.
 */

import { sammanfoga, sammanfogaKalendrar, osynkade, antalIvag } from "../lib/synk";
import {
  gravsatt,
  levande,
  normalisera,
  normaliseraKalender,
  rord,
  stadaGravstenar,
  taBortKalender,
  type Ogonblick,
} from "../lib/butik";
import type { Handelse, Kalender } from "../lib/typer";

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

const T = (t: string) => `2026-08-1${t}`;

function h(
  id: string,
  titel: string,
  andrad: string,
  extra: Partial<Handelse> = {}
): Handelse {
  return normalisera({
    id,
    titel,
    start: "2026-08-12T09:00",
    slut: "2026-08-12T10:00",
    kalenderId: "arbete",
    andrad,
    ...extra,
  });
}

function k(id: string, namn: string, andrad: string, extra: Partial<Kalender> = {}) {
  return normaliseraKalender({ id, namn, ton: 0, andrad, ...extra });
}

process.stdout.write("\nSynkmotorn\n");

/* --- grundfall ---------------------------------------------------- */

prov("post som bara finns lokalt behålls", () => {
  const ut = sammanfoga([h("a", "Möte", T("0T10:00:00Z"))], []);
  lika(ut.map((x) => x.titel), ["Möte"]);
});

prov("post som bara finns i molnet hämtas hem", () => {
  const ut = sammanfoga([], [h("a", "Möte", T("0T10:00:00Z"), { synkad: true })]);
  lika(ut.map((x) => x.titel), ["Möte"]);
  lika(ut[0].synkad, true);
});

prov("nyare lokal ändring vinner över molnet", () => {
  const ut = sammanfoga(
    [h("a", "Telefonens titel", T("0T12:00:00Z"))],
    [h("a", "Molnets titel", T("0T11:00:00Z"), { synkad: true })]
  );
  lika(ut[0].titel, "Telefonens titel");
  lika(ut[0].synkad, false, "den lokala vinnaren måste skickas upp");
});

prov("nyare fjärrändring vinner över den lokala", () => {
  const ut = sammanfoga(
    [h("a", "Telefonens titel", T("0T11:00:00Z"))],
    [h("a", "Molnets titel", T("0T12:00:00Z"), { synkad: true })]
  );
  lika(ut[0].titel, "Molnets titel");
  lika(ut[0].synkad, true, "fjärrvinnaren är redan i molnet");
});

prov("exakt lika stämplar avgörs likadant på varje enhet", () => {
  // Vid oavgjort vinner alltid molnet. Vore regeln "den lokala vinner"
  // skulle två enheter landa på var sitt svar och skriva över varandra
  // i all evighet.
  const a = sammanfoga(
    [h("a", "Enhet A", T("0T12:00:00Z"))],
    [h("a", "Molnet", T("0T12:00:00Z"), { synkad: true })]
  );
  const b = sammanfoga(
    [h("a", "Enhet B", T("0T12:00:00Z"))],
    [h("a", "Molnet", T("0T12:00:00Z"), { synkad: true })]
  );
  lika(a[0].titel, "Molnet");
  lika(b[0].titel, "Molnet");
});

/* --- gravstenar --------------------------------------------------- */

prov("borttagning i molnet slår igenom lokalt", () => {
  const ut = sammanfoga(
    [h("a", "Möte", T("0T10:00:00Z"), { synkad: true })],
    [h("a", "Möte", T("0T11:00:00Z"), { synkad: true, raderad: T("0T11:00:00Z") })]
  );
  lika(ut.length, 1, "gravstenen skall ligga kvar i lagret");
  lika(levande(ut).length, 0, "men posten skall inte synas");
});

prov("en post som ändrats lokalt EFTER borttagningen återuppstår", () => {
  // Detta är avsiktligt. Raderar man på datorn kl 11 och skriver om
  // samma möte på telefonen kl 12, är den senare avsikten den giltiga.
  const ut = sammanfoga(
    [h("a", "Omskriven", T("0T12:00:00Z"))],
    [h("a", "Möte", T("0T11:00:00Z"), { synkad: true, raderad: T("0T11:00:00Z") })]
  );
  lika(levande(ut).length, 1);
  lika(ut[0].titel, "Omskriven");
});

prov("en lokalt raderad post stannar raderad efter synk", () => {
  // Det klassiska felet: enheten som inte hört talas om borttagningen
  // skickar upp sin gamla kopia och posten kommer tillbaka. Gravstenen
  // har nyare stämpel och vinner.
  const lokal = gravsatt(h("a", "Möte", T("0T10:00:00Z")), T("2T09:00:00Z"));
  const ut = sammanfoga([lokal], [h("a", "Möte", T("0T10:00:00Z"), { synkad: true })]);
  lika(levande(ut).length, 0);
});

prov("gravstenar städas först när de nått molnet", () => {
  const gammal = gravsatt(h("a", "Gammal", T("0T10:00:00Z")), "2020-01-01T00:00:00Z");
  const o: Ogonblick = {
    handelser: [{ ...gammal, synkad: true }, { ...gammal, id: "b", synkad: false }],
    kalendrar: [],
  };
  const kvar = stadaGravstenar(o, new Date("2026-08-12T00:00:00Z"));
  // Den synkade gravstenen får försvinna; den osynkade måste vänta,
  // annars glöms borttagningen bort innan den hunnit ut.
  lika(kvar.handelser.map((x) => x.id), ["b"]);
});

prov("färska gravstenar rörs inte", () => {
  const fersk = {
    ...gravsatt(h("a", "Ny", T("0T10:00:00Z")), "2026-08-11T00:00:00Z"),
    synkad: true,
  };
  const kvar = stadaGravstenar(
    { handelser: [fersk], kalendrar: [] },
    new Date("2026-08-12T00:00:00Z")
  );
  lika(kvar.handelser.length, 1);
});

/* --- kalendrar ---------------------------------------------------- */

prov("kalenderns synlighet är en inställning per enhet", () => {
  // Att dölja Arbete på telefonen skall inte dölja den på datorn.
  const ut = sammanfogaKalendrar(
    [k("arbete", "Arbete", T("0T10:00:00Z"), { synlig: false })],
    [k("arbete", "Jobb", T("0T12:00:00Z"), { synlig: true, synkad: true })]
  );
  lika(ut[0].namn, "Jobb", "namnet skall komma från molnet");
  lika(ut[0].synlig, false, "synligheten skall vara enhetens egen");
});

prov("borttagen kalender tar med sig sina händelser som gravstenar", () => {
  const o: Ogonblick = {
    kalendrar: [k("a", "Arbete", T("0T10:00:00Z")), k("s", "Studier", T("0T10:00:00Z"))],
    handelser: [h("h1", "Möte", T("0T10:00:00Z"), { kalenderId: "s" })],
  };
  const ut = taBortKalender(o, "s", null);
  lika(levande(ut.kalendrar).map((x) => x.id), ["a"]);
  lika(levande(ut.handelser).length, 0);
  lika(ut.handelser.length, 1, "händelsen skall finnas kvar som gravsten");
  lika(ut.handelser[0].synkad, false, "gravstenen måste skickas upp");
});

prov("flyttade händelser stämplas om så de skickas upp", () => {
  const o: Ogonblick = {
    kalendrar: [k("a", "Arbete", T("0T10:00:00Z")), k("s", "Studier", T("0T10:00:00Z"))],
    handelser: [
      { ...h("h1", "Möte", T("0T10:00:00Z"), { kalenderId: "s" }), synkad: true },
    ],
  };
  const ut = taBortKalender(o, "s", "a");
  lika(ut.handelser[0].kalenderId, "a");
  lika(ut.handelser[0].synkad, false);
});

/* --- kön ---------------------------------------------------------- */

prov("osynkade poster räknas rätt", () => {
  const o: Ogonblick = {
    handelser: [
      { ...h("a", "Ett", T("0T10:00:00Z")), synkad: true },
      h("b", "Två", T("0T10:00:00Z")),
    ],
    kalendrar: [k("a", "Arbete", T("0T10:00:00Z"))],
  };
  lika(osynkade(o.handelser).map((x) => x.id), ["b"]);
  lika(antalIvag(o), 2, "kalendern är också osynkad");
});

prov("en ändring markerar posten som osynkad", () => {
  const start = { ...h("a", "Möte", T("0T10:00:00Z")), synkad: true };
  const efter = rord({ ...start, titel: "Nytt namn" }, T("2T10:00:00Z"));
  lika(efter.synkad, false);
  lika(efter.andrad, T("2T10:00:00Z"));
});

prov("en offlinekö överlever flera varv utan nät", () => {
  // Tre ändringar i rad utan synk emellan. Alla tre måste ligga kvar i
  // kön; ingen får tappas bort bara för att nästa hann före.
  let o: Ogonblick = { handelser: [], kalendrar: [] };
  o = { ...o, handelser: [h("a", "Ett", T("0T10:00:00Z"))] };
  o = { ...o, handelser: [...o.handelser, h("b", "Två", T("0T11:00:00Z"))] };
  o = { ...o, handelser: [...o.handelser, h("c", "Tre", T("0T12:00:00Z"))] };
  lika(antalIvag(o), 3);

  // Molnet svarar med en fjärde post som ingen av enheterna sett.
  const efter = sammanfoga(o.handelser, [
    h("d", "Fyra", T("0T09:00:00Z"), { synkad: true }),
  ]);
  lika(efter.length, 4);
  lika(osynkade(efter).map((x) => x.id), ["a", "b", "c"]);
});

prov("sammanfogningen muterar inte sitt indata", () => {
  const lokala = [h("a", "Möte", T("0T10:00:00Z"))];
  const kopia = JSON.parse(JSON.stringify(lokala));
  sammanfoga(lokala, [h("a", "Annat", T("0T12:00:00Z"), { synkad: true })]);
  lika(lokala, kopia);
});

process.stdout.write(
  `\n${antal - fel} av ${antal} prov gick igenom.${fel ? " ✗" : " ✓"}\n\n`
);
process.exit(fel ? 1 : 0);
