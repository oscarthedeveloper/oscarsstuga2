"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Terminfalt;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Fältet där man skriver HÖST25.
 *
 * Samma mekanik som Talfalt och av samma skäl: texten ägs av fältet
 * medan man skriver. Skrev fältet om sig själv vid varje tecken skulle
 * "h" genast bli ogiltigt och suddas, och man kom aldrig till "höst25".
 *
 * Vid tappat fokus skrivs texten om till kanonisk form, så att listan
 * ser likadan ut oavsett om man skrev "ht25", "H 2025" eller "HÖST25".
 */
const react_1 = require("react");
const hogskoleprov_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/hogskoleprov");
function Terminfalt({ termin, onTermin, }) {
    const [text, setText] = (0, react_1.useState)(() => (0, hogskoleprov_1.terminText)(termin));
    const textRef = (0, react_1.useRef)(text);
    textRef.current = text;
    (0, react_1.useEffect)(() => {
        const egen = (0, hogskoleprov_1.tolkaTermin)(textRef.current);
        const lika = egen === termin ||
            (!!egen && !!termin && egen.sasong === termin.sasong && egen.ar === termin.ar);
        if (!lika)
            setText((0, hogskoleprov_1.terminText)(termin));
    }, [termin]);
    const giltig = text.trim() === "" || (0, hogskoleprov_1.tolkaTermin)(text) !== null;
    return ((0, jsx_runtime_1.jsx)("input", { className: "falt !w-[6.5rem]", placeholder: "H\u00D6ST25", value: text, autoCapitalize: "characters", autoCorrect: "off", spellCheck: false, 
        // Ett ogiltigt värde ropas inte ut med rött. Man är mitt i att
        // skriva det nästan hela tiden, och en varning som lyser under
        // halva inmatningen slutar man se.
        style: giltig ? undefined : { opacity: 0.55 }, onChange: (e) => {
            setText(e.target.value);
            onTermin((0, hogskoleprov_1.tolkaTermin)(e.target.value));
        }, onBlur: () => setText((0, hogskoleprov_1.terminText)(termin)), "aria-label": "Provtillf\u00E4lle, till exempel H\u00D6ST25" }));
}
