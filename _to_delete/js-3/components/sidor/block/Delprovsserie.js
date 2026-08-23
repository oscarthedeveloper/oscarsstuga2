"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Delprovsserie;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Delproven jämförda mellan provtillfällen.
 *
 * Vändningen mot den vanliga kurvan är att X-AXELN ÄR DELPROVEN och
 * färgen är provtillfället. Då läser man vågrätt: "min DTK har gått
 * från en tredjedel till två tredjedelar, men ORD står stilla" — vilket
 * är den fråga man faktiskt har när man pluggar. Hade varje delprov
 * fått en egen kurva över tid skulle jämförelsen mellan delar kräva att
 * man höll åtta diagram i huvudet samtidigt.
 *
 * Y-AXELN ÄR ANDEL, inte råpoäng. NOG har tolv uppgifter och DTK
 * tjugofyra; ritade i råpoäng skulle DTK alltid se dubbelt så bra ut,
 * och diagrammet skulle svara på fel fråga.
 *
 * Färgen bär inte informationen ensam — teckenförklaringen under
 * diagrammet skriver ut varje termin, och råpoängen står i tabellen
 * nedanför. Den som inte skiljer färgerna åt tappar ingenting.
 */
const hogskoleprov_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/hogskoleprov");
const B = 560;
const H = 190;
const MARGINAL = { topp: 14, hoger: 12, botten: 30, vanster: 34 };
/** Kalenderpaletten, i sin starka variant. Fler prov än så får dela. */
const TONER = [
    "var(--kal-1-stark)",
    "var(--kal-2-stark)",
    "var(--kal-3-stark)",
    "var(--kal-4-stark)",
    "var(--kal-5-stark)",
    "var(--kal-6-stark)",
];
function Delprovsserie({ resultat, }) {
    const medDelar = resultat.filter((r) => Object.keys(r.delar).length > 0);
    if (medDelar.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-6 text-center leading-relaxed", children: "Inga delpo\u00E4ng ifyllda \u00E4nnu. Fyll i dem i avsnittet nedan, s\u00E5 g\u00E5r de att j\u00E4mf\u00F6ra h\u00E4r." }));
    }
    const innerB = B - MARGINAL.vanster - MARGINAL.hoger;
    const innerH = H - MARGINAL.topp - MARGINAL.botten;
    const steg = innerB / (hogskoleprov_1.PROVDELAR.length - 1);
    const x = (i) => MARGINAL.vanster + i * steg;
    const y = (andel) => MARGINAL.topp + innerH - andel * innerH;
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${B} ${H}`, className: "w-full h-auto block", role: "img", "aria-label": "Andel r\u00E4tt per delprov, en linje per provtillf\u00E4lle", children: [[0, 0.25, 0.5, 0.75, 1].map((andel) => ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: MARGINAL.vanster, x2: B - MARGINAL.hoger, y1: y(andel), y2: y(andel), stroke: "var(--ink)", strokeWidth: "1", opacity: andel === 0 ? 0.35 : 0.1 }), (0, jsx_runtime_1.jsxs)("text", { x: MARGINAL.vanster - 6, y: y(andel) + 3, textAnchor: "end", fill: "var(--ink)", opacity: "0.5", style: { fontSize: 9, fontVariantNumeric: "tabular-nums" }, children: [Math.round(andel * 100), "%"] })] }, andel))), (0, jsx_runtime_1.jsx)("line", { x1: x(3.5), x2: x(3.5), y1: MARGINAL.topp, y2: MARGINAL.topp + innerH, stroke: "var(--ink)", strokeWidth: "1", opacity: "0.22", strokeDasharray: "3 3" }), hogskoleprov_1.PROVDELAR.map((d, i) => ((0, jsx_runtime_1.jsx)("text", { x: x(i), y: H - 16, textAnchor: "middle", fill: "var(--ink)", opacity: "0.6", style: { fontSize: 9, letterSpacing: "0.06em" }, children: d.id }, d.id))), (0, jsx_runtime_1.jsx)("text", { x: x(1.5), y: H - 4, textAnchor: "middle", fill: "var(--ink)", opacity: "0.35", style: { fontSize: 8, letterSpacing: "0.1em" }, children: "KVANTITATIV" }), (0, jsx_runtime_1.jsx)("text", { x: x(5.5), y: H - 4, textAnchor: "middle", fill: "var(--ink)", opacity: "0.35", style: { fontSize: 8, letterSpacing: "0.1em" }, children: "VERBAL" }), medDelar.map((r, serieIndex) => {
                        const ton = TONER[serieIndex % TONER.length];
                        const punkter = hogskoleprov_1.PROVDELAR.map((d, i) => {
                            const poang = r.delar[d.id];
                            return poang === undefined
                                ? null
                                : { i, andel: poang / d.max };
                        });
                        /* Linjen bryts där ett delprov saknas. Att dra den rakt över
                           hålet vore att påstå ett värde man inte har. */
                        const segment = [];
                        let pagaende = [];
                        for (const p of punkter) {
                            if (p)
                                pagaende.push(p);
                            else {
                                if (pagaende.length > 1)
                                    segment.push(pagaende);
                                pagaende = [];
                            }
                        }
                        if (pagaende.length > 1)
                            segment.push(pagaende);
                        return ((0, jsx_runtime_1.jsxs)("g", { children: [segment.map((seg, si) => ((0, jsx_runtime_1.jsx)("polyline", { points: seg.map((p) => `${x(p.i)},${y(p.andel)}`).join(" "), fill: "none", stroke: ton, strokeWidth: "1.5" }, si))), punkter.map((p) => p === null ? null : ((0, jsx_runtime_1.jsx)("rect", { x: x(p.i) - 3, y: y(p.andel) - 3, width: "6", height: "6", fill: ton, stroke: "var(--ink)", strokeWidth: "1" }, p.i)))] }, r.id));
                    })] }), (0, jsx_runtime_1.jsx)("div", { className: "chiprad px-3 pb-2 pt-1", children: medDelar.map((r, i) => ((0, jsx_runtime_1.jsxs)("span", { className: "pico flex items-center gap-1.5 shrink-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 border border-ink", style: { background: TONER[i % TONER.length] }, "aria-hidden": "true" }), (0, hogskoleprov_1.terminText)(r.termin) || "Utan termin"] }, r.id))) })] }));
}
