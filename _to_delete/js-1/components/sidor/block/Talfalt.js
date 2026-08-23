"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tolka = tolka;
exports.skriv = skriv;
exports.default = Talfalt;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Ett sifferfält som går att skriva komma i.
 *
 * DETTA ÄR INTE EN DETALJ. Ett vanligt kontrollerat fält som tolkar
 * värdet vid varje tangenttryckning gör det omöjligt att skriva 1,70:
 * efter kommat är texten "1," som tolkas till talet 1, som ritas
 * tillbaka som "1" — och kommat är borta innan man hunnit skriva
 * siffran efter. Samma sak drabbar en inledande nolla och ett
 * avslutande minustecken.
 *
 * Lösningen är att fältet äger sin RÅA TEXT medan man skriver, och bara
 * skickar ut det tolkade värdet. Texten skrivs om utifrån först när det
 * inkommande värdet inte längre stämmer med det man har skrivit — alltså
 * när någon annan ändrat, inte när man själv håller på.
 */
const react_1 = require("react");
/** Samma tolkning som lagret gör. Komma och punkt duger båda. */
function tolka(rå) {
    const rensad = rå.trim().replace(",", ".");
    if (rensad === "")
        return null;
    const n = Number(rensad);
    return Number.isFinite(n) ? n : null;
}
/** Svensk decimalkomma ut, eftersom det är så man skriver in det. */
function skriv(varde) {
    return varde === null ? "" : String(varde).replace(".", ",");
}
function Talfalt({ varde, onVarde, etikett, platshallare = "—", className = "falt talfalt", tolkTal = tolka, skrivTal = skriv, }) {
    const [text, setText] = (0, react_1.useState)(() => skrivTal(varde));
    const textRef = (0, react_1.useRef)(text);
    textRef.current = text;
    (0, react_1.useEffect)(() => {
        // Bara när det inkommande värdet säger något annat än det man skrivit.
        // "1," tolkas till 1, så en halvskriven decimal räknas som i takt och
        // skrivs inte om mitt i inmatningen.
        if (tolkTal(textRef.current) !== varde)
            setText(skrivTal(varde));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [varde]);
    return ((0, jsx_runtime_1.jsx)("input", { className: className, inputMode: "decimal", placeholder: platshallare, value: text, onChange: (e) => {
            setText(e.target.value);
            onVarde(tolkTal(e.target.value));
        }, onBlur: () => {
            // Vid tappat fokus är inmatningen färdig, och skräp som "1,,"
            // eller "abc" skall inte ligga kvar och se ut som ett värde.
            setText(skrivTal(varde));
        }, "aria-label": etikett }));
}
