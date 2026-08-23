"use strict";
/**
 * Prov för privatekonomisidan.
 *
 * Sidan räknar åt användaren, och ett räknefel här är värre än ett
 * ritfel någon annanstans: det ser ut som ett svar. Tyngdpunkten ligger
 * därför på skillnaden mellan NOLL och OKÄNT, på att sparmålet räknas
 * på utfall och inte på avsikt, och på att prognosen håller tyst när
 * den inte vet.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ekonomi_1 = require("../lib/sidor/ekonomi");
let antal = 0;
let fel = 0;
function prov(namn, f) {
    antal += 1;
    try {
        f();
        process.stdout.write(`  ok   ${namn}\n`);
    }
    catch (e) {
        fel += 1;
        process.stdout.write(`  FEL  ${namn}\n       ${e.message}\n`);
    }
}
function lika(fick, vantat, vad = "") {
    if (JSON.stringify(fick) !== JSON.stringify(vantat)) {
        throw new Error(`${vad}\n       fick    ${JSON.stringify(fick)}\n       väntade ${JSON.stringify(vantat)}`);
    }
}
const DATA = (0, ekonomi_1.tolkaEkonomiData)({
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
    inkop: [
        { id: "i1", datum: "2026-08-03", namn: "Airpods Pro", belopp: 2500, kategoriId: "noje" },
        { id: "i2", datum: "2026-08-19", namn: "Kläder på HM", belopp: 2000, kategoriId: "noje" },
        { id: "i3", datum: "2026-08-11", namn: "Vinterdäck", belopp: 4800, kategoriId: "behov" },
        { id: "i4", datum: "2026-08-07", namn: "Present", belopp: 300, kategoriId: "" },
        { id: "i5", datum: "2026-07-22", namn: "Skrivbordslampa", belopp: 900, kategoriId: "behov" },
    ],
    abonnemang: [
        { id: "a1", namn: "Claude Pro", belopp: 250, period: "manad", dragManad: 1, aktiv: true },
        { id: "a2", namn: "Headway", belopp: 250, period: "ar", dragManad: 3, aktiv: true },
        { id: "a3", namn: "Spotify", belopp: 119, period: "manad", dragManad: 1, aktiv: false },
        { id: "a4", namn: "Domän", belopp: 180, period: "ar", dragManad: 8, aktiv: true },
    ],
});
const AUG = DATA.manader[1];
const JUL = DATA.manader[0];
process.stdout.write("\nPRIVATEKONOMI\n");
/* --- belopp ------------------------------------------------------- */
prov("belopp tolkas med mellanrum, komma och kr", () => {
    lika((0, ekonomi_1.tolkaKrona)("7500"), 7500);
    lika((0, ekonomi_1.tolkaKrona)("7 500"), 7500, "vanligt mellanrum");
    lika((0, ekonomi_1.tolkaKrona)("7 500"), 7500, "hårt mellanrum, som utskriften");
    lika((0, ekonomi_1.tolkaKrona)("7 500 kr"), 7500);
    lika((0, ekonomi_1.tolkaKrona)("7500,50"), 7500.5);
    lika((0, ekonomi_1.tolkaKrona)("-1200"), -1200);
    lika((0, ekonomi_1.tolkaKrona)(7500), 7500);
});
prov("tomt är okänt, inte noll", () => {
    // Skillnaden bär hela sidan: en ofylld kategori får inte räknas in i
    // en summa som ser färdig ut.
    lika((0, ekonomi_1.tolkaKrona)(""), null);
    lika((0, ekonomi_1.tolkaKrona)("   "), null);
    lika((0, ekonomi_1.tolkaKrona)("-"), null, "ett påbörjat minustecken är inte ett tal");
    lika((0, ekonomi_1.tolkaKrona)("abc"), null);
    lika((0, ekonomi_1.tolkaKrona)(null), null);
    lika((0, ekonomi_1.tolkaKrona)(0), 0, "en medveten nolla är ett värde");
});
prov("belopp skrivs med hårt mellanrum", () => {
    lika((0, ekonomi_1.kronor)(7500), "7 500");
    lika((0, ekonomi_1.kronor)(1000000), "1 000 000");
    lika((0, ekonomi_1.kronor)(420), "420");
    lika((0, ekonomi_1.kronor)(-1300), "−1 300");
    lika((0, ekonomi_1.kronor)(null), "—");
});
prov("skillnader skrivs med tecken", () => {
    lika((0, ekonomi_1.kronorMedTecken)(380), "+380");
    lika((0, ekonomi_1.kronorMedTecken)(-1300), "−1 300");
    lika((0, ekonomi_1.kronorMedTecken)(0), "0", "noll har inget tecken");
    lika((0, ekonomi_1.kronorMedTecken)(null), "—");
});
prov("procent", () => {
    lika((0, ekonomi_1.procent)(0.3), "30 %");
    lika((0, ekonomi_1.procent)(null), "—");
    lika((0, ekonomi_1.procent)(Infinity), "—", "division med noll läcker inte ut");
});
/* --- månadsnycklar ------------------------------------------------ */
prov("månadsnycklar", () => {
    lika((0, ekonomi_1.manadsNyckel)(new Date(2026, 7, 12)), "2026-08");
    lika((0, ekonomi_1.manadsText)("2026-08"), "Augusti 2026");
    lika((0, ekonomi_1.manadsText)("skräp"), "skräp");
});
prov("nästa och föregående månad går över årsskiftet", () => {
    lika((0, ekonomi_1.nastaManad)("2026-08"), "2026-09");
    lika((0, ekonomi_1.nastaManad)("2026-12"), "2027-01");
    lika((0, ekonomi_1.foregaendeManad)("2026-01"), "2025-12");
});
/* --- tolkningen --------------------------------------------------- */
prov("skräp in ger en tom men användbar sida", () => {
    for (const skrap of [null, undefined, 0, "nej", [], true]) {
        lika((0, ekonomi_1.tolkaEkonomiData)(skrap), ekonomi_1.TOM_EKONOMI, `föll på ${JSON.stringify(skrap)}`);
    }
});
prov("poster mot en kategori som inte finns faller bort", () => {
    // En sådan post går varken att rita, summera eller rätta.
    const d = (0, ekonomi_1.tolkaEkonomiData)({
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
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        manader: [{ id: "2026-08" }, { id: "i somras" }, {}],
    });
    lika(d.manader.map((m) => m.id), ["2026-08"]);
});
prov("månaderna sorteras", () => {
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        manader: [{ id: "2026-08" }, { id: "2025-12" }, { id: "2026-01" }],
    });
    lika(d.manader.map((m) => m.id), ["2025-12", "2026-01", "2026-08"]);
});
/* --- månadens matematik ------------------------------------------- */
prov("summor", () => {
    lika((0, ekonomi_1.summaPlan)(AUG), 14500);
    lika((0, ekonomi_1.summaUtfall)(JUL), 14750);
    lika((0, ekonomi_1.summaUtfall)(AUG), 0, "inga utfall ifyllda");
});
prov("kvar att fördela", () => {
    lika((0, ekonomi_1.kvarAttFordela)(AUG), 10500);
});
prov("kvar att fördela är okänt utan inkomst, inte noll", () => {
    const utan = { ...AUG, inkomst: null };
    lika((0, ekonomi_1.kvarAttFordela)(utan), null, "en nolla här hade sett ut som ett svar");
});
prov("övertrassering ger ett negativt tal", () => {
    const over = { ...AUG, inkomst: 10000 };
    lika((0, ekonomi_1.kvarAttFordela)(over), -4500);
});
prov("andel av inkomsten", () => {
    lika((0, ekonomi_1.andelAvInkomst)(7500, AUG), 0.3);
    lika((0, ekonomi_1.andelAvInkomst)(null, AUG), null);
    lika((0, ekonomi_1.andelAvInkomst)(7500, { ...AUG, inkomst: 0 }), null, "ingen division med noll");
});
prov("avvikelse kräver båda talen", () => {
    lika((0, ekonomi_1.avvikelse)({ kategoriId: "x", plan: 4000, utfall: 4380 }), 380);
    lika((0, ekonomi_1.avvikelse)({ kategoriId: "x", plan: 4000, utfall: null }), null);
    lika((0, ekonomi_1.avvikelse)({ kategoriId: "x", plan: null, utfall: 4380 }), null);
});
prov("har utfall", () => {
    lika((0, ekonomi_1.harUtfall)(JUL), true);
    lika((0, ekonomi_1.harUtfall)(AUG), false);
});
prov("jämförelse mot föregående månad", () => {
    lika((0, ekonomi_1.motForegaende)(DATA, "2026-08", "spar"), 500);
    lika((0, ekonomi_1.motForegaende)(DATA, "2026-08", "lop"), 0);
    lika((0, ekonomi_1.motForegaende)(DATA, "2026-07", "spar"), null, "juni finns inte");
});
/* --- sparandet ---------------------------------------------------- */
prov("sparande räknas bara ur kategorier som är märkta som sparande", () => {
    lika((0, ekonomi_1.sparandePlan)(DATA, AUG), 7500);
    lika((0, ekonomi_1.sparandeUtfall)(DATA, JUL), 7000);
    lika((0, ekonomi_1.sparandeUtfall)(DATA, AUG), 0);
});
prov("sparkvot", () => {
    lika((0, ekonomi_1.sparkvot)(DATA, AUG), 0.3);
});
prov("framsteg räknas på utfall, inte på plan", () => {
    // 55 000 i start + 7 000 som faktiskt lades undan i juli. Augusti är
    // planerad men inte summerad och får inte räknas med.
    lika((0, ekonomi_1.framsteg)(DATA), {
        undanlagt: 62000,
        mal: 100000,
        andel: 0.62,
        kvar: 38000,
    });
});
prov("utan mål finns ingen andel", () => {
    const d = { ...DATA, mal: { namn: "", belopp: null, start: null } };
    lika((0, ekonomi_1.framsteg)(d).andel, null);
    lika((0, ekonomi_1.framsteg)(d).kvar, null);
});
prov("ett nått mål ger inte negativt kvar", () => {
    const d = {
        ...DATA,
        mal: { namn: "Buffert", belopp: 10000, start: 55000 },
    };
    lika((0, ekonomi_1.framsteg)(d).kvar, 0);
});
/* --- prognosen ---------------------------------------------------- */
prov("takten räknas på månader med utfall", () => {
    // Bara juli har utfall: 7 000.
    lika((0, ekonomi_1.genomsnittligtSparande)(DATA), 7000);
});
prov("utan utfall används senaste månadens plan", () => {
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        kategorier: [{ id: "spar", namn: "S", sparande: true }],
        manader: [{ id: "2026-08", poster: [{ kategoriId: "spar", plan: 5000 }] }],
    });
    lika((0, ekonomi_1.genomsnittligtSparande)(d), 5000, "en svag prognos slår ingen alls");
});
prov("prognos", () => {
    // 38 000 kvar i takt 7 000 per månad = sex månader.
    const p = (0, ekonomi_1.prognos)(DATA, "2026-08");
    lika(p?.manader, 6);
    lika(p?.manadsId, "2027-02");
    lika(p?.takt, 7000);
});
prov("prognosen tiger när målet aldrig nås", () => {
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        kategorier: [{ id: "spar", namn: "S", sparande: true }],
        manader: [
            { id: "2026-08", poster: [{ kategoriId: "spar", plan: 0, utfall: 0 }] },
        ],
        mal: { namn: "Buffert", belopp: 100000, start: 0 },
    });
    lika((0, ekonomi_1.prognos)(d, "2026-08"), null, "ett årtal här hade varit en lögn");
});
prov("prognosen tiger utan mål", () => {
    const d = { ...DATA, mal: { namn: "", belopp: null, start: null } };
    lika((0, ekonomi_1.prognos)(d, "2026-08"), null);
});
prov("nått mål ger noll månader kvar", () => {
    const d = {
        ...DATA,
        mal: { namn: "B", belopp: 10000, start: 55000 },
    };
    lika((0, ekonomi_1.prognos)(d, "2026-08")?.manader, 0);
});
/* --- mallen ------------------------------------------------------- */
prov("ny månad fylls ur mallen", () => {
    const m = (0, ekonomi_1.manadUrMall)(DATA, "2026-09");
    lika(m.id, "2026-09");
    lika(m.inkomst, 25000);
    lika(m.poster.map((p) => p.plan), [7500, 4000, null, null]);
});
prov("kategorier som saknas i mallen kommer med som tomma", () => {
    // En kategori som inte syns är en kategori man glömmer att fördela
    // till, och det är precis vad sidan finns för att förhindra.
    const m = (0, ekonomi_1.manadUrMall)(DATA, "2026-09");
    lika(m.poster.length, DATA.kategorier.length);
    lika(m.poster.map((p) => p.kategoriId), ["spar", "lop", "behov", "noje"]);
});
prov("utfall följer aldrig med från mallen", () => {
    lika((0, ekonomi_1.manadUrMall)(DATA, "2026-09").poster.every((p) => p.utfall === null), true);
});
prov("nästa lediga månad", () => {
    lika((0, ekonomi_1.nastaLedigaManad)(DATA, new Date(2026, 7, 12)), "2026-09");
    lika((0, ekonomi_1.nastaLedigaManad)(ekonomi_1.TOM_EKONOMI, new Date(2026, 7, 12)), "2026-08");
});
/* --- inköpen ------------------------------------------------------ */
prov("ett datum hör till sin månad", () => {
    lika((0, ekonomi_1.manadAvDatum)("2026-08-14"), "2026-08");
    lika((0, ekonomi_1.manadAvDatum)("2026-08"), null, "en månad är inte ett datum");
    lika((0, ekonomi_1.manadAvDatum)("strunt"), null);
});
prov("inköpen i en månad kommer senast först", () => {
    lika((0, ekonomi_1.inkopIManad)(DATA, "2026-08").map((i) => i.datum), ["2026-08-19", "2026-08-11", "2026-08-07", "2026-08-03"]);
    lika((0, ekonomi_1.inkopIManad)(DATA, "2026-07").map((i) => i.namn), ["Skrivbordslampa"]);
    lika((0, ekonomi_1.inkopIManad)(DATA, "2026-09"), []);
});
prov("månadens inköp summeras — även de utan kategori", () => {
    // Summan under listan måste svara på samma fråga som listan visar.
    // Ett inköp utan kategori är fortfarande pengar som gick åt.
    lika((0, ekonomi_1.summaInkop)((0, ekonomi_1.inkopIManad)(DATA, "2026-08")), 9600);
});
prov("inköp per kategori", () => {
    const per = (0, ekonomi_1.inkopPerKategori)(DATA, "2026-08");
    lika(per.get("noje"), 4500, "två inköp läggs ihop");
    lika(per.get("behov"), 4800);
    lika(per.get(""), 300, "de utan kategori hamnar för sig");
    lika(per.get("spar"), undefined);
});
prov("en kategori utan inköp är okänd, inte noll", () => {
    // Noll vore påståendet "du handlade ingenting", och det kan sidan
    // inte veta. En nolla där hade sett ut som ett svar.
    lika((0, ekonomi_1.inkopFor)(DATA, "2026-08", "noje"), 4500);
    lika((0, ekonomi_1.inkopFor)(DATA, "2026-08", "spar"), null);
    lika((0, ekonomi_1.inkopFor)(DATA, "2026-09", "noje"), null, "fel månad räknas inte");
});
prov("ett inköp med noll kronor är noll och inte okänt", () => {
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        kategorier: [{ id: "noje", namn: "Nöjen", sparande: false, ton: 2 }],
        inkop: [{ id: "x", datum: "2026-08-02", namn: "Gratisprov", belopp: 0, kategoriId: "noje" }],
    });
    lika((0, ekonomi_1.inkopFor)(d, "2026-08", "noje"), 0);
});
prov("ett inköp utan giltigt datum faller bort", () => {
    // Utan datum går det inte att lägga i någon månad, och en rad som
    // varken syns eller summeras är värre än ingen rad alls.
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        inkop: [
            { id: "x", datum: "", namn: "Utan datum", belopp: 100, kategoriId: "" },
            { id: "y", datum: "2026-08-02", namn: "Med datum", belopp: 100, kategoriId: "" },
        ],
    });
    lika(d.inkop.map((i) => i.namn), ["Med datum"]);
});
prov("ett inköp mot en borttagen kategori behåller pengarna", () => {
    // Pengarna gick åt oavsett vad raden hette. Att låta en omdöpt budget
    // radera historiken vore att låta bokföringen bero på fackindelningen.
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        kategorier: [{ id: "noje", namn: "Nöjen", sparande: false, ton: 2 }],
        inkop: [
            { id: "x", datum: "2026-08-02", namn: "Airpods", belopp: 2500, kategoriId: "borta" },
        ],
    });
    lika(d.inkop.length, 1);
    lika(d.inkop[0].kategoriId, "", "kategorin tappas, inte raden");
    lika((0, ekonomi_1.summaInkop)((0, ekonomi_1.inkopIManad)(d, "2026-08")), 2500);
    lika((0, ekonomi_1.inkopFor)(d, "2026-08", "borta"), null);
});
/* --- abonnemangen ------------------------------------------------- */
prov("månadsavgifter dras varje månad", () => {
    const claude = DATA.abonnemang[0];
    lika((0, ekonomi_1.dras)(claude, "2026-08"), true);
    lika((0, ekonomi_1.dras)(claude, "2026-12"), true);
});
prov("årsavgifter dras bara i sin månad", () => {
    // Hela beloppet i den månad det faktiskt dras. Ett utslaget genomsnitt
    // hade varit ett jämnare tal men ett som aldrig står på kontoutdraget.
    const headway = DATA.abonnemang[1];
    lika((0, ekonomi_1.dras)(headway, "2026-03"), true);
    lika((0, ekonomi_1.dras)(headway, "2027-03"), true, "året spelar ingen roll");
    lika((0, ekonomi_1.dras)(headway, "2026-08"), false);
});
prov("pausade dras aldrig", () => {
    lika((0, ekonomi_1.dras)(DATA.abonnemang[2], "2026-08"), false);
});
prov("månadens abonnemang", () => {
    lika((0, ekonomi_1.abonnemangsKostnad)(DATA, "2026-08"), 430, "Claude 250 + domänen 180");
    lika((0, ekonomi_1.abonnemangsKostnad)(DATA, "2026-03"), 500, "Claude 250 + Headway 250");
    lika((0, ekonomi_1.abonnemangsKostnad)(DATA, "2026-05"), 250, "bara Claude");
    lika((0, ekonomi_1.abonnemangIManad)(DATA, "2026-08").map((a) => a.namn), ["Claude Pro", "Domän"]);
});
prov("årskostnaden räknar månadsavgiften tolv gånger", () => {
    // 250 × 12 + 250 + 180. Spotify är pausat och räknas inte.
    lika((0, ekonomi_1.abonnemangPerAr)(DATA), 3430);
});
prov("nästa dragning", () => {
    const claude = DATA.abonnemang[0];
    const headway = DATA.abonnemang[1];
    lika((0, ekonomi_1.nastaDragning)(claude, "2026-08"), "2026-08", "månadsvis dras nu");
    lika((0, ekonomi_1.nastaDragning)(headway, "2026-01"), "2026-03");
    lika((0, ekonomi_1.nastaDragning)(headway, "2026-03"), "2026-03", "i sin egen månad är det nu");
    lika((0, ekonomi_1.nastaDragning)(headway, "2026-08"), "2027-03", "annars nästa år");
    lika((0, ekonomi_1.nastaDragning)(DATA.abonnemang[2], "2026-08"), null, "pausade har ingen");
});
prov("dragningsmånaden hålls inom skalan", () => {
    lika((0, ekonomi_1.klamManad)(3), 3);
    lika((0, ekonomi_1.klamManad)(0), 1);
    lika((0, ekonomi_1.klamManad)(13), 12);
    lika((0, ekonomi_1.klamManad)("7"), 7, "väljaren lämnar ifrån sig en sträng");
    lika((0, ekonomi_1.klamManad)("strunt"), 1);
});
prov("ett abonnemang utan aktiv-fält är aktivt", () => {
    // Gammal data skall inte tolkas som att allt är pausat.
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        abonnemang: [{ id: "x", namn: "Claude Pro", belopp: 250, period: "manad" }],
    });
    lika(d.abonnemang[0].aktiv, true);
    lika(d.abonnemang[0].dragManad, 1, "utan vald månad blir det januari");
    lika((0, ekonomi_1.abonnemangPerAr)(d), 3000);
});
prov("okänd period blir månad", () => {
    const d = (0, ekonomi_1.tolkaEkonomiData)({
        abonnemang: [{ id: "x", namn: "Något", belopp: 99, period: "kvartal" }],
    });
    lika(d.abonnemang[0].period, "manad");
});
prov("tom data har tomma register", () => {
    lika(ekonomi_1.TOM_EKONOMI.inkop, []);
    lika(ekonomi_1.TOM_EKONOMI.abonnemang, []);
    lika((0, ekonomi_1.tolkaEkonomiData)({}).inkop, []);
    lika((0, ekonomi_1.tolkaEkonomiData)({}).abonnemang, []);
    lika((0, ekonomi_1.abonnemangPerAr)(ekonomi_1.TOM_EKONOMI), 0);
    lika((0, ekonomi_1.abonnemangsKostnad)(ekonomi_1.TOM_EKONOMI, "2026-08"), 0);
});
process.stdout.write(`\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`);
if (fel > 0)
    process.exit(1);
