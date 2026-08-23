"use strict";
/**
 * Prov för fornsvenskasidan.
 *
 * Tre saker bär den:
 *
 *   KODEN, som är postens identitet utanför appen. Den får aldrig bli
 *   en dubblett — två enheter som lägger till varsitt verk offline har
 *   samma räknare, och den som synkar sist skulle annars skriva över.
 *
 *   KÄLLHÄNVISNINGEN, som byggs ur de fält som råkar vara ifyllda. En
 *   hänvisning med ". ." i mitten ser slarvigare ut än ingen alls.
 *
 *   TOLKNINGEN, som tar emot `unknown` ur en JSONB-kolumn databasen inte
 *   kontrollerar — och som måste vägra sätta något annat än http i ett
 *   href.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fornsvenska_1 = require("../lib/sidor/fornsvenska");
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
const v = (extra = {}) => ({
    id: "x",
    kod: "FSV-001",
    titel: "",
    forfattare: "",
    slag: "",
    ar: "",
    lage: "behovs",
    plats: "",
    url: "",
    anteckning: "",
    ...extra,
});
const REGISTER = (0, fornsvenska_1.tolkaFsvData)({
    nastaKod: 5,
    verk: [
        {
            id: "a",
            kod: "FSV-001",
            titel: "Altschwedische Grammatik",
            forfattare: "Noreen, Adolf",
            slag: "Läromedel",
            ar: "1904",
            lage: "har",
            plats: "Litteraturbanken",
        },
        {
            id: "b",
            kod: "FSV-002",
            titel: "Dativens bortfall",
            forfattare: "Larsson",
            slag: "Doktorsavhandling",
            ar: "1988",
            lage: "behovs",
            plats: "DiVA",
        },
        {
            id: "c",
            kod: "FSV-004",
            titel: "Upplandslagen",
            slag: "Utgåva",
            lage: "last",
        },
    ],
});
process.stdout.write("\nFORNSVENSKA\n");
/* --- tolkningen --------------------------------------------------- */
prov("skräp in ger ett tomt men användbart register", () => {
    for (const skrap of [null, undefined, 0, "nej", [], true]) {
        lika((0, fornsvenska_1.tolkaFsvData)(skrap), fornsvenska_1.TOM_FSV, `föll på ${JSON.stringify(skrap)}`);
    }
});
prov("okänt läge blir behövs", () => {
    const d = (0, fornsvenska_1.tolkaFsvData)({ verk: [{ lage: "beställd" }, { lage: 5 }, {}] });
    lika(d.verk.map((x) => x.lage), ["behovs", "behovs", "behovs"]);
});
prov("verk utan kod får en", () => {
    const d = (0, fornsvenska_1.tolkaFsvData)({ verk: [{ titel: "A" }, { titel: "B" }] });
    lika(d.verk.map((x) => x.kod), ["FSV-001", "FSV-002"]);
});
prov("räknaren återställs om den är trasig", () => {
    lika((0, fornsvenska_1.tolkaFsvData)({ nastaKod: -3 }).nastaKod, 1);
    lika((0, fornsvenska_1.tolkaFsvData)({ nastaKod: "x" }).nastaKod, 1);
    lika((0, fornsvenska_1.tolkaFsvData)({ nastaKod: 12 }).nastaKod, 12);
});
prov("bara http och https godtas som länk", () => {
    lika((0, fornsvenska_1.trygsamUrl)("https://libris.kb.se/x"), "https://libris.kb.se/x");
    lika((0, fornsvenska_1.trygsamUrl)("http://a.se"), "http://a.se");
    lika((0, fornsvenska_1.trygsamUrl)("javascript:alert(1)"), "", "skript i ett href");
    lika((0, fornsvenska_1.trygsamUrl)("libris.kb.se"), "", "utan protokoll vet vi inte vad det är");
    lika((0, fornsvenska_1.trygsamUrl)("data:text/html,x"), "");
    lika((0, fornsvenska_1.trygsamUrl)(42), "");
});
prov("länken saneras redan vid tolkningen", () => {
    const d = (0, fornsvenska_1.tolkaFsvData)({ verk: [{ url: "javascript:alert(1)" }] });
    lika(d.verk[0].url, "");
});
prov("idéer utan giltigt datum får tom sträng", () => {
    const d = (0, fornsvenska_1.tolkaFsvData)({
        ideer: [{ text: "A", skapad: "i somras" }, { text: "B", skapad: "2026-08-12" }],
    });
    lika(d.ideer.map((i) => i.skapad), ["", "2026-08-12"]);
});
/* --- koden -------------------------------------------------------- */
prov("koden formateras med tre siffror", () => {
    lika((0, fornsvenska_1.formateraKod)(1), "FSV-001");
    lika((0, fornsvenska_1.formateraKod)(14), "FSV-014");
    lika((0, fornsvenska_1.formateraKod)(999), "FSV-999");
    lika((0, fornsvenska_1.formateraKod)(1000), "FSV-1000", "fyra siffror får växa ut");
});
prov("nästa kod tar hänsyn till redan använda nummer", () => {
    // Räknaren står på 5 men FSV-004 är högsta använda: nästa är 5.
    lika((0, fornsvenska_1.nastaLedigaKod)(REGISTER), 5);
});
prov("en efterbliven räknare ger ändå ingen dubblett", () => {
    // Två enheter offline: den ena har hunnit lägga till FSV-009 medan
    // räknaren i den här kopian står kvar på 3.
    const efter = {
        ...fornsvenska_1.TOM_FSV,
        nastaKod: 3,
        verk: [v({ kod: "FSV-009" })],
    };
    lika((0, fornsvenska_1.nastaLedigaKod)(efter), 10, "hade skrivit över FSV-003 eller kolliderat");
});
prov("tomt register börjar på ett", () => {
    lika((0, fornsvenska_1.nastaLedigaKod)(fornsvenska_1.TOM_FSV), 1);
});
/* --- lägena ------------------------------------------------------- */
prov("lägena är ett flöde", () => {
    lika(fornsvenska_1.LAGEN.map((l) => l.id), ["behovs", "har", "last"]);
    lika((0, fornsvenska_1.lagesIndex)("behovs"), 0);
    lika((0, fornsvenska_1.lagesIndex)("last"), 2);
});
prov("nästa läge går runt", () => {
    lika((0, fornsvenska_1.nastaLage)("behovs"), "har");
    lika((0, fornsvenska_1.nastaLage)("har"), "last");
    lika((0, fornsvenska_1.nastaLage)("last"), "behovs", "från sista går det runt");
});
/* --- räkneverket -------------------------------------------------- */
prov("räkning per läge", () => {
    lika((0, fornsvenska_1.rakna)(REGISTER), { behovs: 1, har: 1, last: 1, totalt: 3 });
});
prov("andelen genomarbetat", () => {
    lika((0, fornsvenska_1.andelLast)((0, fornsvenska_1.rakna)(REGISTER)), 1 / 3);
    lika((0, fornsvenska_1.andelLast)({ behovs: 0, har: 0, last: 0, totalt: 0 }), 0, "ingen division med noll");
});
/* --- filter och ordning ------------------------------------------- */
prov("filter på läge", () => {
    lika((0, fornsvenska_1.filtreraVerk)(REGISTER, "", "behovs").map((x) => x.kod), ["FSV-002"]);
});
prov("fritext söker i titel, författare, slag, plats, kod och år", () => {
    lika((0, fornsvenska_1.filtreraVerk)(REGISTER, "noreen", null).map((x) => x.kod), ["FSV-001"]);
    lika((0, fornsvenska_1.filtreraVerk)(REGISTER, "diva", null).map((x) => x.kod), ["FSV-002"]);
    lika((0, fornsvenska_1.filtreraVerk)(REGISTER, "fsv-004", null).map((x) => x.kod), ["FSV-004"]);
    lika((0, fornsvenska_1.filtreraVerk)(REGISTER, "1904", null).map((x) => x.kod), ["FSV-001"]);
});
prov("alla termer måste finnas", () => {
    lika((0, fornsvenska_1.filtreraVerk)(REGISTER, "noreen 1904", null).length, 1);
    lika((0, fornsvenska_1.filtreraVerk)(REGISTER, "noreen diva", null).length, 0);
});
prov("anteckningen söks inte igenom", () => {
    // Anteckningar är långa och innehåller ord som finns i halva
    // registret. En sökning som träffar allt är ingen sökning.
    const d = {
        ...fornsvenska_1.TOM_FSV,
        verk: [v({ titel: "A", anteckning: "handskriften är svårläst" })],
    };
    lika((0, fornsvenska_1.filtreraVerk)(d, "handskriften", null).length, 0);
});
prov("det som behövs ligger överst", () => {
    lika((0, fornsvenska_1.sorteraVerk)(REGISTER.verk).map((x) => x.kod), [
        "FSV-002",
        "FSV-001",
        "FSV-004",
    ]);
});
/* --- källhänvisningen --------------------------------------------- */
prov("full hänvisning", () => {
    lika((0, fornsvenska_1.kallhanvisning)(v({
        forfattare: "Noreen, Adolf",
        ar: "1904",
        titel: "Altschwedische Grammatik",
        slag: "Läromedel",
        plats: "Litteraturbanken",
        url: "https://litteraturbanken.se/x",
    })), "Noreen, Adolf (1904). Altschwedische Grammatik. Läromedel. Litteraturbanken. https://litteraturbanken.se/x");
});
prov("tomma fält lämnar inga skiljetecken efter sig", () => {
    lika((0, fornsvenska_1.kallhanvisning)(v({ titel: "Upplandslagen" })), "Upplandslagen.");
    lika((0, fornsvenska_1.kallhanvisning)(v({ forfattare: "Larsson", titel: "Dativen" })), "Larsson. Dativen.");
    lika((0, fornsvenska_1.kallhanvisning)(v({ ar: "1988", titel: "Dativen" })), "(1988). Dativen.");
});
prov("helt tomt verk ger tom hänvisning", () => {
    lika((0, fornsvenska_1.kallhanvisning)(v()), "");
});
prov("bara en länk ger bara länken", () => {
    lika((0, fornsvenska_1.kallhanvisning)(v({ url: "https://a.se" })), "https://a.se");
});
process.stdout.write(`\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`);
if (fel > 0)
    process.exit(1);
