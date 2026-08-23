"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Serie;
const jsx_runtime_1 = require("react/jsx-runtime");
const B = 560; // bredd i koordinatsystemet
const H = 150; // höjd
const MARGINAL = { topp: 16, hoger: 10, botten: 26, vanster: 34 };
function Serie({ punkter, hogsta, mal = null, malEtikett = "Mål", skrivTal = (v) => v.toFixed(2), }) {
    if (punkter.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-6 text-center leading-relaxed", children: "Inga resultat \u00E4nnu. L\u00E4gg till ditt f\u00F6rsta provtillf\u00E4lle nedan." }));
    }
    const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
    const innerH = H - MARGINAL.topp - MARGINAL.botten;
    /* En ensam punkt får ligga i mitten. Att dela med noll ger NaN, och
       ett NaN i ett SVG-attribut ritar tyst ingenting alls. */
    const x = (i) => MARGINAL.vanster +
        (punkter.length === 1 ? innerB / 2 : (i / (punkter.length - 1)) * innerB);
    const y = (v) => MARGINAL.topp + innerH - (Math.max(0, Math.min(v, hogsta)) / hogsta) * innerH;
    const linje = punkter.map((p, i) => `${x(i)},${y(p.varde)}`).join(" ");
    const sista = punkter.length - 1;
    // Fyra vågräta hjälplinjer räcker för att kunna läsa av en nivå.
    const nivaer = [0, 0.25, 0.5, 0.75, 1].map((andel) => ({
        andel,
        varde: andel * hogsta,
    }));
    return ((0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${B} ${H}`, className: "w-full h-auto block", role: "img", "aria-label": `Utveckling: ${punkter
            .map((p) => `${p.etikett} ${skrivTal(p.varde)}`)
            .join(", ")}`, children: [nivaer.map((n) => ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: MARGINAL.vanster, x2: B - MARGINAL.hoger, y1: y(n.varde), y2: y(n.varde), stroke: "var(--ink)", strokeWidth: "1", opacity: n.andel === 0 ? 0.35 : 0.1 }), (0, jsx_runtime_1.jsx)("text", { x: MARGINAL.vanster - 6, y: y(n.varde) + 3, textAnchor: "end", fill: "var(--ink)", opacity: "0.5", style: { fontSize: 9, fontVariantNumeric: "tabular-nums" }, children: skrivTal(n.varde) })] }, n.andel))), mal !== null && mal > 0 && mal <= hogsta && ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: MARGINAL.vanster, x2: B - MARGINAL.hoger, y1: y(mal), y2: y(mal), stroke: "var(--accent)", strokeWidth: "1", strokeDasharray: "4 3" }), (0, jsx_runtime_1.jsxs)("text", { x: B - MARGINAL.hoger, y: y(mal) - 4, textAnchor: "end", fill: "var(--accent)", style: { fontSize: 9, letterSpacing: "0.08em" }, children: [malEtikett, " ", skrivTal(mal)] })] })), (0, jsx_runtime_1.jsx)("polyline", { points: linje, fill: "none", stroke: "var(--ink)", strokeWidth: "1.5" }), punkter.map((p, i) => ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("rect", { x: x(i) - 3, y: y(p.varde) - 3, width: "6", height: "6", fill: i === sista ? "var(--accent)" : "var(--paper)", stroke: "var(--ink)", strokeWidth: "1" }), (0, jsx_runtime_1.jsx)("text", { x: x(i), y: y(p.varde) - 8, textAnchor: "middle", fill: "var(--ink)", style: { fontSize: 10, fontVariantNumeric: "tabular-nums" }, children: skrivTal(p.varde) }), (0, jsx_runtime_1.jsx)("text", { x: x(i), y: H - 8, textAnchor: "middle", fill: "var(--ink)", opacity: "0.55", style: { fontSize: 9, letterSpacing: "0.06em" }, children: p.etikett })] }, `${p.etikett}-${i}`)))] }));
}
