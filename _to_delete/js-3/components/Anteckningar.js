"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Anteckningar;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Anteckningarna.
 *
 * Uppställningen är lista och skrivyta sida vid sida på en bred skärm,
 * och en i taget på en smal. Att stapla dem på telefonen är inte en
 * nödanpassning: en skrivyta som delar höjd med en lista blir för kort
 * att skriva i, och en lista under ett tangentbord går inte att läsa.
 *
 * LÄNKARNA RENDERAS INTE INNE I TEXTEN. Skrivytan är en vanlig textruta
 * som visar exakt de tecken man skrivit, och kopplingarna räknas ut
 * under den. Alternativet — ett fält som ritar om [[x]] till en klickbar
 * länk medan man skriver — betyder att markören hoppar, att markering
 * beter sig oväntat, och att ångra i fältet slutar fungera. Priset för
 * det är högre än vinsten av att slippa titta en rad längre ned.
 */
const react_1 = require("react");
const Butik_1 = require("./Butik");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const kopplingar_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/kopplingar");
const Kopplingar_1 = __importDefault(require("./Kopplingar"));
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const anvandMedia_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/anvandMedia");
function Anteckningar({ fokusera = 0, oppna = null, onOppnaMal, }) {
    const butik = (0, Butik_1.useButik)();
    const { anteckningar, kalendrar, kalenderFor } = butik;
    const [vald, setVald] = (0, react_1.useState)(null);
    const [filter, setFilter] = (0, react_1.useState)(null);
    const [fraga, setFraga] = (0, react_1.useState)("");
    const mobil = (0, anvandMedia_1.useMobil)();
    const forsta = (0, react_1.useRef)(true);
    const kalla = (0, react_1.useMemo)(() => ({
        handelser: butik.handelser,
        uppgifter: butik.uppgifter,
        anteckningar: butik.anteckningar,
    }), [butik.handelser, butik.uppgifter, butik.anteckningar]);
    const register = (0, react_1.useMemo)(() => (0, kopplingar_1.byggRegister)(kalla), [kalla]);
    const skapaTom = (0, react_1.useCallback)((titel = "", datum = null) => {
        const a = butik.skapaAnteckning({
            titel,
            brodtext: "",
            datum,
            kalenderId: filter ?? kalendrar[0]?.id ?? "arbete",
        });
        setVald(a.id);
        return a;
    }, [butik, filter, kalendrar]);
    // Signalen från bottenradens plusknapp.
    (0, react_1.useEffect)(() => {
        if (fokusera > 0)
            skapaTom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fokusera]);
    // En sökträff pekade hit. Beroendet är räknaren och inte id:t, så att
    // samma anteckning går att öppna om efter att man klickat bort den.
    (0, react_1.useEffect)(() => {
        if (oppna)
            setVald(oppna.id);
    }, [oppna]);
    const synliga = (0, react_1.useMemo)(() => {
        const q = fraga.trim().toLowerCase();
        const lista = anteckningar.filter((a) => {
            if (filter && a.kalenderId !== filter)
                return false;
            if (!q)
                return true;
            return (a.titel.toLowerCase().includes(q) ||
                a.brodtext.toLowerCase().includes(q));
        });
        return (0, butik_1.sorteraAnteckningar)(lista);
    }, [anteckningar, filter, fraga]);
    // Öppna den översta på en bred skärm, så att ytan aldrig står tom.
    // På telefonen görs det INTE: där betyder ett öppet dokument att
    // listan är borta, och att landa i någon annans anteckning är fel.
    (0, react_1.useEffect)(() => {
        if (!forsta.current || mobil)
            return;
        if (vald === null && synliga.length > 0) {
            forsta.current = false;
            setVald(synliga[0].id);
        }
    }, [mobil, synliga, vald]);
    const oppen = (0, react_1.useMemo)(() => anteckningar.find((a) => a.id === vald) ?? null, [anteckningar, vald]);
    /** Går till länkens mål — eller skapar posten om den inte finns. */
    const foljLank = (0, react_1.useCallback)((titel) => {
        const mal = (0, kopplingar_1.slaUpp)(register, titel);
        if (!mal) {
            skapaTom(titel);
            return;
        }
        if (mal.slag === "anteckning")
            setVald(mal.id);
        else
            onOppnaMal(mal);
    }, [register, skapaTom, onOppnaMal]);
    const visaLista = !mobil || !oppen;
    const visaText = !mobil || !!oppen;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 flex", children: [visaLista && ((0, jsx_runtime_1.jsxs)("div", { className: `${mobil ? "w-full" : "w-[290px] lg:w-[330px] border-r border-ink"} shrink-0 min-h-0 flex flex-col bg-paper`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-ink p-2.5 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "S\u00F6k i anteckningar", value: fraga, onChange: (e) => setFraga(e.target.value), "aria-label": "S\u00F6k i anteckningar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", "data-ton": "accent", onClick: () => skapaTom(), "aria-label": "Ny anteckning", children: mobil ? "+" : "Ny" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad items-center", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": filter === null ? "1" : "0", onClick: () => setFilter(null), children: "Alla" }), kalendrar.map((k) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex items-center gap-1.5", "data-aktiv": filter === k.id ? "1" : "0", onClick: () => setFilter(filter === k.id ? null : k.id), children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2 h-2 border border-current", style: { background: `var(--kal-${k.ton + 1})` } }), k.namn] }, k.id)))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll", children: [synliga.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "p-6 flex items-center justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink px-4 py-3 max-w-[300px]", style: { ["--cf"]: "9px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("p", { className: "micro mb-1.5", children: anteckningar.length === 0
                                                ? "Inga anteckningar"
                                                : "Inget matchar" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-60 leading-[1.8]", children: anteckningar.length === 0
                                                ? "Tryck Ny för att skriva den första. Skriv [[titel]] för att länka till något annat."
                                                : "Pröva ett annat ord eller ta bort filtret." })] }) })), synliga.map((a) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "anteckning px-2.5 py-2", "data-nalad": a.nalad ? "1" : "0", "data-vald": a.id === vald ? "1" : "0", style: a.id === vald && !mobil
                                    ? { boxShadow: "inset 3px 0 0 var(--ink)" }
                                    : undefined, onClick: () => setVald(a.id), children: (0, jsx_runtime_1.jsxs)("span", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "anteckning-titel block truncate", children: a.titel || "Utan rubrik" }), a.brodtext.trim() && ((0, jsx_runtime_1.jsx)("span", { className: "anteckning-utdrag", children: a.brodtext.replace(/\[\[([^\]\n]+)\]\]/g, "$1") })), (0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2 flex-wrap mt-1", children: [(0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-55 flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2 h-2 border border-ink", style: {
                                                                        background: `var(--kal-${kalenderFor(a.kalenderId).ton + 1})`,
                                                                    } }), kalenderFor(a.kalenderId).namn] }), a.datum && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 tabnum", children: (0, tid_1.kortDatum)((0, tid_1.tolka)(a.datum)) })), (0, kopplingar_1.hittaLankar)(a.brodtext).length > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-40", children: ["\u2197 ", (0, kopplingar_1.hittaLankar)(a.brodtext).length] }))] })] }), a.nalad && ((0, jsx_runtime_1.jsx)("span", { className: "pico shrink-0 opacity-70", "aria-label": "N\u00E5lad", children: "\u25A3" }))] }) }, a.id)))] }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-t border-ink px-2.5 py-1.5", children: (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-60 tabnum", children: [anteckningar.length, " ", anteckningar.length === 1 ? "anteckning" : "anteckningar"] }) })] })), visaText && ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-w-0 min-h-0 flex flex-col bg-paper", children: oppen ? ((0, jsx_runtime_1.jsx)(Skrivyta, { anteckning: oppen, mobil: mobil, onTillbaka: () => setVald(null), onFoljLank: foljLank, onOppnaMal: onOppnaMal, onOppnaAnteckning: setVald }, oppen.id)) : ((0, jsx_runtime_1.jsx)("div", { className: "h-full flex items-center justify-center p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink px-4 py-3 max-w-[320px]", style: { ["--cf"]: "9px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("p", { className: "micro mb-1.5", children: "Ingen anteckning vald" }), (0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-60 leading-[1.8]", children: ["V\u00E4lj en i listan, eller tryck ", (0, jsx_runtime_1.jsx)("b", { children: "Ny" }), "."] })] }) })) }))] }));
}
/* ==================================================================
   SKRIVYTAN
   ================================================================== */
function Skrivyta({ anteckning, mobil, onTillbaka, onFoljLank, onOppnaMal, onOppnaAnteckning, }) {
    const butik = (0, Butik_1.useButik)();
    const [form, setForm] = (0, react_1.useState)(anteckning);
    const titelRef = (0, react_1.useRef)(null);
    // Ett nyskapat tomt dokument skall ha markören i rubriken direkt.
    (0, react_1.useEffect)(() => {
        if (!anteckning.titel && !anteckning.brodtext)
            titelRef.current?.focus();
    }, [anteckning]);
    /*
     * Sparas medan man skriver, inte på en knapp.
     *
     * Fördröjningen finns för att varje tangenttryckning annars blir en
     * skrivning till localStorage OCH en post i ångra-historiken — och då
     * ångrar ⌘Z ett tecken i taget genom hela texten. En halv sekunds
     * stiltje är ungefär där en mening slutar.
     */
    (0, react_1.useEffect)(() => {
        if (form.titel === anteckning.titel &&
            form.brodtext === anteckning.brodtext &&
            form.kalenderId === anteckning.kalenderId &&
            form.datum === anteckning.datum) {
            return;
        }
        const id = window.setTimeout(() => butik.sparaAnteckning(form), 500);
        return () => window.clearTimeout(id);
    }, [form, anteckning, butik]);
    // Byter någon annan enhet innehållet under pågående skrivning skall
    // det synas — men bara i de fält man inte själv rört.
    (0, react_1.useEffect)(() => {
        setForm((f) => (f.id === anteckning.id ? f : anteckning));
    }, [anteckning]);
    const satt = (delar) => setForm((f) => ({ ...f, ...delar }));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 flex flex-col", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-ink px-2.5 py-2 flex flex-col gap-2 bg-paper", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [mobil && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", onClick: onTillbaka, "aria-label": "Tillbaka till listan", children: "\u2039" })), (0, jsx_runtime_1.jsx)("input", { ref: titelRef, className: "falt !border-0 !px-0 display !text-[1.05rem]", placeholder: "Rubrik", value: form.titel, onChange: (e) => satt({ titel: e.target.value }), "aria-label": "Rubrik" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "nal", "data-pa": anteckning.nalad ? "1" : "0", onClick: () => butik.vaxlaNalad(anteckning.id), "aria-label": anteckning.nalad ? "Ta bort nålen" : "Nåla överst", "aria-pressed": anteckning.nalad, title: "N\u00E5la \u00F6verst", children: "\u25A3" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad items-center", children: [(0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto", value: form.kalenderId, onChange: (e) => satt({ kalenderId: e.target.value }), "aria-label": "Kalender", children: butik.kalendrar.map((k) => ((0, jsx_runtime_1.jsx)("option", { value: k.id, children: k.namn }, k.id))) }), (0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt !w-auto tabnum", value: form.datum ?? "", onChange: (e) => satt({ datum: e.target.value || null }), "aria-label": "H\u00F6r till dagen" }), !form.datum && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => satt({ datum: (0, tid_1.nyckel)((0, tid_1.startAvDag)(new Date())) }), children: "Idag" })), form.datum && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => satt({ datum: null }), children: "Utan dag" })), (0, jsx_runtime_1.jsx)("span", { className: "hidden md:block flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => {
                                    if (window.confirm(`Radera "${anteckning.titel || "Utan rubrik"}"? Går att ångra med ⌘Z.`)) {
                                        onTillbaka();
                                        butik.taBortAnteckning(anteckning.id);
                                    }
                                }, children: "Radera" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-0 flex flex-col p-2.5", children: (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta tunnskroll", placeholder: "Skriv fritt.\n\nSkriv [[titel]] för att länka till en annan anteckning, en händelse eller en uppgift. Finns den inte kan du skapa den härifrån.", value: form.brodtext, onChange: (e) => satt({ brodtext: e.target.value }), "aria-label": "Br\u00F6dtext" }) }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 max-h-[38dvh] overflow-y-auto tunnskroll", children: (0, jsx_runtime_1.jsx)("div", { className: "px-2.5 pb-2", children: (0, jsx_runtime_1.jsx)(Kopplingar_1.default, { id: anteckning.id, titel: anteckning.titel, text: form.brodtext, onOppnaMal: (mal) => mal.slag === "anteckning" ? onOppnaAnteckning(mal.id) : onOppnaMal(mal), onSkapa: onFoljLank }) }) })] }));
}
