"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Sidopanel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Sidopanelen — bläckfärgad, som dokumentvyns sidebar på Fornsvenska.
 * Innehåller minimånad, kalenderfilter och dagens lista.
 */
const react_1 = require("react");
const Butik_1 = require("./Butik");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
function Sidopanel({ peka, forekomster, onGaTill, onOppna, onNy, onHanteraKalendrar, lada, onStang, }) {
    const { kalendrar, vaxlaKalender, visaEndast, visaAlla, antalIKalender } = (0, Butik_1.useButik)();
    const nu = new Date();
    const rutor = (0, react_1.useMemo)(() => (0, tid_1.manadsrutnat)(peka), [peka]);
    const tathet = (0, react_1.useMemo)(() => {
        const karta = new Map();
        for (const f of forekomster) {
            let d = (0, tid_1.startAvDag)(f.start);
            let varv = 0;
            while (d < f.slut && varv++ < 400) {
                karta.set((0, tid_1.nyckel)(d), (karta.get((0, tid_1.nyckel)(d)) ?? 0) + 1);
                d = (0, tid_1.addDagar)(d, 1);
            }
        }
        return karta;
    }, [forekomster]);
    const dagensPoster = (0, react_1.useMemo)(() => {
        const d0 = (0, tid_1.startAvDag)(peka);
        const d1 = (0, tid_1.addDagar)(d0, 1);
        return forekomster
            .filter((f) => f.start < d1 && f.slut > d0)
            .sort((a, b) => Number(b.heldag) - Number(a.heldag) ||
            a.start.getTime() - b.start.getTime())
            .slice(0, 14);
    }, [forekomster, peka]);
    return ((0, jsx_runtime_1.jsxs)("aside", { className: lada
            ? "sidopanel h-full flex flex-col min-h-0 border-r border-ink"
            : "sidopanel w-[218px] shrink-0 border-r border-ink hidden lg:flex flex-col min-h-0", children: [lada && ((0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 h-[34px] px-2.5 flex items-center justify-between border-b border-[rgb(253_251_239/0.25)]", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro", children: "Kalendariet" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "micro hover:text-accent transition-colors", onClick: onStang, children: "St\u00E4ng \u2715" })] })), (0, jsx_runtime_1.jsx)("div", { className: "p-2.5 shrink-0", children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro w-full !bg-accent !text-ink !border-ink", onClick: onNy, children: "+ Ny h\u00E4ndelse" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 pb-2.5 shrink-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-1.5", children: [(0, jsx_runtime_1.jsxs)("span", { className: "micro", children: [tid_1.MANADER[peka.getMonth()].slice(0, 3), " ", peka.getFullYear()] }), (0, jsx_runtime_1.jsxs)("div", { className: "knapp-rad", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico !px-1.5", onClick: () => onGaTill((0, tid_1.addManader)(peka, -1)), "aria-label": "F\u00F6reg\u00E5ende m\u00E5nad", children: "\u2039" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico !px-1.5", onClick: () => onGaTill((0, tid_1.addManader)(peka, 1)), "aria-label": "N\u00E4sta m\u00E5nad", children: "\u203A" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-8 gap-y-px", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-30 text-center", children: "V" }), tid_1.VECKODAGAR_MINI.slice(1)
                                .concat(tid_1.VECKODAGAR_MINI[0])
                                .map((v, i) => ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-40 text-center", children: v }, i))), rutor.map((d, i) => ((0, jsx_runtime_1.jsx)(MiniRuta, { d: d, i: i, peka: peka, nu: nu, antal: tathet.get((0, tid_1.nyckel)(d)) ?? 0, onGaTill: onGaTill }, (0, tid_1.nyckel)(d))))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 pb-2 shrink-0 border-t border-[rgb(253_251_239/0.2)] pt-2.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-1 gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-60", children: "Kalendrar" }), (0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "pico opacity-50 hover:opacity-100", onClick: visaAlla, children: "Visa alla" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "pico opacity-50 hover:opacity-100", onClick: onHanteraKalendrar, title: "L\u00E4gg till, byt namn eller ta bort kalendrar", children: "Hantera" })] })] }), kalendrar.map((k) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "kalenderrad", "data-pa": k.synlig ? "1" : "0", onClick: (e) => {
                            // Alt-klick isolerar en kalender — snabbaste vägen till
                            // "visa bara arbetet".
                            if (e.altKey)
                                visaEndast(k.id);
                            else
                                vaxlaKalender(k.id);
                        }, title: k.synlig ? "Dölj (alt-klick isolerar)" : "Visa (alt-klick isolerar)", children: [(0, jsx_runtime_1.jsx)("span", { className: "kalenderprick", style: { background: `var(--kal-${k.ton + 1})` } }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: k.namn }), (0, jsx_runtime_1.jsx)("span", { className: "ml-auto pico opacity-45 tabnum shrink-0", children: antalIKalender(k.id) })] }, k.id))), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "kalenderrad opacity-45 hover:opacity-90", onClick: onHanteraKalendrar, children: [(0, jsx_runtime_1.jsx)("span", { className: "kalenderprick !border-dashed" }), "Ny kalender\u2026"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll border-t border-[rgb(253_251_239/0.2)] px-2.5 py-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline justify-between mb-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-60", children: (0, tid_1.arSammaDag)(peka, nu) ? "Idag" : "Vald dag" }), (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-40 tabnum", children: ["v ", (0, tid_1.isoVecka)(peka)] })] }), dagensPoster.length === 0 && ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-40 leading-relaxed", children: "Ingenting inbokat." })), dagensPoster.map((f) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "w-full text-left flex items-start gap-1.5 py-1 opacity-75 hover:opacity-100 transition-opacity", onClick: () => onOppna(f), children: [(0, jsx_runtime_1.jsx)("span", { className: "mt-1 shrink-0", style: {
                                    width: 6,
                                    height: 6,
                                    background: `var(--kal-${f.ton + 1}-stark)`,
                                } }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0", children: [(0, jsx_runtime_1.jsxs)("span", { className: "block text-[0.58rem] leading-[1.35] truncate", children: [f.serie && "↻ ", f.handelse.titel] }), (0, jsx_runtime_1.jsx)("span", { className: "block text-[0.52rem] leading-[1.4] opacity-60 tabnum", children: f.heldag ? "Heldag" : `${(0, tid_1.klocka)(f.start)}–${(0, tid_1.klocka)(f.slut)}` })] })] }, f.nyckel)))] })] }));
}
function MiniRuta({ d, i, peka, nu, antal, onGaTill, }) {
    const utanfor = d.getMonth() !== peka.getMonth();
    const vald = (0, tid_1.arSammaDag)(d, peka);
    const idag = (0, tid_1.arSammaDag)(d, nu);
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [i % 7 === 0 && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-25 text-center self-center tabnum", children: (0, tid_1.isoVecka)(d) })), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onGaTill(d), className: "relative aspect-square flex items-center justify-center text-[0.55rem] leading-none tabnum transition-colors", style: {
                    opacity: utanfor ? 0.28 : (0, tid_1.arHelg)(d) ? 0.72 : 0.92,
                    background: idag
                        ? "var(--accent)"
                        : vald
                            ? "var(--paper)"
                            : "transparent",
                    color: idag || vald ? "var(--ink)" : "var(--paper)",
                    outline: vald && !idag ? "1px solid var(--paper)" : "none",
                }, children: [d.getDate(), antal > 0 && !utanfor && !idag && !vald && ((0, jsx_runtime_1.jsx)("span", { className: "absolute bottom-[1px] left-1/2 -translate-x-1/2 bg-current", style: { width: 3, height: 2, opacity: 0.6 } }))] })] }));
}
