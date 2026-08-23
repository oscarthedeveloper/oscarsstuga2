"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Annat;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Annat — avdelningen för det som inte går att pressa in i EN kategori.
 *
 * Uppställningen är densamma som i anteckningarna: en kompakt lista till
 * vänster, sidan till höger, och en i taget på telefonen. Sidorna ser
 * olika ut i grunden, men de hänger i samma lista och delar samma ram —
 * det är den listan som gör dem till en avdelning i stället för fyra
 * lösryckta vyer.
 *
 * Listan kommer ur registret och inte ur lagret. En sida finns alltså
 * även innan den fyllts i, och posten skapas först när man skriver
 * något. Ett tomt register vore ett tomt Annat, och en tom post vore en
 * rad i listan som inte går att skilja från en ifylld.
 */
const react_1 = require("react");
const Butik_1 = require("./Butik");
const anvandMedia_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/anvandMedia");
const register_1 = require("./sidor/register");
function Annat({ oppnaId = null, }) {
    const butik = (0, Butik_1.useButik)();
    const mobil = (0, anvandMedia_1.useMobil)();
    /*
     * Startvärdet kommer ur propen, inte ur en effekt.
     *
     * Effekter körs inte vid rendering på servern, och appen är en
     * statisk export — en sida som pekas ut utifrån skulle därför saknas
     * i den första ritningen och tonas in först efter hydreringen. Att
     * sätta den direkt gör att den finns med från början, och tar bort en
     * bildruta där fel sida står på skärmen.
     */
    const [vald, setVald] = (0, react_1.useState)(oppnaId);
    (0, react_1.useEffect)(() => {
        if (oppnaId)
            setVald(oppnaId);
    }, [oppnaId]);
    /* På en bred skärm skall ytan aldrig stå tom; på en telefon betyder
       ett öppet dokument att listan är borta, och att landa i en sida man
       inte valt är fel. Samma regel som i anteckningarna. */
    (0, react_1.useEffect)(() => {
        if (!mobil && vald === null && register_1.SIDOR.length > 0)
            setVald(register_1.SIDOR[0].id);
    }, [mobil, vald]);
    const definition = register_1.SIDOR.find((s) => s.id === vald) ?? null;
    const visaLista = !mobil || !definition;
    const visaSida = !mobil || !!definition;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 flex", children: [visaLista && ((0, jsx_runtime_1.jsxs)("div", { className: `${mobil ? "w-full" : "w-[228px] lg:w-[260px] border-r border-ink"} shrink-0 min-h-0 flex flex-col bg-paper`, children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll", children: register_1.SIDOR.map((s) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "sidval", "data-vald": s.id === vald && !mobil ? "1" : "0", onClick: () => setVald(s.id), children: (0, jsx_runtime_1.jsxs)("span", { className: "flex items-baseline gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "palett-marke shrink-0", "aria-hidden": "true", children: s.kort }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[0.8rem] leading-snug", children: s.titel }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-50 block mt-0.5 leading-relaxed", children: s.beskrivning })] })] }) }, s.id))) }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-t border-ink px-2.5 py-1.5", children: (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-45 leading-relaxed", children: [register_1.SIDOR.length, " ", register_1.SIDOR.length === 1 ? "sida" : "sidor", " \u2014 nya byggs i koden, en komponent per sida"] }) })] })), visaSida && ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-w-0 min-h-0 flex flex-col bg-paper", children: definition ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [mobil && ((0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-ink px-2.5 py-1.5 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", onClick: () => setVald(null), "aria-label": "Tillbaka till listan", children: "\u2039" }), (0, jsx_runtime_1.jsx)("span", { className: "micro truncate", children: definition.titel })] })), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-0", children: (0, jsx_runtime_1.jsx)(definition.Komponent, { sida: butik.sidaMed(definition.id), spara: (data) => butik.sparaSida(definition.id, data) }) })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "h-full flex items-center justify-center p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink px-4 py-3 max-w-[320px]", style: { ["--cf"]: "9px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("p", { className: "micro mb-1.5", children: "Ingen sida vald" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-60 leading-[1.8]", children: "V\u00E4lj en i listan till v\u00E4nster." })] }) })) }))] }));
}
