"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Mappikon;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Mappen, för den som inte valt ett omslag.
 *
 * Silhuetten är systemmappens — bakstycke med flik, framstycke över —
 * eftersom det är den formen som säger "mapp" utan att någon behöver
 * lära sig det. Men hörnen är raka och ramen hårfin, och färgen kommer
 * ur hyllans ton i kalenderpaletten.
 *
 * Det är ett medvetet avsteg från förlagan. En rundad, blå systemmapp
 * hade varit trognare macOS och sett ut som en gäst i en app där
 * ingenting annat är rundat — och en mapp som ser lånad ut drar mer
 * uppmärksamhet till sig än den förtjänar.
 */
function Mappikon({ ton }) {
    const yta = `var(--kal-${ton + 1})`;
    const kant = `var(--kal-${ton + 1}-stark)`;
    return ((0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 100 80", className: "w-[62%] h-auto", role: "img", "aria-label": "Mapp utan omslag", children: [(0, jsx_runtime_1.jsx)("path", { d: "M4 18 L4 8 L38 8 L46 18 L96 18 L96 72 L4 72 Z", fill: yta, stroke: "var(--ink)", strokeWidth: "1.5", strokeLinejoin: "miter" }), (0, jsx_runtime_1.jsx)("path", { d: "M4 26 L96 26 L96 72 L4 72 Z", fill: kant, fillOpacity: "0.35", stroke: "var(--ink)", strokeWidth: "1.5", strokeLinejoin: "miter" })] }));
}
