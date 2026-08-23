"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Nedrakning;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Ett datum med nedräkning.
 *
 * Nedräkningen är hela värdet: "17 oktober" säger ingenting om hur
 * bråttom det är, "om 66 dygn" säger allt. Datumet står kvar bredvid,
 * eftersom man behöver båda för att planera.
 */
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const hogskoleprov_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/hogskoleprov");
function Nedrakning({ datum, idag, }) {
    const dygn = (0, hogskoleprov_1.dygnKvar)(datum, idag);
    if (dygn === null)
        return null;
    const passerat = dygn < 0;
    // Accent bara på det som är nära OCH kvar. Ett passerat datum är inte
    // brådskande, det är historia.
    const bradskar = dygn >= 0 && dygn <= 14;
    return ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-baseline gap-2 min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico tabnum opacity-55 shrink-0", children: (0, tid_1.kortDatum)((0, tid_1.tolka)(datum)) }), (0, jsx_runtime_1.jsx)("span", { className: "pico tabnum shrink-0", style: {
                    color: bradskar ? "var(--accent)" : undefined,
                    opacity: passerat ? 0.4 : 1,
                }, children: (0, hogskoleprov_1.nedrakningstext)(dygn) })] }));
}
