"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TidsRutnat;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Tidsrutnätet — den gemensamma motorn bakom dagsvyn, tredagarsvyn och
 * veckovyn. De tre skiljer sig bara i hur många dygn som ligger i spannet,
 * så de delar all geometri, all layout och all dragfunktion.
 *
 * Interaktionen bygger på pointer-händelser i stället för HTML5:s
 * drag-and-drop. Skälet är att dra-och-släpp-API:et inte kan följa musen
 * kontinuerligt: det ger bara `dragover` med grov upplösning, kan inte
 * visa ett block som glider mjukt i femtonminutersteg, och beter sig
 * olika i varje webbläsare. Med `setPointerCapture` följer blocket muspekaren
 * exakt, samma kod gäller för mus, penna och finger, och vi kan rita vår
 * egen förhandsvisning.
 */
const react_1 = require("react");
const anvandMedia_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/anvandMedia");
const layout_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/layout");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
/**
 * Layout-effekter finns inte på servern. Next renderar klientkomponenter
 * en gång på servern innan de hydreras, så en rå useLayoutEffect skulle
 * ge en varning vid varje sidladdning. Den här växeln väljer rätt krok
 * utan att beteendet i webbläsaren ändras.
 */
const useLayoutEffektNarDetFinns = typeof window === "undefined" ? react_1.useEffect : react_1.useLayoutEffect;
const DYGN_MIN = 1440;
const STEG = 15; // minsta rörelse vid drag, i minuter
const TROSKEL = 4; // px innan ett klick räknas som ett drag
const RULLTROSKEL = 9; // px som avslöjar att fingret rullar, inte drar
const LANGTRYCK = 420; // ms innan ett finger tar över gesten
const MINSTA_LANGD = 15; // minuter
function TidsRutnat({ dagar, forekomster, timhojd, vald, onValj, onOppna, onFlytta, onSkapa, visaVecka, }) {
    const rutnatRef = (0, react_1.useRef)(null);
    const skrollRef = (0, react_1.useRef)(null);
    const [drag, setDrag] = (0, react_1.useState)(null);
    const [nu, setNu] = (0, react_1.useState)(() => new Date());
    // Bara veckovyn blir riktigt trång; en och tre dagar har gott om plats.
    const smal = (0, anvandMedia_1.useMobil)() && dagar.length > 3;
    // Nu-linjen tickar en gång i minuten. Oftare vore slöseri; mer sällan
    // gör att linjen syns stå still.
    (0, react_1.useEffect)(() => {
        const id = window.setInterval(() => setNu(new Date()), 60000);
        return () => window.clearInterval(id);
    }, []);
    // Rulla till arbetsdagens början vid första ritningen, inte till 00:00.
    const harRullat = (0, react_1.useRef)(false);
    useLayoutEffektNarDetFinns(() => {
        if (harRullat.current || !skrollRef.current)
            return;
        harRullat.current = true;
        const mal = (0, tid_1.arSammaDag)(dagar[0], nu) || dagar.some((d) => (0, tid_1.arSammaDag)(d, nu))
            ? Math.max(0, ((0, tid_1.minuterInPaDagen)(nu) / 60) * timhojd - 160)
            : (7 / 1) * timhojd;
        skrollRef.current.scrollTop = mal;
    }, [dagar, nu, timhojd]);
    const dagStart = dagar[0];
    const dagSlut = (0, tid_1.addDagar)((0, tid_1.startAvDag)(dagar[dagar.length - 1]), 1);
    /* ---------------------------------------------------------------
       Uppdelning: heldagsremsan respektive rutnätet
       --------------------------------------------------------------- */
    const { remsposter, tidsposter } = (0, react_1.useMemo)(() => {
        const rem = [];
        const tid = [];
        for (const f of forekomster) {
            const langdTim = (f.slut.getTime() - f.start.getTime()) / 3600000;
            if (f.heldag || langdTim >= 24) {
                rem.push({
                    forekomst: f,
                    fran: (0, tid_1.dygnMellan)(dagStart, f.start),
                    // Ett heldagsspann slutar 00:00 dagen efter; sista rutan skall
                    // ändå färgas, därför avrundas uppåt på minuten.
                    till: (0, tid_1.dygnMellan)(dagStart, f.slut) +
                        ((0, tid_1.minuterInPaDagen)(f.slut) > 0 ? 1 : 0),
                });
            }
            else {
                tid.push(f);
            }
        }
        return { remsposter: rem, tidsposter: tid };
    }, [forekomster, dagStart]);
    const { band, rader } = (0, react_1.useMemo)(() => (0, layout_1.laggUtBand)(remsposter, dagar.length), [remsposter, dagar.length]);
    /* ---------------------------------------------------------------
       Segment per dygn — ett möte 23:00–01:00 ritas som två block
       --------------------------------------------------------------- */
    const segmentPerDag = (0, react_1.useMemo)(() => {
        const karta = new Map();
        for (const d of dagar)
            karta.set((0, tid_1.nyckel)(d), []);
        const ersatt = drag && drag.aktiv ? dragForekomst(drag) : null;
        for (const f0 of tidsposter) {
            // Den förekomst som dras ritas på sin nya plats, inte sin gamla.
            const f = ersatt && ersatt.nyckel === f0.nyckel
                ? { ...f0, start: ersatt.start, slut: ersatt.slut }
                : f0;
            for (const d of dagar) {
                const dygnStart = (0, tid_1.startAvDag)(d);
                const dygnEnd = (0, tid_1.addDagar)(dygnStart, 1);
                if (f.slut <= dygnStart || f.start >= dygnEnd)
                    continue;
                const franMin = f.start <= dygnStart ? 0 : (0, tid_1.minuterInPaDagen)(f.start);
                const tillMin = f.slut >= dygnEnd ? DYGN_MIN : (0, tid_1.minuterInPaDagen)(f.slut) || DYGN_MIN;
                const lista = karta.get((0, tid_1.nyckel)(d));
                if (!lista)
                    continue;
                lista.push({
                    nyckel: `${f.nyckel}@${(0, tid_1.nyckel)(d)}`,
                    f: f,
                    start: (0, tid_1.medMinuter)(dygnStart, franMin),
                    slut: (0, tid_1.medMinuter)(dygnStart, Math.max(tillMin, franMin + 5)),
                    franMin,
                    tillMin,
                    fortsatterFore: f.start < dygnStart,
                    fortsatterEfter: f.slut > dygnEnd,
                });
            }
        }
        return karta;
    }, [tidsposter, dagar, drag]);
    const layoutPerDag = (0, react_1.useMemo)(() => {
        const karta = new Map();
        segmentPerDag.forEach((segment, dagnyckel) => {
            karta.set(dagnyckel, (0, layout_1.laggUt)(segment));
        });
        return karta;
    }, [segmentPerDag]);
    /* ---------------------------------------------------------------
       Geometri: från muspekare till tidpunkt
       --------------------------------------------------------------- */
    const punktTillTid = (0, react_1.useCallback)((klientX, klientY) => {
        const el = rutnatRef.current;
        if (!el)
            return null;
        const rekt = el.getBoundingClientRect();
        const kolumnbredd = rekt.width / dagar.length;
        const kolumn = (0, tid_1.klam)(Math.floor((klientX - rekt.left) / kolumnbredd), 0, dagar.length - 1);
        const minuter = ((klientY - rekt.top) / timhojd) * 60;
        return { dag: (0, tid_1.startAvDag)(dagar[kolumn]), minuter, kolumn };
    }, [dagar, timhojd]);
    /** Rullar rutnätet när pekaren närmar sig kanten under ett drag. */
    const kantrullning = (0, react_1.useCallback)((klientY) => {
        const box = skrollRef.current;
        if (!box)
            return;
        const rekt = box.getBoundingClientRect();
        const zon = 44;
        if (klientY < rekt.top + zon) {
            box.scrollTop -= Math.max(4, (rekt.top + zon - klientY) / 3);
        }
        else if (klientY > rekt.bottom - zon) {
            box.scrollTop += Math.max(4, (klientY - (rekt.bottom - zon)) / 3);
        }
    }, []);
    /* ---------------------------------------------------------------
       Dragmaskineriet
  
       På en mus börjar draget direkt: knappen nere betyder drag, och
       rullning sker med hjulet. På en pekskärm finns ingen sådan skillnad
       — fingret som drar ett block och fingret som rullar rutnätet ser
       likadana ut i början. Därför krävs ett LÅNGTRYCK innan draget tar
       över. Rör sig fingret innan dess är det en rullning och vi släpper
       gesten till webbläsaren.
       --------------------------------------------------------------- */
    const startpunkt = (0, react_1.useRef)(null);
    const vantande = (0, react_1.useRef)(null);
    const [armerad, setArmerad] = (0, react_1.useState)(null);
    const avbrytVantan = (0, react_1.useCallback)(() => {
        const v = vantande.current;
        if (!v)
            return;
        window.clearTimeout(v.timer);
        v.el.style.touchAction = v.tidigareTouchAction;
        vantande.current = null;
    }, []);
    /**
     * Tar hand om skillnaden mellan mus och finger. `borja` körs när draget
     * faktiskt skall inledas — omedelbart för en mus, efter långtryck för
     * ett finger.
     */
    const grip = (0, react_1.useCallback)((e, markering, borja) => {
        const el = e.currentTarget;
        startpunkt.current = { x: e.clientX, y: e.clientY };
        if (e.pointerType === "mouse") {
            el.setPointerCapture(e.pointerId);
            borja();
            return;
        }
        const tidigareTouchAction = el.style.touchAction;
        const timer = window.setTimeout(() => {
            vantande.current = null;
            // Först nu tas gesten över. Att sätta touch-action här hinner
            // spärra rullningen eftersom fingret stått stilla — hade en pan
            // redan börjat vore det för sent.
            el.style.touchAction = "none";
            try {
                el.setPointerCapture(e.pointerId);
            }
            catch {
                // Fingret kan ha lyfts under tiden; då finns inget att fånga.
                el.style.touchAction = tidigareTouchAction;
                return;
            }
            setArmerad(markering);
            navigator.vibrate?.(12);
            borja();
        }, LANGTRYCK);
        vantande.current = { timer, el, pekare: e.pointerId, tidigareTouchAction };
    }, []);
    const paBlockNed = (0, react_1.useCallback)((e, seg, kant) => {
        if (e.button !== 0)
            return;
        e.stopPropagation();
        const punkt = punktTillTid(e.clientX, e.clientY);
        if (!punkt)
            return;
        onValj(seg.f);
        const f = seg.f;
        const langdMin = Math.round((f.slut.getTime() - f.start.getTime()) / 60000);
        grip(e, seg.f.nyckel, () => {
            if (kant) {
                setDrag({
                    typ: "langd",
                    kant,
                    f,
                    start: f.start,
                    slut: f.slut,
                    aktiv: false,
                });
                return;
            }
            // Greppunkten mäts som avstånd från händelsens verkliga början —
            // inte från segmentets — så att ett block som sträcker sig över
            // midnatt inte hoppar när man tar tag i dess andra halva.
            const pekartid = (0, tid_1.medMinuter)(punkt.dag, punkt.minuter);
            const greppMin = (pekartid.getTime() - f.start.getTime()) / 60000;
            setDrag({
                typ: "flytta",
                f,
                greppMin: (0, tid_1.klam)(greppMin, 0, langdMin),
                langdMin,
                start: f.start,
                slut: f.slut,
                // Ett finger som redan hållit still i en halv sekund menar
                // allvar: draget är aktivt direkt, utan tröskel.
                aktiv: e.pointerType !== "mouse",
            });
        });
    }, [grip, onValj, punktTillTid]);
    const paTomtNed = (0, react_1.useCallback)((e) => {
        if (e.button !== 0)
            return;
        const punkt = punktTillTid(e.clientX, e.clientY);
        if (!punkt)
            return;
        onValj(null);
        const ankare = (0, tid_1.medMinuter)(punkt.dag, (0, tid_1.klam)((0, tid_1.snappa)(punkt.minuter, STEG), 0, DYGN_MIN - STEG));
        grip(e, null, () => {
            setDrag({
                typ: "rita",
                ankare,
                start: ankare,
                slut: new Date(ankare.getTime() + 30 * 60000),
                aktiv: e.pointerType !== "mouse",
            });
        });
    }, [grip, onValj, punktTillTid]);
    const paRorelse = (0, react_1.useCallback)((e) => {
        // Fingret rörde sig innan långtrycket gick igenom: det var en
        // rullning. Släpp gesten till webbläsaren utan att göra något.
        if (vantande.current && startpunkt.current) {
            const langt = Math.abs(e.clientX - startpunkt.current.x) > RULLTROSKEL ||
                Math.abs(e.clientY - startpunkt.current.y) > RULLTROSKEL;
            if (langt) {
                avbrytVantan();
                startpunkt.current = null;
            }
            return;
        }
        if (!drag || !startpunkt.current)
            return;
        const rord = Math.abs(e.clientX - startpunkt.current.x) > TROSKEL ||
            Math.abs(e.clientY - startpunkt.current.y) > TROSKEL;
        if (!drag.aktiv && !rord)
            return;
        kantrullning(e.clientY);
        const punkt = punktTillTid(e.clientX, e.clientY);
        if (!punkt)
            return;
        setDrag((d) => {
            if (!d)
                return d;
            if (d.typ === "flytta") {
                const pekartid = (0, tid_1.medMinuter)(punkt.dag, punkt.minuter);
                const rå = new Date(pekartid.getTime() - d.greppMin * 60000);
                // Snäpp mot kvartar räknat på väggklockan, inte på tidsstämpeln:
                // det senare skulle glida en timme vid sommartidsomställning.
                const start = (0, tid_1.medMinuter)((0, tid_1.startAvDag)(rå), (0, tid_1.snappa)((0, tid_1.minuterInPaDagen)(rå), STEG));
                return {
                    ...d,
                    aktiv: true,
                    start,
                    slut: new Date(start.getTime() + d.langdMin * 60000),
                };
            }
            if (d.typ === "langd") {
                const min = (0, tid_1.snappa)(punkt.minuter, STEG);
                if (d.kant === "topp") {
                    const grans = new Date(d.slut.getTime() - MINSTA_LANGD * 60000);
                    const ny = (0, tid_1.medMinuter)(punkt.dag, min);
                    return { ...d, aktiv: true, start: ny > grans ? grans : ny };
                }
                const grans = new Date(d.start.getTime() + MINSTA_LANGD * 60000);
                const ny = (0, tid_1.medMinuter)(punkt.dag, min);
                return { ...d, aktiv: true, slut: ny < grans ? grans : ny };
            }
            // rita
            const min = (0, tid_1.klam)((0, tid_1.snappa)(punkt.minuter, STEG), 0, DYGN_MIN);
            const pekare = (0, tid_1.medMinuter)(punkt.dag, min);
            const fram = pekare.getTime() >= d.ankare.getTime();
            const start = fram ? d.ankare : pekare;
            const slut = fram ? pekare : d.ankare;
            const langd = Math.max(MINSTA_LANGD, (slut.getTime() - start.getTime()) / 60000);
            return {
                ...d,
                aktiv: true,
                start,
                slut: new Date(start.getTime() + langd * 60000),
            };
        });
    }, [avbrytVantan, drag, kantrullning, punktTillTid]);
    const paUpp = (0, react_1.useCallback)((e, seg) => {
        const el = e.currentTarget;
        // Fingret lyftes innan långtrycket gick igenom: en vanlig tryckning.
        if (vantande.current) {
            avbrytVantan();
            startpunkt.current = null;
            if (seg)
                onOppna(seg.f);
            return;
        }
        if (el.hasPointerCapture?.(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
        }
        el.style.touchAction = "";
        setArmerad(null);
        startpunkt.current = null;
        const d = drag;
        setDrag(null);
        if (!d)
            return;
        if (!d.aktiv) {
            // Ingen rörelse: det var ett klick, inte ett drag.
            if (d.typ === "flytta" || d.typ === "langd")
                onOppna(d.f);
            return;
        }
        // Ett armerat finger som aldrig rörde sig skall inte skapa en
        // trettiominuters händelse ur tomma intet.
        if (d.typ === "rita" && d.slut.getTime() - d.start.getTime() <= 0) {
            return;
        }
        if (d.typ === "rita") {
            onSkapa(d.start, d.slut, false);
            return;
        }
        const oforandrat = d.start.getTime() === d.f.start.getTime() &&
            d.slut.getTime() === d.f.slut.getTime();
        if (!oforandrat)
            onFlytta(d.f, d.start, d.slut);
    }, [avbrytVantan, drag, onFlytta, onOppna, onSkapa]);
    // Timern får inte överleva komponenten.
    (0, react_1.useEffect)(() => () => avbrytVantan(), [avbrytVantan]);
    // Ett avbrutet drag (Esc, systemdialog) får inte lämna kvar ett block
    // som hänger fast vid muspekaren.
    (0, react_1.useEffect)(() => {
        if (!drag)
            return;
        const paTangent = (e) => {
            if (e.key === "Escape") {
                avbrytVantan();
                startpunkt.current = null;
                setArmerad(null);
                setDrag(null);
            }
        };
        window.addEventListener("keydown", paTangent);
        document.body.classList.add("drar-pagar");
        return () => {
            window.removeEventListener("keydown", paTangent);
            document.body.classList.remove("drar-pagar");
        };
    }, [avbrytVantan, drag]);
    /* ---------------------------------------------------------------
       Ritning
       --------------------------------------------------------------- */
    const tat = timhojd < 40;
    const nuSynlig = dagar.some((d) => (0, tid_1.arSammaDag)(d, nu));
    const nuTopp = ((0, tid_1.minuterInPaDagen)(nu) / 60) * timhojd;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full min-h-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 border-b border-ink bg-paper", children: [(0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-r border-ink flex items-end justify-center pb-1", style: { width: "var(--rannil)" }, children: visaVecka ? ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Vecka" })) : ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Tid" })) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 flex min-w-0", children: dagar.map((d) => {
                            const idag = (0, tid_1.arSammaDag)(d, nu);
                            return (
                            /*
                             * Dagshuvudet byter riktning med bredden. Sju kolumner på en
                             * telefon ger runt femtio pixlar var — datum och veckodag
                             * bredvid varandra får då inte plats och siffran klipps.
                             * Staplade ryms båda, och "Idag" behöver inget eget ord när
                             * siffran ändå bär accentfärgen.
                             */
                            (0, jsx_runtime_1.jsxs)("div", { "data-idag": idag ? "1" : "0", "data-helg": (0, tid_1.arHelg)(d) ? "1" : "0", className: "dagkolumn daghuvud flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "daghuvud-veckodag nano opacity-70", children: smal
                                            ? tid_1.VECKODAGAR_KORT[d.getDay()].slice(0, 2)
                                            : tid_1.VECKODAGAR_KORT[d.getDay()] }), (0, jsx_runtime_1.jsx)("span", { className: "daghuvud-tal display tabnum", children: d.getDate() }), idag && !smal && ((0, jsx_runtime_1.jsx)("span", { className: "pico ml-auto text-accent", children: "Idag" }))] }, (0, tid_1.nyckel)(d)));
                        }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 heldagsremsa", children: [(0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-r border-ink flex items-start justify-end pr-1.5 pt-1", style: { width: "var(--rannil)" }, children: (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "Heldag" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 relative min-w-0", style: { minHeight: 24, height: Math.max(24, rader * 19 + 6) }, children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex", children: dagar.map((d) => ((0, jsx_runtime_1.jsx)("div", { "data-helg": (0, tid_1.arHelg)(d) ? "1" : "0", "data-idag": (0, tid_1.arSammaDag)(d, nu) ? "1" : "0", className: "dagkolumn flex-1" }, (0, tid_1.nyckel)(d)))) }), band.map((b) => {
                                const bredd = 100 / dagar.length;
                                return ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "heldag-block absolute", "data-ton": b.forekomst.ton, "data-vald": vald === b.forekomst.nyckel ? "1" : "0", style: {
                                        left: `calc(${b.fran * bredd}% + 2px)`,
                                        width: `calc(${(b.till - b.fran) * bredd}% - 4px)`,
                                        top: b.rad * 19 + 3,
                                        height: 17,
                                    }, onClick: () => {
                                        onValj(b.forekomst);
                                        onOppna(b.forekomst);
                                    }, title: b.forekomst.handelse.titel, children: [b.klipptVanster && "‹ ", b.forekomst.handelse.titel, b.klipptHoger && " ›"] }, b.nyckel));
                            })] })] }), (0, jsx_runtime_1.jsx)("div", { ref: skrollRef, className: "flex-1 min-h-0 overflow-y-auto tunnskroll", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex", style: { height: 24 * timhojd }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-r border-ink relative bg-paper", style: { width: "var(--rannil)" }, children: [Array.from({ length: 24 }, (_, t) => ((0, jsx_runtime_1.jsx)("div", { className: "absolute right-1.5 pico opacity-60 tabnum", style: { top: t * timhojd - 4 }, children: t === 0 ? "" : `${String(t).padStart(2, "0")}:00` }, t))), nuSynlig && ((0, jsx_runtime_1.jsx)("div", { className: "absolute right-0 px-1 text-[0.52rem] leading-none tabnum bg-accent text-ink", style: { top: nuTopp - 5 }, children: (0, tid_1.klocka)(nu) }))] }), (0, jsx_runtime_1.jsx)("div", { ref: rutnatRef, className: "flex-1 flex min-w-0 tidsrutnat relative", "data-tat": tat ? "1" : "0", style: { ["--timhojd"]: `${timhojd}px` }, children: dagar.map((d) => {
                                const dn = (0, tid_1.nyckel)(d);
                                const segment = segmentPerDag.get(dn) ?? [];
                                const layout = layoutPerDag.get(dn);
                                const idag = (0, tid_1.arSammaDag)(d, nu);
                                return ((0, jsx_runtime_1.jsxs)("div", { className: "dagkolumn flex-1", "data-helg": (0, tid_1.arHelg)(d) ? "1" : "0", "data-idag": idag ? "1" : "0", onPointerDown: paTomtNed, onPointerMove: paRorelse, onPointerUp: (e) => paUpp(e), onPointerCancel: (e) => paUpp(e), children: [segment.map((seg) => {
                                            const l = layout?.get(seg.nyckel);
                                            const dras = drag?.aktiv &&
                                                drag.typ !== "rita" &&
                                                drag.f.nyckel === seg.f.nyckel;
                                            const topp = (seg.franMin / 60) * timhojd;
                                            const hojd = Math.max(13, ((seg.tillMin - seg.franMin) / 60) * timhojd - 1);
                                            const kort = hojd < 30;
                                            return ((0, jsx_runtime_1.jsxs)("div", { role: "button", tabIndex: 0, className: "handelse", "data-ton": seg.f.ton, "data-vald": vald === seg.f.nyckel ? "1" : "0", "data-dras": dras ? "1" : "0", "data-kort": kort ? "1" : "0", "data-armerad": armerad === seg.f.nyckel ? "1" : "0", "data-over": l?.over ? "1" : "0", style: {
                                                    top: topp,
                                                    height: hojd,
                                                    left: `calc(${(l?.vanster ?? 0) * 100}% + 1px)`,
                                                    width: `calc(${(l?.bredd ?? 1) * 100}% - 2px)`,
                                                    /* Trappans djup styr staplingen. Som CSS-variabel
                                                       och inte som inline z-index — ett inline-värde
                                                       hade slagit ut :hover och [data-vald], som
                                                       behöver kunna lyfta blocket över de andra. */
                                                    ["--lager"]: l?.lager ?? 0,
                                                }, onPointerDown: (e) => paBlockNed(e, seg), onPointerMove: paRorelse, onPointerUp: (e) => paUpp(e, seg), onPointerCancel: (e) => paUpp(e), onKeyDown: (e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        onOppna(seg.f);
                                                    }
                                                }, title: `${seg.f.handelse.titel} — ${(0, tid_1.klocka)(seg.f.start)}–${(0, tid_1.klocka)(seg.f.slut)}`, children: [!seg.fortsatterFore && ((0, jsx_runtime_1.jsx)("span", { className: "grepp", "data-kant": "topp", onPointerDown: (e) => paBlockNed(e, seg, "topp"), onPointerMove: paRorelse, onPointerUp: (e) => paUpp(e) })), (0, jsx_runtime_1.jsxs)("span", { className: "handelse-titel", children: [seg.f.serie && "↻ ", seg.f.handelse.titel] }), hojd > 26 || kort ? ((0, jsx_runtime_1.jsx)("span", { className: "handelse-tid", children: kort
                                                            ? (0, tid_1.klockaKort)(seg.f.start)
                                                            : `${(0, tid_1.klocka)(seg.f.start)}–${(0, tid_1.klocka)(seg.f.slut)}` })) : null, hojd > 58 && seg.f.handelse.plats && ((0, jsx_runtime_1.jsx)("span", { className: "handelse-tid", children: seg.f.handelse.plats })), !seg.fortsatterEfter && ((0, jsx_runtime_1.jsx)("span", { className: "grepp", "data-kant": "botten", onPointerDown: (e) => paBlockNed(e, seg, "botten"), onPointerMove: paRorelse, onPointerUp: (e) => paUpp(e) }))] }, seg.nyckel));
                                        }), drag?.typ === "rita" &&
                                            drag.aktiv &&
                                            (0, tid_1.arSammaDag)(drag.start, d) && ((0, jsx_runtime_1.jsx)("div", { className: "nyritning", style: {
                                                top: ((0, tid_1.minuterInPaDagen)(drag.start) / 60) * timhojd,
                                                height: Math.max(13, ((drag.slut.getTime() - drag.start.getTime()) /
                                                    3600000) *
                                                    timhojd),
                                                left: 1,
                                                right: 1,
                                            }, children: (0, jsx_runtime_1.jsxs)("span", { className: "handelse-tid !opacity-100", children: [(0, tid_1.klocka)(drag.start), "\u2013", (0, tid_1.klocka)(drag.slut)] }) })), idag && ((0, jsx_runtime_1.jsx)("div", { className: "nulinje", style: { top: nuTopp } }))] }, dn));
                            }) })] }) }), drag?.aktiv && ((0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-t border-ink bg-ink text-paper px-3 py-1 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico", children: drag.typ === "rita"
                            ? "Ny händelse"
                            : drag.typ === "langd"
                                ? "Ändrar längd"
                                : "Flyttar" }), (0, jsx_runtime_1.jsxs)("span", { className: "micro tabnum", children: [(0, tid_1.kortDatum)(drag.start), " \u00B7 ", (0, tid_1.klocka)(drag.start), "\u2013", (0, tid_1.klocka)(drag.slut), " \u00B7", " ", (0, tid_1.minuterTillText)(Math.round((drag.slut.getTime() - drag.start.getTime()) / 60000))] })] }))] }));
}
function dragForekomst(d) {
    if (d.typ === "rita")
        return null;
    return { nyckel: d.f.nyckel, start: d.start, slut: d.slut };
}
