"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Vinuppslag;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Vinet som ett färdigt uppslag.
 *
 * Läsläget för en öppnad rad i registret: fakta, betyg, smakprofil,
 * noter och text — inga fält, inga ramar runt värden, ingenting som ser
 * ut att vänta på en inmatning. Ett fält som ser ut som en färdig sida
 * är ändå ett fält: markören hamnar i det, texten går att råka ändra,
 * och skärmläsaren säger "inmatning" där det står ett värde.
 *
 * Eget block och inte en funktion inne i sidan, av samma skäl som
 * uppslaget på språksidan: det är den del som skall gå att titta på för
 * sig, och därmed också att prova för sig.
 */
const viner_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/viner");
const Betygsmatare_1 = __importDefault(require("./Betygsmatare"));
const Smakskala_1 = __importDefault(require("./Smakskala"));
function Vinuppslag({ vin }) {
    const fakta = (0, viner_1.vinFakta)(vin);
    const skillnad = (0, viner_1.oense)(vin);
    const harBetyg = vin.egetBetyg !== null || vin.vivinoBetyg !== null;
    const visaProfil = (0, viner_1.harProfil)(vin.profil);
    if ((0, viner_1.arTomt)(vin)) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 py-3 leading-relaxed", children: "Ingenting ifyllt \u00E4nnu. Tryck \u270E Redigera och skriv in vinet \u2014 namnet r\u00E4cker f\u00F6r att b\u00F6rja, resten kan fyllas i n\u00E4r flaskan st\u00E5r framf\u00F6r dig." }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-3", children: [vin.bildUrl && ((0, jsx_runtime_1.jsx)("span", { className: "vinspalt", children: (0, jsx_runtime_1.jsx)("span", { className: "vinbild", children: (0, jsx_runtime_1.jsx)("img", { src: vin.bildUrl, alt: `Etikett för ${(0, viner_1.vinTitel)(vin)}`, loading: "lazy", referrerPolicy: "no-referrer" }) }) })), fakta.length > 0 && ((0, jsx_runtime_1.jsx)("dl", { className: "vinfakta flex-1 min-w-0", children: fakta.map((r) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: r.etikett }), (0, jsx_runtime_1.jsx)("dd", { children: r.varde })] }, r.etikett))) }))] }), harBetyg && ((0, jsx_runtime_1.jsxs)("div", { className: "faktarad", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Ditt betyg" }), (0, jsx_runtime_1.jsx)(Betygsmatare_1.default, { varde: vin.egetBetyg, etikett: "ditt betyg", storlek: "stor" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Vivinos betyg" }), (0, jsx_runtime_1.jsxs)("span", { className: "flex items-baseline gap-2", children: [(0, jsx_runtime_1.jsx)(Betygsmatare_1.default, { varde: vin.vivinoBetyg, etikett: "Vivinos betyg", storlek: "stor" }), vin.vivinoAntal !== null && ((0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-40 tabnum shrink-0", children: [(0, viner_1.kronor)(vin.vivinoAntal), " rec."] }))] })] }), skillnad !== null && Math.abs(skillnad) >= 0.5 && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Ni \u00E4r oense" }), (0, jsx_runtime_1.jsxs)("span", { className: "faktavarde", children: ["Du tyckte ", skillnad > 0 ? "bättre" : "sämre"] })] }))] })), (visaProfil || vin.uppgifterSaknas) && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Hur smakar detta vin?" }), visaProfil ? ((0, jsx_runtime_1.jsx)(Smakskala_1.default, { profil: vin.profil, ton: (0, viner_1.typTon)(vin.typ) })) : ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed", children: "Vinet g\u00E5r inte att sl\u00E5 upp, s\u00E5 det finns ingen smakprofil att visa." }))] })), vin.smaknoter.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Smaknoter" }), (0, jsx_runtime_1.jsx)("div", { className: "smakkortrad", children: vin.smaknoter.map((n) => ((0, jsx_runtime_1.jsxs)("div", { className: "smakkort", style: {
                                borderColor: `var(--kal-${(0, viner_1.gruppTon)(n.grupp) + 1}-stark, var(--ink))`,
                            }, children: [(0, jsx_runtime_1.jsx)("span", { className: "smakkorthuvud", style: { background: `var(--kal-${(0, viner_1.gruppTon)(n.grupp) + 1})` }, children: (0, jsx_runtime_1.jsx)("span", { className: "smakord-text", children: n.ord || "Namnlös not" }) }), (0, jsx_runtime_1.jsx)("span", { className: "smakkortfot", children: (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: (0, viner_1.smaknotsFot)(n) }) })] }, n.id))) })] })), vin.beskrivning.trim() && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Vinbeskrivning" }), (0, jsx_runtime_1.jsx)("p", { className: "brodtext vintext", children: vin.beskrivning })] })), vin.anteckning.trim() && ((0, jsx_runtime_1.jsxs)("div", { className: "vinanteckning", children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Din anteckning" }), (0, jsx_runtime_1.jsx)("p", { className: "brodtext vintext", children: vin.anteckning })] }))] }));
}
