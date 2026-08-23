"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Fordelningsstapel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Månadens fördelning som en enda stapel.
 *
 * En ringgraf hade varit den vanliga lösningen och är fel här: ögat
 * jämför vinklar sämre än längder, och det man vill se är just om
 * sparandet är större än nöjena. En stapel svarar på det direkt.
 *
 * Det ofördelade får ett eget segment i stället för att utelämnas. En
 * stapel som alltid är full döljer sidans viktigaste fråga — finns det
 * pengar kvar som ännu inte fått en plats?
 */
const ekonomi_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/ekonomi");
function Fordelningsstapel({ delar, kvar, inkomst, }) {
    const over = kvar !== null && kvar < 0;
    const synliga = delar.filter((d) => d.belopp > 0);
    if (synliga.length === 0 && !kvar) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: "Fyll i inkomst och belopp, s\u00E5 ritas f\u00F6rdelningen h\u00E4r." }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "px-3 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fordelning", "data-over": over ? "1" : "0", role: "img", "aria-label": etikett(synliga, kvar), children: [synliga.map((d) => ((0, jsx_runtime_1.jsx)("span", { "data-ton": d.ton, style: { flexGrow: d.belopp, flexBasis: 0 }, title: `${d.namn} ${(0, ekonomi_1.kronor)(d.belopp)} kr` }, d.id))), kvar !== null && kvar > 0 && ((0, jsx_runtime_1.jsx)("span", { "data-ofordelat": "1", style: { flexGrow: kvar, flexBasis: 0 }, title: `Ofördelat ${(0, ekonomi_1.kronor)(kvar)} kr` }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad mt-2 gap-x-3 gap-y-1 flex-wrap", children: [synliga.map((d) => ((0, jsx_runtime_1.jsxs)("span", { className: "pico flex items-center gap-1.5 shrink-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 border border-ink shrink-0", style: { background: `var(--kal-${d.ton + 1})` }, "aria-hidden": "true" }), d.namn, (0, jsx_runtime_1.jsx)("span", { className: "tabnum opacity-55", children: (0, ekonomi_1.kronor)(d.belopp) }), (0, jsx_runtime_1.jsx)("span", { className: "tabnum opacity-35", children: (0, ekonomi_1.procent)(inkomst ? d.belopp / inkomst : null, "") })] }, d.id))), kvar !== null && kvar !== 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "pico flex items-center gap-1.5 shrink-0", style: over ? { color: "var(--accent)" } : undefined, children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 border border-ink shrink-0", style: {
                                    background: over ? "var(--accent)" : "transparent",
                                }, "aria-hidden": "true" }), over ? "Övertrasserat" : "Ofördelat", (0, jsx_runtime_1.jsx)("span", { className: "tabnum", children: (0, ekonomi_1.kronor)(Math.abs(kvar)) })] }))] })] }));
}
function etikett(delar, kvar) {
    const rader = delar.map((d) => `${d.namn} ${Math.round(d.belopp)} kronor`);
    if (kvar !== null && kvar > 0)
        rader.push(`ofördelat ${Math.round(kvar)}`);
    return `Fördelning: ${rader.join(", ")}`;
}
