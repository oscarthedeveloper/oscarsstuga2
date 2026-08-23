"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Sprak;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Språkbiblioteket.
 *
 * Hylla → mapp → blad → block. Fyra nivåer är djupt, och det är därför
 * brödsmulan inte är dekoration utan det enda som talar om var man är —
 * särskilt på en telefon, där varje nivå ersätter den föregående.
 *
 * TVÅ LAGERPOSTER, inte en. Texten ligger i `sprak`, omslagsbilderna i
 * `sprak-omslag`. Sidan sparas medan man skriver, och låg bilderna i
 * samma post skulle varenda omslag skickas upp på nytt vid varje
 * tangenttryckning i en anteckning — på ett mobilnät är det skillnaden
 * mellan en app som fungerar och en som inte gör det. `Sida`-entiteten
 * tar godtyckliga id:n, så delningen kostar ingen ny maskineri.
 */
const react_1 = require("react");
const Butik_1 = require("../Butik");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const anvandMedia_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/anvandMedia");
const bild_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/bild");
const sprak_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/sprak");
const markering_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/markering");
const Blockredigerare_1 = __importDefault(require("./block/Blockredigerare"));
const Mappikon_1 = __importDefault(require("./block/Mappikon"));
const Bladtrad_1 = __importDefault(require("./block/Bladtrad"));
const VILA_MS = 600;
const OMSLAGSPOST = "sprak-omslag";
const samma = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function Sprak({ sida, spara, }) {
    const butik = (0, Butik_1.useButik)();
    const mobil = (0, anvandMedia_1.useMobil)();
    const utifran = (0, react_1.useMemo)(() => (0, sprak_1.tolkaSprakData)(sida?.data), [sida]);
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
    /* Omslagen — egen post, skrivs direkt. Man byter omslag sällan, så
       det finns ingenting att fördröja. */
    const omslag = (0, react_1.useMemo)(() => (0, sprak_1.tolkaOmslag)(butik.sidaMed(OMSLAGSPOST)?.data), [butik]);
    const sattOmslag = (0, react_1.useCallback)((mappId, url) => {
        const nya = { ...omslag };
        if (url)
            nya[mappId] = url;
        else
            delete nya[mappId];
        butik.sparaSida(OMSLAGSPOST, nya);
    }, [butik, omslag]);
    /* ---------------------------------------------------------------
       Var är vi?
       --------------------------------------------------------------- */
    const [mappId, setMappId] = (0, react_1.useState)(null);
    const [bladId, setBladId] = (0, react_1.useState)(null);
    /* Vilken hylla som har sin inställningspanel utfälld, och vilka som
       visar alla sina mappar i stället för en rad. */
    const [hanterarId, setHanterarId] = (0, react_1.useState)(null);
    /*
     * Läsläge eller redigeringsläge.
     *
     * Läget hör till SESSIONEN och inte till bladet. Är man mitt i en
     * skrivstund skall ett byte från Dativ till Genitiv inte kasta
     * tillbaka en till läsläge vid varje klick i trädet. Vid omladdning
     * börjar man däremot i läsläge — det är så man oftast öppnar ett blad.
     */
    const [redigerar, setRedigerar] = (0, react_1.useState)(false);
    const [utfallda, setUtfallda] = (0, react_1.useState)([]);
    const mapp = (0, sprak_1.mappMed)(form, mappId);
    const blad = (0, sprak_1.bladMed)(form, bladId);
    /* Hyllan följer av den öppnade mappen. Att också ha ett valt språk
       vore två sanningar om var man är, och de skulle glida isär. */
    const hylla = mapp ? (0, sprak_1.hyllaMed)(form, mapp.hyllaId) : null;
    // Pekar valet på något som inte längre finns — raderat här eller på en
    // annan enhet — backar vi ut i stället för att visa en tom yta.
    (0, react_1.useEffect)(() => {
        if (mappId && !(0, sprak_1.mappMed)(form, mappId)) {
            setMappId(null);
            setBladId(null);
        }
        else if (bladId && !(0, sprak_1.bladMed)(form, bladId)) {
            setBladId(null);
        }
    }, [form, mappId, bladId]);
    const bladen = mapp ? (0, sprak_1.bladI)(form, mapp.id) : [];
    /* ---------------------------------------------------------------
       Ändringar
       --------------------------------------------------------------- */
    const nyHylla = () => {
        const id = (0, butik_1.nyId)();
        andra((d) => ({
            ...d,
            hyllor: [
                ...d.hyllor,
                { id, namn: "Nytt språk", ton: (0, sprak_1.klamTon)(d.hyllor.length) },
            ],
        }));
        // Panelen fälls ut direkt: en hylla som heter "Nytt språk" är inte
        // klar, och att behöva leta rätt på var man byter namn är onödigt.
        setHanterarId(id);
    };
    const andraHylla = (id, delar) => andra((d) => ({
        ...d,
        hyllor: d.hyllor.map((h) => (h.id === id ? { ...h, ...delar } : h)),
    }));
    const nyMapp = (hyllaId) => {
        const id = (0, butik_1.nyId)();
        andra((d) => ({
            ...d,
            mappar: [...d.mappar, { id, hyllaId, titel: "Ny mapp", bihang: "" }],
        }));
        setMappId(id);
        setBladId(null);
    };
    const andraMapp = (id, delar) => andra((d) => ({
        ...d,
        mappar: d.mappar.map((m) => (m.id === id ? { ...m, ...delar } : m)),
    }));
    const nyttBlad = () => {
        if (!mapp)
            return;
        const id = (0, butik_1.nyId)();
        andra((d) => ({
            ...d,
            blad: [
                ...d.blad,
                {
                    id,
                    mappId: mapp.id,
                    titel: "Nytt blad",
                    underrubrik: "",
                    utkast: true,
                    block: [],
                },
            ],
        }));
        setBladId(id);
        // Ett tomt blad har ingenting att läsa.
        setRedigerar(true);
    };
    const andraBlad = (id, delar) => andra((d) => ({
        ...d,
        blad: d.blad.map((b) => (b.id === id ? { ...b, ...delar } : b)),
    }));
    /* Escape lämnar redigeringsläget — men inte medan man skriver i ett
       fält, där tangenten ofta betyder något annat för webbläsaren. */
    (0, react_1.useEffect)(() => {
        if (!redigerar)
            return;
        const paTangent = (e) => {
            if (e.key !== "Escape")
                return;
            const mal = e.target;
            if (mal &&
                (mal.tagName === "INPUT" ||
                    mal.tagName === "TEXTAREA" ||
                    mal.tagName === "SELECT")) {
                return;
            }
            setRedigerar(false);
        };
        window.addEventListener("keydown", paTangent);
        return () => window.removeEventListener("keydown", paTangent);
    }, [redigerar]);
    /* ---------------------------------------------------------------
       Omslagsval
       --------------------------------------------------------------- */
    const filRef = (0, react_1.useRef)(null);
    const [bildfel, setBildfel] = (0, react_1.useState)(null);
    const [laddar, setLaddar] = (0, react_1.useState)(false);
    const valjOmslag = async (fil) => {
        if (!fil || !mapp)
            return;
        setBildfel(null);
        setLaddar(true);
        try {
            sattOmslag(mapp.id, await (0, bild_1.krympBild)(fil));
        }
        catch (e) {
            setBildfel(e instanceof bild_1.Bildfel ? e.message : "Bilden gick inte att läsa.");
        }
        finally {
            setLaddar(false);
            if (filRef.current)
                filRef.current.value = "";
        }
    };
    /* ---------------------------------------------------------------
       Ritning
       --------------------------------------------------------------- */
    /* --- Nivå 1: alla hyllor, en rad var --- */
    if (!mapp) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "h-full min-h-0 flex flex-col", children: (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll p-2.5 md:p-3", children: form.hyllor.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3 items-start", children: [(0, jsx_runtime_1.jsx)(Tomruta, { rubrik: "Inga spr\u00E5k \u00E4nnu", text: "Varje spr\u00E5k f\u00E5r en egen hylla \u2014 en rad med sina mappar. Italienska, tyska, svenska, engelska." }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: nyHylla, children: "+ Spr\u00E5k" })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-5 md:gap-6", children: [form.hyllor.map((h) => {
                            const hyllansMappar = (0, sprak_1.mapparI)(form, h.id);
                            const utfalld = utfallda.includes(h.id);
                            return ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "hyllhuvud", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2.5 h-2.5 border border-ink shrink-0 self-center", style: { background: `var(--kal-${h.ton + 1})` }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("h2", { className: "micro", children: h.namn || "Namnlöst" }), (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-45 tabnum shrink-0", children: [hyllansMappar.length, " ", hyllansMappar.length === 1 ? "mapp" : "mappar"] }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), hyllansMappar.length > 4 && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "pico underline opacity-55 hover:opacity-100 shrink-0", onClick: () => setUtfallda((u) => utfalld ? u.filter((x) => x !== h.id) : [...u, h.id]), children: utfalld ? "visa rad" : "visa alla" })), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => nyMapp(h.id), children: "+ Mapp" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", "data-aktiv": hanterarId === h.id ? "1" : "0", onClick: () => setHanterarId(hanterarId === h.id ? null : h.id), "aria-label": `Hantera ${h.namn || "hyllan"}`, children: "\u2699" })] }), hanterarId === h.id && ((0, jsx_runtime_1.jsxs)("div", { className: "border border-ink bg-panel p-2 mb-2.5 flex gap-2 flex-wrap items-end", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block flex-1 min-w-[10rem]", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45", children: "Spr\u00E5kets namn" }), (0, jsx_runtime_1.jsx)("input", { className: "falt", value: h.namn, onChange: (e) => andraHylla(h.id, { namn: e.target.value }), "aria-label": "Spr\u00E5kets namn" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 block mb-1", children: "Ton" }), (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad", children: [0, 1, 2, 3, 4, 5].map((t) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico !px-2", "data-aktiv": h.ton === t ? "1" : "0", onClick: () => andraHylla(h.id, { ton: t }), "aria-label": `Ton ${t + 1}`, children: (0, jsx_runtime_1.jsx)("span", { className: "inline-block w-3 h-3 border border-current", style: { background: `var(--kal-${t + 1})` } }) }, t))) })] }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => {
                                                    const antal = hyllansMappar.length;
                                                    if (window.confirm(`Ta bort ${h.namn || "hyllan"} med ${antal} ${antal === 1 ? "mapp" : "mappar"} och allt i dem? Går att ångra med ⌘Z.`)) {
                                                        andra((d) => (0, sprak_1.taBortHylla)(d, h.id));
                                                        setHanterarId(null);
                                                    }
                                                }, children: "Ta bort spr\u00E5ket" })] })), hyllansMappar.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed py-2", children: "Tom hylla. Tryck + Mapp \u2014 Verb, Idiom, Uttal. V\u00E4ljer du ingen omslagsbild ritas mappen i hyllans ton." })) : ((0, jsx_runtime_1.jsx)("div", { className: "hyllrad", "data-alla": utfalld ? "1" : "0", children: hyllansMappar.map((m) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "mappkort", onClick: () => {
                                                setMappId(m.id);
                                                setBladId(null);
                                            }, children: [(0, jsx_runtime_1.jsx)("span", { className: "mappomslag", children: omslag[m.id] ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    (0, jsx_runtime_1.jsx)("img", { src: omslag[m.id], alt: "" })) : ((0, jsx_runtime_1.jsx)(Mappikon_1.default, { ton: h.ton })) }), (0, jsx_runtime_1.jsx)("span", { className: "mapptitel", children: m.titel || "Namnlös" }), (0, jsx_runtime_1.jsx)("span", { className: "mappunder pico opacity-45", children: m.bihang ||
                                                        `${(0, sprak_1.bladI)(form, m.id).length} blad` })] }, m.id))) }))] }, h.id));
                        }), (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: nyHylla, children: "+ Spr\u00E5k" }) })] })) }) }));
    }
    /* --- Nivå 2 och 3: trädet och dokumentet --- */
    const visaTrad = !mobil || !blad;
    const visaDok = !mobil || !!blad;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 flex", children: [visaTrad && ((0, jsx_runtime_1.jsx)("div", { className: `${mobil ? "w-full" : "w-[214px] lg:w-[238px]"} shrink-0 min-h-0`, children: (0, jsx_runtime_1.jsx)(Bladtrad_1.default, { hyllnamn: hylla?.namn ?? "", mappar: hylla ? (0, sprak_1.mapparI)(form, hylla.id) : [], bladFor: (id) => (0, sprak_1.bladI)(form, id), oppenMapp: mapp.id, oppetBlad: bladId, onOppnaMapp: (id) => {
                        setMappId(id);
                        setBladId(null);
                    }, onOppnaBlad: setBladId, onTillHyllan: () => {
                        setMappId(null);
                        setBladId(null);
                    } }) })), visaDok && ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-w-0 min-h-0 overflow-y-auto tunnskroll bg-paper", children: (0, jsx_runtime_1.jsx)("div", { className: "p-2.5 md:p-4", children: blad ? ((0, jsx_runtime_1.jsx)("article", { className: "dokument border border-ink max-w-[860px] mx-auto", children: (0, jsx_runtime_1.jsxs)("div", { className: "p-4 md:p-7", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dokumenthuvud mb-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-3 mb-2", children: [(0, jsx_runtime_1.jsxs)("nav", { className: "pico opacity-45 flex items-center gap-1.5 flex-wrap min-w-0", children: [mobil && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0 !mr-1", onClick: () => setBladId(null), "aria-label": "Tillbaka till tr\u00E4det", children: "\u2039" })), (0, jsx_runtime_1.jsx)("span", { className: "shrink-0", children: "Spr\u00E5k" }), (0, jsx_runtime_1.jsx)("span", { className: "opacity-50", children: "/" }), (0, jsx_runtime_1.jsx)("span", { className: "shrink-0", children: hylla?.namn || "Namnlöst" }), (0, jsx_runtime_1.jsx)("span", { className: "opacity-50", children: "/" }), (0, jsx_runtime_1.jsx)("span", { className: "shrink-0", children: mapp.titel || "Namnlös" }), (0, jsx_runtime_1.jsx)("span", { className: "opacity-50", children: "/" }), (0, jsx_runtime_1.jsx)("span", { className: "!opacity-100 text-ink shrink-0", children: blad.titel || "Namnlöst" })] }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), redigerar ? ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "dokmarke shrink-0", style: blad.utkast ? undefined : { opacity: 0.35 }, onClick: () => andraBlad(blad.id, { utkast: !blad.utkast }), title: blad.utkast
                                                        ? "Markera som färdigt"
                                                        : "Markera som utkast", children: blad.utkast ? "Utkast" : "Färdigt" })) : (blad.utkast && ((0, jsx_runtime_1.jsx)("span", { className: "dokmarke shrink-0", children: "Utkast" }))), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", "data-aktiv": redigerar ? "1" : "0", onClick: () => setRedigerar((v) => !v), title: redigerar
                                                        ? "Lämna redigeringsläget (Esc)"
                                                        : "Redigera bladet", children: redigerar ? "✓ Klar" : "✎ Redigera" })] }), redigerar ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { className: "doktitel mb-2", value: blad.titel, onChange: (e) => andraBlad(blad.id, { titel: e.target.value }), placeholder: "Rubrik", "aria-label": "Bladets rubrik" }), (0, jsx_runtime_1.jsx)("input", { className: "dokdeck", value: blad.underrubrik, onChange: (e) => andraBlad(blad.id, { underrubrik: e.target.value }), placeholder: "Underrubrik", "aria-label": "Underrubrik" })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h1", { className: "doktitel mb-2", children: blad.titel || "Namnlöst" }), blad.underrubrik && ((0, jsx_runtime_1.jsx)("p", { className: "dokdeck", children: blad.underrubrik }))] }))] }), (0, jsx_runtime_1.jsx)(Blockredigerare_1.default, { block: blad.block, onAndra: (block) => andraBlad(blad.id, { block }), redigera: redigerar }), redigerar && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-6 pt-3 border-t border-ink/15 flex", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => {
                                                if (window.confirm(`Ta bort ${blad.titel || "bladet"}? Går att ångra med ⌘Z.`)) {
                                                    setBladId(null);
                                                    andra((d) => ({
                                                        ...d,
                                                        blad: d.blad.filter((x) => x.id !== blad.id),
                                                    }));
                                                }
                                            }, children: "Radera bladet" })] }))] }) })) : (
                    /* Mappen själv: omslag, namn och dess blad. */
                    (0, jsx_runtime_1.jsxs)("div", { className: "max-w-[720px] mx-auto flex flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "dokument border border-ink p-4 md:p-6", children: [(0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-45 mb-3", children: ["Spr\u00E5k / ", hylla?.namn || "Namnlöst", " /", " ", (0, jsx_runtime_1.jsx)("span", { className: "opacity-100 text-ink", children: mapp.titel || "Namnlös" })] }), (0, jsx_runtime_1.jsx)("input", { className: "doktitel mb-2", value: mapp.titel, onChange: (e) => andraMapp(mapp.id, { titel: e.target.value }), placeholder: "Mappens namn", "aria-label": "Mappens namn" }), (0, jsx_runtime_1.jsx)("input", { className: "dokdeck mb-4", value: mapp.bihang, onChange: (e) => andraMapp(mapp.id, { bihang: e.target.value }), placeholder: "Underrad, t.ex. A2\u2013B1", "aria-label": "Underrad" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-4 flex-wrap", children: [(0, jsx_runtime_1.jsx)("span", { className: "mappomslag shrink-0", style: { width: 96 }, children: omslag[mapp.id] ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                (0, jsx_runtime_1.jsx)("img", { src: omslag[mapp.id], alt: "" })) : ((0, jsx_runtime_1.jsx)(Mappikon_1.default, { ton: hylla?.ton ?? 0 })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2 flex-1 min-w-[12rem]", children: [(0, jsx_runtime_1.jsx)("input", { ref: filRef, type: "file", accept: "image/*", className: "hidden", onChange: (e) => void valjOmslag(e.target.files?.[0]) }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => filRef.current?.click(), disabled: laddar, children: laddar
                                                                    ? "Krymper…"
                                                                    : omslag[mapp.id]
                                                                        ? "Byt omslag"
                                                                        : "Välj omslag" }), omslag[mapp.id] && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => sattOmslag(mapp.id, null), children: "Ta bort omslag" }), (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-40 tabnum shrink-0 self-center", children: [Math.round((0, bild_1.dataUrlByte)(omslag[mapp.id]) / 1024), " ", "kB"] })] }))] }), bildfel && ((0, jsx_runtime_1.jsx)("p", { className: "pico", style: { color: "var(--accent)" }, children: bildfel })), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-40 leading-relaxed", children: "Bilden krymps till 300 px bredd innan den sparas, s\u00E5 att lagret inte fylls av ett enda omslag." })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dokument border border-ink", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-ink px-3 py-2 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro", children: "Blad" }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 tabnum", children: bladen.length }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: nyttBlad, children: "+ Blad" })] }), bladen.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: "Inga blad \u00E4nnu. Tryck + Blad \u2014 det \u00F6ppnas direkt med rubrik och ett tomt block." })) : (bladen.map((b) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "sidval", onClick: () => setBladId(b.id), children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-baseline gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[0.84rem] leading-snug flex-1 min-w-0", children: b.titel || "Namnlöst" }), b.utkast && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-35 shrink-0", children: "utkast" }))] }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 block mt-0.5 truncate", children: b.underrubrik || sammanfatta(b) })] }, b.id))))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => {
                                            if (window.confirm(`Ta bort ${mapp.titel || "mappen"} med ${bladen.length} ${bladen.length === 1 ? "blad" : "blad"}? Går att ångra med ⌘Z.`)) {
                                                andra((d) => (0, sprak_1.taBortMapp)(d, mapp.id));
                                                sattOmslag(mapp.id, null);
                                                setMappId(null);
                                                setBladId(null);
                                            }
                                        }, children: "Ta bort mappen" })] })] })) }) }))] }));
}
/** Första raden text i bladet, som förhandsbesked i listan. */
function sammanfatta(blad) {
    for (const b of blad.block) {
        if (b.typ === "text" || b.typ === "rubrik") {
            const ren = (0, markering_1.renText)(b.text).replace(/\s+/g, " ").trim();
            if (ren)
                return ren;
        }
    }
    const antal = blad.block.length;
    return antal === 0 ? "Tomt" : `${antal} block`;
}
function Tomruta({ rubrik, text }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink px-4 py-3 max-w-[340px]", style: { ["--cf"]: "9px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("p", { className: "micro mb-1.5", children: rubrik }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-60 leading-[1.8]", children: text })] }));
}
