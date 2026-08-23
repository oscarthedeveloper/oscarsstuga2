"use strict";
/**
 * Provfixtur.
 *
 * Innehållet låg tidigare i lagret som automatisk sådd, men en kalender
 * skall starta tom — det som står i den skall vara skrivet av den som
 * äger den. Här får materialet i stället tjäna som underlag för
 * renderingsproven, där det behövs något att rita.
 *
 * Datumen räknas relativt ett inskickat "idag", så att veckan alltid ser
 * likadan ut oavsett när provet körs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.provdata = provdata;
const butik_1 = require("../lib/butik");
const upprepning_1 = require("../lib/upprepning");
const tid_1 = require("../lib/tid");
/** Ett dygnsspann material att rita prov mot. */
function provdata(idag) {
    const d0 = (0, tid_1.startAvDag)(idag);
    const mandag = (0, tid_1.addDagar)(d0, -((idag.getDay() + 6) % 7));
    const gor = (dagOffset, fran, till, titel, kalenderId, extra = {}) => {
        const dag = (0, tid_1.addDagar)(mandag, dagOffset);
        return (0, butik_1.normalisera)({
            titel,
            kalenderId,
            start: `${(0, tid_1.nyckel)(dag)}T${fran}`,
            slut: `${(0, tid_1.nyckel)(dag)}T${till}`,
            ...extra,
        });
    };
    return [
        gor(0, "08:30", "09:00", "Veckostart", "arbete", {
            upprepning: {
                ...upprepning_1.STANDARD_UPPREPNING,
                frekvens: "veckovis",
                veckodagar: [1],
            },
            anteckning: "Genomgång av veckans leveranser.",
            plats: "Rum 4",
        }),
        gor(0, "07:00", "07:45", "Löprunda", "traning", {
            upprepning: {
                ...upprepning_1.STANDARD_UPPREPNING,
                frekvens: "veckovis",
                veckodagar: [1, 3, 5],
            },
        }),
        gor(0, "12:00", "13:00", "Lunch", "privat", {
            upprepning: { ...upprepning_1.STANDARD_UPPREPNING, frekvens: "vardag" },
        }),
        gor(1, "10:00", "11:30", "Fornsvenska — paradigmarbete", "studier", {
            anteckning: "Starka verb, klass III. Noreen §512.",
        }),
        // Krockar med paradigmarbetet ovan — visar hur kolumnpackningen delar
        // bredden mellan två block som ligger på samma tid.
        gor(1, "10:30", "11:00", "Samtal med handledare", "arbete"),
        gor(1, "14:00", "15:00", "Avstämning design", "arbete"),
        gor(2, "09:00", "10:00", "Handskriftsseminarium", "studier", {
            upprepning: {
                ...upprepning_1.STANDARD_UPPREPNING,
                frekvens: "veckovis",
                intervall: 2,
                veckodagar: [3],
            },
            plats: "Carolina Rediviva",
        }),
        gor(2, "13:00", "17:00", "Djupt arbete", "arbete"),
        gor(2, "15:00", "15:30", "Kort avstämning", "arbete"),
        gor(3, "11:00", "11:45", "Tandläkare", "privat"),
        gor(3, "22:30", "24:00", "Nattpass — korrektur", "studier", {
            anteckning: "Sträcker sig till midnatt; provar blocket vid dygnsgränsen.",
        }),
        gor(4, "09:00", "09:30", "Veckoslut", "arbete", {
            upprepning: {
                ...upprepning_1.STANDARD_UPPREPNING,
                frekvens: "veckovis",
                veckodagar: [5],
            },
        }),
        gor(4, "18:30", "22:00", "Middag hos Ingrid", "privat"),
        (0, butik_1.normalisera)({
            titel: "Resa till Visby",
            kalenderId: "resor",
            heldag: true,
            start: `${(0, tid_1.nyckel)((0, tid_1.addDagar)(mandag, 5))}T00:00`,
            slut: `${(0, tid_1.nyckel)((0, tid_1.addDagar)(mandag, 8))}T00:00`,
            anteckning: "Gotlands fornsal, tre dagar.",
        }),
        (0, butik_1.normalisera)({
            titel: "Månadsrapport",
            kalenderId: "arbete",
            start: `${(0, tid_1.nyckel)(new Date(d0.getFullYear(), d0.getMonth(), 1))}T16:00`,
            slut: `${(0, tid_1.nyckel)(new Date(d0.getFullYear(), d0.getMonth(), 1))}T17:00`,
            upprepning: {
                ...upprepning_1.STANDARD_UPPREPNING,
                frekvens: "manadsvis",
                manadslage: "dag-i-manad",
            },
        }),
        (0, butik_1.normalisera)({
            titel: "Sista fredagen — retrospektiv",
            kalenderId: "arbete",
            start: `${(0, tid_1.nyckel)(sistaFredagen(d0))}T15:00`,
            slut: `${(0, tid_1.nyckel)(sistaFredagen(d0))}T16:00`,
            upprepning: {
                ...upprepning_1.STANDARD_UPPREPNING,
                frekvens: "manadsvis",
                manadslage: "veckodag-i-manad",
            },
        }),
    ];
}
function sistaFredagen(d) {
    const sista = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const back = (sista.getDay() - 5 + 7) % 7;
    return new Date(d.getFullYear(), d.getMonth(), sista.getDate() - back);
}
