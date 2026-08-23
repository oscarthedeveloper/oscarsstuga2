"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synkText = synkText;
exports.KontoKnapp = KontoKnapp;
exports.MolnRemsa = MolnRemsa;
exports.HamtaKnapp = HamtaKnapp;
exports.default = KontoPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Kontot och synkläget.
 *
 * Statusknappen sitter i navigeringsraden och säger alltid sanningen med
 * ett ord: Synkad, Offline, tre på väg upp, eller Logga in. Att dölja
 * synktillståndet är frestande men fel — den enda gången en användare
 * bryr sig är när något inte kommit fram, och då måste det synas.
 *
 * Panelen bakom knappen har ingen registreringsruta. Kontot skapas i
 * Supabase-panelen; appen är byggd för en enda person.
 */
const react_1 = require("react");
const Butik_1 = require("./Butik");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
function synkText(l) {
    switch (l.tillstand) {
        case "av":
            return "Endast denna enhet";
        case "utloggad":
            return l.ivag > 0 ? `${l.ivag} osparade` : "Logga in";
        case "offline":
            return l.ivag > 0 ? `Offline · ${l.ivag}` : "Offline";
        case "synkar":
            return "Synkar…";
        case "fel":
            return l.ivag > 0 ? `Fel · ${l.ivag}` : "Synkfel";
        case "vilande":
            return l.ivag > 0 ? `↑ ${l.ivag}` : "Synkad";
    }
}
/** En liten fyrkant som bär tillståndet i färg, aldrig ensam om det. */
function Lampa({ lage }) {
    const farg = lage.tillstand === "fel"
        ? "var(--accent)"
        : lage.tillstand === "vilande" && lage.ivag === 0
            ? "var(--kal-5-stark)"
            : lage.tillstand === "offline" || lage.tillstand === "utloggad"
                ? "transparent"
                : "var(--kal-1-stark)";
    return ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "inline-block shrink-0 border border-current", style: { width: 7, height: 7, background: farg } }));
}
function KontoKnapp({ onOppna }) {
    const { synkLage } = (0, Butik_1.useButik)();
    // Knappen visas ALLTID, även i ett bygge utan molnnycklar. Att dölja
    // den när molnet är avstängt lät prydligt, men gjorde att den som
    // undrade "varför synkas det inte" inte hade någonstans att fråga.
    const kravInsats = synkLage.tillstand === "utloggad" || synkLage.tillstand === "fel";
    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp micro flex items-center gap-1.5", onClick: onOppna, title: "Konto och synkning", "data-ton": kravInsats ? "accent" : undefined, children: [(0, jsx_runtime_1.jsx)(Lampa, { lage: synkLage }), (0, jsx_runtime_1.jsx)("span", { className: kravInsats ? "" : "hidden sm:inline", children: synkText(synkLage) })] }));
}
const AVFARDAD = "kalendariet.molnremsa.avfardad";
/**
 * Remsan som säger att ingenting synkas.
 *
 * Det finns två tysta lägen där appen fungerar perfekt men molnet aldrig
 * rörs: bygget saknar nycklar, eller enheten är inte inloggad. Båda ser
 * ut precis som en fungerande kalender. Den här remsan är det enda som
 * skiljer "allt är bra" från "ingenting av det du gör lämnar den här
 * enheten", och därför får den ta plats.
 */
function MolnRemsa({ onOppna }) {
    const { molnetFinns, session, synkLage } = (0, Butik_1.useButik)();
    const [avfardad, setAvfardad] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        setAvfardad(window.localStorage.getItem(AVFARDAD) === "1");
    }, []);
    if (session)
        return null;
    if (synkLage.tillstand === "av" && avfardad)
        return null;
    if (molnetFinns && avfardad && synkLage.ivag === 0)
        return null;
    const utanNycklar = !molnetFinns;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-ink bg-accent text-ink px-3 py-1.5 flex items-center gap-2 flex-wrap", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro", children: utanNycklar
                    ? "Molnet är inte inkopplat i det här bygget"
                    : "Inte inloggad — ingenting synkas" }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-80 flex-1 min-w-[12rem]", children: utanNycklar
                    ? "Allt du skriver stannar på den här enheten."
                    : `Allt du skriver stannar på den här enheten${synkLage.ivag > 0 ? ` (${synkLage.ivag} väntar)` : ""}.` }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: onOppna, children: utanNycklar ? "Läs mer" : "Logga in" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "pico opacity-70 hover:opacity-100 px-1", onClick: () => {
                    window.localStorage.setItem(AVFARDAD, "1");
                    setAvfardad(true);
                }, "aria-label": "D\u00F6lj", title: "D\u00F6lj \u2014 statusknappen visar det \u00E4nd\u00E5", children: "\u2715" })] }));
}
/**
 * Tvångshämtning.
 *
 * Glömmer var synkningen stod och läser om hela kalendern från Supabase.
 * Den vanliga synken räcker nästan alltid — men "nästan alltid" är inte
 * gott nog när man står med telefonen i handen och undrar var mötet tog
 * vägen. Då skall det finnas en knapp som gör precis en sak, direkt, utan
 * att man först måste leta i en panel.
 *
 * Ingenting kan gå förlorat: lokala ändringar sammanfogas som vanligt och
 * skickas upp i samma körning.
 */
function HamtaKnapp() {
    const { molnetFinns, session, synkLage, synkaOmAllt } = (0, Butik_1.useButik)();
    const [kvitto, setKvitto] = (0, react_1.useState)(null);
    const timerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => () => {
        if (timerRef.current)
            window.clearTimeout(timerRef.current);
    }, []);
    if (!molnetFinns || !session)
        return null;
    const arbetar = synkLage.tillstand === "synkar";
    const kor = async () => {
        setKvitto(null);
        await synkaOmAllt();
        // Kvittot läses ur butikens läge efter körningen. Att visa "hämtade
        // N" en kort stund är hela skillnaden mellan en knapp man litar på
        // och en som känns som om den inte gjorde något.
        setKvitto("klart");
        if (timerRef.current)
            window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setKvitto(null), 3000);
    };
    const etikett = arbetar
        ? "…"
        : kvitto
            ? synkLage.tillstand === "fel"
                ? "✕"
                : `✓ ${synkLage.ner}`
            : "↻";
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro tabnum", onClick: () => void kor(), disabled: arbetar, title: "H\u00E4mta om allt fr\u00E5n Supabase. Lokala \u00E4ndringar beh\u00E5lls och skickas upp.", "aria-label": "H\u00E4mta om allt fr\u00E5n molnet", children: etikett }));
}
function KontoPanel({ onStang }) {
    const { session, synkLage, synkaNu, loggaIn, loggaUt, molnetFinns, handelser, synkaOmAllt, stallDiagnos, } = (0, Butik_1.useButik)();
    const [epost, setEpost] = (0, react_1.useState)("");
    const [losenord, setLosenord] = (0, react_1.useState)("");
    const [fel, setFel] = (0, react_1.useState)(null);
    const [arbetar, setArbetar] = (0, react_1.useState)(false);
    const [diagnos, setDiagnos] = (0, react_1.useState)(null);
    const [staller, setStaller] = (0, react_1.useState)(false);
    const epostRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const id = window.setTimeout(() => epostRef.current?.focus(), 30);
        return () => window.clearTimeout(id);
    }, []);
    const skicka = async (e) => {
        e.preventDefault();
        setArbetar(true);
        setFel(null);
        const svar = await loggaIn(epost, losenord);
        setArbetar(false);
        if (svar)
            setFel(oversattFel(svar));
        else {
            setLosenord("");
            onStang();
        }
    };
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "panel-overlay", onClick: onStang }), (0, jsx_runtime_1.jsxs)("aside", { className: "redigeringspanel", role: "dialog", "aria-label": "Konto och synkning", onKeyDown: (e) => {
                    if (e.key === "Escape")
                        onStang();
                }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 bg-ink text-paper px-3 h-[34px] flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "micro", children: "Konto och synkning" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onStang, className: "micro hover:text-accent transition-colors", children: "St\u00E4ng \u2715" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-h-0 overflow-y-auto tunnskroll p-3 flex flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border border-ink p-2.5 flex flex-col gap-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-60", children: "Tillst\u00E5nd" }), (0, jsx_runtime_1.jsxs)("span", { className: "micro flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(Lampa, { lage: synkLage }), synkText(synkLage)] })] }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-55 leading-relaxed", children: synkLage.ivag > 0
                                            ? `${synkLage.ivag} ${synkLage.ivag === 1 ? "ändring" : "ändringar"} väntar på att skickas upp. De ligger sparade på enheten och går inte förlorade.`
                                            : session
                                                ? "Allt som finns på enheten finns också i molnet."
                                                : "Allt ligger sparat på den här enheten." }), synkLage.sist && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-40 tabnum", children: ["Senaste synk ", (0, tid_1.klocka)(new Date(synkLage.sist))] })), synkLage.meddelande && ((0, jsx_runtime_1.jsx)("p", { className: "pico text-accent leading-relaxed", children: oversattFel(synkLage.meddelande) })), (0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-40 tabnum", children: [handelser.length, " ", handelser.length === 1 ? "post" : "poster", " p\u00E5 enheten"] })] }), !molnetFinns && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-55 leading-relaxed", children: ["Bygget saknar molnnycklar \u2014", " ", (0, jsx_runtime_1.jsx)("b", { children: "NEXT_PUBLIC_SUPABASE_URL" }), " och", " ", (0, jsx_runtime_1.jsx)("b", { children: "NEXT_PUBLIC_SUPABASE_ANON_KEY" }), " saknas. Kalendern fungerar precis som vanligt, men bara p\u00E5 den h\u00E4r enheten. Lokalt s\u00E4tts de i", " ", (0, jsx_runtime_1.jsx)("b", { children: ".env.local" }), ", p\u00E5 Netlify under Environment variables \u2014 och bygget m\u00E5ste k\u00F6ras om efter\u00E5t, eftersom v\u00E4rdena bakas in vid bygget."] })), !molnetFinns && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-55 leading-relaxed", children: ["G\u00E5r deployen \u00E4nd\u00E5 inte igenom: Netlify genoms\u00F6ker bygget efter v\u00E4rden som liknar hemligheter och avbryter deployen om den hittar n\u00E5gra \u2014 och ", (0, jsx_runtime_1.jsx)("b", { children: "NEXT_PUBLIC_*" }), " hamnar med flit i klientkoden. Undantaget st\u00E5r numera i ", (0, jsx_runtime_1.jsx)("b", { children: "netlify.toml" }), " ", "(SECRETS_SCAN_OMIT_KEYS). Kontrollera ocks\u00E5 att variablernas", " ", (0, jsx_runtime_1.jsx)("b", { children: "scope" }), " omfattar ", (0, jsx_runtime_1.jsx)("b", { children: "Builds" }), " och att de g\u00E4ller f\u00F6r", " ", (0, jsx_runtime_1.jsx)("b", { children: "Production" }), "."] })), molnetFinns && !session && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-55 leading-relaxed", children: ["Utan inloggning skickas ingenting upp och ingenting h\u00E4mtas ner. Kontot skapas i Supabase under ", (0, jsx_runtime_1.jsx)("b", { children: "Authentication \u2192 Users" }), "."] })), molnetFinns && !session && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: skicka, className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "E-post" }), (0, jsx_runtime_1.jsx)("input", { ref: epostRef, type: "email", autoComplete: "username", className: "falt", value: epost, onChange: (e) => setEpost(e.target.value), required: true })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "L\u00F6senord" }), (0, jsx_runtime_1.jsx)("input", { type: "password", autoComplete: "current-password", className: "falt", value: losenord, onChange: (e) => setLosenord(e.target.value), required: true })] }), fel && ((0, jsx_runtime_1.jsx)("p", { className: "pico text-accent leading-relaxed", children: fel })), (0, jsx_runtime_1.jsx)("button", { type: "submit", className: "knapp micro", "data-ton": "accent", disabled: arbetar, children: arbetar ? "Loggar in…" : "Logga in" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed", children: "Kontot skapas i Supabase under Authentication \u2192 Users. Appen har med flit ingen registreringsruta." })] })), molnetFinns && session && ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border border-ink p-2.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 block", children: "Inloggad som" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[0.78rem] break-all", children: session.user.email })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: () => void synkaNu(), disabled: synkLage.tillstand === "synkar", children: "Synka nu" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: () => void synkaOmAllt(), children: "H\u00E4mta om allt fr\u00E5n molnet" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: () => void loggaUt(), children: "Logga ut" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed", children: "Utloggning r\u00F6r inte kalendern p\u00E5 enheten. Allt ligger kvar och skickas upp n\u00E4sta g\u00E5ng du loggar in." })] })), (0, jsx_runtime_1.jsxs)("details", { className: "border border-ink", open: !session, children: [(0, jsx_runtime_1.jsx)("summary", { className: "micro px-2.5 py-2 cursor-pointer select-none", children: "Fels\u00F6kning" }), (0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 pb-2.5 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: async () => {
                                                    setDiagnos(null);
                                                    setStaller(true);
                                                    setDiagnos(await stallDiagnos());
                                                    setStaller(false);
                                                }, disabled: staller, children: staller ? "Kontrollerar…" : "Kontrollera molnet" }), diagnos && ((0, jsx_runtime_1.jsxs)("dl", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)(Rad, { namn: "Bygge", varde: diagnos.bygge, bra: true }), (0, jsx_runtime_1.jsx)(Rad, { namn: "Nycklar i bygget", varde: diagnos.nycklar ? "Ja" : "Nej", bra: diagnos.nycklar }), diagnos.vardnamn && ((0, jsx_runtime_1.jsx)(Rad, { namn: "Projekt", varde: diagnos.vardnamn, bra: true })), (0, jsx_runtime_1.jsx)(Rad, { namn: "Inloggad", varde: diagnos.epost ?? (diagnos.inloggad ? "Ja" : "Nej"), bra: diagnos.inloggad }), (0, jsx_runtime_1.jsx)(Rad, { namn: "Tabeller", varde: diagnos.tabeller === "ok"
                                                            ? "Svarar"
                                                            : diagnos.tabeller === "saknas"
                                                                ? "Saknas"
                                                                : diagnos.tabeller === "fel"
                                                                    ? "Fel"
                                                                    : "Ej provat", bra: diagnos.tabeller === "ok" }), (0, jsx_runtime_1.jsx)(Rad, { namn: "Skrivning", varde: diagnos.skrivning === "ok"
                                                            ? "Går igenom"
                                                            : diagnos.skrivning === "nekad"
                                                                ? "Nekas"
                                                                : diagnos.skrivning === "fel"
                                                                    ? "Fel"
                                                                    : "Ej provat", bra: diagnos.skrivning === "ok" }), diagnos.antalIMolnet !== null && ((0, jsx_runtime_1.jsx)(Rad, { namn: "Poster i molnet", varde: String(diagnos.antalIMolnet), bra: true })), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-55 leading-relaxed pt-1", children: diagnos.meddelande }), diagnos.ratext && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-40 leading-relaxed break-all", children: ["Svar fr\u00E5n databasen: ", diagnos.ratext] }))] })), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed", children: "Provet l\u00E4ser OCH skriver p\u00E5 riktigt. L\u00E4sning kan fungera d\u00E4r skrivning nekas \u2014 det \u00E4r tv\u00E5 olika regler i radniv\u00E5s\u00E4kerheten, och bara ett skrivprov avsl\u00F6jar det." })] })] })] })] })] }));
}
function Rad({ namn, varde, bra, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("dt", { className: "pico opacity-55", children: namn }), (0, jsx_runtime_1.jsxs)("dd", { className: "pico flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "inline-block border border-current", style: {
                            width: 7,
                            height: 7,
                            background: bra ? "var(--kal-5-stark)" : "var(--accent)",
                        } }), varde] })] }));
}
/** Supabase svarar på engelska; de vanligaste felen får svensk text. */
function oversattFel(meddelande) {
    const m = meddelande.toLowerCase();
    if (m.includes("invalid login credentials")) {
        return "Fel e-post eller lösenord.";
    }
    if (m.includes("email not confirmed")) {
        return "Kontot är inte bekräftat. Kryssa i Auto Confirm User i Supabase.";
    }
    if (m.includes("failed to fetch") || m.includes("networkerror")) {
        return "Ingen kontakt med molnet. Ändringarna ligger kvar på enheten.";
    }
    if (m.includes("jwt") || m.includes("token")) {
        return "Sessionen har gått ut. Logga in igen.";
    }
    if (m.includes("relation") && m.includes("does not exist")) {
        return "Tabellerna saknas i databasen. Kör supabase/schema.sql först.";
    }
    return meddelande;
}
