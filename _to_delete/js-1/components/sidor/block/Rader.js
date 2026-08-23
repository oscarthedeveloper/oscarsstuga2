"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Rader;
const jsx_runtime_1 = require("react/jsx-runtime");
function Rader({ rader, rita, onTaBort, tomText, }) {
    if (rader.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: tomText }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { children: rader.map((rad) => ((0, jsx_runtime_1.jsxs)("div", { className: "sidrad", children: [rita(rad), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => onTaBort(rad.id), "aria-label": "Ta bort raden", title: "Ta bort raden", children: "\u2715" })] }, rad.id))) }));
}
