"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ArsVy;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Årsvyn — tolv minimånader som ett uppslag.
 *
 * Vyn är till för att se mönster, inte enskilda möten: därför visas ingen
 * text alls, bara en densitetsmarkering under varje datum. Att försöka
 * klämma in titlar i en ruta på tio pixlar ger bara grå gröt.
 */
const react_1 = require("react");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
function ArsVy({ peka, forekomster, onGaTillDag, onGaTillManad, }) {
    const ar = peka.getFullYear();
    const nu = new Date();
    /** Antal förekomster per dygn. Räknas en gång för hela året. */
    const tathet = (0, react_1.useMemo)(() => {
        const karta = new Map();
        for (const f of forekomster) {
            let d = new Date(f.start.getFullYear(), f.start.getMonth(), f.start.getDate());
            const slut = f.slut;
            let varv = 0;
            while (d < slut && varv++ < 400) {
                const k = (0, tid_1.nyckel)(d);
                karta.set(k, (karta.get(k) ?? 0) + 1);
                d = (0, tid_1.addDagar)(d, 1);
            }
            // En händelse som slutar exakt vid midnatt räknas inte in i nästa dygn.
            if (varv === 0) {
                const k = (0, tid_1.nyckel)(f.start);
                karta.set(k, (karta.get(k) ?? 0) + 1);
            }
        }
        return karta;
    }, [forekomster]);
    const summaPerManad = (0, react_1.useMemo)(() => {
        const per = new Array(12).fill(0);
        tathet.forEach((antal, k) => {
            const [a, m] = k.split("-").map(Number);
            if (a === ar)
                per[m - 1] += antal;
        });
        return per;
    }, [tathet, ar]);
    return ((0, jsx_runtime_1.jsx)("div", { className: "h-full min-h-0 overflow-y-auto tunnskroll p-3", children: (0, jsx_runtime_1.jsx)("div", { className: "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: Array.from({ length: 12 }, (_, m) => ((0, jsx_runtime_1.jsx)(MiniManad, { ar: ar, manad: m, nu: nu, tathet: tathet, summa: summaPerManad[m], onGaTillDag: onGaTillDag, onGaTillManad: onGaTillManad }, m))) }) }));
}
function MiniManad({ ar, manad, nu, tathet, summa, onGaTillDag, onGaTillManad, }) {
    const forsta = new Date(ar, manad, 1);
    const rutor = (0, react_1.useMemo)(() => {
        const start = (0, tid_1.startAvVecka)(forsta);
        const antalRader = Math.ceil((((forsta.getDay() + 6) % 7) + (0, tid_1.dagarIManad)(ar, manad)) / 7);
        return Array.from({ length: antalRader * 7 }, (_, i) => (0, tid_1.addDagar)(start, i));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ar, manad]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "cf border border-ink bg-panel p-2", style: { ["--cf"]: "5px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline justify-between mb-1.5 gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "display text-[1.05rem] leading-none hover:text-accent transition-colors", onClick: () => onGaTillManad(forsta), children: tid_1.MANADER[manad] }), (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-50 tabnum", children: [summa, " ", summa === 1 ? "post" : "poster"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-8 gap-x-0.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-35 text-center leading-[1.6]", children: "V" }), tid_1.VECKODAGAR_MINI.slice(1)
                        .concat(tid_1.VECKODAGAR_MINI[0])
                        .map((v, i) => ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 text-center leading-[1.6]", children: v }, i))), rutor.map((d, i) => {
                        const visaVecka = i % 7 === 0;
                        const utanfor = d.getMonth() !== manad;
                        const antal = tathet.get((0, tid_1.nyckel)(d)) ?? 0;
                        return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [visaVecka && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-30 text-center self-center tabnum", children: (0, tid_1.isoVecka)(d) })), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "minidag tabnum", "data-idag": (0, tid_1.arSammaDag)(d, nu) ? "1" : "0", "data-utanfor": utanfor ? "1" : "0", "data-helg": (0, tid_1.arHelg)(d) ? "1" : "0", onClick: () => onGaTillDag(d), title: `${d.getDate()}/${d.getMonth() + 1} — ${antal} ${antal === 1 ? "post" : "poster"}`, children: [d.getDate(), antal > 0 && !utanfor && ((0, jsx_runtime_1.jsx)("span", { className: "minidag-punkt", style: { width: Math.min(3 + antal, 9) } }))] })] }, (0, tid_1.nyckel)(d)));
                    })] })] }));
}
