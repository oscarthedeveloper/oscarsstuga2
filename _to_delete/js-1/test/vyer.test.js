"use strict";
/**
 * Ritprov för vyerna.
 *
 * Provet renderar varje vy till en sträng och kontrollerar att den
 * innehåller det den skall. Syftet är inte att mäta utseendet utan att
 * fånga de fel som annars bara visar sig i webbläsaren: felaktiga hooks,
 * uppslag mot odefinierade värden, och vyer som tyst ritar tomt.
 *
 * Körs med `npm test`.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const server_1 = require("react-dom/server");
const TidsRutnat_1 = __importDefault(require("../components/vyer/TidsRutnat"));
const ManadsVy_1 = __importDefault(require("../components/vyer/ManadsVy"));
const ArsVy_1 = __importDefault(require("../components/vyer/ArsVy"));
const Butik_1 = __importDefault(require("../components/Butik"));
const KalenderApp_1 = __importDefault(require("../components/KalenderApp"));
const HandelsePanel_1 = __importDefault(require("../components/HandelsePanel"));
const Kommandopalett_1 = __importStar(require("../components/Kommandopalett"));
const KalenderPanel_1 = __importDefault(require("../components/KalenderPanel"));
const AttGora_1 = __importDefault(require("../components/AttGora"));
const Anteckningar_1 = __importDefault(require("../components/Anteckningar"));
const Annat_1 = __importDefault(require("../components/Annat"));
const Sprak_1 = __importDefault(require("../components/sidor/Sprak"));
const Viner_1 = __importDefault(require("../components/sidor/Viner"));
const Betygsmatare_1 = __importDefault(require("../components/sidor/block/Betygsmatare"));
const Delstapel_1 = __importDefault(require("../components/sidor/block/Delstapel"));
const Punktdiagram_1 = __importDefault(require("../components/sidor/block/Punktdiagram"));
const Smakskala_1 = __importDefault(require("../components/sidor/block/Smakskala"));
const Bladtrad_1 = __importDefault(require("../components/sidor/block/Bladtrad"));
const Blockredigerare_1 = __importDefault(require("../components/sidor/block/Blockredigerare"));
const butik_1 = require("../lib/butik");
const register_1 = require("../components/sidor/register");
const butik_2 = require("../lib/butik");
const provdata_1 = require("./provdata");
const upprepning_1 = require("../lib/upprepning");
const tid_1 = require("../lib/tid");
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
function innehaller(html, text) {
    if (!html.includes(text)) {
        throw new Error(`hittade inte ${JSON.stringify(text)} i utdata`);
    }
}
// Fast referensdatum, så att provet ger samma svar varje gång det körs.
const IDAG = (0, tid_1.tolka)("2026-08-12T10:30");
const handelser = (0, provdata_1.provdata)(IDAG);
const toner = new Map(butik_2.STANDARDKALENDRAR.map((k) => [k.id, k.ton]));
function forekomsterFor(fran, dygn) {
    return (0, upprepning_1.expanderaAlla)(handelser, (0, tid_1.addDagar)(fran, -8), (0, tid_1.addDagar)(fran, dygn + 8)).map((f) => ({ ...f, ton: toner.get(f.handelse.kalenderId) ?? 0 }));
}
const tomt = () => { };
process.stdout.write("\nVyerna\n");
prov("veckovyn ritar sju kolumner och veckans händelser", () => {
    const start = (0, tid_1.startAvVecka)(IDAG);
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(TidsRutnat_1.default, {
        dagar: (0, tid_1.dagsspann)(start, 7),
        forekomster: forekomsterFor(start, 7),
        timhojd: 52,
        vald: null,
        visaVecka: true,
        onValj: tomt,
        onOppna: tomt,
        onFlytta: tomt,
        onSkapa: tomt,
    }));
    innehaller(html, "Veckostart");
    innehaller(html, "Handskriftsseminarium");
    innehaller(html, "Heldag");
    // Sju dagskolumner i rutnätet plus sju i huvudet och sju i heldagsremsan.
    const kolumner = (html.match(/dagkolumn/g) ?? []).length;
    if (kolumner < 21)
        throw new Error(`för få dagskolumner: ${kolumner}`);
});
prov("dagsvyn ritar en kolumn", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(TidsRutnat_1.default, {
        dagar: (0, tid_1.dagsspann)(IDAG, 1),
        forekomster: forekomsterFor(IDAG, 1),
        timhojd: 52,
        vald: null,
        onValj: tomt,
        onOppna: tomt,
        onFlytta: tomt,
        onSkapa: tomt,
    }));
    innehaller(html, "Handskriftsseminarium");
    innehaller(html, "23:00");
});
prov("tredagarsvyn ritar tre kolumner", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(TidsRutnat_1.default, {
        dagar: (0, tid_1.dagsspann)(IDAG, 3),
        forekomster: forekomsterFor(IDAG, 3),
        timhojd: 52,
        vald: null,
        onValj: tomt,
        onOppna: tomt,
        onFlytta: tomt,
        onSkapa: tomt,
    }));
    const kolumner = (html.match(/dagkolumn/g) ?? []).length;
    if (kolumner < 9)
        throw new Error(`för få dagskolumner: ${kolumner}`);
});
prov("månadsvyn ritar 42 rutor och sex veckonummer", () => {
    const start = (0, tid_1.startAvVecka)((0, tid_1.startAvManad)(IDAG));
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(ManadsVy_1.default, {
        peka: IDAG,
        forekomster: forekomsterFor(start, 42),
        vald: null,
        onValj: tomt,
        onOppna: tomt,
        onFlytta: tomt,
        onSkapa: tomt,
        onGaTillDag: tomt,
    }));
    const rutor = (html.match(/manadsruta /g) ?? []).length;
    if (rutor !== 42)
        throw new Error(`fel antal rutor: ${rutor}`);
    innehaller(html, "Veckostart");
});
prov("årsvyn ritar tolv månader", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(ArsVy_1.default, {
        peka: IDAG,
        forekomster: forekomsterFor((0, tid_1.startAvAr)(IDAG), 366),
        onGaTillDag: tomt,
        onGaTillManad: tomt,
    }));
    for (const m of [
        "Januari",
        "Februari",
        "Mars",
        "April",
        "Maj",
        "Juni",
        "Juli",
        "Augusti",
        "September",
        "Oktober",
        "November",
        "December",
    ]) {
        innehaller(html, m);
    }
    const dagar = (html.match(/minidag/g) ?? []).length;
    if (dagar < 365)
        throw new Error(`för få dagsrutor: ${dagar}`);
});
prov("överlappande händelser ritas som en trappa", () => {
    // Uträkningen provas för sig i layout.test.ts. Här kontrolleras bara
    // att vyn faktiskt SKRIVER ut inskjutet — ett block kan ha rätt
    // layout och ändå ritas i vänsterkant om style-raden tappar bort den.
    const start = (0, tid_1.startAvVecka)(IDAG);
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(TidsRutnat_1.default, {
        dagar: (0, tid_1.dagsspann)(start, 7),
        forekomster: forekomsterFor(start, 7),
        timhojd: 52,
        vald: null,
        onValj: tomt,
        onOppna: tomt,
        onFlytta: tomt,
        onSkapa: tomt,
    }));
    const vansterkanter = Array.from(html.matchAll(/left:calc\(([\d.]+)% \+ 1px\)/g)).map((m) => Number(m[1]));
    const bredder = Array.from(html.matchAll(/width:calc\(([\d.]+)% - 2px\)/g)).map((m) => Number(m[1]));
    if (bredder.length === 0)
        throw new Error("inga block ritades");
    if (!bredder.some((b) => b > 99)) {
        throw new Error("inget block fick full bredd");
    }
    if (!vansterkanter.some((v) => v > 0)) {
        throw new Error("inget block skjuts in — överlappen räknades inte");
    }
    // Trappan betyder att allt når högerkanten: vänster + bredd = 100.
    for (let i = 0; i < bredder.length; i++) {
        const summa = (vansterkanter[i] ?? 0) + bredder[i];
        if (Math.abs(summa - 100) > 0.01) {
            throw new Error(`block ${i} slutar vid ${summa}%, inte vid kanten`);
        }
    }
    // Lagret måste följa med ut i märkspråket, annars staplas trappan fel.
    if (!html.includes("--lager"))
        throw new Error("lagret skrevs inte ut");
    // Och genomskinligheten måste märkas ut, annars döljer det översta
    // blocket det under sig helt.
    if (!html.includes('data-over="1"')) {
        throw new Error("inget block märktes som täckande");
    }
});
/* ------------------------------------------------------------------
   Skalet — nav, sidopanel, redigeringspanel och palett
   ------------------------------------------------------------------ */
prov("appskalet ritas utan att kasta", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(KalenderApp_1.default)));
    innehaller(html, "Kalendariet");
    innehaller(html, "Vecka");
    innehaller(html, "Ny händelse");
    innehaller(html, "Hantera");
    // Sidväxeln mellan kalendern och att göra.
    innehaller(html, "Att göra");
    // Tvångshämtningen kan inte göra något utan inloggning och skall inte
    // ritas — men statusknappen SKALL finnas, annars har den som undrar
    // varför inget synkas ingenstans att fråga.
    if (html.includes('aria-label="Hämta om allt från molnet"')) {
        throw new Error("hämtaknappen visas trots att molnet är avstängt");
    }
    innehaller(html, "Konto och synkning");
    // Remsan som varnar för att inget synkas ritas medvetet FÖRST efter
    // monteringen: den läser localStorage för att se om den avfärdats, och
    // det går inte att göra under serverrenderingen utan att riskera en
    // hydreringskrock. Därför mäts den inte här.
    // Kolofonremsan finns kvar som designelement, men bär numera bara
    // tangentbordshjälpen. Posträknare och "Inget att ångra" togs bort:
    // en remsa som fylls för att den har tre fack blir dekoration, och
    // dekoration som ser ut som information är värre än tom plats.
    innehaller(html, "växlar vy");
    for (const fyllnad of ["Inget att ångra", "Offline först", "poster ·"]) {
        if (html.includes(fyllnad)) {
            throw new Error(`fyllnadstexten "${fyllnad}" finns kvar`);
        }
    }
});
prov("redigeringspanelen ritar upprepningsreglerna", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(HandelsePanel_1.default, {
        forekomst: null,
        utkast: {
            start: "2026-08-12T09:00",
            slut: "2026-08-12T10:00",
            heldag: false,
        },
        onStang: tomt,
        onOppnaMal: tomt,
    })));
    innehaller(html, "Varje vardag (mån–fre)");
    innehaller(html, "Varje månad");
    innehaller(html, "Heldag");
    innehaller(html, "Upprepning");
});
prov("kalenderpanelen listar kalendrarna och kan lägga till nya", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(KalenderPanel_1.default, { onStang: tomt })));
    for (const k of butik_2.STANDARDKALENDRAR)
        innehaller(html, k.namn);
    innehaller(html, "Ny kalender");
    innehaller(html, "Lägg till");
    innehaller(html, "Ta bort");
});
prov("att göra ritar inmatning, filter och tomt läge", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(AttGora_1.default)));
    innehaller(html, "Vad behöver göras?");
    innehaller(html, "Lägg till");
    // Kalendrarna skall gå att filtrera på, med samma namn som i kalendern.
    for (const k of butik_2.STANDARDKALENDRAR)
        innehaller(html, k.namn);
    innehaller(html, "Visa klara");
    // Tomt lager: anvisningen skall stå där, inte en tom yta.
    innehaller(html, "Ingenting att göra");
});
prov("paletten listar kommandon och tolkar datum", () => {
    // Paletten läser numera butiken direkt — den söker i allt innehåll och
    // skapar poster — och måste därför renderas inuti leverantören.
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Kommandopalett_1.default, {
        kommandon: [
            { id: "a", namn: "Gå till idag", grupp: "Navigering", utfor: tomt },
        ],
        onGaTill: tomt,
        onOppnaTraff: tomt,
        onFangad: tomt,
        onStang: tomt,
    })));
    innehaller(html, "Gå till idag");
    innehaller(html, "Skriv för att fånga");
});
prov("anteckningsvyn ritar lista och tomt läge", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Anteckningar_1.default, { onOppnaMal: tomt })));
    innehaller(html, "Sök i anteckningar");
    for (const k of butik_2.STANDARDKALENDRAR)
        innehaller(html, k.namn);
    // Tomt lager: anvisningen skall stå där, inte en tom yta.
    innehaller(html, "Inga anteckningar");
});
prov("annat-avdelningen ritar listan och första sidan", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Annat_1.default)));
    // Sidorna kommer ur registret, inte ur lagret: de finns i listan även
    // innan de fyllts i.
    for (const s of register_1.SIDOR) {
        innehaller(html, s.titel);
        innehaller(html, s.beskrivning);
    }
});
prov("högskoleprovssidan ritar sina avsnitt utan data", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Annat_1.default, { oppnaId: "hogskoleprov" })));
    for (const rubrik of [
        "Avstånd till målet",
        "Resultat över tid",
        "Delpoäng per provdel",
        "Antagningspoäng",
        "Viktiga datum",
    ]) {
        innehaller(html, rubrik);
    }
    /*
     * Ingenting sås med siffror. Varje avsnitt skall stå tomt och be om
     * indata i stället för att visa ett påhittat värde — en föråldrad
     * antagningspoäng som ser ut som en sanning är sämre än ett tomt fält.
     */
    innehaller(html, "Inga lärosäten tillagda");
    innehaller(html, "Inga provtillfällen inlagda");
    innehaller(html, "Inga datum inlagda");
    // Delpoängen går inte att fylla i utan ett provtillfälle att fylla i
    // dem för, och avsnittet säger det i stället för att rita tomma fält.
    innehaller(html, "Lägg till ett provtillfälle ovan");
});
prov("språksidan ritar hyllvyn och det tomma läget", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Annat_1.default, { oppnaId: "sprak" })));
    innehaller(html, "Inga språk ännu");
    innehaller(html, "+ Språk");
    // Brödsmulan är det enda som talar om var man är i fyra nivåer.
    innehaller(html, "Språk");
});
prov("varje språk får en egen rad med sina mappar", () => {
    // Hyllan ÄR raden. Alla språk syns samtidigt, och mapparna ligger på
    // respektive språks rad — man skall inte behöva välja ett språk för
    // att få se vad som står i det.
    const sida = (0, butik_1.normaliseraSida)({
        id: "sprak",
        data: {
            hyllor: [
                { id: "it", namn: "Italienska", ton: 2 },
                { id: "de", namn: "Tyska", ton: 3 },
            ],
            mappar: [
                { id: "verb", hyllaId: "it", titel: "Verb", bihang: "A2–B1" },
                { id: "idiom", hyllaId: "it", titel: "Idiom" },
                { id: "kasus", hyllaId: "de", titel: "Kasus" },
            ],
            blad: [],
        },
    });
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Sprak_1.default, { sida, spara: tomt })));
    // Båda hyllorna ritas samtidigt, utan att någon behöver väljas.
    innehaller(html, "Italienska");
    innehaller(html, "Tyska");
    // Och båda hyllornas mappar syns.
    innehaller(html, "Verb");
    innehaller(html, "Idiom");
    innehaller(html, "Kasus");
    // Raden radbryter inte — då vore den inte en hylla.
    innehaller(html, "hyllrad");
    // Mappen utan omslag ritas som en mapp.
    innehaller(html, "Mapp utan omslag");
});
prov("vinsidan ritar sina avsnitt utan data", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Annat_1.default, { oppnaId: "viner" })));
    for (const rubrik of ["Vinerna", "Fördelning", "Betyg mot pris", "Smakkarta"]) {
        innehaller(html, rubrik);
    }
    /*
     * Ingenting sås. Varje diagram står tomt och säger VARFÖR det är tomt
     * i stället för att rita en axel utan punkter — en tom ruta ser ut som
     * något som gått sönder, en mening gör det inte.
     */
    innehaller(html, "Registret är tomt");
    innehaller(html, "Inga viner att dela upp ännu");
    innehaller(html, "Ett vin kommer med när det har både pris och betyg");
});
prov("vinsidan ritar registret, mätarna och diagrammen", () => {
    const sida = (0, butik_1.normaliseraSida)({
        id: "viner",
        data: {
            nastaKod: 3,
            viner: [
                {
                    id: "a",
                    kod: "VIN-001",
                    namn: "Mucho Más Tinto",
                    producent: "Félix Solís",
                    argang: "N.V.",
                    land: "Spanien",
                    typ: "rott",
                    druvor: ["Tempranillo"],
                    lage: "har",
                    antal: 3,
                    pris: 89,
                    egetBetyg: 4,
                    vivinoBetyg: 3.7,
                    profil: { fyllighet: 70, stravhet: 34, sotma: 38, syra: 28 },
                    smaknoter: [
                        { id: "n1", ord: "Vanilj, ek, tobak", grupp: "fatad", antal: 1511 },
                    ],
                },
                {
                    id: "b",
                    kod: "VIN-002",
                    namn: "Chablis",
                    producent: "William Fèvre",
                    argang: "2021",
                    land: "Frankrike",
                    typ: "vitt",
                    lage: "drucken",
                    pris: 249,
                    vivinoBetyg: 4.1,
                    profil: { fyllighet: 40, stravhet: 20, sotma: 10, syra: 82 },
                },
            ],
        },
    });
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Viner_1.default, { sida, spara: tomt })));
    // Producenten fogas till namnet, och årgången sist.
    innehaller(html, "Félix Solís Mucho Más Tinto N.V.");
    innehaller(html, "VIN-001");
    // Källarens värde: 89 × 3. Det druckna vinet räknas inte.
    innehaller(html, "Källarens värde");
    innehaller(html, "267");
    // Fördelningsstapeln ritas med sina segment, inte som en tom ram.
    innehaller(html, "fordelning");
    innehaller(html, "Rött");
    innehaller(html, "Vitt");
    // Båda punktdiagrammen har fått punkter — en <title> per vin.
    innehaller(html, "Lätt");
    innehaller(html, "Fyllig");
});
prov("ett vin utan uppgifter online räknas inte som ofyllt", () => {
    /*
     * Sidans "återstår att göra" är viner utan smakprofil. Ett vin som
     * INTE går att slå upp skall kunna säga det och därmed lämna listan —
     * annars blir det en påminnelse om ett arbete som aldrig kan bli
     * gjort, varje gång man öppnar sidan.
     */
    const utan = (0, butik_1.normaliseraSida)({
        id: "viner",
        data: { viner: [{ id: "a", namn: "Okänd flaska", lage: "vill" }] },
    });
    const med = (0, butik_1.normaliseraSida)({
        id: "viner",
        data: {
            viner: [
                { id: "a", namn: "Okänd flaska", lage: "vill", uppgifterSaknas: true },
            ],
        },
    });
    const ett = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Viner_1.default, { sida: utan, spara: tomt })));
    const noll = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Viner_1.default, { sida: med, spara: tomt })));
    innehaller(ett, 'data-atgard="1"');
    if (noll.includes('data-atgard="1"')) {
        throw new Error("ett vin märkt som omöjligt att slå upp bär fortfarande accent");
    }
});
prov("vinsidans block ritar i redigeringsläge", () => {
    /*
     * Den utfällda vinraden går inte att öppna i ett statiskt ritprov —
     * den öppnas av ett klick. Blocken den består av ritas därför var för
     * sig i sitt REDIGERINGSLÄGE, vilket är där de skiljer sig mest från
     * visningsläget och där ett fel annars bara visar sig i webbläsaren.
     */
    const skala = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Smakskala_1.default, {
        profil: { fyllighet: 70, stravhet: null, sotma: 38, syra: 28 },
        ton: 2,
        onVarde: tomt,
    }));
    innehaller(skala, "Lätt");
    innehaller(skala, "Fyllig");
    innehaller(skala, "smakreglage");
    // En ofylld skala ritas som raster, inte som ett tomt spår: "ingen
    // uppgift" och "noll på skalan" får inte se likadana ut.
    innehaller(skala, 'data-tomt="1"');
    const betyg = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Betygsmatare_1.default, { varde: 3.7, onVarde: tomt, etikett: "provet", storlek: "stor" }));
    // Talet står alltid skrivet — skillnaden mellan 3,6 och 3,8 syns inte
    // i en cell men är hela skillnaden mellan två viner.
    innehaller(betyg, "3,7");
    innehaller(betyg, "betygscell");
    // Ett tomt betyg ritar fem tomma celler och ett streck, inte noll.
    innehaller((0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Betygsmatare_1.default, { varde: null, etikett: "tomt" })), "—");
    const stapel = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Delstapel_1.default, {
        delar: [
            { id: "a", namn: "Spanien", antal: 4, ton: 2 },
            { id: "b", namn: "Frankrike", antal: 1, ton: 0 },
        ],
        tomText: "tomt",
    }));
    innehaller(stapel, "Spanien");
    innehaller(stapel, "80 %");
    const diagram = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Punktdiagram_1.default, {
        punkter: [
            { id: "a", etikett: "Ett vin", x: 89, y: 4, ton: 2, framhavd: true },
        ],
        xAxel: { lag: "Billigt", hog: "Dyrt", min: 0, max: 600 },
        yAxel: { lag: "Lågt", hog: "Högt", min: 0, max: 5 },
        tomText: "tomt",
    }));
    innehaller(diagram, "Ett vin");
    innehaller(diagram, "Billigt");
});
prov("ett diagram med ett enda värde ritar ändå", () => {
    /*
     * Ett spann på noll ger division med noll, och ett NaN i ett
     * SVG-attribut ritar TYST ingenting alls — inget felmeddelande, bara
     * en tom ruta man får leta efter i en timme.
     */
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Punktdiagram_1.default, {
        punkter: [{ id: "a", etikett: "Ensam", x: 5, y: 5, ton: 0, framhavd: false }],
        xAxel: { lag: "a", hog: "b", min: 5, max: 5 },
        yAxel: { lag: "c", hog: "d", min: 5, max: 5 },
        tomText: "tomt",
    }));
    innehaller(html, "Ensam");
    if (html.includes("NaN"))
        throw new Error("ett NaN kom med i utdata");
});
prov("trädsidlisten visar hela hyllan med filsystemets vokabulär", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Bladtrad_1.default, {
        hyllnamn: "Tyska",
        mappar: [
            { id: "subst", hyllaId: "de", titel: "Substantiv", bihang: "" },
            { id: "verb", hyllaId: "de", titel: "Verb", bihang: "" },
        ],
        bladFor: (id) => id === "subst"
            ? [
                {
                    id: "dativ",
                    mappId: "subst",
                    titel: "Dativ",
                    underrubrik: "",
                    utkast: true,
                    block: [],
                },
            ]
            : [],
        oppenMapp: "subst",
        oppetBlad: "dativ",
        onOppnaMapp: tomt,
        onOppnaBlad: tomt,
        onTillHyllan: tomt,
    }));
    // Hela hyllans mappar, inte bara den öppnade — man skall kunna hoppa
    // mellan mappar utan att backa ut.
    innehaller(html, "Substantiv/");
    innehaller(html, "Verb/");
    // Snedstrecket och triangeln skiljer mapp från blad utan färg, som
    // måste hållas ledig för "det här är du".
    innehaller(html, "▾");
    innehaller(html, "▸");
    // Bladet i den öppna mappen, med utkastmärke.
    innehaller(html, "Dativ");
    innehaller(html, "utkast");
    // Aktiv rad markeras.
    innehaller(html, 'data-aktiv="1"');
});
prov("fornsvenskasidan ritar mätarpanel, register och de två listorna", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Annat_1.default, { oppnaId: "fornsvenska" })));
    innehaller(html, "matarpanel");
    innehaller(html, "andelsstapel");
    innehaller(html, "Litteratur");
    innehaller(html, "Att göra");
    innehaller(html, "Idéer");
    // Tomma lägen skall be om innehåll, inte visa påhittat.
    innehaller(html, "Registret är tomt");
    // Att göra-listan är egen och säger det.
    innehaller(html, "rör inte appens uppgifter");
});
prov("privatekonomisidan ritar mätarpanel och tomma lägen", () => {
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(Annat_1.default, { oppnaId: "privatekonomi" })));
    innehaller(html, "Kvar att fördela");
    innehaller(html, "Sparkvot");
    innehaller(html, "Sparmål");
    innehaller(html, "Mall");
    // Utan månad skall sidan be om en, inte visa nollor som ser ut som svar.
    innehaller(html, "Ingen månad upplagd");
    innehaller(html, "Sätt ett målbelopp");
});
prov("läsläget visar inga redigeringsknappar alls", () => {
    const block = [
        { id: "1", typ: "rubrik", text: "Konjunktiv" },
        { id: "2", typ: "text", text: "efter **credo che**" },
    ];
    const las = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Blockredigerare_1.default, { block, onAndra: tomt, redigera: false }));
    // Innehållet ritas.
    innehaller(las, "Konjunktiv");
    innehaller(las, "<strong>credo che</strong>");
    // Men ingenting som redigerar det.
    for (const krom of [
        "blockhuvud",
        "blockknapp",
        "blockkort",
        "+ Text",
        "+ Annat block",
        "Flytta upp",
        "Ta bort blocket",
    ]) {
        if (las.includes(krom)) {
            throw new Error(`läsläget läckte redigering: ${krom}`);
        }
    }
    // Och i redigeringsläget skall allt finnas.
    const red = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Blockredigerare_1.default, { block, onAndra: tomt, redigera: true }));
    innehaller(red, "blockhuvud");
    innehaller(red, "+ Text");
    innehaller(red, 'aria-label="Flytta upp"');
});
prov("mobilen kan bläddra, växla sida och nå paletten", () => {
    /*
     * Ritprovet ser DOM:en, inte bildskärmen, så det kan inte mäta om en
     * knapp syns. Det det KAN slå fast är att kontrollerna över huvud
     * taget finns i märkspråket — vilket är precis det som saknades:
     * stegknapparna låg bara i navigeringsraden, längst från tummen, och
     * palettknappen var helt bortgömd bakom `md:`.
     */
    const html = (0, server_1.renderToStaticMarkup)((0, react_1.createElement)(Butik_1.default, null, (0, react_1.createElement)(KalenderApp_1.default)));
    // Bläddring inom tummens räckvidd, i bottenraden.
    innehaller(html, 'aria-label="Föregående period"');
    innehaller(html, 'aria-label="Nästa period"');
    // Alla fem vyerna når man därifrån också.
    for (const v of ["Dag", "Tre dagar", "Vecka", "Månad", "År"]) {
        innehaller(html, `aria-label="${v}"`);
    }
    // Fångst och sök måste gå att nå utan tangentbord.
    innehaller(html, 'aria-label="Fånga, sök eller styr"');
    // Alla fyra sidorna skall gå att växla mellan.
    innehaller(html, "Anteckn.");
    innehaller(html, "Att göra");
    innehaller(html, "Annat");
});
prov("datumtolkningen förstår svenska uttryck", () => {
    const bas = (0, tid_1.tolka)("2026-08-12T00:00");
    const som = (q) => {
        const d = (0, Kommandopalett_1.tolkaDatum)(q, bas);
        return d ? (0, tid_1.nyckel)(d) : null;
    };
    lika(som("idag"), "2026-08-12");
    lika(som("imorgon"), "2026-08-13");
    lika(som("igår"), "2026-08-11");
    lika(som("+10"), "2026-08-22");
    lika(som("-5"), "2026-08-07");
    lika(som("2026-12-24"), "2026-12-24");
    lika(som("24/12"), "2026-12-24");
    lika(som("24/12 2027"), "2027-12-24");
    lika(som("24 dec"), "2026-12-24");
    lika(som("3 mars"), "2026-03-03");
    lika(som("struntprat"), null);
});
function lika(fick, vantat) {
    if (JSON.stringify(fick) !== JSON.stringify(vantat)) {
        throw new Error(`fick ${JSON.stringify(fick)}, väntade ${JSON.stringify(vantat)}`);
    }
}
process.stdout.write(`\n${antal - fel} av ${antal} prov gick igenom.${fel ? " ✗" : " ✓"}\n\n`);
process.exit(fel ? 1 : 0);
