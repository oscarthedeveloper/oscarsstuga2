"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Jamforelse;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Rad för rad: vad som krävs, och hur långt du har kvar.
 *
 * Skillnaden skrivs alltid med tecken — "+0,10" och "−0,15" — och
 * aldrig bara som en färg. En röd siffra utan tecken kräver att man
 * minns åt vilket håll skalan går, och det gör man inte klockan sju på
 * morgonen.
 */
const hogskoleprov_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/hogskoleprov");
function Jamforelse({ rader, harPoang, }) {
    if (rader.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: "L\u00E4gg till ett l\u00E4ros\u00E4te nedan, eller s\u00E4tt ett eget m\u00E5l, s\u00E5 r\u00E4knas avst\u00E5ndet ut h\u00E4r." }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { children: rader.map((r) => ((0, jsx_runtime_1.jsxs)("div", { className: "sidrad", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[0.78rem] min-w-0 flex-1 truncate", children: r.etikett }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 shrink-0", children: "Kr\u00E4vs" }), (0, jsx_runtime_1.jsx)("span", { className: "medeltal shrink-0", children: (0, hogskoleprov_1.poangtext)(r.krav) }), (0, jsx_runtime_1.jsx)("span", { className: "utfall micro tabnum shrink-0 w-[4.5rem] text-right", "data-racker": r.racker ? "1" : "0", children: r.skillnad === null
                        ? harPoang
                            ? "—"
                            : "?"
                        : (0, hogskoleprov_1.skillnadstext)(r.skillnad) })] }, r.id))) }));
}
