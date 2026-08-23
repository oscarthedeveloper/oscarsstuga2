"use strict";
/**
 * Språkbiblioteket.
 *
 * Tre nivåer och ett innehåll:
 *
 *   HYLLA   ett språk. Bär en ton ur kalenderpaletten, som allt annat
 *           i appen som behöver skiljas åt med färg.
 *   MAPP    en "bok". Har ett omslag om man valt en bild, annars ritas
 *           den som en mapp i hyllans ton.
 *   BLAD    ett "papper". Innehållet är en lista BLOCK.
 *
 * ORDNINGEN ÄR LISTANS ORDNING, inte ett sorteringsfält. Ett `ordning`-
 * tal måste hållas i takt vid varje infogning och flytt, och den dagen
 * två poster får samma tal är ordningen godtycklig — vilket syns som att
 * listan hoppar mellan två renderingar. En array vet redan vad som kommer
 * först.
 *
 * TOLKNINGEN ÄR DEFENSIV, av samma skäl som på högskoleprovssidan:
 * innehållet ligger i en JSONB-kolumn databasen inte kontrollerar, kan
 * vara skrivet av ett äldre bygge och kan ha synkats ned halvvägs. Allt
 * som inte går att tolka faller bort tyst i stället för att kasta. Ett
 * bibliotek som vägrar öppna för att ett block har fel form är ett
 * bibliotek man har tappat.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKNAMN = exports.bladMed = exports.mappMed = exports.hyllaMed = exports.bladI = exports.mapparI = exports.PERSONER = exports.TOM_SPRAK = void 0;
exports.klamTon = klamTon;
exports.tolkaSprakData = tolkaSprakData;
exports.tolkaBlock = tolkaBlock;
exports.tolkaOmslag = tolkaOmslag;
exports.taBortHylla = taBortHylla;
exports.taBortMapp = taBortMapp;
exports.flytta = flytta;
exports.nyttBlock = nyttBlock;
exports.TOM_SPRAK = { hyllor: [], mappar: [], blad: [] };
/* ==================================================================
   FÄRDIGA UPPSÄTTNINGAR
   ================================================================== */
/**
 * Personformer per språk.
 *
 * Ligger här och inte i komponenten för att det är kunskap om språken,
 * inte om gränssnittet — och för att det går att prova.
 */
exports.PERSONER = [
    {
        id: "it",
        namn: "Italienska",
        rader: ["io", "tu", "lui/lei", "noi", "voi", "loro"],
    },
    {
        id: "de",
        namn: "Tyska",
        rader: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"],
    },
    { id: "sv", namn: "Svenska", rader: ["jag", "du", "hen", "vi", "ni", "de"] },
    {
        id: "en",
        namn: "Engelska",
        rader: ["I", "you", "he/she/it", "we", "you", "they"],
    },
    {
        id: "kasus",
        namn: "Kasus (tyska)",
        rader: ["Nominativ", "Akkusativ", "Dativ", "Genitiv"],
    },
];
/* ==================================================================
   TOLKNING
   ================================================================== */
const arObjekt = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
const text = (x) => (typeof x === "string" ? x : "");
const textlista = (x) => Array.isArray(x) ? x.map(text) : [];
function lista(x, tolk) {
    if (!Array.isArray(x))
        return [];
    const ut = [];
    for (let i = 0; i < x.length; i++) {
        const rad = x[i];
        if (!arObjekt(rad))
            continue;
        const tolkad = tolk(rad, i);
        if (tolkad !== null)
            ut.push(tolkad);
    }
    return ut;
}
const idFor = (rad, prefix, i) => text(rad.id) || `${prefix}${i}`;
/** Klämmer tonen till paletten, precis som butiken gör för kalendrar. */
function klamTon(n) {
    const t = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(t))
        return 0;
    return ((Math.round(t) % 6) + 6) % 6;
}
function tolkaSprakData(rå) {
    if (!arObjekt(rå))
        return exports.TOM_SPRAK;
    const hyllor = lista(rå.hyllor, (h, i) => ({
        id: idFor(h, "h", i),
        namn: text(h.namn),
        ton: klamTon(h.ton),
    }));
    const mappar = lista(rå.mappar, (m, i) => ({
        id: idFor(m, "m", i),
        hyllaId: text(m.hyllaId),
        titel: text(m.titel),
        bihang: text(m.bihang),
    }));
    const blad = lista(rå.blad, (b, i) => ({
        id: idFor(b, "b", i),
        mappId: text(b.mappId),
        titel: text(b.titel),
        underrubrik: text(b.underrubrik),
        utkast: b.utkast === true,
        block: tolkaBlock(b.block),
    }));
    return { hyllor, mappar, blad };
}
function tolkaBlock(rå) {
    return lista(rå, (b, i) => {
        const id = idFor(b, "bl", i);
        switch (text(b.typ)) {
            case "text":
                return { id, typ: "text", text: text(b.text) };
            case "rubrik":
                return { id, typ: "rubrik", text: text(b.text) };
            case "tabell": {
                const rubriker = textlista(b.rubriker);
                // Något som inte är en array är inte en rad. Att göra en tom rad
                // av den vore att lägga till innehåll som aldrig funnits — och en
                // tom rad mitt i en tabell ser ut som ett fel man själv gjort.
                const rader = Array.isArray(b.rader)
                    ? b.rader.filter(Array.isArray).map(textlista)
                    : [];
                return {
                    id,
                    typ: "tabell",
                    rubrik: text(b.rubrik),
                    rubriker,
                    rader,
                    // Index utanför tabellen skulle framhäva en rad som inte finns.
                    framhavda: Array.isArray(b.framhavda)
                        ? b.framhavda
                            .map((n) => Math.round(Number(n)))
                            .filter((n) => Number.isInteger(n) && n >= 0 && n < rader.length)
                        : [],
                };
            }
            case "flikar":
                return {
                    id,
                    typ: "flikar",
                    flikar: lista(b.flikar, (f) => ({
                        namn: text(f.namn),
                        text: text(f.text),
                    })),
                };
            case "ruta": {
                const slag = text(b.slag);
                return {
                    id,
                    typ: "ruta",
                    slag: slag === "varning" || slag === "tips" ? slag : "info",
                    titel: text(b.titel),
                    text: text(b.text),
                };
            }
            case "bojning":
                return {
                    id,
                    typ: "bojning",
                    rubrik: text(b.rubrik),
                    kolumner: textlista(b.kolumner),
                    rader: lista(b.rader, (r) => ({
                        etikett: text(r.etikett),
                        former: textlista(r.former),
                    })),
                };
            case "ordpar":
                return {
                    id,
                    typ: "ordpar",
                    vansterNamn: text(b.vansterNamn),
                    hogerNamn: text(b.hogerNamn),
                    par: lista(b.par, (p) => ({
                        vanster: text(p.vanster),
                        hoger: text(p.hoger),
                    })),
                };
            case "parallell":
                return {
                    id,
                    typ: "parallell",
                    vansterNamn: text(b.vansterNamn),
                    hogerNamn: text(b.hogerNamn),
                    vanster: text(b.vanster),
                    hoger: text(b.hoger),
                };
            case "belagg":
                return {
                    id,
                    typ: "belagg",
                    citat: text(b.citat),
                    kalla: text(b.kalla),
                    kommentar: text(b.kommentar),
                };
            case "fakta":
                return {
                    id,
                    typ: "fakta",
                    rader: lista(b.rader, (r) => ({
                        etikett: text(r.etikett),
                        varde: text(r.varde),
                    })),
                };
            default:
                // Ett block av okänd typ kommer från ett nyare bygge. Det tas
                // bort tyst hellre än att ritas som ett fel — men det är också
                // skälet att aldrig byta namn på en typ som varit i bruk.
                return null;
        }
    });
}
/** Omslagsposten: mapp-id till data-URL. */
function tolkaOmslag(rå) {
    if (!arObjekt(rå))
        return {};
    const ut = {};
    for (const [nyckel, varde] of Object.entries(rå)) {
        // Bara riktiga bild-URL:er. En godtycklig sträng här skulle hamna i
        // ett src-attribut, och det är inte ett fält man vill vara slarvig med.
        if (typeof varde === "string" && varde.startsWith("data:image/")) {
            ut[nyckel] = varde;
        }
    }
    return ut;
}
/* ==================================================================
   TRÄDFRÅGOR
   ================================================================== */
const mapparI = (data, hyllaId) => data.mappar.filter((m) => m.hyllaId === hyllaId);
exports.mapparI = mapparI;
const bladI = (data, mappId) => data.blad.filter((b) => b.mappId === mappId);
exports.bladI = bladI;
const hyllaMed = (data, id) => data.hyllor.find((h) => h.id === id) ?? null;
exports.hyllaMed = hyllaMed;
const mappMed = (data, id) => data.mappar.find((m) => m.id === id) ?? null;
exports.mappMed = mappMed;
const bladMed = (data, id) => data.blad.find((b) => b.id === id) ?? null;
exports.bladMed = bladMed;
/**
 * Tar bort en hylla och allt som hänger under den.
 *
 * Att bara ta bort hyllan lämnar mapparna och bladen kvar i lagret utan
 * någon väg fram till dem — osynliga men fortfarande synkade, och de
 * växer för varje språk man ångrar. Trädet städas därför nedifrån.
 */
function taBortHylla(data, hyllaId) {
    const mappIder = new Set(data.mappar.filter((m) => m.hyllaId === hyllaId).map((m) => m.id));
    return {
        hyllor: data.hyllor.filter((h) => h.id !== hyllaId),
        mappar: data.mappar.filter((m) => m.hyllaId !== hyllaId),
        blad: data.blad.filter((b) => !mappIder.has(b.mappId)),
    };
}
function taBortMapp(data, mappId) {
    return {
        ...data,
        mappar: data.mappar.filter((m) => m.id !== mappId),
        blad: data.blad.filter((b) => b.mappId !== mappId),
    };
}
/* ==================================================================
   LISTOPERATIONER
   ================================================================== */
/**
 * Flyttar posten ett steg. Utanför kanterna händer ingenting — en
 * knapp som tyst gör fel är sämre än en som inte gör något.
 */
function flytta(lista, index, steg) {
    const mal = index + steg;
    if (index < 0 || index >= lista.length || mal < 0 || mal >= lista.length) {
        return lista;
    }
    const ut = [...lista];
    const [posten] = ut.splice(index, 1);
    ut.splice(mal, 0, posten);
    return ut;
}
/** Ett tomt block av angiven typ. */
function nyttBlock(typ, id) {
    switch (typ) {
        case "rubrik":
            return { id, typ: "rubrik", text: "" };
        case "tabell":
            return {
                id,
                typ: "tabell",
                rubrik: "",
                rubriker: ["", ""],
                rader: [["", ""]],
                framhavda: [],
            };
        case "flikar":
            return { id, typ: "flikar", flikar: [{ namn: "", text: "" }] };
        case "ruta":
            return { id, typ: "ruta", slag: "info", titel: "", text: "" };
        case "bojning":
            return {
                id,
                typ: "bojning",
                rubrik: "",
                kolumner: ["Presens"],
                rader: exports.PERSONER[0].rader.map((etikett) => ({ etikett, former: [""] })),
            };
        case "ordpar":
            return {
                id,
                typ: "ordpar",
                vansterNamn: "",
                hogerNamn: "",
                par: [{ vanster: "", hoger: "" }],
            };
        case "parallell":
            return {
                id,
                typ: "parallell",
                vansterNamn: "",
                hogerNamn: "",
                vanster: "",
                hoger: "",
            };
        case "belagg":
            return { id, typ: "belagg", citat: "", kalla: "", kommentar: "" };
        case "fakta":
            return {
                id,
                typ: "fakta",
                rader: [
                    { etikett: "", varde: "" },
                    { etikett: "", varde: "" },
                ],
            };
        default:
            return { id, typ: "text", text: "" };
    }
}
exports.BLOCKNAMN = [
    { typ: "text", namn: "Text", beskrivning: "**fet**, *kursiv*, `kod`" },
    { typ: "rubrik", namn: "Rubrik", beskrivning: "Delar upp bladet" },
    { typ: "belagg", namn: "Belägg", beskrivning: "Citat, källa och kommentar" },
    { typ: "fakta", namn: "Faktarad", beskrivning: "Etikett över värde" },
    { typ: "tabell", namn: "Tabell", beskrivning: "Rader och kolumner" },
    { typ: "bojning", namn: "Böjning", beskrivning: "Person i första spalten" },
    { typ: "ordpar", namn: "Ordpar", beskrivning: "Glosor i två spalter" },
    { typ: "parallell", namn: "Paralleltext", beskrivning: "Text och översättning" },
    { typ: "flikar", namn: "Flikar", beskrivning: "Växla mellan varianter" },
    { typ: "ruta", namn: "Anmärkning", beskrivning: "Info, varning eller tips" },
];
