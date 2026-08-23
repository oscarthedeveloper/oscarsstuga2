"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Smakskala;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * De fyra smakskalorna, som på Vivino.
 *
 * Skalan går från ett ORD till ett annat och aldrig från noll till
 * hundra. Ingen av de fyra har en bra och en dålig ände — ett strävt
 * vin är inte sämre än ett lent — och siffror på axeln hade fått
 * mätaren att läsas som ett betyg.
 *
 * Markören ritas som ett band och inte som ett streck, precis som i
 * förlagan. Bandet är dock alltid lika brett: bredden i förlagan står
 * för en spridning bland tusentals recensioner, och att härma den med
 * ett tal man skattat för hand ur en skärmbild vore påhittad precision.
 * Bandet säger "ungefär här", vilket är sant.
 */
const viner_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/viner");
/** Bandets bredd i procent av spåret. Fast, se förklaringen ovan. */
const BAND = 14;
function Smakskala({ profil, onVarde, ton = 2, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "smaktavla", children: viner_1.SKALOR.map((s) => {
            const varde = profil[s.id];
            return ((0, jsx_runtime_1.jsxs)("div", { className: "smakrad", children: [(0, jsx_runtime_1.jsx)("span", { className: "smakord", children: s.vanster }), (0, jsx_runtime_1.jsxs)("span", { className: "smakspar", "data-tomt": varde === null ? "1" : "0", children: [varde !== null && ((0, jsx_runtime_1.jsx)("span", { className: "smakband", style: {
                                    background: `var(--kal-${ton + 1}-stark, var(--accent))`,
                                    left: `${klamProcent(varde)}%`,
                                    width: `${BAND}%`,
                                } })), onVarde && ((0, jsx_runtime_1.jsx)("input", { type: "range", className: "smakreglage", min: 0, max: 100, step: 1, value: varde ?? 50, onChange: (e) => onVarde(s.id, Number(e.target.value)), "aria-label": `${s.vanster} till ${s.hoger}`, "aria-valuetext": varde === null
                                    ? "Ej ifyllt"
                                    : `${varde} av 100, ${s.vanster} till ${s.hoger}` }))] }), (0, jsx_runtime_1.jsx)("span", { className: "smakord text-right", children: s.hoger }), onVarde && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp shrink-0", onClick: () => onVarde(s.id, varde === null ? 50 : null), "aria-label": varde === null
                            ? `Fyll i ${s.vanster} till ${s.hoger}`
                            : `Töm ${s.vanster} till ${s.hoger}`, title: varde === null ? "Fyll i" : "Töm", children: varde === null ? "+" : "✕" }))] }, s.id));
        }) }));
}
/**
 * Bandets vänsterkant.
 *
 * Klämd så att bandet aldrig hamnar utanför spåret. Ett vin längst ut
 * på skalan skall se ut att ligga längst ut, inte att sticka ut ur
 * ramen.
 */
function klamProcent(varde) {
    return Math.min(100 - BAND, Math.max(0, varde - BAND / 2));
}
