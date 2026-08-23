"use strict";
/**
 * Datumaritmetik i lokal tid.
 *
 * Hela appen räknar i väggklocka. Ett möte klockan 09:00 skall ligga på
 * 09:00 även den natt då klockan ställs om — därför byggs varje tidpunkt
 * med `new Date(år, månad, dag, timme, minut)` och aldrig genom att lägga
 * millisekunder till en tidsstämpel. Att addera 24 timmar över en
 * sommartidsövergång ger 23 eller 25 timmars dygn; att addera ett dygn
 * i kalendermening ger alltid nästa datum.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANADER_KORT = exports.MANADER = exports.VECKODAGAR_MINI = exports.VECKODAGAR_KORT = exports.VECKODAGAR = void 0;
exports.veckoIndex = veckoIndex;
exports.nyckel = nyckel;
exports.stampel = stampel;
exports.tolka = tolka;
exports.startAvDag = startAvDag;
exports.addDagar = addDagar;
exports.addManader = addManader;
exports.dagarIManad = dagarIManad;
exports.arSammaDag = arSammaDag;
exports.arHelg = arHelg;
exports.arVardag = arVardag;
exports.startAvVecka = startAvVecka;
exports.startAvManad = startAvManad;
exports.startAvAr = startAvAr;
exports.isoVecka = isoVecka;
exports.isoVeckoAr = isoVeckoAr;
exports.minuterInPaDagen = minuterInPaDagen;
exports.dygnMellan = dygnMellan;
exports.klocka = klocka;
exports.klockaKort = klockaKort;
exports.minuterTillText = minuterTillText;
exports.langtDatum = langtDatum;
exports.kortDatum = kortDatum;
exports.overlappar = overlappar;
exports.snappa = snappa;
exports.medMinuter = medMinuter;
exports.klam = klam;
exports.dagsspann = dagsspann;
exports.manadsrutnat = manadsrutnat;
exports.VECKODAGAR = [
    "Söndag",
    "Måndag",
    "Tisdag",
    "Onsdag",
    "Torsdag",
    "Fredag",
    "Lördag",
];
exports.VECKODAGAR_KORT = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
exports.VECKODAGAR_MINI = ["S", "M", "T", "O", "T", "F", "L"];
exports.MANADER = [
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
];
exports.MANADER_KORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Maj",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
];
/** Veckan börjar på måndag. Index i grid: mån=0 … sön=6. */
function veckoIndex(d) {
    return (d.getDay() + 6) % 7;
}
const tvasiffrigt = (n) => String(n).padStart(2, "0");
/** Lokal datumnyckel, YYYY-MM-DD. Aldrig toISOString — den är i UTC. */
function nyckel(d) {
    return `${d.getFullYear()}-${tvasiffrigt(d.getMonth() + 1)}-${tvasiffrigt(d.getDate())}`;
}
/** Lokal väggklocka, YYYY-MM-DDTHH:mm. */
function stampel(d) {
    return `${nyckel(d)}T${tvasiffrigt(d.getHours())}:${tvasiffrigt(d.getMinutes())}`;
}
/** Tolkar "YYYY-MM-DD" eller "YYYY-MM-DDTHH:mm" som lokal tid. */
function tolka(s) {
    const [datumdel, tidsdel = "00:00"] = s.split("T");
    const [ar, man, dag] = datumdel.split("-").map(Number);
    const [tim, min] = tidsdel.split(":").map(Number);
    return new Date(ar, man - 1, dag, tim || 0, min || 0, 0, 0);
}
function startAvDag(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
/** Kalenderdygn, inte 86 400 000 ms. Klarar sommartid. */
function addDagar(d, antal) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + antal, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}
/**
 * Adderar månader och klipper dagen mot målmånadens längd:
 * 31 januari + 1 månad blir 28 (eller 29) februari, inte 3 mars.
 */
function addManader(d, antal) {
    const ar = d.getFullYear();
    const man = d.getMonth() + antal;
    const maxDag = dagarIManad(ar + Math.floor(man / 12), ((man % 12) + 12) % 12);
    return new Date(ar, man, Math.min(d.getDate(), maxDag), d.getHours(), d.getMinutes());
}
function dagarIManad(ar, manad) {
    return new Date(ar, manad + 1, 0).getDate();
}
function arSammaDag(a, b) {
    return (a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate());
}
function arHelg(d) {
    const v = d.getDay();
    return v === 0 || v === 6;
}
function arVardag(d) {
    const v = d.getDay();
    return v >= 1 && v <= 5;
}
/** Måndagen i datumets vecka, kl 00:00. */
function startAvVecka(d) {
    return addDagar(startAvDag(d), -veckoIndex(d));
}
function startAvManad(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startAvAr(d) {
    return new Date(d.getFullYear(), 0, 1);
}
/**
 * ISO 8601-veckonummer. Torsdagen i veckan avgör vilket år veckan hör
 * till, vilket är varför 1 januari ibland ligger i vecka 52 föregående år.
 */
function isoVecka(d) {
    const t = startAvDag(d);
    // Flytta till veckans torsdag.
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    const forstaTorsdag = new Date(t.getFullYear(), 0, 4);
    forstaTorsdag.setDate(forstaTorsdag.getDate() + 3 - ((forstaTorsdag.getDay() + 6) % 7));
    const dygn = Math.round((startAvDag(t).getTime() - startAvDag(forstaTorsdag).getTime()) / 86400000);
    return 1 + Math.round(dygn / 7);
}
/** Året som ISO-veckan tillhör (kan skilja sig från kalenderåret). */
function isoVeckoAr(d) {
    const t = startAvDag(d);
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    return t.getFullYear();
}
/** Minuter sedan midnatt, uträknat på väggklockan. */
function minuterInPaDagen(d) {
    return d.getHours() * 60 + d.getMinutes();
}
/** Hela kalenderdygn mellan två datum, tecknat. */
function dygnMellan(a, b) {
    const ms = startAvDag(b).getTime() - startAvDag(a).getTime();
    // Avrundning krävs: sommartid gör vissa dygn 23 eller 25 timmar långa.
    return Math.round(ms / 86400000);
}
function klocka(d) {
    return `${tvasiffrigt(d.getHours())}:${tvasiffrigt(d.getMinutes())}`;
}
/** "09:00" men utan onödig nolla: "9" och "9.30". Används i trånga block. */
function klockaKort(d) {
    const t = d.getHours();
    const m = d.getMinutes();
    return m === 0 ? `${t}` : `${t}.${tvasiffrigt(m)}`;
}
function minuterTillText(minuter) {
    const t = Math.floor(minuter / 60);
    const m = minuter % 60;
    if (t === 0)
        return `${m} min`;
    if (m === 0)
        return `${t} h`;
    return `${t} h ${m} min`;
}
/** "10 augusti 2026" */
function langtDatum(d) {
    return `${d.getDate()} ${exports.MANADER[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}
/** "Mån 10 aug" */
function kortDatum(d) {
    return `${exports.VECKODAGAR_KORT[d.getDay()]} ${d.getDate()} ${exports.MANADER_KORT[d.getMonth()].toLowerCase()}`;
}
/** Sant om två halvöppna intervall [aS,aE) och [bS,bE) skär varandra. */
function overlappar(aS, aE, bS, bE) {
    return aS.getTime() < bE.getTime() && bS.getTime() < aE.getTime();
}
/** Avrundar minuter till närmaste steg (15 min som standard). */
function snappa(minuter, steg = 15) {
    return Math.round(minuter / steg) * steg;
}
/**
 * Midnatt på `dag` plus ett antal minuter. Värden över 1440 rullar över
 * till nästa dygn av sig själva, vilket är precis vad ett block som dras
 * förbi midnatt behöver.
 */
function medMinuter(dag, minuter) {
    return new Date(dag.getFullYear(), dag.getMonth(), dag.getDate(), 0, minuter);
}
/** Klämmer ett tal till [lag, hog]. */
function klam(v, lag, hog) {
    return Math.max(lag, Math.min(hog, v));
}
/** Radda upp n dygn från och med `start`. */
function dagsspann(start, antal) {
    const d0 = startAvDag(start);
    return Array.from({ length: antal }, (_, i) => addDagar(d0, i));
}
/**
 * Sex rader à sju dagar som täcker månaden — alltid 42 rutor, så att
 * rutnätet inte hoppar i höjd mellan månader.
 */
function manadsrutnat(peka) {
    const forsta = startAvManad(peka);
    const start = startAvVecka(forsta);
    return Array.from({ length: 42 }, (_, i) => addDagar(start, i));
}
