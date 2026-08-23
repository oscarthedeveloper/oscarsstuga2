"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Blockredigerare;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Bladets blocklista.
 *
 * TVÅ LÄGEN. I läsläget finns ingen redigering alls — inga
 * verktygsrader, inga kortramar, ingen blockväljare. Bladet är då ett
 * dokument och ingenting annat. I redigeringsläget kommer allt fram.
 *
 * Verktygsraden göms inte bakom hovring inne i redigeringsläget, utan
 * syns hela tiden. Ett finger hovrar inte, och en kontroll som bara
 * finns på skrivbordet finns inte. Det är just därför lägena behövs:
 * knappar som alltid syns är rätt medan man skriver och fel medan man
 * läser, och samma yta kan inte vara båda.
 *
 * Nya block öppnas direkt i redigeringsläge. Det är hela skillnaden
 * mellan att lägga till ett block och att lägga till ett block OCH
 * sedan leta rätt på pennan.
 */
const react_1 = require("react");
const sprak_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/sprak");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const Blockvy_1 = require("./Blockvy");
function Blockredigerare({ block, onAndra, redigera, }) {
    const [redigerad, setRedigerad] = (0, react_1.useState)(null);
    const [meny, setMeny] = (0, react_1.useState)(false);
    /* Lämnar man redigeringsläget skall inget block ligga kvar öppet —
       annars står ett halvskrivet fält kvar och väntar nästa gång man
       slår på redigeringen, på ett blad man kanske inte ens är kvar i. */
    (0, react_1.useEffect)(() => {
        if (!redigera) {
            setRedigerad(null);
            setMeny(false);
        }
    }, [redigera]);
    const laggTill = (typ) => {
        const id = (0, butik_1.nyId)();
        onAndra([...block, (0, sprak_1.nyttBlock)(typ, id)]);
        setRedigerad(id);
        setMeny(false);
    };
    const namnFor = (typ) => sprak_1.BLOCKNAMN.find((b) => b.typ === typ)?.namn ?? typ;
    if (!redigera) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "blockflode", children: block.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 py-3 leading-relaxed", children: "Tomt blad. Tryck Redigera f\u00F6r att b\u00F6rja skriva." })) : (block.map((b) => (0, jsx_runtime_1.jsx)(Blockvy_1.VisaBlock, { block: b }, b.id))) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [block.length === 0 && ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 py-3 leading-relaxed", children: "Tomt blad. L\u00E4gg till ett textblock och b\u00F6rja skriva, eller v\u00E4lj en tabell, en b\u00F6jning eller en paralleltext nedan." })), block.map((b, i) => {
                const redigeras = redigerad === b.id;
                return ((0, jsx_runtime_1.jsxs)("div", { className: "blockkort", "data-redigeras": redigeras ? "1" : "0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "blockhuvud", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-40 shrink-0", children: namnFor(b.typ) }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp", onClick: () => onAndra((0, sprak_1.flytta)(block, i, -1)), disabled: i === 0, "aria-label": "Flytta upp", title: "Flytta upp", children: "\u2191" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp", onClick: () => onAndra((0, sprak_1.flytta)(block, i, 1)), disabled: i === block.length - 1, "aria-label": "Flytta ned", title: "Flytta ned", children: "\u2193" }), (0, jsx_runtime_1.jsx)("span", { className: "blockdelare", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp", "data-aktiv": redigeras ? "1" : "0", onClick: () => setRedigerad(redigeras ? null : b.id), "aria-label": redigeras ? "Klar" : "Redigera blocket", title: redigeras ? "Klar" : "Redigera", children: redigeras ? "✓" : "✎" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp", onClick: () => {
                                        if (window.confirm(`Ta bort ${namnFor(b.typ).toLowerCase()}sblocket? Går att ångra med ⌘Z.`)) {
                                            onAndra(block.filter((x) => x.id !== b.id));
                                        }
                                    }, "aria-label": "Ta bort blocket", title: "Ta bort", children: "\u2715" })] }), (0, jsx_runtime_1.jsx)("div", { className: "blockyta", children: redigeras ? ((0, jsx_runtime_1.jsx)(Blockvy_1.RedigeraBlock, { block: b, onAndra: (nytt) => onAndra(block.map((x) => (x.id === b.id ? nytt : x))) })) : ((0, jsx_runtime_1.jsx)(Blockvy_1.VisaBlock, { block: b })) })] }, b.id));
            }), meny ? ((0, jsx_runtime_1.jsxs)("div", { className: "border border-ink bg-panel p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro", children: "L\u00E4gg till block" }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => setMeny(false), children: "Avbryt" })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-1.5", children: sprak_1.BLOCKNAMN.map((b) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico text-left !py-2", onClick: () => laggTill(b.typ), children: [(0, jsx_runtime_1.jsx)("span", { className: "block", children: b.namn }), (0, jsx_runtime_1.jsx)("span", { className: "block opacity-45 normal-case mt-0.5", children: b.beskrivning })] }, b.typ))) })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-ton": "accent", onClick: () => laggTill("text"), children: "+ Text" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => setMeny(true), children: "+ Annat block" })] }))] }));
}
