"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = KalenderPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Hantering av kalendrarna själva — lägg till, byt namn, byt färg,
 * ta bort.
 *
 * Det enda som kräver eftertanke är borttagningen. Händelserna i en
 * raderad kalender måste ta vägen någonstans, så panelen frågar vart:
 * flytta dem, eller radera dem med. Att lämna dem kvar utan kalender
 * vore värst av allt — de skulle bli osynliga men ligga kvar i lagret.
 */
const react_1 = require("react");
const typer_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/typer");
const Butik_1 = require("./Butik");
function KalenderPanel({ onStang }) {
    const { kalendrar, skapaKalender, uppdateraKalender, taBortKalender, vaxlaKalender, antalIKalender, } = (0, Butik_1.useButik)();
    const [nyttNamn, setNyttNamn] = (0, react_1.useState)("");
    const [nyTon, setNyTon] = (0, react_1.useState)(0);
    const [tarBort, setTarBort] = (0, react_1.useState)(null);
    const nyRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const id = window.setTimeout(() => nyRef.current?.focus(), 30);
        return () => window.clearTimeout(id);
    }, []);
    const laggTill = () => {
        const namn = nyttNamn.trim();
        if (!namn)
            return;
        skapaKalender(namn, nyTon);
        setNyttNamn("");
        // Nästa nya kalender får nästa ton, så att två i rad inte blir lika.
        setNyTon((t) => (t + 1) % 6);
        nyRef.current?.focus();
    };
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "panel-overlay", onClick: onStang }), (0, jsx_runtime_1.jsxs)("aside", { className: "redigeringspanel", role: "dialog", "aria-label": "Hantera kalendrar", onKeyDown: (e) => {
                    if (e.key === "Escape")
                        onStang();
                }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 bg-ink text-paper px-3 h-[34px] flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro", children: "Kalendrar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onStang, className: "micro hover:text-accent transition-colors", children: "St\u00E4ng \u2715" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll p-3 flex flex-col gap-2", children: [kalendrar.map((k) => ((0, jsx_runtime_1.jsx)(KalenderRad, { kalender: k, antal: antalIKalender(k.id), ensam: kalendrar.length <= 1, onNamn: (namn) => uppdateraKalender(k.id, { namn }), onTon: (ton) => uppdateraKalender(k.id, { ton }), onSynlig: () => vaxlaKalender(k.id), onTaBort: () => setTarBort(k) }, k.id))), kalendrar.length <= 1 && ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed", children: "Den sista kalendern g\u00E5r inte att ta bort \u2014 nya h\u00E4ndelser m\u00E5ste kunna hamna n\u00E5gonstans." }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-t border-ink p-2.5 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-60", children: "Ny kalender" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { ref: nyRef, className: "falt", placeholder: "Namn", value: nyttNamn, onChange: (e) => setNyttNamn(e.target.value), onKeyDown: (e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                laggTill();
                                            }
                                        } }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", "data-ton": "accent", onClick: laggTill, disabled: nyttNamn.trim().length === 0, children: "L\u00E4gg till" })] }), (0, jsx_runtime_1.jsx)(TonValjare, { varde: nyTon, onValj: setNyTon })] }), tarBort && ((0, jsx_runtime_1.jsx)(BorttagningsFraga, { kalender: tarBort, antal: antalIKalender(tarBort.id), ovriga: kalendrar.filter((k) => k.id !== tarBort.id), onVal: (flyttaTill) => {
                            taBortKalender(tarBort.id, flyttaTill);
                            setTarBort(null);
                        }, onAvbryt: () => setTarBort(null) }))] })] }));
}
function KalenderRad({ kalender, antal, ensam, onNamn, onTon, onSynlig, onTaBort, }) {
    // Namnet redigeras lokalt och skrivs tillbaka när fältet lämnas —
    // annars skulle varje tangenttryckning bli ett eget steg i ⌘Z.
    const [namn, setNamn] = (0, react_1.useState)(kalender.namn);
    (0, react_1.useEffect)(() => setNamn(kalender.namn), [kalender.namn]);
    const skriv = () => {
        if (namn.trim() && namn !== kalender.namn)
            onNamn(namn);
        else
            setNamn(kalender.namn);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "border border-ink p-2 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "shrink-0 border border-ink", style: {
                            width: 14,
                            height: 14,
                            background: `var(--kal-${kalender.ton + 1})`,
                            borderLeft: `4px solid var(--kal-${kalender.ton + 1}-stark)`,
                        } }), (0, jsx_runtime_1.jsx)("input", { className: "falt !py-1", value: namn, onChange: (e) => setNamn(e.target.value), onBlur: skriv, onKeyDown: (e) => {
                            if (e.key === "Enter")
                                e.target.blur();
                            if (e.key === "Escape")
                                setNamn(kalender.namn);
                        }, "aria-label": `Namn på kalendern ${kalender.namn}` })] }), (0, jsx_runtime_1.jsx)(TonValjare, { varde: kalender.ton, onValj: onTon }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-50 tabnum flex-1", children: [antal, " ", antal === 1 ? "post" : "poster"] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": kalender.synlig ? "1" : "0", onClick: onSynlig, children: kalender.synlig ? "Synlig" : "Dold" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: onTaBort, disabled: ensam, title: ensam ? "Den sista kalendern går inte att ta bort" : "Ta bort", children: "Ta bort" })] })] }));
}
function TonValjare({ varde, onValj, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "knapp-rad", children: typer_1.TON_NAMN.map((namn, i) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp flex-1 !px-0 !py-0 h-6 relative", "data-aktiv": varde === i ? "1" : "0", onClick: () => onValj(i), title: namn, "aria-label": namn, "aria-pressed": varde === i, children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute inset-[3px]", style: { background: `var(--kal-${i + 1})` } }), varde === i && ((0, jsx_runtime_1.jsx)("span", { className: "absolute inset-0 border-2", style: { borderColor: "var(--accent)" } }))] }, namn))) }));
}
function BorttagningsFraga({ kalender, antal, ovriga, onVal, onAvbryt, }) {
    const [mal, setMal] = (0, react_1.useState)(ovriga[0]?.id ?? "");
    // Tom kalender: inget att fråga om, bara bekräfta.
    if (antal === 0) {
        return ((0, jsx_runtime_1.jsxs)(Ruta, { children: [(0, jsx_runtime_1.jsxs)("p", { className: "micro mb-1", children: ["Ta bort ", kalender.namn, "?"] }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-55 mb-2.5 leading-relaxed", children: "Kalendern \u00E4r tom." }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro text-left", "data-ton": "accent", onClick: () => onVal(null), children: "Ta bort" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico opacity-70", onClick: onAvbryt, children: "Avbryt" })] })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(Ruta, { children: [(0, jsx_runtime_1.jsxs)("p", { className: "micro mb-1", children: ["Ta bort ", kalender.namn, "?"] }), (0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-55 mb-2.5 leading-relaxed", children: [antal, " ", antal === 1 ? "post ligger" : "poster ligger", " i den. Vad skall h\u00E4nda med ", antal === 1 ? "den" : "dem", "?"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1.5", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Flytta till" }), (0, jsx_runtime_1.jsx)("select", { className: "falt", value: mal, onChange: (e) => setMal(e.target.value), children: ovriga.map((k) => ((0, jsx_runtime_1.jsx)("option", { value: k.id, children: k.namn }, k.id))) })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro text-left", "data-ton": "accent", onClick: () => onVal(mal), children: "Flytta och ta bort kalendern" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp micro text-left", onClick: () => onVal(null), children: ["Radera ", antal === 1 ? "posten" : "posterna", " ocks\u00E5"] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico mt-1 opacity-70", onClick: onAvbryt, children: "Avbryt" })] }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-40 mt-2 leading-relaxed", children: "G\u00E5r att \u00E5ngra med \u2318Z." })] }));
}
function Ruta({ children }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-[rgb(17_17_17/0.45)] flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink p-3 w-full max-w-[300px]", style: { ["--cf"]: "7px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), children] }) }));
}
