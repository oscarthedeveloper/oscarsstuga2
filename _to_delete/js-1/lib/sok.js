"use strict";
/**
 * Söket.
 *
 * För att hitta något i appen måste man annars först komma ihåg VAR det
 * ligger — var det ett möte, en uppgift eller en anteckning? Den frågan
 * är hjärnarbete som appen borde göra, och det är hela skälet till att
 * söket går tvärs över alla tre sorterna i stället för att bo i varje vy.
 *
 * Allt innehåll ligger redan i minnet, så sökningen är ett filter och
 * inget index. Det betyder att den är omedelbar, fungerar utan nät, och
 * inte kan hamna ur fas med det som faktiskt står i lagret. Ett index
 * hade varit snabbare vid tiotusen poster och fel vid tio.
 *
 * POÄNGSÄTTNINGEN är ordnad efter hur säker träffen är, inte efter hur
 * många tecken som råkade stämma. Exakt titel slår titelbörjan slår
 * titelinnehåll slår brödtext. Skälet är att den som skriver "tandläk"
 * letar efter posten som HETER något med tandläkare, inte efter den där
 * ordet råkar nämnas i en anteckning.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sok = sok;
const tid_1 = require("./tid");
/* Poängnivåer. Avstånden är stora med flit: en titelträff skall aldrig
   kunna vägas upp av att frågan förekommer tre gånger i en brödtext. */
const EXAKT = 1000;
const TITEL_BORJAN = 700;
const ORD_BORJAN = 500;
const TITEL_INNE = 400;
const LUDD = 200;
const KROPP = 150;
function sok(fraga, kalla, tak = 24) {
    const termer = fraga.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (termer.length === 0)
        return [];
    const ut = [];
    for (const h of kalla.handelser) {
        const kropp = [h.anteckning, h.plats].filter(Boolean).join(" ");
        const poang = poangsatt(termer, h.titel, kropp);
        if (poang < 0)
            continue;
        const start = (0, tid_1.tolka)(h.start);
        ut.push({
            slag: "handelse",
            id: h.id,
            titel: h.titel,
            utdrag: utdragUr(kropp, termer),
            hoger: (0, tid_1.kortDatum)(start),
            kalenderId: h.kalenderId,
            datum: start,
            vilande: false,
            poang,
        });
    }
    for (const u of kalla.uppgifter) {
        const poang = poangsatt(termer, u.titel, u.anteckning);
        if (poang < 0)
            continue;
        ut.push({
            slag: "uppgift",
            id: u.id,
            titel: u.titel,
            utdrag: utdragUr(u.anteckning, termer),
            hoger: u.klar
                ? "Klar"
                : u.forfaller
                    ? (0, tid_1.kortDatum)((0, tid_1.tolka)(u.forfaller))
                    : "Utan datum",
            kalenderId: u.kalenderId,
            datum: u.forfaller ? (0, tid_1.tolka)(u.forfaller) : null,
            // En avbockad uppgift är ett kvitto, inte arbete. Den får finnas
            // kvar i träfflistan men skall aldrig ligga överst.
            vilande: u.klar,
            poang,
        });
    }
    for (const a of kalla.anteckningar ?? []) {
        const poang = poangsatt(termer, a.titel, a.brodtext);
        if (poang < 0)
            continue;
        ut.push({
            slag: "anteckning",
            id: a.id,
            titel: a.titel || "Utan rubrik",
            utdrag: utdragUr(a.brodtext, termer),
            hoger: a.datum ? (0, tid_1.kortDatum)((0, tid_1.tolka)(a.datum)) : "Anteckning",
            kalenderId: a.kalenderId,
            datum: a.datum ? (0, tid_1.tolka)(a.datum) : null,
            vilande: false,
            poang,
        });
    }
    /*
     * Sorteringen måste vara total, annars byter listan ordning mellan två
     * renderingar och raden man siktade på hinner flytta sig. Poäng först,
     * sedan datum, och id sist som garanterat skiljande fält.
     */
    ut.sort((a, b) => {
        if (a.vilande !== b.vilande)
            return a.vilande ? 1 : -1;
        if (b.poang !== a.poang)
            return b.poang - a.poang;
        const ad = a.datum?.getTime() ?? 0;
        const bd = b.datum?.getTime() ?? 0;
        if (ad !== bd)
            return bd - ad;
        return a.id.localeCompare(b.id);
    });
    return ut.slice(0, tak);
}
/**
 * Poäng för en post, eller -1 om den inte är en träff.
 *
 * Varje term måste finnas någonstans i posten. Att låta en av två termer
 * räcka gör att "möte anna" börjar lista varenda möte, och en träfflista
 * som svarar på halva frågan är i praktiken ingen sökning.
 */
function poangsatt(termer, titel, kropp) {
    const t = titel.toLowerCase();
    const k = kropp.toLowerCase();
    let summa = 0;
    for (const term of termer) {
        const p = termpoang(term, t, k);
        if (p < 0)
            return -1;
        summa += p;
    }
    /*
     * Orden i följd väger tyngre än samma ord utspridda — och i svenskan
     * räknas SAMMANSKRIVET som i följd. Skriver man "styrelse möte" menar
     * man "Styrelsemöte", inte "Möte om styrelsen och annat", och utan den
     * här regeln vinner det senare eftersom det råkar ha två träffar på
     * ordgräns. Det är den enskilt vanligaste sökningen i ett svenskt
     * material och värd sitt undantag.
     */
    if (termer.length > 1) {
        const isar = termer.join(" ");
        const ihop = termer.join("");
        if (t.includes(isar) || t.includes(ihop))
            summa += TITEL_INNE;
    }
    return summa;
}
function termpoang(term, titel, kropp) {
    if (titel === term)
        return EXAKT;
    if (titel.startsWith(term))
        return TITEL_BORJAN;
    if (ordBorjan(titel, term))
        return ORD_BORJAN;
    if (titel.includes(term))
        return TITEL_INNE;
    if (kropp.includes(term))
        return KROPP;
    // Luddig matchning sist och bara för lite längre frågor: på två tecken
    // matchar den nästan allt, och då är listan inte längre en träfflista.
    if (term.length >= 3 && luddigt(titel, term))
        return LUDD;
    return -1;
}
/** Sant om något ORD i texten börjar på termen. */
function ordBorjan(text, term) {
    let i = text.indexOf(term);
    while (i !== -1) {
        if (i === 0 || /[\s\-–—/(,.:]/.test(text[i - 1]))
            return true;
        i = text.indexOf(term, i + 1);
    }
    return false;
}
/** Tecknen kommer i ordning, men inte nödvändigtvis i följd. */
function luddigt(text, term) {
    let i = 0;
    for (const tecken of term) {
        i = text.indexOf(tecken, i);
        if (i === -1)
            return false;
        i += 1;
    }
    return true;
}
/**
 * En rad ur brödtexten omkring första träffen, så att man ser VARFÖR
 * posten kom med. En träfflista utan sammanhang tvingar en att öppna
 * varje rad för att förstå den.
 */
function utdragUr(kropp, termer, bredd = 64) {
    if (!kropp)
        return "";
    const platt = kropp.replace(/\s+/g, " ").trim();
    const lag = platt.toLowerCase();
    let träff = -1;
    for (const term of termer) {
        const i = lag.indexOf(term);
        if (i !== -1 && (träff === -1 || i < träff))
            träff = i;
    }
    if (träff === -1)
        return platt.slice(0, bredd) + (platt.length > bredd ? "…" : "");
    const fran = Math.max(0, träff - Math.floor(bredd / 3));
    const till = Math.min(platt.length, fran + bredd);
    return ((fran > 0 ? "…" : "") +
        platt.slice(fran, till) +
        (till < platt.length ? "…" : ""));
}
