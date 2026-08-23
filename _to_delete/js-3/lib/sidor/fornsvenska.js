"use strict";
/**
 * Fornsvenska — egenstudier.
 *
 * Sidans tyngdpunkt är REGISTRET: vilka läromedel, utgåvor,
 * examensarbeten och avhandlingar som behöver skaffas fram. Att göra och
 * idéer ligger vid sidan av, avsiktligt små, och rör bara hemsidan.
 *
 * Att göra-listan här är EGEN och inte kopplad till appens uppgifter.
 * Det är ett val med en känd kostnad — de här sysslorna får inga datum,
 * ingen fångst med ⌘K och syns inte i söket — och en känd vinst:
 * projektstoket förorenar inte den dagliga listan.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KODPREFIX = exports.TOM_FSV = exports.lagesIndex = exports.LAGEN = void 0;
exports.nastaLage = nastaLage;
exports.formateraKod = formateraKod;
exports.nastaLedigaKod = nastaLedigaKod;
exports.trygsamUrl = trygsamUrl;
exports.tolkaFsvData = tolkaFsvData;
exports.rakna = rakna;
exports.andelLast = andelLast;
exports.filtreraVerk = filtreraVerk;
exports.sorteraVerk = sorteraVerk;
exports.kallhanvisning = kallhanvisning;
/**
 * Ordningen är ett flöde, inte en uppräkning. Den bär två saker:
 * lägesmätarens fyllnad, och vad "nästa läge" betyder när man trycker.
 */
exports.LAGEN = [
    { id: "behovs", namn: "Behövs", kort: "BEH" },
    { id: "har", namn: "Har", kort: "HAR" },
    { id: "last", namn: "Läst", kort: "LÄST" },
];
const lagesIndex = (l) => Math.max(0, exports.LAGEN.findIndex((x) => x.id === l));
exports.lagesIndex = lagesIndex;
/** Nästa läge i flödet. Från sista går det runt till första. */
function nastaLage(l) {
    return exports.LAGEN[((0, exports.lagesIndex)(l) + 1) % exports.LAGEN.length].id;
}
exports.TOM_FSV = {
    verk: [],
    sysslor: [],
    ideer: [],
    nastaKod: 1,
};
/* ==================================================================
   KODEN
   ================================================================== */
exports.KODPREFIX = "FSV";
function formateraKod(nummer) {
    return `${exports.KODPREFIX}-${String(Math.max(1, Math.round(nummer))).padStart(3, "0")}`;
}
/**
 * Nästa lediga löpnummer.
 *
 * Räknaren i lagret är sanningen, men den kan ha hamnat efter: två
 * enheter som lägger till varsitt verk offline får samma nummer, och
 * den som synkar sist skulle annars skriva en dubblett. Därför tas
 * alltid det största av räknaren och det högsta använda numret.
 */
function nastaLedigaKod(data) {
    let hogst = 0;
    for (const v of data.verk) {
        const m = v.kod.match(/(\d+)\s*$/);
        if (m)
            hogst = Math.max(hogst, Number(m[1]));
    }
    return Math.max(data.nastaKod, hogst + 1, 1);
}
/* ==================================================================
   TOLKNING
   ================================================================== */
const arObjekt = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
const text = (x) => (typeof x === "string" ? x : "");
function lista(x, tolk) {
    if (!Array.isArray(x))
        return [];
    return x.filter(arObjekt).map(tolk);
}
const idFor = (rad, prefix, i) => text(rad.id) || `${prefix}${i}`;
function tolkaLage(x) {
    const l = text(x);
    return exports.LAGEN.some((y) => y.id === l) ? l : "behovs";
}
/**
 * Bara adresser vi vågar sätta i ett href.
 *
 * En godtycklig sträng här hamnar i en länk som användaren klickar på,
 * och `javascript:` i ett href är exakt det man inte vill ha i ett fält
 * som synkas mellan enheter. Http och https räcker för ett bibliotek.
 */
function trygsamUrl(rå) {
    const s = text(rå).trim();
    if (!s)
        return "";
    return /^https?:\/\//i.test(s) ? s : "";
}
function tolkaFsvData(rå) {
    if (!arObjekt(rå))
        return exports.TOM_FSV;
    const verk = lista(rå.verk, (v, i) => ({
        id: idFor(v, "v", i),
        kod: text(v.kod) || formateraKod(i + 1),
        titel: text(v.titel),
        forfattare: text(v.forfattare),
        slag: text(v.slag),
        ar: text(v.ar),
        lage: tolkaLage(v.lage),
        plats: text(v.plats),
        url: trygsamUrl(v.url),
        anteckning: text(v.anteckning),
    }));
    const raknare = Number(rå.nastaKod);
    return {
        verk,
        sysslor: lista(rå.sysslor, (s, i) => ({
            id: idFor(s, "s", i),
            text: text(s.text),
            klar: s.klar === true,
        })),
        ideer: lista(rå.ideer, (d, i) => ({
            id: idFor(d, "i", i),
            text: text(d.text),
            skapad: /^\d{4}-\d{2}-\d{2}$/.test(text(d.skapad)) ? text(d.skapad) : "",
            anvand: d.anvand === true,
        })),
        nastaKod: Number.isFinite(raknare) && raknare > 0 ? Math.round(raknare) : 1,
    };
}
function rakna(data) {
    const ut = { behovs: 0, har: 0, last: 0, totalt: data.verk.length };
    for (const v of data.verk)
        ut[v.lage] += 1;
    return ut;
}
/** Andelen av registret som är genomarbetat, 0–1. */
function andelLast(r) {
    return r.totalt === 0 ? 0 : r.last / r.totalt;
}
/* ==================================================================
   FILTER
   ================================================================== */
/**
 * Filtrerar registret.
 *
 * Frågan söks i titel, författare, slag, plats och kod — men inte i
 * anteckningen. Anteckningarna är långa och innehåller ofta ord som
 * finns i halva registret, och en fritextsökning som träffar allt är
 * ingen sökning.
 */
function filtreraVerk(data, fraga, lage) {
    const termer = fraga.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.verk.filter((v) => {
        if (lage && v.lage !== lage)
            return false;
        if (termer.length === 0)
            return true;
        const halm = [v.titel, v.forfattare, v.slag, v.plats, v.kod, v.ar]
            .join(" ")
            .toLowerCase();
        return termer.every((t) => halm.includes(t));
    });
}
/**
 * Registrets ordning: det som behövs först, sedan i kodordning.
 *
 * Sidan finns för att svara på vad som återstår att skaffa, så det som
 * återstår ligger överst. Inom samma läge är kodordningen den enda som
 * inte flyttar sig när man rättar en titel.
 */
function sorteraVerk(verk) {
    return [...verk].sort((a, b) => (0, exports.lagesIndex)(a.lage) - (0, exports.lagesIndex)(b.lage) || a.kod.localeCompare(b.kod));
}
/* ==================================================================
   KÄLLHÄNVISNING
   ================================================================== */
/**
 * En rad att kopiera in i ett arbete eller på hemsidan.
 *
 * Byggd ur de fält som faktiskt är ifyllda, och tomma delar utelämnas
 * helt i stället för att lämna kvar sina skiljetecken. En hänvisning med
 * ". ." i mitten ser slarvigare ut än ingen alls.
 */
function kallhanvisning(v) {
    const delar = [];
    const forfattare = v.forfattare.trim();
    const ar = v.ar.trim();
    if (forfattare && ar)
        delar.push(`${forfattare} (${ar})`);
    else if (forfattare)
        delar.push(forfattare);
    else if (ar)
        delar.push(`(${ar})`);
    if (v.titel.trim())
        delar.push(v.titel.trim());
    if (v.slag.trim())
        delar.push(v.slag.trim());
    if (v.plats.trim())
        delar.push(v.plats.trim());
    const rad = delar.join(". ");
    const url = v.url.trim();
    if (!rad)
        return url;
    return url ? `${rad}. ${url}` : `${rad}.`;
}
