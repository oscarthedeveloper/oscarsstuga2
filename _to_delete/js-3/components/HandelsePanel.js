"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HandelsePanel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Redigeringspanelen.
 *
 * Panelen är avsiktligt en enda kolumn utan flikar: allt som går att
 * ställa in syns på samma gång. Upprepningsreglerna är den enda delen som
 * viker ut sig, eftersom de flesta händelser inte har någon.
 *
 * När en händelse tillhör en serie frågar panelen ALLTID vad ändringen
 * skall gälla innan den sparar. Att gissa åt användaren här är det
 * snabbaste sättet att förstöra en kalender.
 */
const react_1 = require("react");
const typer_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/typer");
const Butik_1 = require("./Butik");
const Kopplingar_1 = __importDefault(require("./Kopplingar"));
const upprepning_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/upprepning");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const FREKVENSER = [
    { id: "ingen", namn: "Upprepas inte" },
    { id: "daglig", namn: "Varje dag" },
    { id: "vardag", namn: "Varje vardag (mån–fre)" },
    { id: "veckovis", namn: "Varje vecka" },
    { id: "manadsvis", namn: "Varje månad" },
    { id: "arlig", namn: "Varje år" },
];
function HandelsePanel({ forekomst, utkast, onStang, onOppnaMal, onSkapaLank, }) {
    const { kalendrar, sparaHandelse, radera, skapa } = (0, Butik_1.useButik)();
    const titelRef = (0, react_1.useRef)(null);
    const arNy = !forekomst;
    const grund = (0, react_1.useMemo)(() => {
        if (forekomst) {
            // Formuläret arbetar på FÖREKOMSTENS tider, inte på seriens första
            // tillfälle — annars ser användaren fel datum när hen öppnar en
            // upprepad händelse längre fram.
            return {
                ...forekomst.handelse,
                start: (0, tid_1.stampel)(forekomst.start),
                slut: (0, tid_1.stampel)(forekomst.slut),
            };
        }
        return {
            id: "",
            titel: "",
            anteckning: "",
            plats: "",
            start: utkast?.start ?? (0, tid_1.stampel)(new Date()),
            slut: utkast?.slut ?? (0, tid_1.stampel)(new Date()),
            heldag: !!utkast?.heldag,
            kalenderId: utkast?.kalenderId ?? kalendrar[0]?.id ?? "arbete",
            upprepning: null,
            undantag: [],
            avvikelser: {},
            skapad: new Date().toISOString(),
            // Synkfälten sätts på riktigt av butiken när posten sparas; här
            // behöver de bara finnas för att formuläret skall ha en hel post.
            andrad: new Date().toISOString(),
            raderad: null,
            synkad: false,
        };
    }, [forekomst, utkast, kalendrar]);
    const [form, setForm] = (0, react_1.useState)(grund);
    const [visaRackvidd, setVisaRackvidd] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => setForm(grund), [grund]);
    (0, react_1.useEffect)(() => {
        const id = window.setTimeout(() => titelRef.current?.focus(), 30);
        return () => window.clearTimeout(id);
    }, []);
    const arSerie = !!forekomst?.handelse.upprepning &&
        forekomst.handelse.upprepning.frekvens !== "ingen";
    const start = (0, tid_1.tolka)(form.start);
    const slut = (0, tid_1.tolka)(form.slut);
    const langdMin = Math.max(0, Math.round((slut.getTime() - start.getTime()) / 60000));
    const satt = (delar) => setForm((f) => ({ ...f, ...delar }));
    /** Flyttar slutet med när starten ändras, så längden hålls konstant. */
    const sattStart = (varde) => {
        const nyStart = (0, tid_1.tolka)(varde);
        const nySlut = new Date(nyStart.getTime() + langdMin * 60000);
        satt({ start: (0, tid_1.stampel)(nyStart), slut: (0, tid_1.stampel)(nySlut) });
    };
    const sattSlut = (varde) => {
        const nySlut = (0, tid_1.tolka)(varde);
        if (nySlut <= start) {
            // Ett slut före starten är alltid ett misstag; lägg det en kvart efter.
            satt({ slut: (0, tid_1.stampel)(new Date(start.getTime() + 15 * 60000)) });
            return;
        }
        satt({ slut: (0, tid_1.stampel)(nySlut) });
    };
    const sattUpprepning = (delar) => {
        const bas = form.upprepning ?? {
            ...upprepning_1.STANDARD_UPPREPNING,
            veckodagar: [start.getDay()],
        };
        const ny = { ...bas, ...delar };
        satt({ upprepning: ny.frekvens === "ingen" ? null : ny });
    };
    const spara = (rackvidd) => {
        if (arNy) {
            skapa({ ...form, id: undefined });
        }
        else {
            sparaHandelse(form, forekomst, rackvidd);
        }
        onStang();
    };
    const utfor = () => {
        if (!arNy && arSerie) {
            setVisaRackvidd("spara");
            return;
        }
        spara("alla");
    };
    const raderaNu = (rackvidd) => {
        if (forekomst)
            radera(forekomst, rackvidd);
        onStang();
    };
    const u = form.upprepning;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "panel-overlay", onClick: onStang }), (0, jsx_runtime_1.jsxs)("aside", { className: "redigeringspanel", role: "dialog", "aria-label": arNy ? "Ny händelse" : "Redigera händelse", onKeyDown: (e) => {
                    if (e.key === "Escape")
                        onStang();
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                        utfor();
                }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 bg-ink text-paper px-3 h-[34px] flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro", children: arNy ? "Ny händelse" : "Händelse" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onStang, className: "micro hover:text-accent transition-colors", "aria-label": "St\u00E4ng", children: "St\u00E4ng \u2715" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll p-3 flex flex-col gap-3", children: [(0, jsx_runtime_1.jsx)("input", { ref: titelRef, className: "falt !text-base !py-2", placeholder: "Vad g\u00E4ller saken?", value: form.titel, onChange: (e) => satt({ titel: e.target.value }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "pico opacity-60 block mb-1", children: "Kalender" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1", children: kalendrar.map((k) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex items-center gap-1.5", "data-aktiv": form.kalenderId === k.id ? "1" : "0", onClick: () => satt({ kalenderId: k.id }), title: typer_1.TON_NAMN[k.ton], children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2 h-2 border border-current", style: { background: `var(--kal-${k.ton + 1})` } }), k.namn] }, k.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "border border-ink p-2.5 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-60", children: "Tid" }), (0, jsx_runtime_1.jsxs)("label", { className: "pico flex items-center gap-1.5 cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: "accent-[color:var(--accent)]", checked: form.heldag, onChange: (e) => {
                                                            const heldag = e.target.checked;
                                                            if (heldag) {
                                                                const d0 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                                                                satt({
                                                                    heldag,
                                                                    start: (0, tid_1.stampel)(d0),
                                                                    slut: (0, tid_1.stampel)(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1)),
                                                                });
                                                            }
                                                            else {
                                                                const d9 = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9);
                                                                satt({
                                                                    heldag,
                                                                    start: (0, tid_1.stampel)(d9),
                                                                    slut: (0, tid_1.stampel)(new Date(d9.getTime() + 3600000)),
                                                                });
                                                            }
                                                        } }), "Heldag"] })] }), form.heldag ? ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-2", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Fr\u00E5n" }), (0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt tabnum", value: (0, tid_1.nyckel)(start), onChange: (e) => sattStart(`${e.target.value}T00:00`) })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Till och med" }), (0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt tabnum", value: (0, tid_1.nyckel)(new Date(slut.getTime() - 60000)), onChange: (e) => {
                                                            const d = (0, tid_1.tolka)(e.target.value);
                                                            satt({
                                                                slut: (0, tid_1.stampel)(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)),
                                                            });
                                                        } })] })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[1fr_auto] gap-2 items-end", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "B\u00F6rjar" }), (0, jsx_runtime_1.jsx)("input", { type: "datetime-local", className: "falt tabnum", value: form.start, onChange: (e) => sattStart(e.target.value) })] }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 pb-2 tabnum", children: (0, tid_1.minuterTillText)(langdMin) })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Slutar" }), (0, jsx_runtime_1.jsx)("input", { type: "datetime-local", className: "falt tabnum", value: form.slut, onChange: (e) => sattSlut(e.target.value) })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1", children: [15, 30, 45, 60, 90, 120].map((m) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": langdMin === m ? "1" : "0", onClick: () => satt({ slut: (0, tid_1.stampel)(new Date(start.getTime() + m * 60000)) }), children: m < 60 ? `${m} min` : `${m / 60} h` }, m))) })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "border border-ink p-2.5 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-60", children: "Upprepning" }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 text-right", children: (0, upprepning_1.beskrivUpprepning)(u, start) })] }), (0, jsx_runtime_1.jsx)("select", { className: "falt", value: u?.frekvens ?? "ingen", onChange: (e) => sattUpprepning({ frekvens: e.target.value }), children: FREKVENSER.map((f) => ((0, jsx_runtime_1.jsx)("option", { value: f.id, children: f.namn }, f.id))) }), u && u.frekvens !== "ingen" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [u.frekvens !== "vardag" && ((0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 shrink-0", children: "Var" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 99, className: "falt tabnum !w-16", value: u.intervall, onChange: (e) => sattUpprepning({
                                                            intervall: Math.max(1, Number(e.target.value) || 1),
                                                        }) }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: u.frekvens === "daglig"
                                                            ? "dag"
                                                            : u.frekvens === "veckovis"
                                                                ? "vecka"
                                                                : u.frekvens === "manadsvis"
                                                                    ? "månad"
                                                                    : "år" })] })), u.frekvens === "veckovis" && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 block mb-1", children: "P\u00E5 dagarna" }), (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad", children: [1, 2, 3, 4, 5, 6, 0].map((v) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex-1", "data-aktiv": u.veckodagar.includes(v) ? "1" : "0", onClick: () => {
                                                                const har = u.veckodagar.includes(v);
                                                                const nya = har
                                                                    ? u.veckodagar.filter((x) => x !== v)
                                                                    : [...u.veckodagar, v];
                                                                // Minst en dag måste vara vald, annars har
                                                                // regeln ingen mening.
                                                                sattUpprepning({
                                                                    veckodagar: nya.length ? nya : [v],
                                                                });
                                                            }, children: [tid_1.VECKODAGAR_KORT[v][0], tid_1.VECKODAGAR_KORT[v][1]] }, v))) })] })), u.frekvens === "manadsvis" && ((0, jsx_runtime_1.jsxs)("div", { className: "knapp-rad", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex-1", "data-aktiv": u.manadslage === "dag-i-manad" ? "1" : "0", onClick: () => sattUpprepning({ manadslage: "dag-i-manad" }), children: ["Den ", start.getDate(), ":e"] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex-1", "data-aktiv": u.manadslage === "veckodag-i-manad" ? "1" : "0", onClick: () => sattUpprepning({ manadslage: "veckodag-i-manad" }), children: [(0, upprepning_1.veckoNummerIManad)(start) === -1
                                                                ? "Sista"
                                                                : `${(0, upprepning_1.veckoNummerIManad)(start)}:a`, " ", tid_1.VECKODAGAR_KORT[start.getDay()].toLowerCase()] })] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 block mb-1", children: "Slutar" }), (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad mb-1.5", children: [
                                                            ["aldrig", "Aldrig"],
                                                            ["datum", "Vid datum"],
                                                            ["antal", "Efter antal"],
                                                        ].map(([typ, namn]) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico flex-1", "data-aktiv": u.slut.typ === typ ? "1" : "0", onClick: () => sattUpprepning({
                                                                slut: typ === "aldrig"
                                                                    ? { typ: "aldrig" }
                                                                    : typ === "datum"
                                                                        ? {
                                                                            typ: "datum",
                                                                            datum: (0, tid_1.nyckel)(new Date(start.getFullYear() + 1, start.getMonth(), start.getDate())),
                                                                        }
                                                                        : { typ: "antal", antal: 10 },
                                                            }), children: namn }, typ))) }), u.slut.typ === "datum" && ((0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt tabnum", value: u.slut.datum, onChange: (e) => sattUpprepning({
                                                            slut: { typ: "datum", datum: e.target.value },
                                                        }) })), u.slut.typ === "antal" && ((0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 999, className: "falt tabnum !w-20", value: u.slut.antal, onChange: (e) => sattUpprepning({
                                                                    slut: {
                                                                        typ: "antal",
                                                                        antal: Math.max(1, Number(e.target.value) || 1),
                                                                    },
                                                                }) }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "g\u00E5nger" })] }))] })] }))] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Plats" }), (0, jsx_runtime_1.jsx)("input", { className: "falt", value: form.plats, onChange: (e) => satt({ plats: e.target.value }), placeholder: "Rum, adress eller l\u00E4nk" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Anteckning" }), (0, jsx_runtime_1.jsx)("textarea", { className: "falt resize-none", rows: 4, value: form.anteckning, onChange: (e) => satt({ anteckning: e.target.value }), placeholder: "Skriv [[titel]] f\u00F6r att l\u00E4nka till en anteckning, en uppgift eller en annan h\u00E4ndelse." })] }), (0, jsx_runtime_1.jsx)(Kopplingar_1.default, { id: form.id, titel: form.titel, text: form.anteckning, onOppnaMal: onOppnaMal, onSkapa: onSkapaLank }), forekomst && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-45 leading-relaxed", children: [(0, tid_1.langtDatum)(forekomst.start), " \u00B7 ", (0, tid_1.klocka)(forekomst.start), "\u2013", (0, tid_1.klocka)(forekomst.slut), arSerie && " · del av en serie"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-t border-ink p-2.5 flex items-center gap-2", children: [!arNy && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: () => (arSerie ? setVisaRackvidd("radera") : raderaNu("alla")), children: "Radera" })), (0, jsx_runtime_1.jsx)("div", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: onStang, children: "Avbryt" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", "data-ton": "accent", onClick: utfor, disabled: form.titel.trim().length === 0, children: arNy ? "Skapa" : "Spara" })] }), visaRackvidd && ((0, jsx_runtime_1.jsx)(RackviddsFraga, { avsikt: visaRackvidd, onVal: (r) => {
                            setVisaRackvidd(null);
                            if (visaRackvidd === "spara")
                                spara(r);
                            else
                                raderaNu(r);
                        }, onAvbryt: () => setVisaRackvidd(null) }))] })] }));
}
/**
 * Frågan som alltid ställs innan en serie ändras. Tre val, inget
 * förvalt — det finns inget säkert standardsvar.
 */
function RackviddsFraga({ avsikt, onVal, onAvbryt, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-[rgb(17_17_17/0.45)] flex items-center justify-center p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink p-3 w-full max-w-[300px]", style: { ["--cf"]: "7px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsxs)("p", { className: "micro mb-1", children: [avsikt === "radera" ? "Radera" : "Spara", " \u2014 vad skall det g\u00E4lla?"] }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-55 mb-2.5 leading-relaxed", children: "H\u00E4ndelsen ing\u00E5r i en serie." }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [[
                            ["denna", "Endast denna händelse"],
                            ["framat", "Denna och alla senare"],
                            ["alla", "Hela serien"],
                        ].map(([r, namn]) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro text-left", onClick: () => onVal(r), children: namn }, r))), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico mt-1 opacity-70", onClick: onAvbryt, children: "Avbryt" })] })] }) }));
}
