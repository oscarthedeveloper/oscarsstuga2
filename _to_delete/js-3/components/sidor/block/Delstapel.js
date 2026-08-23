"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Delstapel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Delar som får egen färg innan resten slås ihop.
 *
 * En stapel med tjugofem segment är inte en översikt utan en rand, och
 * med sex färger blir den sjunde ändå en upprepning. Resten samlas
 * därför i ett rastrerat segment som säger vad det är — inte utelämnas,
 * eftersom en stapel som tyst hoppar över svansen ser ut som en
 * fullständig bild av något den inte beskriver.
 */
const HOGST = 6;
function Delstapel({ delar, tomText, }) {
    if (delar.length === 0) {
        return (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: tomText });
    }
    const framme = delar.slice(0, HOGST);
    const svans = delar.slice(HOGST);
    const ovrigt = svans.reduce((s, d) => s + d.antal, 0);
    const totalt = delar.reduce((s, d) => s + d.antal, 0);
    const andel = (n) => totalt === 0 ? "" : `${Math.round((n / totalt) * 100)} %`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "px-3 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fordelning", role: "img", "aria-label": `Fördelning: ${delar
                    .map((d) => `${d.namn} ${d.antal}`)
                    .join(", ")}`, children: [framme.map((d) => ((0, jsx_runtime_1.jsx)("span", { "data-ton": d.ton, style: { flexGrow: d.antal, flexBasis: 0 }, title: `${d.namn} — ${d.antal} (${andel(d.antal)})` }, d.id))), ovrigt > 0 && ((0, jsx_runtime_1.jsx)("span", { "data-ofordelat": "1", style: { flexGrow: ovrigt, flexBasis: 0 }, title: `Övriga ${svans.length} — ${ovrigt}` }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad mt-2 gap-x-3 gap-y-1 flex-wrap", children: [framme.map((d) => ((0, jsx_runtime_1.jsxs)("span", { className: "pico flex items-center gap-1.5 shrink-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 border border-ink shrink-0", style: { background: `var(--kal-${d.ton + 1})` }, "aria-hidden": "true" }), d.namn, (0, jsx_runtime_1.jsx)("span", { className: "tabnum opacity-55", children: d.antal }), (0, jsx_runtime_1.jsx)("span", { className: "tabnum opacity-35", children: andel(d.antal) })] }, d.id))), ovrigt > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "pico flex items-center gap-1.5 shrink-0", title: svans.map((d) => `${d.namn} ${d.antal}`).join(", "), children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 border border-ink shrink-0", style: {
                                    background: "repeating-linear-gradient(45deg, rgb(17 17 17 / 0.28) 0 1px, transparent 1px 5px)",
                                }, "aria-hidden": "true" }), "\u00D6vriga ", svans.length, (0, jsx_runtime_1.jsx)("span", { className: "tabnum opacity-55", children: ovrigt }), (0, jsx_runtime_1.jsx)("span", { className: "tabnum opacity-35", children: andel(ovrigt) })] }))] })] }));
}
