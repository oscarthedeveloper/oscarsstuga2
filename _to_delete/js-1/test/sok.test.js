"use strict";
/**
 * Prov för söket.
 *
 * Tyngdpunkten ligger på ORDNINGEN. En träfflista är i praktiken sin
 * första rad: den som skriver tre bokstäver och trycker ⏎ landar där,
 * och står fel sak överst öppnas fel sak. Att alla träffar kommer med
 * är mycket mindre viktigt än att den rätta ligger först.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const sok_1 = require("../lib/sok");
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
const h = (id, titel, extra = {}) => (0, butik_1.normalisera)({
    id,
    titel,
    kalenderId: "arbete",
    start: "2026-08-12T09:00",
    slut: "2026-08-12T10:00",
    ...extra,
});
const u = (id, titel, extra = {}) => (0, butik_1.normaliseraUppgift)({ id, titel, kalenderId: "arbete", ...extra });
const a = (id, titel, brodtext = "", extra = {}) => (0, butik_1.normaliseraAnteckning)({ id, titel, brodtext, kalenderId: "arbete", ...extra });
process.stdout.write("\nSÖKET\n");
prov("tom fråga ger inga träffar", () => {
    const r = (0, sok_1.sok)("  ", { handelser: [h("1", "Möte")], uppgifter: [] });
    lika(r.length, 0);
});
prov("exakt titel slår titel som bara innehåller ordet", () => {
    const r = (0, sok_1.sok)("möte", {
        handelser: [h("1", "Veckans möte med gruppen"), h("2", "Möte")],
        uppgifter: [],
    });
    lika(r[0].id, "2", "den som HETER möte skall ligga först");
});
prov("titelns början slår ord längre in", () => {
    const r = (0, sok_1.sok)("tand", {
        handelser: [h("1", "Boka om hos tandläkaren"), h("2", "Tandläkare kl 9")],
        uppgifter: [],
    });
    lika(r[0].id, "2");
});
prov("titel slår brödtext", () => {
    const r = (0, sok_1.sok)("budget", {
        handelser: [h("1", "Styrelsemöte", { anteckning: "gå igenom budget" })],
        uppgifter: [u("2", "Budget för hösten")],
    });
    lika(r[0].id, "2");
    lika(r[0].slag, "uppgift");
});
prov("alla termer måste finnas någonstans", () => {
    const kalla = {
        handelser: [h("1", "Möte med Anna"), h("2", "Möte med Bertil")],
        uppgifter: [],
    };
    lika((0, sok_1.sok)("möte anna", kalla).length, 1, "bara Anna");
    lika((0, sok_1.sok)("möte anna", kalla)[0].id, "1");
    lika((0, sok_1.sok)("möte carl", kalla).length, 0, "carl finns inte");
});
prov("sammanhängande fras väger tyngre än utspridda ord", () => {
    const r = (0, sok_1.sok)("styrelse möte", {
        handelser: [
            h("1", "Möte om styrelsen och annat"),
            h("2", "Styrelsemöte"),
        ],
        uppgifter: [],
    });
    lika(r[0].id, "2");
});
prov("söker över alla tre sorterna", () => {
    const r = (0, sok_1.sok)("rapport", {
        handelser: [h("1", "Rapportmöte")],
        uppgifter: [u("2", "Skriv rapporten")],
        anteckningar: [a("3", "Rapportutkast")],
    });
    lika(r.length, 3);
    lika(new Set(r.map((x) => x.slag)).size, 3);
});
prov("avbockade uppgifter hamnar sist", () => {
    const r = (0, sok_1.sok)("rapport", {
        handelser: [],
        uppgifter: [
            u("1", "Rapport", { klar: true, klarVid: "2026-08-10T10:00:00.000Z" }),
            u("2", "Rapport senare"),
        ],
    });
    lika(r[0].id, "2", "det som återstår går före kvittot");
});
prov("luddig matchning fångar stavfel men bara för längre ord", () => {
    const kalla = { handelser: [h("1", "Tandläkare")], uppgifter: [] };
    lika((0, sok_1.sok)("tndlk", kalla).length, 1, "tecknen kommer i ordning");
    lika((0, sok_1.sok)("xyz", kalla).length, 0);
});
prov("utdraget visar var i texten träffen satt", () => {
    const r = (0, sok_1.sok)("försäkring", {
        handelser: [],
        uppgifter: [],
        anteckningar: [
            a("1", "Bilen", "Verkstaden sa att försäkringen går ut i november."),
        ],
    });
    lika(r.length, 1);
    if (!r[0].utdrag.includes("försäkringen")) {
        throw new Error(`utdraget saknar ordet: ${r[0].utdrag}`);
    }
});
prov("ordningen är total och därmed stabil", () => {
    // Två identiska poster får inte byta plats mellan två anrop.
    const kalla = {
        handelser: [h("b", "Möte"), h("a", "Möte")],
        uppgifter: [],
    };
    lika((0, sok_1.sok)("möte", kalla).map((x) => x.id), (0, sok_1.sok)("möte", kalla).map((x) => x.id));
});
prov("taket respekteras", () => {
    const manga = Array.from({ length: 50 }, (_, i) => h(`h${i}`, `Möte ${i}`));
    lika((0, sok_1.sok)("möte", { handelser: manga, uppgifter: [] }, 5).length, 5);
});
process.stdout.write(`\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`);
if (fel > 0)
    process.exit(1);
