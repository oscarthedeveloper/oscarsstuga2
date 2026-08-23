"use strict";
/**
 * Prov för högskoleprovssidan.
 *
 * Två saker bär hela sidan och provas därför hårdast:
 *
 *   TOLKNINGEN, som tar emot `unknown` ur en JSONB-kolumn databasen
 *   inte kontrollerar. Den måste klara gammal, halv och trasig data
 *   utan att kasta — en sida som kraschar på ett omdöpt fält är en
 *   sida man har tappat.
 *
 *   AVSTÅNDET, som är sidans hela svar på frågan "räcker min poäng".
 */
Object.defineProperty(exports, "__esModule", { value: true });
const hogskoleprov_1 = require("../lib/sidor/hogskoleprov");
const Talfalt_1 = require("../components/sidor/block/Talfalt");
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
const IDAG = new Date(2026, 7, 12); // onsdag 12 augusti 2026
/** Oscars faktiska kurva. */
const t = (sasong, ar) => ({ sasong, ar });
const KURVAN = {
    ...hogskoleprov_1.TOM_HP,
    resultat: [
        { id: "a", termin: t("host", 2024), normerat: 0.95, delar: {}, anteckning: "" },
        { id: "b", termin: t("var", 2025), normerat: 1.05, delar: {}, anteckning: "" },
        { id: "c", termin: t("host", 2025), normerat: 1.25, delar: {}, anteckning: "" },
        { id: "d", termin: t("var", 2026), normerat: 1.45, delar: {}, anteckning: "" },
    ],
};
process.stdout.write("\nHÖGSKOLEPROVSSIDAN\n");
/* --- provets form ------------------------------------------------- */
prov("provdelarna summerar till 160 uppgifter", () => {
    lika(hogskoleprov_1.PROVDELAR.reduce((s, d) => s + d.max, 0), 160);
});
prov("kvantitativt och verbalt väger lika", () => {
    const kv = hogskoleprov_1.PROVDELAR.filter((d) => d.grupp === "kvantitativ");
    const ve = hogskoleprov_1.PROVDELAR.filter((d) => d.grupp === "verbal");
    lika(kv.reduce((s, d) => s + d.max, 0), 80);
    lika(ve.reduce((s, d) => s + d.max, 0), 80);
});
/* --- tolkningen --------------------------------------------------- */
prov("skräp in ger en tom men ritbar sida", () => {
    for (const skrap of [null, undefined, 0, "nej", [], true]) {
        lika((0, hogskoleprov_1.tolkaHpData)(skrap), hogskoleprov_1.TOM_HP, `föll på ${JSON.stringify(skrap)}`);
    }
});
prov("halva poster fylls i med tomma värden", () => {
    const d = (0, hogskoleprov_1.tolkaHpData)({ resultat: [{ termin: "VÅR26" }] });
    lika(d.resultat.length, 1);
    lika(d.resultat[0].normerat, null);
    lika(d.resultat[0].anteckning, "");
    lika(d.resultat[0].delar, {});
});
prov("poster utan id får ett stabilt sådant", () => {
    const d = (0, hogskoleprov_1.tolkaHpData)({ resultat: [{ termin: "VÅR26" }, {}] });
    lika(d.resultat[0].id, "r0");
    lika(d.resultat[1].id, "r1");
});
/* --- terminen ----------------------------------------------------- */
prov("terminen går att skriva på alla rimliga sätt", () => {
    const vantat = { sasong: "host", ar: 2025 };
    for (const rå of ["HÖST25", "höst25", "host 25", "H25", "HT25", "ht 2025", "höst-2025"]) {
        lika((0, hogskoleprov_1.tolkaTermin)(rå), vantat, `föll på "${rå}"`);
    }
    for (const rå of ["VÅR26", "var26", "V26", "VT26", "vt 2026"]) {
        lika((0, hogskoleprov_1.tolkaTermin)(rå), { sasong: "var", ar: 2026 }, `föll på "${rå}"`);
    }
});
prov("skräp är ingen termin", () => {
    for (const rå of ["", "25", "höst", "x25", "höst 1", "sommar25", "höst 20255"]) {
        lika((0, hogskoleprov_1.tolkaTermin)(rå), null, `godtog "${rå}"`);
    }
});
prov("terminen skrivs ut kort", () => {
    lika((0, hogskoleprov_1.terminText)({ sasong: "host", ar: 2025 }), "HÖST25");
    lika((0, hogskoleprov_1.terminText)({ sasong: "var", ar: 2026 }), "VÅR26");
    lika((0, hogskoleprov_1.terminText)(null), "");
});
prov("våren kommer före hösten samma år", () => {
    const v = (0, hogskoleprov_1.terminOrdning)({ sasong: "var", ar: 2026 });
    const h = (0, hogskoleprov_1.terminOrdning)({ sasong: "host", ar: 2026 });
    const nasta = (0, hogskoleprov_1.terminOrdning)({ sasong: "var", ar: 2027 });
    lika(v < h && h < nasta, true);
    lika((0, hogskoleprov_1.terminOrdning)(null) > nasta, true, "ofyllda hamnar sist");
});
prov("gamla poster med datum läses som termin", () => {
    // Fältet hette datum innan provtillfället blev en termin. En post
    // som ännu inte skrivits om skall inte tappa sitt provtillfälle.
    const d = (0, hogskoleprov_1.tolkaHpData)({
        resultat: [
            { id: "host", datum: "2025-10-19" },
            { id: "var", datum: "2026-04-11" },
        ],
    });
    lika(d.resultat[0].termin, { sasong: "host", ar: 2025 });
    lika(d.resultat[1].termin, { sasong: "var", ar: 2026 });
});
prov("orimliga poäng avvisas i stället för att ritas", () => {
    const d = (0, hogskoleprov_1.tolkaHpData)({
        resultat: [
            { normerat: 2.5 },
            { normerat: -1 },
            { normerat: "1,35" },
            { normerat: 1.45 },
        ],
    });
    lika(d.resultat.map((r) => r.normerat), [null, null, 1.35, 1.45]);
});
prov("komma duger som decimaltecken", () => {
    lika((0, hogskoleprov_1.tolkaHpData)({ mal: "1,60" }).mal, 1.6);
});
prov("datum som inte är datum blir tomma", () => {
    const d = (0, hogskoleprov_1.tolkaHpData)({ datum: [{ datum: "i höst", vad: "Anmälan" }] });
    lika(d.datum[0].datum, "");
    lika(d.datum[0].vad, "Anmälan");
});
prov("delpoäng över delens maxpoäng avvisas", () => {
    const d = (0, hogskoleprov_1.tolkaHpData)({ resultat: [{ delar: { NOG: 13, XYZ: 20, ORD: 8 } }] });
    // NOG har tolv uppgifter; tretton går inte att få.
    lika(d.resultat[0].delar, { XYZ: 20, ORD: 8 });
});
prov("okända fält i delar ignoreras", () => {
    const d = (0, hogskoleprov_1.tolkaHpData)({ resultat: [{ delar: { GAMMALT: 5, ORD: 8 } }] });
    lika(d.resultat[0].delar, { ORD: 8 });
});
/* --- resultaten --------------------------------------------------- */
prov("resultaten sorteras i terminsordning", () => {
    const d = (0, hogskoleprov_1.tolkaHpData)({
        resultat: [
            { id: "sen", termin: "VÅR26", normerat: 1.45 },
            { id: "tidig", termin: "HÖST24", normerat: 0.95 },
            { id: "utan", normerat: 1.1 },
        ],
    });
    lika((0, hogskoleprov_1.sorteradeResultat)(d).map((r) => r.id), ["tidig", "sen", "utan"]);
});
prov("senaste och bästa resultatet", () => {
    lika((0, hogskoleprov_1.senasteResultat)(KURVAN)?.normerat, 1.45);
    lika((0, hogskoleprov_1.bastaResultat)(KURVAN)?.normerat, 1.45);
});
prov("ett kommande prov utan poäng räknas inte som ett tapp", () => {
    const d = {
        ...KURVAN,
        resultat: [
            ...KURVAN.resultat,
            { id: "e", termin: t("host", 2026), normerat: null, delar: {}, anteckning: "" },
        ],
    };
    lika((0, hogskoleprov_1.senasteResultat)(d)?.normerat, 1.45, "det oskrivna provet tog över");
});
prov("ett sämre omprov tar inte bort ett bra", () => {
    const d = {
        ...KURVAN,
        resultat: [
            ...KURVAN.resultat,
            { id: "e", termin: t("host", 2026), normerat: 1.2, delar: {}, anteckning: "" },
        ],
    };
    lika((0, hogskoleprov_1.senasteResultat)(d)?.normerat, 1.2);
    lika((0, hogskoleprov_1.bastaResultat)(d)?.normerat, 1.45, "antagningen räknar det bästa");
});
/* --- avståndet ---------------------------------------------------- */
prov("avstånd räknas mot bästa poängen", () => {
    const d = {
        ...KURVAN,
        larosaten: [
            { id: "gu", namn: "Göteborgs universitet", termin: "HT2026", poang: 1.35 },
            { id: "ki", namn: "Karolinska institutet", termin: "HT2026", poang: 1.6 },
        ],
    };
    const a = (0, hogskoleprov_1.avstand)(d);
    lika(a[0].skillnad, 0.1);
    lika(a[0].racker, true);
    lika(a[1].skillnad, -0.15);
    lika(a[1].racker, false);
});
prov("utan ifylld antagningspoäng blir avståndet okänt, inte noll", () => {
    const d = {
        ...KURVAN,
        larosaten: [{ id: "gu", namn: "GU", termin: "", poang: null }],
    };
    lika((0, hogskoleprov_1.avstand)(d)[0].skillnad, null);
    lika((0, hogskoleprov_1.avstand)(d)[0].racker, false);
});
prov("eget mål kommer med sist", () => {
    const a = (0, hogskoleprov_1.avstand)({ ...KURVAN, mal: 1.6 });
    lika(a.length, 1);
    lika(a[0].id, "mal");
    lika(a[0].skillnad, -0.15);
});
prov("avrundning håller sig till två decimaler", () => {
    const d = {
        ...hogskoleprov_1.TOM_HP,
        resultat: [
            { id: "a", termin: t("var", 2026), normerat: 1.45, delar: {}, anteckning: "" },
        ],
        larosaten: [{ id: "x", namn: "X", termin: "", poang: 1.1 }],
    };
    lika((0, hogskoleprov_1.avstand)(d)[0].skillnad, 0.35, "flyttalsskräp läckte ut");
});
/* --- delpoängen --------------------------------------------------- */
prov("svagaste delen mäts i andel, inte i råpoäng", () => {
    // 6/12 på NOG är hälften; 10/24 på DTK är knappt det. DTK är svagast
    // trots att råpoängen är högre.
    const r = (0, hogskoleprov_1.tolkaHpData)({ resultat: [{ delar: { NOG: 6, DTK: 10 } }] }).resultat[0];
    lika((0, hogskoleprov_1.svagasteDelen)(r)?.del, "DTK");
});
prov("delar som inte fyllts i räknas inte som noll", () => {
    const r = (0, hogskoleprov_1.tolkaHpData)({ resultat: [{ delar: { ORD: 18 } }] }).resultat[0];
    lika((0, hogskoleprov_1.svagasteDelen)(r)?.del, "ORD");
    lika((0, hogskoleprov_1.delresultat)(r).filter((d) => d.andel !== null).length, 1);
});
prov("utan delpoäng finns ingen svagaste del", () => {
    lika((0, hogskoleprov_1.svagasteDelen)(null), null);
    lika((0, hogskoleprov_1.svagasteDelen)(KURVAN.resultat[0]), null);
});
prov("gruppsummor", () => {
    const r = (0, hogskoleprov_1.tolkaHpData)({
        resultat: [{ delar: { XYZ: 20, KVA: 15, ORD: 18 } }],
    }).resultat[0];
    lika((0, hogskoleprov_1.gruppsumma)(r, "kvantitativ"), { poang: 35, max: 80, ifyllda: 2 });
    lika((0, hogskoleprov_1.gruppsumma)(r, "verbal"), { poang: 18, max: 80, ifyllda: 1 });
});
/* --- datumen ------------------------------------------------------ */
prov("nedräkning", () => {
    lika((0, hogskoleprov_1.dygnKvar)("2026-08-12", IDAG), 0);
    lika((0, hogskoleprov_1.dygnKvar)("2026-08-13", IDAG), 1);
    lika((0, hogskoleprov_1.dygnKvar)("2026-08-11", IDAG), -1);
    lika((0, hogskoleprov_1.dygnKvar)("2026-10-17", IDAG), 66);
    lika((0, hogskoleprov_1.dygnKvar)("", IDAG), null);
});
prov("nedräkningstext", () => {
    lika((0, hogskoleprov_1.nedrakningstext)(0), "Idag");
    lika((0, hogskoleprov_1.nedrakningstext)(1), "Imorgon");
    lika((0, hogskoleprov_1.nedrakningstext)(-1), "Igår");
    lika((0, hogskoleprov_1.nedrakningstext)(66), "Om 66 dygn");
    lika((0, hogskoleprov_1.nedrakningstext)(-5), "För 5 dygn sedan");
    lika((0, hogskoleprov_1.nedrakningstext)(null), "");
});
prov("kommande datum först, passerade sist", () => {
    const d = {
        ...hogskoleprov_1.TOM_HP,
        datum: [
            { id: "gammalt", datum: "2026-04-11", vad: "Provdag" },
            { id: "nytt", datum: "2026-10-17", vad: "Provdag" },
            { id: "snart", datum: "2026-09-01", vad: "Anmälan" },
            { id: "utan", datum: "", vad: "Besked" },
        ],
    };
    lika((0, hogskoleprov_1.sorteradeDatum)(d, IDAG).map((x) => x.id), [
        "snart",
        "nytt",
        "gammalt",
        "utan",
    ]);
});
prov("högsta normerade poängen är två", () => {
    lika(hogskoleprov_1.HOGSTA_NORMERAT, 2.0);
});
/* ------------------------------------------------------------------
   SIFFERFÄLTET
   ------------------------------------------------------------------ */
prov("en halvskriven decimal räknas som i takt med värdet", () => {
    /*
     * Det här är hela kommateckensbuggen, fångad i ett prov.
     *
     * Fältet ritar om sig utifrån först när det inkommande värdet säger
     * något ANNAT än det man skrivit. Skriver man "1," måste den texten
     * tolkas till samma tal som "1" — annars ser fältet sig självt som
     * ur takt, skriver om texten till "1", och kommat försvinner innan
     * man hunnit skriva 7:an i 1,70.
     */
    lika((0, Talfalt_1.tolka)("1,"), (0, Talfalt_1.tolka)("1"));
    lika((0, Talfalt_1.tolka)("1,"), 1);
    lika((0, Talfalt_1.tolka)("1,7"), 1.7);
    lika((0, Talfalt_1.tolka)("1,70"), 1.7);
    lika((0, Talfalt_1.tolka)("1.70"), 1.7, "punkt duger också");
});
prov("tomt fält är inget värde, inte noll", () => {
    lika((0, Talfalt_1.tolka)(""), null);
    lika((0, Talfalt_1.tolka)("   "), null);
});
prov("skräp i fältet blir inget värde", () => {
    lika((0, Talfalt_1.tolka)("abc"), null);
    lika((0, Talfalt_1.tolka)("1,,2"), null);
});
prov("värdet skrivs tillbaka med svenskt komma", () => {
    lika((0, Talfalt_1.skriv)(1.7), "1,7");
    lika((0, Talfalt_1.skriv)(20), "20");
    lika((0, Talfalt_1.skriv)(null), "");
});
process.stdout.write(`\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`);
if (fel > 0)
    process.exit(1);
