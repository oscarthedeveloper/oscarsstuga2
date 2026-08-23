"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Kopplingar;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Kopplingsrutan.
 *
 * Samma två listor överallt: vad posten pekar på, och vad som pekar på
 * den. Att den bor i en egen komponent och inte i varje panel är inte
 * bara sparade rader — det är garantin att en anteckning, en händelse
 * och en uppgift beter sig LIKADANT. Kopplingarna är det som gör de tre
 * sorterna till en väv, och en väv där trådarna fungerar olika beroende
 * på vilken ände man håller i är ingen väv.
 *
 * Rutan visas bara när det finns något att visa. En tom rubrik som säger
 * "Kopplingar: inga" är krom som tar plats från innehållet varje gång
 * man öppnar något, för att någon enstaka gång berätta något man redan
 * ser.
 */
const react_1 = require("react");
const Butik_1 = require("./Butik");
const kopplingar_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/kopplingar");
const MARKE = {
    handelse: "H",
    uppgift: "U",
    anteckning: "A",
};
function Kopplingar({ id, titel, text, onOppnaMal, onSkapa, kompakt = false, }) {
    const butik = (0, Butik_1.useButik)();
    const kalla = (0, react_1.useMemo)(() => ({
        handelser: butik.handelser,
        uppgifter: butik.uppgifter,
        anteckningar: butik.anteckningar,
    }), [butik.handelser, butik.uppgifter, butik.anteckningar]);
    const register = (0, react_1.useMemo)(() => (0, kopplingar_1.byggRegister)(kalla), [kalla]);
    const utgaende = (0, react_1.useMemo)(() => (0, kopplingar_1.hittaLankar)(text).map((t) => ({ titel: t, mal: (0, kopplingar_1.slaUpp)(register, t) })), [text, register]);
    const inkommande = (0, react_1.useMemo)(() => (0, kopplingar_1.bakatlankar)(kalla, { titel, id }), [kalla, titel, id]);
    if (utgaende.length === 0 && inkommande.length === 0)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: kompakt ? "" : "border-t border-ink/20 pt-2 mt-1", children: [utgaende.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 mb-1", children: "Pekar p\u00E5" }), (0, jsx_runtime_1.jsx)("div", { className: "chiprad", children: utgaende.map(({ titel: t, mal }) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex items-center gap-1.5", "data-finns": mal ? "1" : "0", disabled: !mal && !onSkapa, onClick: () => (mal ? onOppnaMal(mal) : onSkapa?.(t)), title: mal ? `Öppna ${t}` : `Skapa anteckningen ${t}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "opacity-55", children: mal ? MARKE[mal.slag] : "+" }), t] }, t))) })] })), inkommande.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-45 mb-1", children: ["N\u00E4mns i ", inkommande.length] }), inkommande.map((r) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "baklank", onClick: () => onOppnaMal(r), children: [(0, jsx_runtime_1.jsx)("span", { className: "palett-marke", "aria-hidden": "true", children: MARKE[r.slag] }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate", children: r.titel }), r.utdrag && (0, jsx_runtime_1.jsx)("span", { className: "palett-under", children: r.utdrag })] })] }, `${r.slag}-${r.id}`)))] }))] }));
}
