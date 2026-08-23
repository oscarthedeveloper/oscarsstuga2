"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Hogskoleprov;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Högskoleprov och läkarprogrammet.
 *
 * Sidan är byggd kring EN fråga: räcker min poäng? Allt annat är
 * underlag för den. Därför ligger avståndet överst och inte kurvan —
 * kurvan säger hur det har gått, avståndet vad som återstår.
 *
 * TVÅ SPALTER på bredden. Vänster spalt är det som ändras när man
 * pluggar: resultat och delpoäng. Höger spalt är förutsättningarna:
 * vad som krävs och när saker händer. De ändras sällan men behöver
 * synas hela tiden, och att behöva rulla förbi dem för att komma åt
 * kurvan vore att lägga det stillastående i vägen för det rörliga.
 *
 * Ingenting sås med siffror. Antagningspoäng ändras varje omgång, och
 * en föråldrad siffra som ser ut som en sanning är sämre än ett tomt
 * fält som ber om en.
 */
const react_1 = require("react");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const hogskoleprov_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/hogskoleprov");
const Avsnitt_1 = __importDefault(require("./block/Avsnitt"));
const Rader_1 = __importDefault(require("./block/Rader"));
const Serie_1 = __importDefault(require("./block/Serie"));
const Delprovsserie_1 = __importDefault(require("./block/Delprovsserie"));
const Nedrakning_1 = __importDefault(require("./block/Nedrakning"));
const Jamforelse_1 = __importDefault(require("./block/Jamforelse"));
const Talfalt_1 = __importDefault(require("./block/Talfalt"));
const Terminfalt_1 = __importDefault(require("./block/Terminfalt"));
/** Hur länge en tangenttryckning får vila innan sidan sparas. */
const VILA_MS = 600;
const samma = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function Hogskoleprov({ sida, spara, }) {
    const utifran = (0, react_1.useMemo)(() => (0, hogskoleprov_1.tolkaHpData)(sida?.data), [sida]);
    const [form, setForm] = (0, react_1.useState)(utifran);
    const [graf, setGraf] = (0, react_1.useState)("normerat");
    /*
     * Har ANVÄNDAREN ändrat något?
     *
     * Skiljs medvetet från "skiljer sig form från lagret". De två ser
     * likadana ut men betyder motsatta saker: den ena betyder att vi har
     * något att skriva, den andra kan lika gärna betyda att en annan
     * enhet skrivit något vi ännu inte tagit emot. Utan skillnaden
     * skriver den här sidan över den andra enhetens ändring med sin egen
     * gamla kopia, varje gång.
     */
    const rord = (0, react_1.useRef)(false);
    const formRef = (0, react_1.useRef)(form);
    formRef.current = form;
    const andra = (0, react_1.useCallback)((f) => {
        rord.current = true;
        setForm(f);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!rord.current)
            return;
        if (samma(form, utifran)) {
            rord.current = false;
            return;
        }
        const id = window.setTimeout(() => {
            rord.current = false;
            spara(form);
        }, VILA_MS);
        return () => window.clearTimeout(id);
    }, [form, utifran, spara]);
    (0, react_1.useEffect)(() => {
        if (rord.current)
            return;
        if (!samma(utifran, formRef.current))
            setForm(utifran);
    }, [utifran]);
    /* ---------------------------------------------------------------
       Uträkningar
       --------------------------------------------------------------- */
    const idag = (0, react_1.useMemo)(() => (0, tid_1.startAvDag)(new Date()), []);
    const resultat = (0, react_1.useMemo)(() => (0, hogskoleprov_1.sorteradeResultat)(form), [form]);
    const bast = (0, hogskoleprov_1.bastaResultat)(form);
    const senast = (0, hogskoleprov_1.senasteResultat)(form);
    const jamforelser = (0, react_1.useMemo)(() => (0, hogskoleprov_1.avstand)(form), [form]);
    const punkter = (0, react_1.useMemo)(() => resultat
        .filter((r) => r.normerat !== null && r.termin)
        .map((r) => ({ etikett: (0, hogskoleprov_1.terminText)(r.termin), varde: r.normerat })), [resultat]);
    const [valtProv, setValtProv] = (0, react_1.useState)(null);
    const visatProv = resultat.find((r) => r.id === valtProv) ??
        resultat[resultat.length - 1] ??
        null;
    const delar = (0, react_1.useMemo)(() => (0, hogskoleprov_1.delresultat)(visatProv), [visatProv]);
    const svagast = (0, react_1.useMemo)(() => (0, hogskoleprov_1.svagasteDelen)(visatProv), [visatProv]);
    const laggTill = (falt, rad) => andra((d) => ({ ...d, [falt]: [...d[falt], rad] }));
    const taBort = (falt, id) => andra((d) => ({ ...d, [falt]: d[falt].filter((r) => r.id !== id) }));
    const andraRad = (falt, id, delarAvRad) => andra((d) => ({
        ...d,
        [falt]: d[falt].map((r) => (r.id === id ? { ...r, ...delarAvRad } : r)),
    }));
    return ((0, jsx_runtime_1.jsx)("div", { className: "h-full min-h-0 overflow-y-auto tunnskroll", children: (0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] max-w-[1180px]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2.5 md:gap-3 min-w-0", children: [(0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: "Avst\u00E5nd till m\u00E5let", bihang: "B\u00E4sta po\u00E4ngen r\u00E4knas vid antagning", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-end gap-4 px-3 pt-3 pb-2 flex-wrap", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 mb-1", children: "Din b\u00E4sta po\u00E4ng" }), (0, jsx_runtime_1.jsx)("p", { className: "stortal", children: (0, hogskoleprov_1.poangtext)(bast?.normerat ?? null) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "pb-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45", children: bast?.termin ? (0, hogskoleprov_1.terminText)(bast.termin) : "Inget resultat ännu" }), senast && bast && senast.id !== bast.id && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-45 mt-0.5", children: ["Senast ", (0, hogskoleprov_1.poangtext)(senast.normerat)] }))] }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsxs)("label", { className: "block shrink-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45", children: "Eget m\u00E5l" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: form.mal, onVarde: (n) => andra((d) => ({ ...d, mal: n })), etikett: "Eget m\u00E5l i normerad po\u00E4ng", platshallare: "1,70" })] })] }), (0, jsx_runtime_1.jsx)(Jamforelse_1.default, { rader: jamforelser, harPoang: bast !== null })] }), (0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: graf === "normerat" ? "Resultat över tid" : "Delprov jämförda", bihang: graf === "normerat"
                                ? `Skalan går till ${(0, hogskoleprov_1.poangtext)(hogskoleprov_1.HOGSTA_NORMERAT)}`
                                : "Andel rätt — en färg per provtillfälle", atgard: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "knapp-rad", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": graf === "normerat" ? "1" : "0", onClick: () => setGraf("normerat"), children: "Normerat" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": graf === "delprov" ? "1" : "0", onClick: () => setGraf("delprov"), children: "Delprov" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => laggTill("resultat", {
                                            id: (0, butik_1.nyId)(),
                                            termin: null,
                                            normerat: null,
                                            delar: {},
                                            anteckning: "",
                                        }), children: "+ Prov" })] }), children: [(0, jsx_runtime_1.jsx)("div", { className: "px-2 pt-3 pb-1", children: graf === "normerat" ? ((0, jsx_runtime_1.jsx)(Serie_1.default, { punkter: punkter, hogsta: hogskoleprov_1.HOGSTA_NORMERAT, mal: form.mal, skrivTal: (v) => (0, hogskoleprov_1.poangtext)(v) })) : ((0, jsx_runtime_1.jsx)(Delprovsserie_1.default, { resultat: resultat })) }), (0, jsx_runtime_1.jsx)(Rader_1.default, { rader: resultat, onTaBort: (id) => taBort("resultat", id), tomText: "Inga provtillf\u00E4llen inlagda. Tryck + Prov och skriv terminen, till exempel H\u00D6ST25.", rita: (r) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(Terminfalt_1.default, { termin: r.termin, onTermin: (t) => andraRad("resultat", r.id, { termin: t }) }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: r.normerat, onVarde: (n) => andraRad("resultat", r.id, { normerat: n }), etikett: "Normerad po\u00E4ng", platshallare: "0,00" }), (0, jsx_runtime_1.jsx)("input", { className: "falt min-w-[7rem] flex-1", placeholder: "Anteckning", value: r.anteckning, onChange: (e) => andraRad("resultat", r.id, { anteckning: e.target.value }), "aria-label": "Anteckning" })] })) })] }), (0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Delpo\u00E4ng per provdel", bihang: "Andel av delens maxpo\u00E4ng, inte r\u00E5po\u00E4ng", atgard: resultat.length > 1 ? ((0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto", value: visatProv?.id ?? "", onChange: (e) => setValtProv(e.target.value), "aria-label": "Provtillf\u00E4lle", children: resultat.map((r) => ((0, jsx_runtime_1.jsx)("option", { value: r.id, children: (0, hogskoleprov_1.terminText)(r.termin) || "Utan termin" }, r.id))) })) : null, children: !visatProv ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: "L\u00E4gg till ett provtillf\u00E4lle ovan, s\u00E5 g\u00E5r delpo\u00E4ngen att fylla i h\u00E4r." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [["kvantitativ", "verbal"].map((grupp) => {
                                        const summa = (0, hogskoleprov_1.gruppsumma)(visatProv, grupp);
                                        return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline gap-2 px-3 pt-2 pb-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45", children: grupp === "kvantitativ" ? "Kvantitativ del" : "Verbal del" }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), summa.ifyllda > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "pico tabnum opacity-55", children: [summa.poang, " / ", summa.max] }))] }), delar
                                                    .filter((d) => d.grupp === grupp)
                                                    .map((d) => ((0, jsx_runtime_1.jsxs)("div", { className: "sidrad !flex-nowrap", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro w-[3.2rem] shrink-0", children: d.del }), (0, jsx_runtime_1.jsx)("span", { className: "matare", "data-svagast": svagast?.del === d.del ? "1" : "0", title: d.namn, children: (0, jsx_runtime_1.jsx)("span", { style: { width: `${(d.andel ?? 0) * 100}%` } }) }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: d.poang, onVarde: (n) => andraRad("resultat", visatProv.id, {
                                                                delar: {
                                                                    ...visatProv.delar,
                                                                    [d.del]: n === null ? undefined : n,
                                                                },
                                                            }), etikett: `${d.del} — ${d.namn}`, className: "falt talfalt !w-[4rem]" }), (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-45 tabnum w-[2rem] shrink-0", children: ["/", d.max] })] }, d.del)))] }, grupp));
                                    }), svagast && ((0, jsx_runtime_1.jsxs)("p", { className: "pico px-3 py-2 border-t border-ink/15", children: ["Svagast just nu:", " ", (0, jsx_runtime_1.jsxs)("span", { style: { color: "var(--accent)" }, children: [svagast.del, " \u2014 ", svagast.namn] }), " ", (0, jsx_runtime_1.jsxs)("span", { className: "tabnum opacity-55", children: [svagast.poang, "/", svagast.max] })] }))] })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2.5 md:gap-3 min-w-0", children: [(0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Antagningspo\u00E4ng", bihang: "HP-gruppen", atgard: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => laggTill("larosaten", {
                                    id: (0, butik_1.nyId)(),
                                    namn: "",
                                    termin: "",
                                    poang: null,
                                }), children: "+ L\u00E4ros\u00E4te" }), children: (0, jsx_runtime_1.jsx)(Rader_1.default, { rader: form.larosaten, onTaBort: (id) => taBort("larosaten", id), tomText: "Inga l\u00E4ros\u00E4ten tillagda. L\u00E4gg till t.ex. G\u00F6teborgs universitet och Karolinska institutet och fyll i antagningspo\u00E4ngen fr\u00E5n senaste omg\u00E5ngen.", rita: (l) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { className: "falt min-w-[7rem] flex-1", placeholder: "L\u00E4ros\u00E4te", value: l.namn, onChange: (e) => andraRad("larosaten", l.id, { namn: e.target.value }), "aria-label": "L\u00E4ros\u00E4te" }), (0, jsx_runtime_1.jsx)("input", { className: "falt !w-[5.5rem]", placeholder: "HT2026", value: l.termin, onChange: (e) => andraRad("larosaten", l.id, { termin: e.target.value }), "aria-label": "Antagningsomg\u00E5ng" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: l.poang, onVarde: (n) => andraRad("larosaten", l.id, { poang: n }), etikett: "Antagningspo\u00E4ng", platshallare: "0,00" })] })) }) }), (0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Viktiga datum", atgard: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => laggTill("datum", { id: (0, butik_1.nyId)(), datum: (0, tid_1.nyckel)(idag), vad: "" }), children: "+ Datum" }), children: (0, jsx_runtime_1.jsx)(Rader_1.default, { rader: (0, hogskoleprov_1.sorteradeDatum)(form), onTaBort: (id) => taBort("datum", id), tomText: "Inga datum inlagda. Anm\u00E4lan, provdag och besked \u00E4r de som brukar beh\u00F6vas.", rita: (d) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt datumfalt", value: d.datum, onChange: (e) => andraRad("datum", d.id, { datum: e.target.value }), "aria-label": "Datum" }), (0, jsx_runtime_1.jsx)("input", { className: "falt min-w-[7rem] flex-1", placeholder: "Vad h\u00E4nder?", value: d.vad, onChange: (e) => andraRad("datum", d.id, { vad: e.target.value }), "aria-label": "Vad" }), (0, jsx_runtime_1.jsx)(Nedrakning_1.default, { datum: d.datum })] })) }) })] })] }) }));
}
