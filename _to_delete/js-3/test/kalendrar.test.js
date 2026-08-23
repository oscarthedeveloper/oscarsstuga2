"use strict";
/**
 * Prov för kalenderoperationerna.
 *
 * Det som mäts är främst borttagningen, eftersom det är den enda
 * operationen som rör två saker samtidigt: kalendrarna och händelserna i
 * dem. En händelse får aldrig bli kvar med en kalender som inte finns —
 * den skulle bli osynlig men fortsätta ta plats i lagret.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const butik_1 = require("../lib/butik");
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
const kal = (id, namn, ton = 0) => (0, butik_1.normaliseraKalender)({ id, namn, ton, synlig: true });
function bas() {
    return {
        uppgifter: [],
        anteckningar: [],
        sidor: [],
        kalendrar: [kal("a", "Arbete", 3), kal("s", "Studier", 0)],
        handelser: [
            (0, butik_1.normalisera)({
                id: "h1",
                titel: "Möte",
                kalenderId: "a",
                start: "2026-08-12T09:00",
                slut: "2026-08-12T10:00",
            }),
            (0, butik_1.normalisera)({
                id: "h2",
                titel: "Seminarium",
                kalenderId: "s",
                start: "2026-08-12T13:00",
                slut: "2026-08-12T14:00",
            }),
            (0, butik_1.normalisera)({
                id: "h3",
                titel: "Läsning",
                kalenderId: "s",
                start: "2026-08-13T13:00",
                slut: "2026-08-13T14:00",
            }),
        ],
    };
}
// Borttagning sker med gravsten: posten ligger kvar i lagret tills den
// hunnit ut i molnet. Proven mäter därför de LEVANDE posterna.
const ider = (o) => (0, butik_1.levande)(o.kalendrar).map((k) => k.id);
const tillhor = (o) => (0, butik_1.levande)(o.handelser).map((h) => h.kalenderId);
const hIder = (o) => (0, butik_1.levande)(o.handelser).map((h) => h.id);
process.stdout.write("\nKalendrarna\n");
prov("standardkalendrarna har giltiga färgtoner", () => {
    // Ett fel som inte kastar: läses ANTAL_TONER innan den tilldelats blir
    // varje ton NaN, och blocken ritas färglösa utan att något klagar.
    for (const k of butik_1.STANDARDKALENDRAR) {
        if (!Number.isInteger(k.ton) || k.ton < 0 || k.ton >= butik_1.ANTAL_TONER) {
            throw new Error(`${k.namn} har tonen ${k.ton}`);
        }
    }
});
prov("lägga till en kalender", () => {
    const o = (0, butik_1.laggTillKalender)(bas(), "Träning", 4, "t");
    lika(ider(o), ["a", "s", "t"]);
    lika(o.kalendrar[2].namn, "Träning");
    lika(o.kalendrar[2].ton, 4);
    lika(o.kalendrar[2].synlig, true);
});
prov("blanksteg trimmas och tomt namn ersätts", () => {
    const o = (0, butik_1.laggTillKalender)(bas(), "   Resor  ", 2, "r");
    lika(o.kalendrar[2].namn, "Resor");
    const tom = (0, butik_1.laggTillKalender)(bas(), "   ", 0, "x");
    lika(tom.kalendrar[2].namn, "Namnlös");
});
prov("toner utanför skalan viks runt i stället för att gå sönder", () => {
    lika((0, butik_1.klamTon)(0), 0);
    lika((0, butik_1.klamTon)(butik_1.ANTAL_TONER), 0);
    lika((0, butik_1.klamTon)(butik_1.ANTAL_TONER + 2), 2);
    lika((0, butik_1.klamTon)(-1), butik_1.ANTAL_TONER - 1);
    const o = (0, butik_1.laggTillKalender)(bas(), "Extra", 11, "e");
    lika(o.kalendrar[2].ton, 5);
});
prov("byta namn och färg", () => {
    const o = (0, butik_1.andraKalender)(bas(), "a", { namn: "Jobb", ton: 5 });
    lika(o.kalendrar[0].namn, "Jobb");
    lika(o.kalendrar[0].ton, 5);
    // Den andra kalendern rörs inte.
    lika(o.kalendrar[1].namn, "Studier");
});
prov("tomt namn vid redigering behåller det gamla", () => {
    const o = (0, butik_1.andraKalender)(bas(), "a", { namn: "   " });
    lika(o.kalendrar[0].namn, "Arbete");
});
prov("ändring av okänd kalender gör ingenting", () => {
    const o = (0, butik_1.andraKalender)(bas(), "finns-ej", { namn: "Spöke" });
    lika(ider(o), ["a", "s"]);
    lika(o.kalendrar.map((k) => k.namn), ["Arbete", "Studier"]);
});
prov("ta bort och flytta händelserna", () => {
    const o = (0, butik_1.taBortKalender)(bas(), "s", "a");
    lika(ider(o), ["a"]);
    lika((0, butik_1.levande)(o.handelser).length, 3, "inga händelser skulle raderas");
    lika(tillhor(o), ["a", "a", "a"]);
});
prov("ta bort och radera händelserna med", () => {
    const o = (0, butik_1.taBortKalender)(bas(), "s", null);
    lika(ider(o), ["a"]);
    lika(hIder(o), ["h1"]);
    // Gravstenarna ligger kvar tills de hunnit ut i molnet.
    lika(o.handelser.length, 3);
});
prov("ingen händelse blir kvar med en kalender som inte finns", () => {
    for (const mal of ["a", null]) {
        const o = (0, butik_1.taBortKalender)(bas(), "s", mal);
        const kvar = new Set((0, butik_1.levande)(o.kalendrar).map((k) => k.id));
        for (const h of (0, butik_1.levande)(o.handelser)) {
            if (!kvar.has(h.kalenderId)) {
                throw new Error(`${h.titel} pekar på en borttagen kalender`);
            }
        }
    }
});
prov("den sista kalendern går inte att ta bort", () => {
    const en = {
        uppgifter: [],
        anteckningar: [],
        sidor: [],
        kalendrar: [kal("a", "Arbete")],
        handelser: bas().handelser.slice(0, 1),
    };
    const o = (0, butik_1.taBortKalender)(en, "a", null);
    lika(ider(o), ["a"]);
    lika((0, butik_1.levande)(o.handelser).length, 1);
});
prov("ta bort en okänd kalender gör ingenting", () => {
    const o = (0, butik_1.taBortKalender)(bas(), "finns-ej", "a");
    lika(ider(o), ["a", "s"]);
    lika(tillhor(o), ["a", "s", "s"]);
});
prov("flytta till sig själv faller tillbaka på radering", () => {
    // Att peka ut den kalender som just tagits bort är inte ett giltigt mål.
    const o = (0, butik_1.taBortKalender)(bas(), "s", "s");
    lika(ider(o), ["a"]);
    lika(hIder(o), ["h1"]);
});
prov("okänt flyttmål faller tillbaka på radering", () => {
    const o = (0, butik_1.taBortKalender)(bas(), "s", "finns-ej");
    lika(ider(o), ["a"]);
    lika(hIder(o), ["h1"]);
});
prov("operationerna muterar inte sitt indata", () => {
    const original = bas();
    const kopia = JSON.parse(JSON.stringify(original));
    (0, butik_1.laggTillKalender)(original, "Ny", 1, "n");
    (0, butik_1.andraKalender)(original, "a", { namn: "Ändrad" });
    (0, butik_1.taBortKalender)(original, "s", null);
    lika(original, kopia, "indata ändrades");
});
process.stdout.write(`\n${antal - fel} av ${antal} prov gick igenom.${fel ? " ✗" : " ✓"}\n\n`);
process.exit(fel ? 1 : 0);
