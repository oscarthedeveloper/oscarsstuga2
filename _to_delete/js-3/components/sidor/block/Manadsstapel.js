"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Manadsstapel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Sparandet månad för månad, plan mot utfall.
 *
 * Staplar och inte en kurva: värdena är belopp per avgränsad månad, inte
 * en storhet som glider mellan dem. En kurva mellan juli och augusti
 * antyder att det fanns värden däremellan.
 *
 * Planen ritas som en tom ram och utfallet som en fylld stapel inuti
 * den. Två staplar sida vid sida hade tvingat ögat att jämföra över ett
 * mellanrum; så här läses skillnaden direkt — utfallet syns rakt av som
 * hur högt det står i förhållande till ramen.
 */
const ekonomi_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/ekonomi");
const B = 560;
const H = 170;
const MARGINAL = { topp: 14, hoger: 10, botten: 26, vanster: 46 };
function Manadsstapel({ staplar, mal = null, }) {
    if (staplar.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-6 text-center leading-relaxed", children: "L\u00E4gg upp en m\u00E5nad, s\u00E5 ritas sparandet h\u00E4r." }));
    }
    const hogsta = Math.max(1, ...staplar.map((s) => Math.max(s.plan, s.utfall ?? 0)), mal ?? 0);
    const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
    const innerH = H - MARGINAL.topp - MARGINAL.botten;
    const bredd = innerB / staplar.length;
    /* Stapeln fyller två tredjedelar av sitt fack. Mer och de växer ihop,
       mindre och de ser ut att sakna sammanhang. */
    const stapelBredd = Math.max(6, bredd * 0.62);
    const y = (v) => MARGINAL.topp + innerH - (v / hogsta) * innerH;
    const x = (i) => MARGINAL.vanster + i * bredd + (bredd - stapelBredd) / 2;
    return ((0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${B} ${H}`, className: "w-full h-auto block", role: "img", "aria-label": `Sparande per månad: ${staplar
            .map((s) => `${(0, ekonomi_1.manadsText)(s.id)} plan ${Math.round(s.plan)}${s.utfall === null ? "" : `, utfall ${Math.round(s.utfall)}`}`)
            .join("; ")}`, children: [[0, 0.5, 1].map((andel) => ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: MARGINAL.vanster, x2: B - MARGINAL.hoger, y1: y(andel * hogsta), y2: y(andel * hogsta), stroke: "var(--ink)", strokeWidth: "1", opacity: andel === 0 ? 0.35 : 0.1 }), (0, jsx_runtime_1.jsx)("text", { x: MARGINAL.vanster - 6, y: y(andel * hogsta) + 3, textAnchor: "end", fill: "var(--ink)", opacity: "0.5", style: { fontSize: 9, fontVariantNumeric: "tabular-nums" }, children: (0, ekonomi_1.kronor)(andel * hogsta) })] }, andel))), mal !== null && mal > 0 && ((0, jsx_runtime_1.jsx)("line", { x1: MARGINAL.vanster, x2: B - MARGINAL.hoger, y1: y(mal), y2: y(mal), stroke: "var(--accent)", strokeWidth: "1", strokeDasharray: "4 3" })), staplar.map((s, i) => {
                const topp = y(s.plan);
                const hojd = MARGINAL.topp + innerH - topp;
                return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("rect", { x: x(i), y: topp, width: stapelBredd, height: Math.max(1, hojd), fill: "none", stroke: "var(--ink)", strokeWidth: "1" }), s.utfall !== null && ((0, jsx_runtime_1.jsx)("rect", { x: x(i), y: y(s.utfall), width: stapelBredd, height: Math.max(1, MARGINAL.topp + innerH - y(s.utfall)), fill: "var(--ink)" })), (0, jsx_runtime_1.jsx)("text", { x: x(i) + stapelBredd / 2, y: H - 8, textAnchor: "middle", fill: "var(--ink)", opacity: "0.55", style: { fontSize: 9, letterSpacing: "0.06em" }, children: s.etikett })] }, s.id));
            })] }));
}
