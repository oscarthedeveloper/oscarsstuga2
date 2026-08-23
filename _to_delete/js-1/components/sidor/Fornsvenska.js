"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Fornsvenska;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Fornsvenska — egenstudier.
 *
 * Sidan svarar på EN fråga överst: vad återstår att skaffa fram. Därför
 * ligger mätarpanelen först och registret direkt under; att göra och
 * idéer är småsaker vid sidan av och tar höger spalt.
 *
 * "Avancerat" byggs här av täthet och precision, inte av nya färger.
 * Varje verk bär en kort stabil kod, läget visas som en treställig
 * mätare, och registret är en tabellik lista som fälls ut till ett
 * formulär när man öppnar en rad. Ett sken eller en accentfärg till
 * hade sett modernt ut i en skärmdump och som en gäst i appen.
 */
const react_1 = require("react");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const fornsvenska_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/fornsvenska");
const Avsnitt_1 = __importDefault(require("./block/Avsnitt"));
const VILA_MS = 600;
const samma = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function Fornsvenska({ sida, spara, }) {
    const utifran = (0, react_1.useMemo)(() => (0, fornsvenska_1.tolkaFsvData)(sida?.data), [sida]);
    const [form, setForm] = (0, react_1.useState)(utifran);
    const rord = (0, react_1.useRef)(false);
    const formRef = (0, react_1.useRef)(form);
    formRef.current = form;
    const andra = (0, react_1.useCallback)((f) => {
        rord.current = true;
        setForm(f);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!rord.current)
            return;
        if (samma(form, utifran)) {
            rord.current = false;
            return;
        }
        const id = window.setTimeout(() => {
            rord.current = false;
            spara(form);
        }, VILA_MS);
        return () => window.clearTimeout(id);
    }, [form, utifran, spara]);
    (0, react_1.useEffect)(() => {
        if (rord.current)
            return;
        if (!samma(utifran, formRef.current))
            setForm(utifran);
    }, [utifran]);
    /* ---------------------------------------------------------------
       Registret
       --------------------------------------------------------------- */
    const [fraga, setFraga] = (0, react_1.useState)("");
    const [filter, setFilter] = (0, react_1.useState)(null);
    const [oppet, setOppet] = (0, react_1.useState)(null);
    const raknat = (0, react_1.useMemo)(() => (0, fornsvenska_1.rakna)(form), [form]);
    const synliga = (0, react_1.useMemo)(() => (0, fornsvenska_1.sorteraVerk)((0, fornsvenska_1.filtreraVerk)(form, fraga, filter)), [form, fraga, filter]);
    const nyttVerk = () => {
        const nummer = (0, fornsvenska_1.nastaLedigaKod)(form);
        const id = (0, butik_1.nyId)();
        andra((d) => ({
            ...d,
            nastaKod: nummer + 1,
            verk: [
                ...d.verk,
                {
                    id,
                    kod: (0, fornsvenska_1.formateraKod)(nummer),
                    titel: "",
                    forfattare: "",
                    slag: "",
                    ar: "",
                    lage: "behovs",
                    plats: "",
                    url: "",
                    anteckning: "",
                },
            ],
        }));
        setFilter(null);
        setFraga("");
        setOppet(id);
    };
    const andraVerk = (id, delar) => andra((d) => ({
        ...d,
        verk: d.verk.map((v) => (v.id === id ? { ...v, ...delar } : v)),
    }));
    const taBortVerk = (id) => andra((d) => ({ ...d, verk: d.verk.filter((v) => v.id !== id) }));
    /* ---------------------------------------------------------------
       Att göra och idéer
       --------------------------------------------------------------- */
    const [nySyssla, setNySyssla] = (0, react_1.useState)("");
    const [nyIde, setNyIde] = (0, react_1.useState)("");
    const [visaKlara, setVisaKlara] = (0, react_1.useState)(false);
    const laggSyssla = () => {
        const t = nySyssla.trim();
        if (!t)
            return;
        andra((d) => ({
            ...d,
            sysslor: [...d.sysslor, { id: (0, butik_1.nyId)(), text: t, klar: false }],
        }));
        setNySyssla("");
    };
    const laggIde = () => {
        const t = nyIde.trim();
        if (!t)
            return;
        andra((d) => ({
            ...d,
            ideer: [
                {
                    id: (0, butik_1.nyId)(),
                    text: t,
                    skapad: (0, tid_1.nyckel)((0, tid_1.startAvDag)(new Date())),
                    anvand: false,
                },
                ...d.ideer,
            ],
        }));
        setNyIde("");
    };
    const sysslorKvar = form.sysslor.filter((s) => !s.klar).length;
    const synligaSysslor = form.sysslor.filter((s) => visaKlara || !s.klar);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 overflow-y-auto tunnskroll", children: [(0, jsx_runtime_1.jsxs)("div", { className: "matarpanel", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Beh\u00F6vs" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", "data-atgard": raknat.behovs > 0 ? "1" : "0", children: raknat.behovs })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Har" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: raknat.har })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "L\u00E4st" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: raknat.last })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-[9rem]", children: [(0, jsx_runtime_1.jsxs)("span", { className: "matarnamn", children: ["Registret \u2014 ", raknat.totalt, " ", raknat.totalt === 1 ? "verk" : "verk", ",", " ", Math.round((0, fornsvenska_1.andelLast)(raknat) * 100), " % genomarbetat"] }), (0, jsx_runtime_1.jsx)("span", { className: "andelsstapel", role: "img", "aria-label": `${raknat.behovs} behövs, ${raknat.har} har, ${raknat.last} lästa`, children: raknat.totalt > 0 &&
                                    fornsvenska_1.LAGEN.map((l) => ((0, jsx_runtime_1.jsx)("span", { "data-lage": l.id, style: { flexGrow: raknat[l.id], flexBasis: 0 } }, l.id))) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] max-w-[1240px]", children: [(0, jsx_runtime_1.jsx)("div", { className: "min-w-0", children: (0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: "Litteratur", bihang: "L\u00E4romedel, utg\u00E5vor, examensarbeten, avhandlingar", atgard: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", "data-ton": "accent", onClick: nyttVerk, children: "+ Verk" }), children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-ink/15 px-2.5 py-2 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "S\u00F6k titel, f\u00F6rfattare, slag, plats eller kod", value: fraga, onChange: (e) => setFraga(e.target.value), "aria-label": "S\u00F6k i registret" }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad items-center", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico", "data-aktiv": filter === null ? "1" : "0", onClick: () => setFilter(null), children: ["Alla ", raknat.totalt] }), fornsvenska_1.LAGEN.map((l) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico", "data-aktiv": filter === l.id ? "1" : "0", onClick: () => setFilter(filter === l.id ? null : l.id), children: [l.namn, " ", raknat[l.id]] }, l.id)))] })] }), synliga.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-5 leading-relaxed", children: form.verk.length === 0
                                        ? "Registret är tomt. Tryck + Verk och skriv in det första — titel räcker för att börja, resten kan fyllas i när du hittat den."
                                        : "Inget i registret matchar. Pröva ett annat ord eller ta bort filtret." })) : (synliga.map((v) => ((0, jsx_runtime_1.jsx)(Verkrad, { verk: v, oppen: oppet === v.id, onOppna: () => setOppet(oppet === v.id ? null : v.id), onAndra: (delar) => andraVerk(v.id, delar), onTaBort: () => {
                                        setOppet(null);
                                        taBortVerk(v.id);
                                    } }, v.id))))] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2.5 md:gap-3 min-w-0", children: [(0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: "Att g\u00F6ra", bihang: "Hemsidan", atgard: (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-45 tabnum shrink-0", children: [sysslorKvar, " kvar"] }), children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 py-2 border-b border-ink/15 flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Vad beh\u00F6ver g\u00F6ras?", value: nySyssla, onChange: (e) => setNySyssla(e.target.value), onKeyDown: (e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        laggSyssla();
                                                    }
                                                }, "aria-label": "Ny syssla" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: laggSyssla, disabled: nySyssla.trim().length === 0, "aria-label": "L\u00E4gg till", children: "+" })] }), synligaSysslor.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: form.sysslor.length === 0
                                            ? "Inga sysslor. Listan är egen för sidan och rör inte appens uppgifter."
                                            : "Allt avbockat." })) : (synligaSysslor.map((s) => ((0, jsx_runtime_1.jsxs)("div", { className: "uppgift flex items-start gap-2 px-2.5 py-2", "data-klar": s.klar ? "1" : "0", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "uppgift-bockyta shrink-0", onClick: () => andra((d) => ({
                                                    ...d,
                                                    sysslor: d.sysslor.map((x) => x.id === s.id ? { ...x, klar: !x.klar } : x),
                                                })), "aria-label": s.klar ? "Ångra avbockning" : "Bocka av", "aria-pressed": s.klar, children: (0, jsx_runtime_1.jsx)("span", { className: "uppgift-bock", "data-klar": s.klar ? "1" : "0", children: s.klar ? "✕" : "" }) }), (0, jsx_runtime_1.jsx)("span", { className: "uppgift-titel flex-1 min-w-0", children: s.text }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp shrink-0", onClick: () => andra((d) => ({
                                                    ...d,
                                                    sysslor: d.sysslor.filter((x) => x.id !== s.id),
                                                })), "aria-label": "Ta bort sysslan", children: "\u2715" })] }, s.id)))), form.sysslor.some((s) => s.klar) && ((0, jsx_runtime_1.jsx)("div", { className: "px-2.5 py-1.5 border-t border-ink/15", children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": visaKlara ? "1" : "0", onClick: () => setVisaKlara((v) => !v), children: "Visa klara" }) }))] }), (0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: "Id\u00E9er", bihang: "F\u00E5ngas nu, sorteras sedan", atgard: (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 tabnum shrink-0", children: form.ideer.filter((i) => !i.anvand).length }), children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 py-2 border-b border-ink/15 flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "En id\u00E9\u2026", value: nyIde, onChange: (e) => setNyIde(e.target.value), onKeyDown: (e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        laggIde();
                                                    }
                                                }, "aria-label": "Ny id\u00E9" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: laggIde, disabled: nyIde.trim().length === 0, "aria-label": "F\u00E5nga id\u00E9n", children: "+" })] }), form.ideer.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: "Inga id\u00E9er f\u00E5ngade. Skriv ned den innan den hinner bli bortgl\u00F6md \u2014 sorteringen kan v\u00E4nta." })) : (form.ideer.map((i) => ((0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 py-2 border-b border-ink/10 last:border-b-0 flex items-start gap-2", style: i.anvand ? { opacity: 0.45 } : undefined, children: [(0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[0.78rem] leading-relaxed", style: i.anvand ? { textDecoration: "line-through" } : undefined, children: i.text }), i.skapad && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-40 tabnum block mt-0.5", children: i.skapad }))] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp shrink-0", onClick: () => andra((d) => ({
                                                    ...d,
                                                    ideer: d.ideer.map((x) => x.id === i.id ? { ...x, anvand: !x.anvand } : x),
                                                })), "aria-label": i.anvand ? "Återöppna idén" : "Markera som använd", title: i.anvand ? "Återöppna" : "Använd", children: i.anvand ? "↺" : "✓" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp shrink-0", onClick: () => andra((d) => ({
                                                    ...d,
                                                    ideer: d.ideer.filter((x) => x.id !== i.id),
                                                })), "aria-label": "Ta bort id\u00E9n", children: "\u2715" })] }, i.id))))] })] })] })] }));
}
/* ==================================================================
   EN RAD I REGISTRET
   ================================================================== */
function Verkrad({ verk, oppen, onOppna, onAndra, onTaBort, }) {
    const fylld = (0, fornsvenska_1.lagesIndex)(verk.lage);
    const meta = [verk.forfattare, verk.slag, verk.ar, verk.plats].filter(Boolean);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "verkrad", "data-oppen": oppen ? "1" : "0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "lagesmatare shrink-0 mt-1", "data-lage": verk.lage, onClick: () => onAndra({ lage: (0, fornsvenska_1.nastaLage)(verk.lage) }), "aria-label": `Läge: ${fornsvenska_1.LAGEN[fylld].namn}. Tryck för nästa.`, title: `${fornsvenska_1.LAGEN[fylld].namn} — tryck för nästa läge`, children: fornsvenska_1.LAGEN.map((l, i) => ((0, jsx_runtime_1.jsx)("span", { "data-fylld": i <= fylld ? "1" : "0" }, l.id))) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "flex-1 min-w-0 text-left", onClick: onOppna, children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-baseline gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "kodmarke", children: verk.kod }), (0, jsx_runtime_1.jsx)("span", { className: "verktitel flex-1 min-w-0", children: verk.titel || "Utan titel" })] }), meta.length > 0 && ((0, jsx_runtime_1.jsx)("span", { className: "verkmeta pico opacity-50 block mt-0.5", children: meta.map((m) => ((0, jsx_runtime_1.jsx)("span", { children: m }, m))) }))] }), verk.url && ((0, jsx_runtime_1.jsx)("a", { href: verk.url, target: "_blank", rel: "noreferrer noopener", className: "blockknapp shrink-0", onClick: (e) => e.stopPropagation(), "aria-label": "\u00D6ppna l\u00E4nken", title: verk.url, children: "\u2197" }))] }), oppen && ((0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 pb-3 flex flex-col gap-2 border-t border-ink/10 pt-2.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt flex-1", placeholder: "Titel", value: verk.titel, onChange: (e) => onAndra({ titel: e.target.value }), "aria-label": "Titel", autoFocus: true }), (0, jsx_runtime_1.jsx)("input", { className: "falt md:!w-[12rem]", placeholder: "F\u00F6rfattare", value: verk.forfattare, onChange: (e) => onAndra({ forfattare: e.target.value }), "aria-label": "F\u00F6rfattare" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt flex-1", placeholder: "Slag \u2014 examensarbete, doktorsavhandling, l\u00E4romedel\u2026", value: verk.slag, onChange: (e) => onAndra({ slag: e.target.value }), "aria-label": "Slag" }), (0, jsx_runtime_1.jsx)("input", { className: "falt md:!w-[7rem]", placeholder: "\u00C5r", value: verk.ar, onChange: (e) => onAndra({ ar: e.target.value }), "aria-label": "\u00C5r" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt md:!w-[13rem]", placeholder: "Var den finns \u2014 DiVA, Libris, antikvariat\u2026", value: verk.plats, onChange: (e) => onAndra({ plats: e.target.value }), "aria-label": "Var den finns" }), (0, jsx_runtime_1.jsx)("input", { className: "falt flex-1", placeholder: "https://\u2026", inputMode: "url", value: verk.url, onChange: (e) => onAndra({ url: e.target.value }), onBlur: (e) => onAndra({ url: (0, fornsvenska_1.trygsamUrl)(e.target.value) }), "aria-label": "L\u00E4nk" })] }), (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 2, placeholder: "Anteckning", value: verk.anteckning, onChange: (e) => onAndra({ anteckning: e.target.value }), "aria-label": "Anteckning" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "K\u00E4llh\u00E4nvisning" }), (0, jsx_runtime_1.jsx)("p", { className: "hanvisning", children: (0, fornsvenska_1.kallhanvisning)(verk) || "Fyll i fälten ovan så byggs den här." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "knapp-rad", children: fornsvenska_1.LAGEN.map((l) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": verk.lage === l.id ? "1" : "0", onClick: () => onAndra({ lage: l.id }), children: l.namn }, l.id))) }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => {
                                    if (window.confirm(`Ta bort ${verk.kod}${verk.titel ? ` — ${verk.titel}` : ""}? Går att ångra med ⌘Z.`)) {
                                        onTaBort();
                                    }
                                }, children: "Radera" })] })] }))] }));
}
