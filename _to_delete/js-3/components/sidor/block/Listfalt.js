"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Listfalt;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Ett fält för en kommaskild lista som går att skriva mellanslag i.
 *
 * DETTA ÄR SAMMA SJUKA SOM KOMMATECKNET I `Talfalt`, och den är värd att
 * skriva ut en gång till eftersom den ser olika ut men är en och samma.
 * Ett vanligt kontrollerat fält som tolkar värdet vid varje
 * tangenttryckning gör det omöjligt att skriva "nötkött, pasta": efter
 * kommat är texten "nötkött, " som tolkas till listan ["nötkött"], som
 * ritas tillbaka som "nötkött" — och både kommat och mellanslaget är
 * borta innan man hunnit skriva bokstaven efter. Samma sak drabbar varje
 * mellanslag i slutet av ett ord.
 *
 * Lösningen är densamma: fältet äger sin RÅA TEXT medan man skriver, och
 * skickar bara ut den tolkade listan. Texten skrivs om utifrån först när
 * det inkommande värdet inte längre stämmer med det man har skrivit —
 * alltså när någon annan ändrat, inte när man själv håller på.
 */
const react_1 = require("react");
const viner_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/viner");
const samma = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function Listfalt({ varden, onVarden, etikett, platshallare, className = "falt", }) {
    const [text, setText] = (0, react_1.useState)(() => (0, viner_1.skrivLista)(varden));
    const textRef = (0, react_1.useRef)(text);
    textRef.current = text;
    (0, react_1.useEffect)(() => {
        // Bara när det inkommande värdet säger något annat än det man skrivit.
        // "nötkött, " tolkas till ["nötkött"], så en halvskriven post räknas
        // som i takt och skrivs inte om mitt i inmatningen.
        if (!samma((0, viner_1.tolkaLista)(textRef.current), varden)) {
            setText((0, viner_1.skrivLista)(varden));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [varden]);
    return ((0, jsx_runtime_1.jsx)("input", { className: className, placeholder: platshallare, value: text, onChange: (e) => {
            setText(e.target.value);
            onVarden((0, viner_1.tolkaLista)(e.target.value));
        }, onBlur: () => {
            // Vid tappat fokus är inmatningen färdig, och ett hängande komma
            // eller dubbla mellanslag skall inte ligga kvar och se ut som en
            // post man glömt skriva.
            setText((0, viner_1.skrivLista)(varden));
        }, "aria-label": etikett }));
}
