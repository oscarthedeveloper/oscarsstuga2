"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttGora;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Att göra-listan.
 *
 * Två saker styr utseendet, och båda kommer ur samma princip som
 * kalendern: färgen bär aldrig informationen ensam, och ingenting ritas
 * som inte går att handla på.
 *
 * Styrkan visas därför både som siffra och som fyllda streck — en enda
 * accentfärg hade sagt "viktigt" utan att säga hur viktigt, och hade
 * dessutom varit osynlig för den som inte skiljer färgerna åt. Kalendern
 * visas med samma prick och samma ton som i rutnätet, så att en uppgift
 * märkt Arbete och ett möte märkt Arbete ser släkt ut.
 *
 * Listan är en enda kolumn, inte tre spalter efter styrka. Kolumner
 * tvingar ögat att jämföra saker som inte skall jämföras, och gör det
 * omöjligt att se vad som är näst på tur.
 */
const react_1 = require("react");
const typer_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/typer");
const Butik_1 = require("./Butik");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const anvandMedia_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/anvandMedia");
const Kopplingar_1 = __importDefault(require("./Kopplingar"));
/** Tre streck där de fyllda är styrkan. Läses utan färgseende. */
function Styrka({ varde }) {
    return ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center gap-[2px] shrink-0", "aria-hidden": "true", children: [1, 2, 3].map((n) => ((0, jsx_runtime_1.jsx)("span", { style: {
                width: 3,
                height: 10,
                border: "1px solid var(--ink)",
                // Styrka 1 fyller tre streck, styrka 3 fyller ett.
                background: n <= 4 - varde ? "var(--ink)" : "transparent",
            } }, n))) }));
}
function AttGora({ fokusera = 0, oppna = null, onOppnaMal, onSkapaLank, }) {
    const { uppgifter, kalendrar, kalenderFor, skapaUppgift, sparaUppgift, vaxlaKlar, taBortUppgift, } = (0, Butik_1.useButik)();
    const [titel, setTitel] = (0, react_1.useState)("");
    const [prioritet, setPrioritet] = (0, react_1.useState)(2);
    const [kalenderId, setKalenderId] = (0, react_1.useState)("");
    const [filter, setFilter] = (0, react_1.useState)(null);
    const [visaKlara, setVisaKlara] = (0, react_1.useState)(false);
    const [oppen, setOppen] = (0, react_1.useState)(null);
    const faltRef = (0, react_1.useRef)(null);
    const mobil = (0, anvandMedia_1.useMobil)();
    // Knappen i mobilens bottenrad kan inte nå fältet direkt; den räknar
    // i stället upp en signal, och fältet tar fokus när den ändras.
    (0, react_1.useEffect)(() => {
        if (fokusera > 0)
            faltRef.current?.focus();
    }, [fokusera]);
    /*
     * En sökträff pekade hit. Utöver att fälla ut raden måste filtren
     * släppas: träffen kan mycket väl ligga i en kalender som är bortfiltrerad
     * eller vara avbockad, och att öppna en post som sedan inte syns är
     * samma sak som att inte öppna den alls.
     */
    (0, react_1.useEffect)(() => {
        if (!oppna)
            return;
        const traff = uppgifter.find((u) => u.id === oppna.id);
        if (!traff)
            return;
        setOppen(oppna.id);
        setFilter((f) => (f && f !== traff.kalenderId ? null : f));
        if (traff.klar)
            setVisaKlara(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oppna]);
    const valdKalender = kalenderId || kalendrar[0]?.id || "arbete";
    const idag = (0, tid_1.nyckel)((0, tid_1.startAvDag)(new Date()));
    const synliga = (0, react_1.useMemo)(() => {
        const lista = uppgifter.filter((u) => (!filter || u.kalenderId === filter) && (visaKlara || !u.klar));
        return (0, butik_1.sorteraUppgifter)(lista);
    }, [uppgifter, filter, visaKlara]);
    const kvar = uppgifter.filter((u) => !u.klar).length;
    const forsenade = uppgifter.filter((u) => !u.klar && u.forfaller && u.forfaller < idag).length;
    const laggTill = () => {
        const t = titel.trim();
        if (!t)
            return;
        skapaUppgift({ titel: t, prioritet, kalenderId: valdKalender });
        setTitel("");
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 flex flex-col", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-ink p-2.5 flex flex-col gap-2 bg-paper", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { ref: faltRef, className: "falt", placeholder: "Vad beh\u00F6ver g\u00F6ras?", value: titel, onChange: (e) => setTitel(e.target.value), onKeyDown: (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        laggTill();
                                    }
                                } }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", "data-ton": "accent", onClick: laggTill, disabled: titel.trim().length === 0, "aria-label": "L\u00E4gg till", children: mobil ? "+" : "Lägg till" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "knapp-rad", children: typer_1.PRIORITETER.map((p) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex items-center gap-1.5", "data-aktiv": prioritet === p.varde ? "1" : "0", onClick: () => setPrioritet(p.varde), title: p.namn, children: [(0, jsx_runtime_1.jsx)(Styrka, { varde: p.varde }), p.kort] }, p.varde))) }), (0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto", value: valdKalender, onChange: (e) => setKalenderId(e.target.value), "aria-label": "Kalender", children: kalendrar.map((k) => ((0, jsx_runtime_1.jsx)("option", { value: k.id, children: k.namn }, k.id))) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-ink px-2.5 py-1.5 chiprad items-center bg-paper", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": filter === null ? "1" : "0", onClick: () => setFilter(null), children: "Alla" }), kalendrar.map((k) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex items-center gap-1.5", "data-aktiv": filter === k.id ? "1" : "0", onClick: () => setFilter(filter === k.id ? null : k.id), children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2 h-2 border border-current", style: { background: `var(--kal-${k.ton + 1})` } }), k.namn] }, k.id))), (0, jsx_runtime_1.jsx)("span", { className: "hidden md:block flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": visaKlara ? "1" : "0", onClick: () => setVisaKlara((v) => !v), children: "Visa klara" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll", children: [synliga.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "p-6 flex items-center justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink px-4 py-3 max-w-[320px]", style: { ["--cf"]: "9px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("p", { className: "micro mb-1.5", children: uppgifter.length === 0 ? "Ingenting att göra" : "Inget kvar här" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-60 leading-[1.8]", children: uppgifter.length === 0
                                        ? "Skriv in något i fältet ovan och välj styrka och kalender."
                                        : "Allt i det här urvalet är avbockat. Slå på Visa klara för att se dem." })] }) })), synliga.map((u) => ((0, jsx_runtime_1.jsx)(UppgiftRad, { markera: u.id === oppna?.id, uppgift: u, idag: idag, kalendernamn: kalenderFor(u.kalenderId).namn, ton: kalenderFor(u.kalenderId).ton, oppen: oppen === u.id, onOppna: () => setOppen(oppen === u.id ? null : u.id), onVaxla: () => vaxlaKlar(u.id), onSpara: sparaUppgift, onTaBort: () => {
                            setOppen(null);
                            taBortUppgift(u.id);
                        }, kalendrar: kalendrar, onOppnaMal: onOppnaMal, onSkapaLank: onSkapaLank }, u.id)))] }), (0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-t border-ink px-2.5 py-1.5 flex items-center gap-3 bg-paper", children: [(0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-60 tabnum", children: [kvar, " ", kvar === 1 ? "kvar" : "kvar"] }), forsenade > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "pico text-accent tabnum", children: [forsenade, " f\u00F6rsenade"] }))] })] }));
}
function UppgiftRad({ uppgift, markera, idag, kalendernamn, ton, oppen, onOppna, onVaxla, onSpara, onTaBort, kalendrar, onOppnaMal, onSkapaLank, }) {
    const forsenad = !uppgift.klar && !!uppgift.forfaller && uppgift.forfaller < idag;
    const idagsdags = uppgift.forfaller === idag;
    const radRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (markera)
            radRef.current?.scrollIntoView({ block: "center" });
    }, [markera]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: radRef, className: "uppgift", "data-klar": uppgift.klar ? "1" : "0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "uppgift-bockyta shrink-0", "data-klar": uppgift.klar ? "1" : "0", onClick: onVaxla, "aria-label": uppgift.klar ? "Ångra avbockning" : "Bocka av", "aria-pressed": uppgift.klar, children: (0, jsx_runtime_1.jsx)("span", { className: "uppgift-bock", "data-klar": uppgift.klar ? "1" : "0", children: uppgift.klar ? "✕" : "" }) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "flex-1 min-w-0 text-left", onClick: onOppna, children: [(0, jsx_runtime_1.jsx)("span", { className: "uppgift-titel block", children: uppgift.titel }), (0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2 flex-wrap mt-0.5", children: [(0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-55 flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2 h-2 border border-ink", style: { background: `var(--kal-${ton + 1})` } }), kalendernamn] }), uppgift.forfaller && ((0, jsx_runtime_1.jsxs)("span", { className: "pico tabnum", style: {
                                            color: forsenad ? "var(--accent)" : undefined,
                                            opacity: forsenad || idagsdags ? 1 : 0.55,
                                        }, children: [forsenad ? "Försenad " : "", (0, tid_1.kortDatum)((0, tid_1.tolka)(uppgift.forfaller))] })), uppgift.anteckning && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-40", children: "\u270E" }))] })] }), (0, jsx_runtime_1.jsxs)("span", { className: "shrink-0 flex items-center gap-1.5 pt-0.5", children: [(0, jsx_runtime_1.jsx)(Styrka, { varde: uppgift.prioritet }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 tabnum", children: uppgift.prioritet })] })] }), oppen && ((0, jsx_runtime_1.jsx)(UppgiftRedigering, { uppgift: uppgift, kalendrar: kalendrar, onSpara: onSpara, onTaBort: onTaBort, onStang: onOppna, onOppnaMal: onOppnaMal, onSkapaLank: onSkapaLank }))] }));
}
/**
 * Redigeringen fälls ut i raden i stället för att öppna en panel.
 * En uppgift har fyra fält; att skicka iväg användaren till ett eget
 * fönster för dem vore mer ceremoni än innehåll.
 */
function UppgiftRedigering({ uppgift, kalendrar, onSpara, onTaBort, onStang, onOppnaMal, onSkapaLank, }) {
    const [form, setForm] = (0, react_1.useState)(uppgift);
    const satt = (delar) => setForm((f) => ({ ...f, ...delar }));
    const spara = () => {
        onSpara({ ...form, titel: form.titel.trim() || uppgift.titel });
        onStang();
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "border-t border-ink/20 bg-panel px-2.5 py-2.5 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", value: form.titel, onChange: (e) => satt({ titel: e.target.value }), onKeyDown: (e) => {
                    if (e.key === "Enter")
                        spara();
                    if (e.key === "Escape")
                        onStang();
                }, "aria-label": "Titel" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row md:flex-wrap md:items-end gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 block mb-1", children: "Styrka" }), (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad", children: typer_1.PRIORITETER.map((p) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex items-center gap-1.5", "data-aktiv": form.prioritet === p.varde ? "1" : "0", onClick: () => satt({ prioritet: p.varde }), title: p.namn, children: [(0, jsx_runtime_1.jsx)(Styrka, { varde: p.varde }), p.kort] }, p.varde))) })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Kalender" }), (0, jsx_runtime_1.jsx)("select", { className: "falt md:!w-auto", value: form.kalenderId, onChange: (e) => satt({ kalenderId: e.target.value }), children: kalendrar.map((k) => ((0, jsx_runtime_1.jsx)("option", { value: k.id, children: k.namn }, k.id))) })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Senast" }), (0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt tabnum md:!w-auto", value: form.forfaller ?? "", onChange: (e) => satt({ forfaller: e.target.value || null }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [form.forfaller && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => satt({ forfaller: null }), children: "Utan datum" })), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => satt({ forfaller: (0, tid_1.nyckel)((0, tid_1.addDagar)((0, tid_1.startAvDag)(new Date()), 1)) }), children: "Imorgon" })] })] }), (0, jsx_runtime_1.jsx)("textarea", { className: "falt resize-none", rows: 2, placeholder: "Anteckning \u2014 [[titel]] l\u00E4nkar till annat", value: form.anteckning, onChange: (e) => satt({ anteckning: e.target.value }) }), onOppnaMal && ((0, jsx_runtime_1.jsx)(Kopplingar_1.default, { id: uppgift.id, titel: uppgift.titel, text: form.anteckning, onOppnaMal: onOppnaMal, onSkapa: onSkapaLank })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: onTaBort, children: "Radera" }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: onStang, children: "Avbryt" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", "data-ton": "accent", onClick: spara, children: "Spara" })] })] }));
}
