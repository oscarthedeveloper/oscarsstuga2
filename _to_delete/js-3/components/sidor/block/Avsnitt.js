"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Avsnitt;
const jsx_runtime_1 = require("react/jsx-runtime");
function Avsnitt({ rubrik, bihang, atgard, children, }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "sidavsnitt", children: [(0, jsx_runtime_1.jsxs)("div", { className: "sidrubrik", children: [(0, jsx_runtime_1.jsx)("h2", { className: "micro", children: rubrik }), bihang && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 truncate hidden sm:inline", children: bihang })), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), atgard] }), children] }));
}
