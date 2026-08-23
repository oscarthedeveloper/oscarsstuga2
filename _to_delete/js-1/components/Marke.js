"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Marke;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Geometriskt märke — en urtavla ritad med samma streckvokabulär som
 * märket på Fornsvenska: rena linjer, ingen fyllning utom visarna, och
 * fyra markeringar i kvartsläge så figuren läses som en klocka även i
 * 24 pixlar.
 */
function Marke() {
    return ((0, jsx_runtime_1.jsxs)("svg", { width: "24", height: "24", viewBox: "0 0 26 26", "aria-hidden": "true", focusable: "false", className: "shrink-0", children: [(0, jsx_runtime_1.jsx)("rect", { x: "1", y: "1", width: "24", height: "24", fill: "none", stroke: "var(--ink)", strokeWidth: "1" }), (0, jsx_runtime_1.jsx)("polygon", { points: "13,2.5 15.2,7 10.8,7", fill: "var(--ink)" }), (0, jsx_runtime_1.jsx)("rect", { x: "12.6", y: "12.6", width: "0.9", height: "0.9", fill: "var(--ink)" }), (0, jsx_runtime_1.jsx)("line", { x1: "13", y1: "13", x2: "13", y2: "6", stroke: "var(--ink)", strokeWidth: "1.4" }), (0, jsx_runtime_1.jsx)("line", { x1: "13", y1: "13", x2: "18.5", y2: "15.5", stroke: "var(--ink)", strokeWidth: "1.4" }), (0, jsx_runtime_1.jsx)("line", { x1: "1", y1: "13", x2: "4", y2: "13", stroke: "var(--ink)", strokeWidth: "1" }), (0, jsx_runtime_1.jsx)("line", { x1: "22", y1: "13", x2: "25", y2: "13", stroke: "var(--ink)", strokeWidth: "1" }), (0, jsx_runtime_1.jsx)("line", { x1: "13", y1: "22", x2: "13", y2: "25", stroke: "var(--ink)", strokeWidth: "1" })] }));
}
