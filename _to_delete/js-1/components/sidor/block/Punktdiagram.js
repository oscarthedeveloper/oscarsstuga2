"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Punktdiagram;
const jsx_runtime_1 = require("react/jsx-runtime");
const B = 480; // bredd i koordinatsystemet
const H = 300; // höjd
const MARGINAL = { topp: 14, hoger: 14, botten: 30, vanster: 40 };
function Punktdiagram({ punkter, xAxel, yAxel, tomText, }) {
    if (punkter.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-6 leading-relaxed", children: tomText }));
    }
    const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
    const innerH = H - MARGINAL.topp - MARGINAL.botten;
    /* Ett spann på noll ger division med noll, och ett NaN i ett
       SVG-attribut ritar tyst ingenting alls — inget felmeddelande, bara
       en tom ruta man får leta efter i en timme. */
    const spann = (a) => (a.max - a.min === 0 ? 1 : a.max - a.min);
    const x = (v) => MARGINAL.vanster + ((v - xAxel.min) / spann(xAxel)) * innerB;
    const y = (v) => MARGINAL.topp + innerH - ((v - yAxel.min) / spann(yAxel)) * innerH;
    const andelar = [0, 0.25, 0.5, 0.75, 1];
    const vidX = (a) => xAxel.min + a * spann(xAxel);
    const vidY = (a) => yAxel.min + a * spann(yAxel);
    return ((0, jsx_runtime_1.jsx)("div", { className: "px-2.5 pt-2 pb-2.5", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${B} ${H}`, className: "w-full h-auto block", role: "img", "aria-label": `Punktdiagram, ${xAxel.hog} mot ${yAxel.hog}: ${punkter
                .map((p) => p.etikett)
                .join("; ")}`, children: [andelar.map((a) => ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: MARGINAL.vanster, x2: B - MARGINAL.hoger, y1: y(vidY(a)), y2: y(vidY(a)), stroke: "var(--ink)", strokeWidth: "1", opacity: a === 0 ? 0.35 : 0.1 }), yAxel.skrivTal && ((0, jsx_runtime_1.jsx)("text", { x: MARGINAL.vanster - 6, y: y(vidY(a)) + 3, textAnchor: "end", fill: "var(--ink)", opacity: "0.5", style: { fontSize: 9, fontVariantNumeric: "tabular-nums" }, children: yAxel.skrivTal(vidY(a)) }))] }, `v-${a}`))), andelar.map((a) => ((0, jsx_runtime_1.jsx)("line", { y1: MARGINAL.topp, y2: MARGINAL.topp + innerH, x1: x(vidX(a)), x2: x(vidX(a)), stroke: "var(--ink)", strokeWidth: "1", opacity: a === 0 ? 0.35 : 0.1 }, `l-${a}`))), punkter.map((p) => ((0, jsx_runtime_1.jsx)("rect", { x: x(p.x) - (p.framhavd ? 5 : 3.5), y: y(p.y) - (p.framhavd ? 5 : 3.5), width: p.framhavd ? 10 : 7, height: p.framhavd ? 10 : 7, fill: `var(--kal-${p.ton + 1})`, stroke: p.framhavd ? "var(--accent)" : "var(--ink)", strokeWidth: p.framhavd ? 2 : 1, children: (0, jsx_runtime_1.jsx)("title", { children: p.etikett }) }, p.id))), (0, jsx_runtime_1.jsx)("text", { x: MARGINAL.vanster, y: H - 8, fill: "var(--ink)", opacity: "0.55", style: { fontSize: 9, letterSpacing: "0.08em" }, children: xAxel.lag }), (0, jsx_runtime_1.jsx)("text", { x: B - MARGINAL.hoger, y: H - 8, textAnchor: "end", fill: "var(--ink)", opacity: "0.55", style: { fontSize: 9, letterSpacing: "0.08em" }, children: xAxel.hog }), (0, jsx_runtime_1.jsx)("text", { x: -(MARGINAL.topp + innerH), y: 11, transform: "rotate(-90)", fill: "var(--ink)", opacity: "0.55", style: { fontSize: 9, letterSpacing: "0.08em" }, children: yAxel.lag }), (0, jsx_runtime_1.jsx)("text", { x: -MARGINAL.topp, y: 11, textAnchor: "end", transform: "rotate(-90)", fill: "var(--ink)", opacity: "0.55", style: { fontSize: 9, letterSpacing: "0.08em" }, children: yAxel.hog })] }) }));
}
