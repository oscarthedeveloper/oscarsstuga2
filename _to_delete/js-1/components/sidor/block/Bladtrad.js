"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Bladtrad;
const jsx_runtime_1 = require("react/jsx-runtime");
function Bladtrad({ hyllnamn, mappar, bladFor, oppenMapp, oppetBlad, onOppnaMapp, onOppnaBlad, onTillHyllan, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "trad h-full min-h-0 flex flex-col", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "tradhuvud shrink-0", onClick: onTillHyllan, title: "Tillbaka till hyllorna", "aria-label": "Tillbaka till hyllorna", children: [(0, jsx_runtime_1.jsx)("span", { className: "shrink-0", "aria-hidden": "true", children: "\u2039" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: hyllnamn || "Namnlöst" }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("span", { className: "opacity-70 shrink-0", children: "Bibliotek" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "tradlista flex-1 min-h-0 overflow-y-auto tunnskroll", children: [mappar.length === 0 && ((0, jsx_runtime_1.jsx)("p", { className: "tradrad !text-[0.6rem] opacity-50 pl-6", children: "Tom hylla" })), mappar.map((m) => {
                        const bladen = bladFor(m.id);
                        const oppen = m.id === oppenMapp;
                        return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "tradrad", "data-slag": "mapp", "data-aktiv": oppen && !oppetBlad ? "1" : "0", onClick: () => onOppnaMapp(m.id), children: [(0, jsx_runtime_1.jsx)("span", { className: "tradmarke", "aria-hidden": "true", children: oppen ? "▾" : "▸" }), (0, jsx_runtime_1.jsxs)("span", { className: "truncate", children: [m.titel || "Namnlös", "/"] })] }), oppen &&
                                    bladen.map((b) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "tradrad", "data-slag": "blad", "data-aktiv": b.id === oppetBlad ? "1" : "0", onClick: () => onOppnaBlad(b.id), style: { paddingLeft: "1.2rem" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "tradmarke", "aria-hidden": "true", children: "\u00B7" }), (0, jsx_runtime_1.jsxs)("span", { className: "truncate", children: [b.titel || "Namnlöst", b.utkast && ((0, jsx_runtime_1.jsx)("span", { className: "opacity-40", children: " \u00B7utkast" }))] })] }, b.id)))] }, m.id));
                    })] })] }));
}
