"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ManadsVy;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Månadsvyn — sex rader à sju dygn, alltid 42 rutor. Antalet rutor hålls
 * fast för att rutnätet inte skall hoppa i höjd mellan februari och mars.
 *
 * Här dras händelser mellan dygn, inte mellan klockslag: klockslaget följer
 * med oförändrat. Det är den enda rimliga tolkningen — i en ruta som är
 * ett dygn hög finns ingen upplösning att sikta med.
 */
const react_1 = require("react");
const layout_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/layout");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const RADHOJD = 19;
const TOPPMARGINAL = 24;
function ManadsVy({ peka, forekomster, vald, onValj, onOppna, onFlytta, onSkapa, onGaTillDag, }) {
    const dagar = (0, react_1.useMemo)(() => (0, tid_1.manadsrutnat)(peka), [peka]);
    const rutorRef = (0, react_1.useRef)(null);
    const [drag, setDrag] = (0, react_1.useState)(null);
    const [nu, setNu] = (0, react_1.useState)(() => new Date());
    (0, react_1.useEffect)(() => {
        const id = window.setInterval(() => setNu(new Date()), 60000);
        return () => window.clearInterval(id);
    }, []);
    const veckor = (0, react_1.useMemo)(() => Array.from({ length: 6 }, (_, i) => dagar.slice(i * 7, i * 7 + 7)), [dagar]);
    /** Vilket dygn ligger under pekaren? Läses ur DOM via data-attribut. */
    const dagUnder = (0, react_1.useCallback)((x, y) => {
        const el = document.elementFromPoint(x, y);
        const ruta = el?.closest?.("[data-dagnyckel]");
        return ruta?.dataset.dagnyckel ?? null;
    }, []);
    const paNed = (0, react_1.useCallback)((e, f, dagnyckel) => {
        if (e.button !== 0)
            return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        onValj(f);
        setDrag({ f, fran: dagnyckel, over: null });
    }, [onValj]);
    const paRorelse = (0, react_1.useCallback)((e) => {
        if (!drag)
            return;
        const over = dagUnder(e.clientX, e.clientY);
        setDrag((d) => (d && d.over !== over ? { ...d, over } : d));
    }, [drag, dagUnder]);
    const paUpp = (0, react_1.useCallback)((e) => {
        const el = e.currentTarget;
        if (el.hasPointerCapture?.(e.pointerId)) {
            el.releasePointerCapture(e.pointerId);
        }
        const d = drag;
        setDrag(null);
        if (!d)
            return;
        if (!d.over || d.over === d.fran) {
            onOppna(d.f);
            return;
        }
        // Skillnaden mäts i hela dygn; klockslaget rörs inte.
        const skift = (0, tid_1.dygnMellan)((0, tid_1.tolka)(d.fran), (0, tid_1.tolka)(d.over));
        const nyStart = (0, tid_1.addDagar)(d.f.start, skift);
        const nySlut = (0, tid_1.addDagar)(d.f.slut, skift);
        onFlytta(d.f, nyStart, nySlut);
    }, [drag, onFlytta, onOppna]);
    (0, react_1.useEffect)(() => {
        if (!drag)
            return;
        const paTangent = (e) => {
            if (e.key === "Escape")
                setDrag(null);
        };
        window.addEventListener("keydown", paTangent);
        return () => window.removeEventListener("keydown", paTangent);
    }, [drag]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full min-h-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 border-b border-ink bg-paper", children: [(0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-r border-ink flex items-center justify-center", style: { width: "var(--rannil)" }, children: (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55", children: "V" }) }), tid_1.VECKODAGAR_KORT.slice(1)
                        .concat(tid_1.VECKODAGAR_KORT[0])
                        .map((namn) => ((0, jsx_runtime_1.jsx)("div", { className: "flex-1 py-1.5 text-center border-l border-ink/15 first:border-l-0", children: (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-70", children: namn }) }, namn)))] }), (0, jsx_runtime_1.jsx)("div", { ref: rutorRef, className: "flex-1 min-h-0 flex flex-col", children: veckor.map((vecka, vi) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex-1 flex min-h-0", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onGaTillDag(vecka[0]), className: "shrink-0 border-r border-t border-ink/15 flex items-start justify-center pt-1.5 hover:bg-ink hover:text-paper transition-colors", style: { width: "var(--rannil)" }, title: `Gå till vecka ${(0, tid_1.isoVecka)(vecka[0])}`, children: (0, jsx_runtime_1.jsx)("span", { className: "pico tabnum opacity-70", children: (0, tid_1.isoVecka)(vecka[0]) }) }), (0, jsx_runtime_1.jsx)(VeckoRad, { vecka: vecka, peka: peka, nu: nu, forekomster: forekomster, vald: vald, drag: drag, onValj: onValj, onOppna: onOppna, onSkapa: onSkapa, onGaTillDag: onGaTillDag, paNed: paNed, paRorelse: paRorelse, paUpp: paUpp })] }, vi))) })] }));
}
function VeckoRad({ vecka, peka, nu, forekomster, vald, drag, onValj, onOppna, onSkapa, onGaTillDag, paNed, paRorelse, paUpp, }) {
    const radRef = (0, react_1.useRef)(null);
    const [platser, setPlatser] = (0, react_1.useState)(4);
    const veckoStart = (0, tid_1.startAvDag)(vecka[0]);
    const veckoSlut = (0, tid_1.addDagar)(veckoStart, 7);
    // Flerdygnshändelser läggs som sammanhängande band över veckan;
    // endagshändelser blir ettdagsband. Samma packning för båda, så att
    // ordningen inom en dag är stabil oavsett längd.
    const poster = (0, react_1.useMemo)(() => {
        const ut = [];
        for (const f of forekomster) {
            if (f.slut <= veckoStart || f.start >= veckoSlut)
                continue;
            const fran = (0, tid_1.dygnMellan)(veckoStart, f.start);
            const slutDygn = (0, tid_1.dygnMellan)(veckoStart, f.slut);
            // Ett heldagsspann slutar 00:00 dagen efter — den sista rutan skall
            // ändå räknas med, men bara om det finns tid kvar av dygnet.
            const till = f.slut.getHours() === 0 && f.slut.getMinutes() === 0
                ? Math.max(fran + 1, slutDygn)
                : slutDygn + 1;
            ut.push({ forekomst: f, fran, till });
        }
        return ut;
    }, [forekomster, veckoStart, veckoSlut]);
    const { band } = (0, react_1.useMemo)(() => (0, layout_1.laggUtBand)(poster, 7), [poster]);
    // Hur många band ryms innan raden måste skriva "+3 till"?
    (0, react_1.useEffect)(() => {
        const el = radRef.current;
        if (!el)
            return;
        const mat = () => {
            const h = el.clientHeight - TOPPMARGINAL;
            setPlatser(Math.max(1, Math.floor(h / RADHOJD)));
        };
        mat();
        const obs = new ResizeObserver(mat);
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    const synligaRader = Math.max(1, platser - (band.some((b) => b.rad >= platser) ? 1 : 0));
    const overskott = (0, react_1.useMemo)(() => {
        const per = new Array(7).fill(0);
        for (const b of band) {
            if (b.rad < synligaRader)
                continue;
            for (let i = b.fran; i < b.till; i++)
                per[i] += 1;
        }
        return per;
    }, [band, synligaRader]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: radRef, className: "flex-1 relative min-w-0", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 flex", children: vecka.map((d) => {
                    const dn = (0, tid_1.nyckel)(d);
                    const utanfor = d.getMonth() !== peka.getMonth();
                    const idag = (0, tid_1.arSammaDag)(d, nu);
                    return ((0, jsx_runtime_1.jsx)("div", { "data-dagnyckel": dn, "data-utanfor": utanfor ? "1" : "0", "data-helg": (0, tid_1.arHelg)(d) ? "1" : "0", "data-idag": idag ? "1" : "0", "data-slappmal": drag && drag.over === dn && drag.over !== drag.fran ? "1" : "0", className: "manadsruta flex-1", onDoubleClick: () => {
                            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0);
                            onSkapa(start, new Date(start.getTime() + 3600000), false);
                        }, onClick: () => onValj(null), children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between px-1.5 pt-1 shrink-0", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "manadsruta-tal tabnum hover:text-accent transition-colors", onClick: (e) => {
                                        e.stopPropagation();
                                        onGaTillDag(d);
                                    }, title: "\u00D6ppna dagen", children: d.getDate() }), d.getDate() === 1 && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-55 pt-0.5", children: tid_1.MANADER[d.getMonth()].slice(0, 3) }))] }) }, dn));
                }) }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute inset-0 pointer-events-none", children: [band
                        .filter((b) => b.rad < synligaRader)
                        .map((b) => {
                        const bredd = 100 / 7;
                        const dras = drag?.f.nyckel === b.forekomst.nyckel;
                        const flerdygn = b.till - b.fran > 1;
                        const heldagsaktig = b.forekomst.heldag || flerdygn;
                        return ((0, jsx_runtime_1.jsx)("button", { type: "button", className: heldagsaktig
                                ? "heldag-block absolute pointer-events-auto"
                                : "absolute pointer-events-auto flex items-center gap-1.5 px-1 text-left w-full overflow-hidden", "data-ton": b.forekomst.ton, "data-vald": vald === b.forekomst.nyckel ? "1" : "0", style: {
                                left: `calc(${b.fran * bredd}% + 3px)`,
                                width: `calc(${(b.till - b.fran) * bredd}% - 6px)`,
                                top: TOPPMARGINAL + b.rad * RADHOJD,
                                height: RADHOJD - 3,
                                opacity: dras ? 0.45 : 1,
                                cursor: "grab",
                                touchAction: "none",
                            }, onPointerDown: (e) => paNed(e, b.forekomst, (0, tid_1.nyckel)((0, tid_1.addDagar)(veckoStart, b.fran))), onPointerMove: paRorelse, onPointerUp: paUpp, onPointerCancel: paUpp, title: b.forekomst.handelse.titel, children: heldagsaktig ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [b.klipptVanster && "‹ ", b.forekomst.serie && "↻ ", b.forekomst.handelse.titel, b.klipptHoger && " ›"] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "shrink-0", style: {
                                            width: 6,
                                            height: 6,
                                            background: `var(--kal-${b.forekomst.ton + 1}-stark)`,
                                        } }), (0, jsx_runtime_1.jsx)("span", { className: "text-[0.55rem] leading-none tabnum opacity-65 shrink-0", children: (0, tid_1.klockaKort)(b.forekomst.start) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[0.58rem] leading-none truncate", children: b.forekomst.handelse.titel })] })) }, b.nyckel));
                    }), overskott.map((antal, i) => antal > 0 ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "absolute pointer-events-auto pico opacity-70 hover:opacity-100 hover:text-accent px-1 text-left", style: {
                            left: `calc(${i * (100 / 7)}% + 4px)`,
                            top: TOPPMARGINAL + synligaRader * RADHOJD,
                            height: RADHOJD - 3,
                        }, onClick: () => onGaTillDag((0, tid_1.addDagar)(veckoStart, i)), children: ["+", antal, " till"] }, i)) : null)] })] }));
}
