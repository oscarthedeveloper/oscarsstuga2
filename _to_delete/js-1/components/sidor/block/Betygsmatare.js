"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Betygsmatare;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Betyget som fem celler.
 *
 * Stjärnor undviks med flit. En stjärna är en gäst i den här appen —
 * den är rund, den är en ikon, och den är hämtad ur ett annat
 * formspråk. Fem fyrkanter säger samma sak med husets vokabulär, och de
 * kan dessutom fyllas delvis, vilket en stjärna inte kan utan att bli
 * en halv stjärna som ser ut som ett ritfel.
 *
 * Talet står ALLTID skrivet bredvid. Fyllnaden är översikten; siffran
 * är det man faktiskt läser av, och skillnaden mellan 3,6 och 3,8 syns
 * inte i en cell men är hela skillnaden mellan två viner.
 */
const viner_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/viner");
const CELLER = 5;
function Betygsmatare({ varde, onVarde, etikett, storlek = "liten", }) {
    const n = varde === null ? 0 : (0, viner_1.klam)(varde, 0, CELLER);
    return ((0, jsx_runtime_1.jsxs)("span", { className: "betygsrad", "data-storlek": storlek, children: [(0, jsx_runtime_1.jsx)("span", { className: "betygsmatare", role: onVarde ? undefined : "img", "aria-label": onVarde
                    ? undefined
                    : `${etikett}: ${varde === null ? "inget betyg" : `${(0, viner_1.betygstext)(varde)} av 5`}`, children: Array.from({ length: CELLER }, (_, i) => {
                    /* Cellens fyllnad är den del av betyget som faller inom just
                       den cellen. 3,6 ger fyra fyllda och en till 60 procent. */
                    const fyllnad = (0, viner_1.klam)(n - i, 0, 1);
                    const cell = ((0, jsx_runtime_1.jsx)("span", { className: "betygscell", children: (0, jsx_runtime_1.jsx)("span", { style: { width: `${fyllnad * 100}%` } }) }));
                    if (!onVarde)
                        return (0, jsx_runtime_1.jsx)("span", { children: cell }, i);
                    return ((0, jsx_runtime_1.jsx)("button", { type: "button", 
                        /* Ett tryck på cellen man redan står på tömmer betyget.
                           Utan det går ett satt betyg inte att ta tillbaka, bara
                           att ändra — och ett betyg man satte av misstag skulle
                           ligga kvar för alltid. */
                        onClick: () => onVarde(varde === i + 1 ? null : i + 1), "aria-label": `Sätt ${i + 1} av 5 för ${etikett}`, title: `${i + 1} av 5`, children: cell }, i));
                }) }), (0, jsx_runtime_1.jsx)("span", { className: "betygstal tabnum", children: (0, viner_1.betygstext)(varde) })] }));
}
