"use strict";
/**
 * Prov för vinsidan.
 *
 * Sidan räknar åt användaren och ritar tre diagram ur samma data, och
 * ett räknefel här ser inte ut som ett fel utan som ett svar. Tyngden
 * ligger därför på tre saker: att OFYLLT aldrig blir noll, att ett vin
 * som saknar ett tal hamnar sist och inte först när listan sorteras, och
 * att diagrammen hoppar över det de inte vet i stället för att gissa.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const viner_1 = require("../lib/sidor/viner");
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
const DATA = (0, viner_1.tolkaVinData)({
    nastaKod: 5,
    viner: [
        {
            id: "a",
            kod: "VIN-001",
            namn: "Mucho Más Tinto",
            producent: "Félix Solís",
            argang: "N.V.",
            land: "Spanien",
            region: "La Mancha",
            vinstil: "Spanien Röda",
            typ: "rott",
            druvor: ["Shiraz/Syrah", "Tempranillo"],
            alkohol: 13.5,
            lage: "har",
            antal: 3,
            pris: 89,
            inkopsstalle: "Systembolaget",
            vivinoBetyg: 3.7,
            vivinoAntal: 8503,
            egetBetyg: 4,
            profil: { fyllighet: 70, stravhet: 34, sotma: 38, syra: 28 },
            smaknoter: [
                { id: "n1", ord: "Vanilj, ek, tobak", grupp: "fatad", antal: 1511 },
            ],
            passarTill: ["nötkött", "pasta"],
        },
        {
            id: "b",
            kod: "VIN-002",
            namn: "Chablis",
            producent: "William Fèvre",
            argang: "2021",
            land: "Frankrike",
            typ: "vitt",
            druvor: ["Chardonnay"],
            lage: "drucken",
            druckenDatum: "2026-07-04",
            pris: 249,
            vivinoBetyg: 4.1,
            egetBetyg: 3.2,
            profil: { fyllighet: 40, stravhet: 20, sotma: 10, syra: 82 },
        },
        {
            id: "c",
            kod: "VIN-003",
            namn: "Barolo",
            producent: "Vietti",
            argang: "2018",
            land: "Italien",
            typ: "rott",
            druvor: ["Nebbiolo"],
            lage: "har",
            // Inget antal: skall räknas som en flaska.
            pris: 599,
            vivinoBetyg: 4.4,
        },
        {
            id: "d",
            kod: "VIN-004",
            namn: "Okänd flaska från resan",
            lage: "vill",
            typ: "rose",
            uppgifterSaknas: true,
        },
    ],
});
process.stdout.write("\nMINA VINER\n");
/* --- tal och text ------------------------------------------------- */
prov("tal tolkas med mellanrum, komma, kr och procent", () => {
    lika((0, viner_1.tolkaTal)("1299"), 1299);
    lika((0, viner_1.tolkaTal)("1 299"), 1299, "vanligt mellanrum");
    lika((0, viner_1.tolkaTal)("1 299"), 1299, "hårt mellanrum, som utskriften");
    lika((0, viner_1.tolkaTal)("89 kr"), 89);
    lika((0, viner_1.tolkaTal)("13,5"), 13.5);
    lika((0, viner_1.tolkaTal)("13,5 %"), 13.5);
    lika((0, viner_1.tolkaTal)(3.7), 3.7);
});
prov("tomt är okänt, inte noll", () => {
    // Ett vin utan pris är inte gratis, och ett vin utan betyg är inte
    // uselt. Skillnaden bär hela sidan.
    lika((0, viner_1.tolkaTal)(""), null);
    lika((0, viner_1.tolkaTal)("   "), null);
    lika((0, viner_1.tolkaTal)("abc"), null);
    lika((0, viner_1.tolkaTal)(null), null);
    lika((0, viner_1.tolkaTal)(0), 0, "en medveten nolla är ett värde");
});
prov("betyg hålls inom skalan", () => {
    lika((0, viner_1.tolkaBetyg)("4,2"), 4.2);
    lika((0, viner_1.tolkaBetyg)("9"), 5, "utanför skalan är det inget betyg");
    lika((0, viner_1.tolkaBetyg)("-2"), 0);
    lika((0, viner_1.tolkaBetyg)(""), null);
});
prov("betyg och procent skrivs med svenskt komma", () => {
    lika((0, viner_1.betygstext)(3.7), "3,7");
    lika((0, viner_1.betygstext)(4), "4,0");
    lika((0, viner_1.betygstext)(null), "—");
    lika((0, viner_1.procenttext)(13.5), "13,5 %");
    lika((0, viner_1.procenttext)(14), "14 %", "hela tal får ingen påhängd nolla");
    lika((0, viner_1.kronor)(1299), "1 299", "hårt mellanrum, så att beloppet aldrig bryts");
});
prov("snedstreck delar inte druvor", () => {
    // "Shiraz/Syrah" är druvans namn och inte två druvor. Komma och
    // radbrytning delar; snedstreck gör det inte.
    lika((0, viner_1.tolkaLista)("Shiraz/Syrah, Tempranillo"), ["Shiraz/Syrah", "Tempranillo"]);
    lika((0, viner_1.tolkaLista)("Chardonnay\nRiesling"), ["Chardonnay", "Riesling"]);
    lika((0, viner_1.tolkaLista)("  "), []);
    lika((0, viner_1.tolkaLista)(["Nebbiolo", "  ", ""]), ["Nebbiolo"]);
    lika((0, viner_1.skrivLista)(["a", "b"]), "a, b");
});
prov("bara http och https duger som adress", () => {
    // Ett fält som synkas mellan enheter och hamnar i ett href eller ett
    // src är precis det man inte vill ha javascript: i.
    lika((0, viner_1.trygsamUrl)("https://vivino.com/x"), "https://vivino.com/x");
    lika((0, viner_1.trygsamUrl)("javascript:alert(1)"), "");
    lika((0, viner_1.trygsamUrl)("vivino.com"), "");
    lika((0, viner_1.trygsamUrl)(null), "");
});
/* --- vinets namn -------------------------------------------------- */
prov("producenten utelämnas när namnet redan börjar med den", () => {
    lika((0, viner_1.vinTitel)(DATA.viner[0]), "Félix Solís Mucho Más Tinto N.V.");
    const eget = (0, viner_1.tolkaVinData)({
        viner: [{ id: "x", namn: "Vietti Barolo", producent: "Vietti", argang: "2018" }],
    });
    lika((0, viner_1.vinTitel)(eget.viner[0]), "Vietti Barolo 2018", "ingen dubblering");
});
prov("ett namnlöst vin heter något ändå", () => {
    const d = (0, viner_1.tolkaVinData)({ viner: [{ id: "x" }] });
    lika((0, viner_1.vinTitel)(d.viner[0]), "Namnlöst vin");
});
prov("underraden bär bara det som är ifyllt", () => {
    lika((0, viner_1.vinUnderrad)(DATA.viner[0]), [
        "Spanien · La Mancha",
        "Shiraz/Syrah, Tempranillo",
        "13,5 %",
    ]);
    lika((0, viner_1.vinUnderrad)(DATA.viner[3]), [], "ett tomt vin får ingen underrad");
});
/* --- fakta om vinet ----------------------------------------------- */
prov("faktatabellen lämnar ingen rad efter tomma fält", () => {
    // En tabell med halva raderna tomma ser ut som ett formulär man glömt
    // fylla i, och läsläget finns just för att slippa se ett formulär.
    const rader = (0, viner_1.vinFakta)(DATA.viner[0]);
    const etiketter = rader.map((r) => r.etikett);
    lika(etiketter, [
        "Producent",
        "Årgång",
        "Druvor",
        "Ursprung",
        "Vinstil",
        "Slag",
        "Alkoholvolym",
        "Pris per flaska",
        "Inköpsställe",
        "I källaren",
        "Passar till",
    ]);
    lika(rader.find((r) => r.etikett === "Ursprung")?.varde, "Spanien / La Mancha");
    lika(rader.find((r) => r.etikett === "I källaren")?.varde, "3 flaskor");
    lika(rader.find((r) => r.etikett === "Pris per flaska")?.varde, "89 kr");
});
prov("lagret och drickandet står bara där de betyder något", () => {
    // "0 flaskor" under ett vin man vill prova är inte en upplysning utan
    // en gåta.
    const vill = (0, viner_1.vinFakta)(DATA.viner[3]).map((r) => r.etikett);
    if (vill.includes("I källaren"))
        throw new Error("källarrad på ett vin man vill prova");
    if (vill.includes("Drucket"))
        throw new Error("dryckesdatum på ett oprovat vin");
    const drucket = (0, viner_1.vinFakta)(DATA.viner[1]);
    lika(drucket.find((r) => r.etikett === "Drucket")?.varde, "2026-07-04");
    if (drucket.some((r) => r.etikett === "I källaren")) {
        throw new Error("källarrad på ett drucket vin");
    }
});
prov("en flaska heter flaska och två heter flaskor", () => {
    lika((0, viner_1.vinFakta)(DATA.viner[2]).find((r) => r.etikett === "I källaren")?.varde, "1 flaska");
});
prov("ett nyss tillagt vin är tomt", () => {
    // Ett visningsläge som ritar en tom yta ser trasigt ut. Sidan skall
    // säga att det är tomt och peka på redigeringsknappen.
    const tomt = (0, viner_1.tolkaVinData)({ viner: [{ id: "x" }] });
    lika((0, viner_1.arTomt)(tomt.viner[0]), true);
    // Ett enda ifyllt fält räcker för att det skall finnas något att läsa.
    lika((0, viner_1.arTomt)(DATA.viner[0]), false);
    lika((0, viner_1.arTomt)(DATA.viner[3]), false, "namnet ensamt räcker");
});
prov("smaknotens fot skrivs som på förlagan", () => {
    lika((0, viner_1.smaknotsFot)({ id: "x", ord: "Vanilj, ek, tobak", grupp: "fatad", antal: 1511 }), "1 511 kommentarer om fatad toner");
    lika((0, viner_1.smaknotsFot)({ id: "x", ord: "a", grupp: "röd frukt", antal: 1 }), "1 kommentar om röd frukt toner", "en kommentar är inte kommentarer");
    // Utan antal står gruppen ensam. En påhittad nolla där hade sagt att
    // ingen nämnt tonen, vilket är något helt annat än att man inte skrev
    // av siffran.
    lika((0, viner_1.smaknotsFot)({ id: "x", ord: "a", grupp: "jordig", antal: null }), "jordig toner");
    lika((0, viner_1.smaknotsFot)({ id: "x", ord: "a", grupp: "", antal: null }), "");
});
/* --- listfältet --------------------------------------------------- */
prov("en halvskriven lista räknas som i takt", () => {
    /*
     * Detta är regeln som gör att man kan skriva mellanslag i fälten för
     * druvor och passar till. Ett kontrollerat fält som tolkar vid varje
     * tangenttryckning skriver om texten så fort det tolkade värdet ändras
     * — och "nötkött, " tolkas till samma lista som "nötkött", vilket är
     * precis vad `Listfalt` lutar sig mot när det låter bli att skriva om.
     * Höll inte detta skulle kommat och mellanslaget suddas innan man
     * hunnit skriva bokstaven efter.
     */
    lika((0, viner_1.tolkaLista)("nötkött, "), ["nötkött"]);
    lika((0, viner_1.tolkaLista)("nötkött,"), ["nötkött"]);
    lika((0, viner_1.tolkaLista)("nötkött "), ["nötkött"]);
    lika((0, viner_1.tolkaLista)("nötkött, pasta, "), ["nötkött", "pasta"]);
    // Mellanslag INNE i en post är en del av posten och får aldrig strykas.
    lika((0, viner_1.tolkaLista)("torkad frukt, mörk choklad"), ["torkad frukt", "mörk choklad"]);
    lika((0, viner_1.tolkaLista)("Pinot Noir"), ["Pinot Noir"]);
});
prov("utskriften är den man skrev in", () => {
    // Vid tappat fokus skrivs texten om ur listan. Går den rundturen inte
    // jämnt ut hoppar fältet när man klickar bort — och det ser ut som om
    // något ändrats.
    for (const rad of ["nötkött, pasta", "Shiraz/Syrah, Tempranillo", "Pinot Noir"]) {
        lika((0, viner_1.skrivLista)((0, viner_1.tolkaLista)(rad)), rad);
    }
});
/* --- lägen -------------------------------------------------------- */
prov("läget är ett flöde som går runt", () => {
    lika(viner_1.LAGEN.map((l) => l.id), ["vill", "har", "drucken"]);
    lika((0, viner_1.nastaLage)("vill"), "har");
    lika((0, viner_1.nastaLage)("har"), "drucken");
    lika((0, viner_1.nastaLage)("drucken"), "vill");
    lika((0, viner_1.lagesIndex)("drucken"), 2);
});
prov("okänt läge och okänd typ faller tillbaka", () => {
    const d = (0, viner_1.tolkaVinData)({
        viner: [{ id: "x", lage: "sålt", typ: "orange" }],
    });
    lika(d.viner[0].lage, "vill");
    lika(d.viner[0].typ, "rott");
});
/* --- flaskor och värde -------------------------------------------- */
prov("ett vin i källaren utan antal är en flaska", () => {
    // Noll vore fel: man har uppenbarligen vinet, annars stod det inte i
    // källaren. Att inte räkna det alls hade gett färre flaskor än viner.
    lika((0, viner_1.flaskor)(DATA.viner[2]), 1);
    lika((0, viner_1.flaskor)(DATA.viner[0]), 3);
    lika((0, viner_1.flaskor)(DATA.viner[1]), 0, "ett drucket vin är ingen flaska");
    lika((0, viner_1.flaskor)(DATA.viner[3]), 0, "ett vin man vill prova är ingen flaska");
});
prov("räkneverket", () => {
    const r = (0, viner_1.rakna)(DATA);
    lika(r.totalt, 4);
    lika(r.vill, 1);
    lika(r.har, 2);
    lika(r.drucken, 1);
    lika(r.flaskor, 4, "tre plus en utan antal");
    lika(r.varde, 866, "89×3 + 599×1; det druckna räknas inte");
    lika(Math.round((0, viner_1.andelDrucken)(r) * 100), 25);
});
prov("ett tomt register ger inga nollor att dela med", () => {
    const r = (0, viner_1.rakna)(viner_1.TOM_VIN_DATA);
    lika(r, { vill: 0, har: 0, drucken: 0, totalt: 0, flaskor: 0, varde: 0 });
    lika((0, viner_1.andelDrucken)(r), 0);
    lika((0, viner_1.medelbetyg)(viner_1.TOM_VIN_DATA, "eget"), null);
});
/* --- betyg -------------------------------------------------------- */
prov("snittet räknas bara på dem som har ett betyg", () => {
    // Ett vin man inte satt betyg på är inte ett dåligt vin. Räknades det
    // som en nolla skulle snittet falla för varje vin man lade till.
    lika((0, viner_1.medelbetyg)(DATA, "eget"), 3.6, "(4 + 3,2) / 2");
    lika((0, viner_1.medelbetyg)(DATA, "vivino"), (3.7 + 4.1 + 4.4) / 3);
});
prov("oense räknas bara när båda betygen finns", () => {
    lika(Math.round((0, viner_1.oense)(DATA.viner[0]) * 10) / 10, 0.3);
    lika(Math.round((0, viner_1.oense)(DATA.viner[1]) * 10) / 10, -0.9);
    lika((0, viner_1.oense)(DATA.viner[2]), null, "utan eget betyg finns ingen skillnad");
});
/* --- vad som återstår --------------------------------------------- */
prov("ett vin märkt som omöjligt att slå upp räknas inte som ofyllt", () => {
    // Utan flaggan blir varje sådant vin en påminnelse om ett arbete som
    // aldrig kan bli gjort.
    lika((0, viner_1.harProfil)(DATA.viner[3].profil), false);
    lika(DATA.viner[3].uppgifterSaknas, true);
    lika((0, viner_1.ofullstandiga)(DATA).map((v) => v.kod), ["VIN-003"]);
});
/* --- ordning ------------------------------------------------------ */
prov("ofyllda tal hamnar sist åt båda hållen", () => {
    // Ett vin utan pris är inte billigast, och ett utan betyg är inte
    // bäst. Låg man dem först vore listan obrukbar just när man använder
    // den.
    lika((0, viner_1.sorteraViner)(DATA.viner, "pris").map((v) => v.kod), [
        "VIN-001",
        "VIN-002",
        "VIN-003",
        "VIN-004",
    ]);
    lika((0, viner_1.sorteraViner)(DATA.viner, "betyg").map((v) => v.kod), [
        "VIN-003",
        "VIN-001",
        "VIN-002",
        "VIN-004",
    ]);
});
prov("kodordningen är den som inte flyttar sig", () => {
    lika((0, viner_1.sorteraViner)([...DATA.viner].reverse(), "kod").map((v) => v.kod), [
        "VIN-001",
        "VIN-002",
        "VIN-003",
        "VIN-004",
    ]);
});
/* --- filter ------------------------------------------------------- */
prov("sökningen träffar namn, land, druva och kod", () => {
    lika((0, viner_1.filtreraViner)(DATA, "tempranillo", null, null).map((v) => v.kod), [
        "VIN-001",
    ]);
    lika((0, viner_1.filtreraViner)(DATA, "italien", null, null).map((v) => v.kod), [
        "VIN-003",
    ]);
    lika((0, viner_1.filtreraViner)(DATA, "VIN-002", null, null).map((v) => v.kod), [
        "VIN-002",
    ]);
    lika((0, viner_1.filtreraViner)(DATA, "spanien röda", null, null).map((v) => v.kod), ["VIN-001"], "alla termer måste träffa");
});
prov("läge och typ filtrerar samtidigt", () => {
    lika((0, viner_1.filtreraViner)(DATA, "", "har", null).map((v) => v.kod), [
        "VIN-001",
        "VIN-003",
    ]);
    lika((0, viner_1.filtreraViner)(DATA, "", "har", "rott").map((v) => v.kod), [
        "VIN-001",
        "VIN-003",
    ]);
    lika((0, viner_1.filtreraViner)(DATA, "", "har", "vitt"), []);
});
/* --- fördelningen ------------------------------------------------- */
prov("ett vin med två druvor räknas i båda grupperna", () => {
    // Frågan uppdelningen svarar på är "hur mycket tempranillo har jag",
    // inte "hur många viner har jag" — det talet står i mätarpanelen.
    const d = (0, viner_1.fordelning)(DATA.viner, "druva");
    lika(d.find((x) => x.namn === "Shiraz/Syrah")?.antal, 1);
    lika(d.find((x) => x.namn === "Tempranillo")?.antal, 1);
    lika(d.reduce((s, x) => s + x.antal, 0), 5, "fyra viner, fem druvposter");
});
prov("viner utan värde samlas under Ej ifyllt", () => {
    // En stapel som tyst hoppar över hälften av samlingen ser ut som en
    // fullständig bild av något den inte beskriver.
    const d = (0, viner_1.fordelning)(DATA.viner, "druva");
    lika(d.find((x) => x.namn === "Ej ifyllt")?.antal, 1);
    const l = (0, viner_1.fordelning)(DATA.viner, "land");
    lika(l.find((x) => x.namn === "Ej ifyllt")?.antal, 1);
});
prov("typens färg är bunden och byts aldrig", () => {
    // Ett rött vin som är terrakotta i stapeln måste vara terrakotta i
    // smakkartan också, annars måste ögat lära om för varje diagram.
    const d = (0, viner_1.fordelning)(DATA.viner, "typ");
    lika(d.find((x) => x.namn === "Rött")?.ton, (0, viner_1.typTon)("rott"));
    lika(d.find((x) => x.namn === "Vitt")?.ton, (0, viner_1.typTon)("vitt"));
    lika(d.find((x) => x.namn === "Rosé")?.ton, (0, viner_1.typTon)("rose"));
});
prov("fördelningen sorteras störst först", () => {
    lika((0, viner_1.fordelning)(DATA.viner, "typ")[0].namn, "Rött");
});
/* --- diagrammen --------------------------------------------------- */
prov("betyg mot pris kräver båda talen", () => {
    // Ett saknat pris sätts inte till noll: vinet hade då hamnat längst
    // till vänster, där det ser ut att vara ett fynd.
    const p = (0, viner_1.betygMotPris)(DATA.viner, null);
    lika(p.map((x) => x.id), ["a", "b", "c"]);
    lika(p[0].x, 89);
    lika(p[0].y, 4, "ditt betyg går före Vivinos");
    lika(p[2].y, 4.4, "utan eget betyg används Vivinos");
});
prov("det öppnade vinet framhävs i diagrammet", () => {
    const p = (0, viner_1.betygMotPris)(DATA.viner, "b");
    lika(p.map((x) => x.framhavd), [false, true, false]);
});
prov("smakkartan kräver båda skalorna", () => {
    const p = (0, viner_1.smakkarta)(DATA.viner, "fyllighet", "stravhet", null);
    lika(p.map((x) => x.id), ["a", "b"]);
    lika([p[0].x, p[0].y], [70, 34]);
    lika((0, viner_1.smakkarta)(DATA.viner, "sotma", "syra", null).map((x) => x.id), ["a", "b"]);
});
prov("prisaxeln rundas upp och har ett golv", () => {
    // En samling med bara billiga viner skall inte få en axel som slutar
    // på 60, där varje prisskillnad ser dramatisk ut.
    lika((0, viner_1.pristak)((0, viner_1.betygMotPris)(DATA.viner, null)), 600);
    lika((0, viner_1.pristak)([]), 200);
    lika((0, viner_1.pristak)([{ id: "x", etikett: "", x: 45, y: 3, ton: 0, framhavd: false }]), 200);
});
/* --- smaknoterna -------------------------------------------------- */
prov("en okänd smakgrupp får blyerts och ingen gissad färg", () => {
    // En färg som betyder ingenting är värre än ingen färg.
    lika((0, viner_1.gruppTon)("fatad"), 0);
    lika((0, viner_1.gruppTon)("Svart frukt"), 5, "versaler spelar ingen roll");
    lika((0, viner_1.gruppTon)("hittepå"), 3);
    lika((0, viner_1.gruppTon)(""), 3);
});
prov("smaknoterna överlever en rundtur genom lagret", () => {
    lika(DATA.viner[0].smaknoter.length, 1);
    lika(DATA.viner[0].smaknoter[0].antal, 1511);
    lika(DATA.viner[0].smaknoter[0].grupp, "fatad");
});
/* --- koden -------------------------------------------------------- */
prov("koden är treställig och räknas aldrig ned", () => {
    lika((0, viner_1.formateraKod)(1), "VIN-001");
    lika((0, viner_1.formateraKod)(14), "VIN-014");
    lika((0, viner_1.formateraKod)(0), "VIN-001");
    // Räknaren kan ha hamnat efter när två enheter skrivit offline. Då
    // vinner det högsta använda numret.
    lika((0, viner_1.nastaLedigaKod)(DATA), 5);
    lika((0, viner_1.nastaLedigaKod)({ ...DATA, nastaKod: 1 }), 5);
    lika((0, viner_1.nastaLedigaKod)({ ...DATA, nastaKod: 99 }), 99);
    lika((0, viner_1.nastaLedigaKod)(viner_1.TOM_VIN_DATA), 1);
});
/* --- tolkningen --------------------------------------------------- */
prov("trasig data kraschar inte", () => {
    lika((0, viner_1.tolkaVinData)(null), viner_1.TOM_VIN_DATA);
    lika((0, viner_1.tolkaVinData)("strunt"), viner_1.TOM_VIN_DATA);
    lika((0, viner_1.tolkaVinData)({ viner: "inte en lista" }).viner, []);
    lika((0, viner_1.tolkaVinData)({ viner: [null, 3, { id: "x" }] }).viner.length, 1);
});
prov("ett ogiltigt datum blir tomt och inte skräp", () => {
    const d = (0, viner_1.tolkaVinData)({
        viner: [{ id: "x", druckenDatum: "i somras" }],
    });
    lika(d.viner[0].druckenDatum, "");
});
prov("klam håller sig inom spannet", () => {
    lika((0, viner_1.klam)(120, 0, 100), 100);
    lika((0, viner_1.klam)(-4, 0, 100), 0);
    lika((0, viner_1.klam)(50, 0, 100), 50);
});
process.stdout.write(`\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`);
if (fel > 0)
    process.exit(1);
