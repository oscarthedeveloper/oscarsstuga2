/**
 * Prov för privatekonomisidan.
 *
 * Sidan räknar åt användaren, och ett räknefel här är värre än ett
 * ritfel någon annanstans: det ser ut som ett svar. Tyngdpunkten ligger
 * därför på skillnaden mellan NOLL och OKÄNT, på att sparmålet räknas
 * på utfall och inte på avsikt, och på att prognosen håller tyst när
 * den inte vet.
 */

import {
  andelAvInkomst,
  avvikelse,
  foregaendeManad,
  framsteg,
  genomsnittligtSparande,
  harUtfall,
  kronor,
  kronorMedTecken,
  kvarAttFordela,
  manadUrMall,
  manadsNyckel,
  manadsText,
  motForegaende,
  nastaLedigaManad,
  nastaManad,
  procent,
  prognos,
  sparandePlan,
  sparandeUtfall,
  sparkvot,
  summaPlan,
  summaUtfall,
  tolkaEkonomiData,
  tolkaKrona,
  TOM_EKONOMI,
  type EkonomiData,
  type Manad,
} from "../lib/sidor/ekonomi";

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

const DATA: EkonomiData = tolkaEkonomiData({
  kategorier: [
    { id: "spar", namn: "Sparande", sparande: true, ton: 4 },
    { id: "lop", namn: "Löpande utgifter", sparande: false, ton: 3 },
    { id: "behov", namn: "Behov", sparande: false, ton: 0 },
    { id: "noje", namn: "Nöjen", sparande: false, ton: 2 },
  ],
  manader: [
    {
      id: "2026-07",
      inkomst: 25000,
      poster: [
        { kategoriId: "spar", plan: 7000, utfall: 7000 },
        { kategoriId: "lop", plan: 4000, utfall: 4380 },
        { kategoriId: "behov", plan: 1000, utfall: 420 },
        { kategoriId: "noje", plan: 2000, utfall: 2950 },
      ],
    },
    {
      id: "2026-08",
      inkomst: 25000,
      poster: [
        { kategoriId: "spar", plan: 7500, utfall: null },
        { kategoriId: "lop", plan: 4000, utfall: null },
        { kategoriId: "behov", plan: 1000, utfall: null },
        { kategoriId: "noje", plan: 2000, utfall: null },
      ],
    },
  ],
  mall: {
    inkomst: 25000,
    poster: [
      { kategoriId: "spar", plan: 7500 },
      { kategoriId: "lop", plan: 4000 },
    ],
  },
  mal: { namn: "Buffert", belopp: 100000, start: 55000 },
});

const AUG = DATA.manader[1];
const JUL = DATA.manader[0];

process.stdout.write("\nPRIVATEKONOMI\n");

/* --- belopp ------------------------------------------------------- */

prov("belopp tolkas med mellanrum, komma och kr", () => {
  lika(tolkaKrona("7500"), 7500);
  lika(tolkaKrona("7 500"), 7500, "vanligt mellanrum");
  lika(tolkaKrona("7 500"), 7500, "hårt mellanrum, som utskriften");
  lika(tolkaKrona("7 500 kr"), 7500);
  lika(tolkaKrona("7500,50"), 7500.5);
  lika(tolkaKrona("-1200"), -1200);
  lika(tolkaKrona(7500), 7500);
});

prov("tomt är okänt, inte noll", () => {
  // Skillnaden bär hela sidan: en ofylld kategori får inte räknas in i
  // en summa som ser färdig ut.
  lika(tolkaKrona(""), null);
  lika(tolkaKrona("   "), null);
  lika(tolkaKrona("-"), null, "ett påbörjat minustecken är inte ett tal");
  lika(tolkaKrona("abc"), null);
  lika(tolkaKrona(null), null);
  lika(tolkaKrona(0), 0, "en medveten nolla är ett värde");
});

prov("belopp skrivs med hårt mellanrum", () => {
  lika(kronor(7500), "7 500");
  lika(kronor(1000000), "1 000 000");
  lika(kronor(420), "420");
  lika(kronor(-1300), "−1 300");
  lika(kronor(null), "—");
});

prov("skillnader skrivs med tecken", () => {
  lika(kronorMedTecken(380), "+380");
  lika(kronorMedTecken(-1300), "−1 300");
  lika(kronorMedTecken(0), "0", "noll har inget tecken");
  lika(kronorMedTecken(null), "—");
});

prov("procent", () => {
  lika(procent(0.3), "30 %");
  lika(procent(null), "—");
  lika(procent(Infinity), "—", "division med noll läcker inte ut");
});

/* --- månadsnycklar ------------------------------------------------ */

prov("månadsnycklar", () => {
  lika(manadsNyckel(new Date(2026, 7, 12)), "2026-08");
  lika(manadsText("2026-08"), "Augusti 2026");
  lika(manadsText("skräp"), "skräp");
});

prov("nästa och föregående månad går över årsskiftet", () => {
  lika(nastaManad("2026-08"), "2026-09");
  lika(nastaManad("2026-12"), "2027-01");
  lika(foregaendeManad("2026-01"), "2025-12");
});

/* --- tolkningen --------------------------------------------------- */

prov("skräp in ger en tom men användbar sida", () => {
  for (const skrap of [null, undefined, 0, "nej", [], true]) {
    lika(tolkaEkonomiData(skrap), TOM_EKONOMI, `föll på ${JSON.stringify(skrap)}`);
  }
});

prov("poster mot en kategori som inte finns faller bort", () => {
  // En sådan post går varken att rita, summera eller rätta.
  const d = tolkaEkonomiData({
    kategorier: [{ id: "spar", namn: "Sparande" }],
    manader: [
      {
        id: "2026-08",
        poster: [
          { kategoriId: "spar", plan: 100 },
          { kategoriId: "borttagen", plan: 999 },
        ],
      },
    ],
  });
  lika(d.manader[0].poster.map((p) => p.kategoriId), ["spar"]);
});

prov("månader utan giltig nyckel faller bort", () => {
  const d = tolkaEkonomiData({
    manader: [{ id: "2026-08" }, { id: "i somras" }, {}],
  });
  lika(d.manader.map((m) => m.id), ["2026-08"]);
});

prov("månaderna sorteras", () => {
  const d = tolkaEkonomiData({
    manader: [{ id: "2026-08" }, { id: "2025-12" }, { id: "2026-01" }],
  });
  lika(d.manader.map((m) => m.id), ["2025-12", "2026-01", "2026-08"]);
});

/* --- månadens matematik ------------------------------------------- */

prov("summor", () => {
  lika(summaPlan(AUG), 14500);
  lika(summaUtfall(JUL), 14750);
  lika(summaUtfall(AUG), 0, "inga utfall ifyllda");
});

prov("kvar att fördela", () => {
  lika(kvarAttFordela(AUG), 10500);
});

prov("kvar att fördela är okänt utan inkomst, inte noll", () => {
  const utan: Manad = { ...AUG, inkomst: null };
  lika(kvarAttFordela(utan), null, "en nolla här hade sett ut som ett svar");
});

prov("övertrassering ger ett negativt tal", () => {
  const over: Manad = { ...AUG, inkomst: 10000 };
  lika(kvarAttFordela(over), -4500);
});

prov("andel av inkomsten", () => {
  lika(andelAvInkomst(7500, AUG), 0.3);
  lika(andelAvInkomst(null, AUG), null);
  lika(andelAvInkomst(7500, { ...AUG, inkomst: 0 }), null, "ingen division med noll");
});

prov("avvikelse kräver båda talen", () => {
  lika(avvikelse({ kategoriId: "x", plan: 4000, utfall: 4380 }), 380);
  lika(avvikelse({ kategoriId: "x", plan: 4000, utfall: null }), null);
  lika(avvikelse({ kategoriId: "x", plan: null, utfall: 4380 }), null);
});

prov("har utfall", () => {
  lika(harUtfall(JUL), true);
  lika(harUtfall(AUG), false);
});

prov("jämförelse mot föregående månad", () => {
  lika(motForegaende(DATA, "2026-08", "spar"), 500);
  lika(motForegaende(DATA, "2026-08", "lop"), 0);
  lika(motForegaende(DATA, "2026-07", "spar"), null, "juni finns inte");
});

/* --- sparandet ---------------------------------------------------- */

prov("sparande räknas bara ur kategorier som är märkta som sparande", () => {
  lika(sparandePlan(DATA, AUG), 7500);
  lika(sparandeUtfall(DATA, JUL), 7000);
  lika(sparandeUtfall(DATA, AUG), 0);
});

prov("sparkvot", () => {
  lika(sparkvot(DATA, AUG), 0.3);
});

prov("framsteg räknas på utfall, inte på plan", () => {
  // 55 000 i start + 7 000 som faktiskt lades undan i juli. Augusti är
  // planerad men inte summerad och får inte räknas med.
  lika(framsteg(DATA), {
    undanlagt: 62000,
    mal: 100000,
    andel: 0.62,
    kvar: 38000,
  });
});

prov("utan mål finns ingen andel", () => {
  const d: EkonomiData = { ...DATA, mal: { namn: "", belopp: null, start: null } };
  lika(framsteg(d).andel, null);
  lika(framsteg(d).kvar, null);
});

prov("ett nått mål ger inte negativt kvar", () => {
  const d: EkonomiData = {
    ...DATA,
    mal: { namn: "Buffert", belopp: 10000, start: 55000 },
  };
  lika(framsteg(d).kvar, 0);
});

/* --- prognosen ---------------------------------------------------- */

prov("takten räknas på månader med utfall", () => {
  // Bara juli har utfall: 7 000.
  lika(genomsnittligtSparande(DATA), 7000);
});

prov("utan utfall används senaste månadens plan", () => {
  const d = tolkaEkonomiData({
    kategorier: [{ id: "spar", namn: "S", sparande: true }],
    manader: [{ id: "2026-08", poster: [{ kategoriId: "spar", plan: 5000 }] }],
  });
  lika(genomsnittligtSparande(d), 5000, "en svag prognos slår ingen alls");
});

prov("prognos", () => {
  // 38 000 kvar i takt 7 000 per månad = sex månader.
  const p = prognos(DATA, "2026-08");
  lika(p?.manader, 6);
  lika(p?.manadsId, "2027-02");
  lika(p?.takt, 7000);
});

prov("prognosen tiger när målet aldrig nås", () => {
  const d = tolkaEkonomiData({
    kategorier: [{ id: "spar", namn: "S", sparande: true }],
    manader: [
      { id: "2026-08", poster: [{ kategoriId: "spar", plan: 0, utfall: 0 }] },
    ],
    mal: { namn: "Buffert", belopp: 100000, start: 0 },
  });
  lika(prognos(d, "2026-08"), null, "ett årtal här hade varit en lögn");
});

prov("prognosen tiger utan mål", () => {
  const d: EkonomiData = { ...DATA, mal: { namn: "", belopp: null, start: null } };
  lika(prognos(d, "2026-08"), null);
});

prov("nått mål ger noll månader kvar", () => {
  const d: EkonomiData = {
    ...DATA,
    mal: { namn: "B", belopp: 10000, start: 55000 },
  };
  lika(prognos(d, "2026-08")?.manader, 0);
});

/* --- mallen ------------------------------------------------------- */

prov("ny månad fylls ur mallen", () => {
  const m = manadUrMall(DATA, "2026-09");
  lika(m.id, "2026-09");
  lika(m.inkomst, 25000);
  lika(m.poster.map((p) => p.plan), [7500, 4000, null, null]);
});

prov("kategorier som saknas i mallen kommer med som tomma", () => {
  // En kategori som inte syns är en kategori man glömmer att fördela
  // till, och det är precis vad sidan finns för att förhindra.
  const m = manadUrMall(DATA, "2026-09");
  lika(m.poster.length, DATA.kategorier.length);
  lika(m.poster.map((p) => p.kategoriId), ["spar", "lop", "behov", "noje"]);
});

prov("utfall följer aldrig med från mallen", () => {
  lika(manadUrMall(DATA, "2026-09").poster.every((p) => p.utfall === null), true);
});

prov("nästa lediga månad", () => {
  lika(nastaLedigaManad(DATA, new Date(2026, 7, 12)), "2026-09");
  lika(nastaLedigaManad(TOM_EKONOMI, new Date(2026, 7, 12)), "2026-08");
});

process.stdout.write(
  `\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`
);
if (fel > 0) process.exit(1);
