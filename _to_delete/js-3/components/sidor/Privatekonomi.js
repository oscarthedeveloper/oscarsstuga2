"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Privatekonomi;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Privatekonomi — månadsplanering.
 *
 * Gjord för kvarten före löning: pengarna kommer in och skall fördelas.
 * Därför ligger KVAR ATT FÖRDELA överst och störst — det är talet man
 * arbetar ned mot noll — och kategorierna direkt under.
 *
 * Sidan räknar allt själv. Andel, avvikelse, sparkvot, framsteg och
 * prognos följer av det man skriver in; ingenting av det går att skriva
 * för hand, eftersom ett tal man matat in och ett tal som räknats fram
 * ser likadana ut och det första blir fel den dag man ändrar något annat.
 *
 * Under planen ligger två register som INTE är planen. Inköpen är de
 * enskilda utgifter man vill minnas, och de föreslår månadens utfall med
 * en pil man trycker på — de skriver det aldrig själva. Abonnemangen är
 * det som dras utan att man gör något, och räknas i den månad avgiften
 * faktiskt dras.
 */
const react_1 = require("react");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const ekonomi_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/ekonomi");
const Avsnitt_1 = __importDefault(require("./block/Avsnitt"));
const Rader_1 = __importDefault(require("./block/Rader"));
const Talfalt_1 = __importDefault(require("./block/Talfalt"));
const Fordelningsstapel_1 = __importDefault(require("./block/Fordelningsstapel"));
const Manadsstapel_1 = __importDefault(require("./block/Manadsstapel"));
const VILA_MS = 600;
const samma = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Belopp skrivs "7 500". Talfältet får därför egna regler. */
const skrivKrona = (n) => (n === null ? "" : (0, ekonomi_1.kronor)(n));
/**
 * Datumet ett nytt inköp skall få.
 *
 * Idag om man står i innevarande månad, annars den första i den månad
 * man tittar på. Att alltid föreslå idag hade lagt raden i fel månad så
 * fort man efterregistrerar, och den försvinner då ur listan man just
 * skriver i — vilket ser ut som att den inte sparades.
 */
function nyttInkopsdatum(manadId) {
    const idag = new Date();
    return (0, tid_1.nyckel)(idag).startsWith(manadId) ? (0, tid_1.nyckel)(idag) : `${manadId}-01`;
}
function Privatekonomi({ sida, spara, }) {
    const utifran = (0, react_1.useMemo)(() => (0, ekonomi_1.tolkaEkonomiData)(sida?.data), [sida]);
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
       Vilken månad
       --------------------------------------------------------------- */
    const [valdId, setValdId] = (0, react_1.useState)(null);
    const [visaUtfall, setVisaUtfall] = (0, react_1.useState)(false);
    const [hanterar, setHanterar] = (0, react_1.useState)(false);
    const manad = (0, ekonomi_1.manadMed)(form, valdId) ?? form.manader[form.manader.length - 1] ?? null;
    const laggManad = () => {
        const id = (0, ekonomi_1.nastaLedigaManad)(form);
        if ((0, ekonomi_1.manadMed)(form, id))
            return;
        andra((d) => ({
            ...d,
            manader: [...d.manader, (0, ekonomi_1.manadUrMall)(d, id)].sort((a, b) => a.id.localeCompare(b.id)),
        }));
        setValdId(id);
    };
    const andraManad = (id, delar) => andra((d) => ({
        ...d,
        manader: d.manader.map((m) => (m.id === id ? { ...m, ...delar } : m)),
    }));
    const sattPost = (manadId, kategoriId, falt, varde) => andra((d) => ({
        ...d,
        manader: d.manader.map((m) => {
            if (m.id !== manadId)
                return m;
            const finns = m.poster.some((p) => p.kategoriId === kategoriId);
            return {
                ...m,
                poster: finns
                    ? m.poster.map((p) => p.kategoriId === kategoriId ? { ...p, [falt]: varde } : p)
                    : [
                        ...m.poster,
                        { kategoriId, plan: null, utfall: null, [falt]: varde },
                    ],
            };
        }),
    }));
    /* ---------------------------------------------------------------
       Kategorier
       --------------------------------------------------------------- */
    const nyKategori = () => andra((d) => ({
        ...d,
        kategorier: [
            ...d.kategorier,
            {
                id: (0, butik_1.nyId)(),
                namn: "",
                sparande: false,
                ton: (0, ekonomi_1.klamTon)(d.kategorier.length),
            },
        ],
    }));
    const andraKategori = (id, delar) => andra((d) => ({
        ...d,
        kategorier: d.kategorier.map((k) => k.id === id ? { ...k, ...delar } : k),
    }));
    /* En borttagen kategori måste bort ur varje månad och ur mallen. Blir
       posterna kvar syns de inte men räknas fortfarande in i summorna.
  
       Inköpen är ett undantag: de tappar sin kategori men får ligga kvar.
       Pengarna gick åt oavsett vad raden hette, och en omdöpt budget skall
       inte kunna radera historiken. */
    const taBortKategori = (id) => andra((d) => ({
        ...d,
        kategorier: d.kategorier.filter((k) => k.id !== id),
        manader: d.manader.map((m) => ({
            ...m,
            poster: m.poster.filter((p) => p.kategoriId !== id),
        })),
        mall: {
            ...d.mall,
            poster: d.mall.poster.filter((p) => p.kategoriId !== id),
        },
        inkop: d.inkop.map((i) => i.kategoriId === id ? { ...i, kategoriId: "" } : i),
    }));
    /* ---------------------------------------------------------------
       Inköp
       --------------------------------------------------------------- */
    const [visaAllaInkop, setVisaAllaInkop] = (0, react_1.useState)(false);
    const nyttInkop = () => andra((d) => ({
        ...d,
        inkop: [
            {
                id: (0, butik_1.nyId)(),
                datum: nyttInkopsdatum(manad?.id ?? (0, ekonomi_1.nastaLedigaManad)(d)),
                namn: "",
                belopp: null,
                kategoriId: "",
            },
            ...d.inkop,
        ],
    }));
    const andraInkop = (id, delar) => andra((d) => ({
        ...d,
        inkop: d.inkop.map((i) => (i.id === id ? { ...i, ...delar } : i)),
    }));
    const taBortInkop = (id) => andra((d) => ({ ...d, inkop: d.inkop.filter((i) => i.id !== id) }));
    /**
     * Fyller månadens utfall ur inköpen.
     *
     * Rör bara kategorier som FAKTISKT har inköp. Att nolla de övriga vore
     * att påstå att ingenting gick åt där, och det är ett påstående som
     * kommer från att listan är ofullständig och inte från verkligheten.
     */
    const fyllUtfallUrInkop = (manadId) => andra((d) => ({
        ...d,
        manader: d.manader.map((m) => {
            if (m.id !== manadId)
                return m;
            const poster = [...m.poster];
            for (const k of d.kategorier) {
                const belopp = (0, ekonomi_1.inkopFor)(d, manadId, k.id);
                if (belopp === null)
                    continue;
                const i = poster.findIndex((p) => p.kategoriId === k.id);
                if (i === -1) {
                    poster.push({ kategoriId: k.id, plan: null, utfall: belopp });
                }
                else {
                    poster[i] = { ...poster[i], utfall: belopp };
                }
            }
            return { ...m, poster };
        }),
    }));
    /* ---------------------------------------------------------------
       Abonnemang
       --------------------------------------------------------------- */
    const nyttAbonnemang = () => andra((d) => ({
        ...d,
        abonnemang: [
            ...d.abonnemang,
            {
                id: (0, butik_1.nyId)(),
                namn: "",
                belopp: null,
                period: "manad",
                dragManad: new Date().getMonth() + 1,
                aktiv: true,
            },
        ],
    }));
    const andraAbonnemang = (id, delar) => andra((d) => ({
        ...d,
        abonnemang: d.abonnemang.map((a) => a.id === id ? { ...a, ...delar } : a),
    }));
    const taBortAbonnemang = (id) => andra((d) => ({
        ...d,
        abonnemang: d.abonnemang.filter((a) => a.id !== id),
    }));
    /* ---------------------------------------------------------------
       Uträkningar
       --------------------------------------------------------------- */
    const kvar = manad ? (0, ekonomi_1.kvarAttFordela)(manad) : null;
    const fram = (0, react_1.useMemo)(() => (0, ekonomi_1.framsteg)(form), [form]);
    const prog = (0, react_1.useMemo)(() => (0, ekonomi_1.prognos)(form), [form]);
    const takt = (0, react_1.useMemo)(() => (0, ekonomi_1.genomsnittligtSparande)(form), [form]);
    const delar = (0, react_1.useMemo)(() => manad
        ? form.kategorier
            .map((k) => ({
            id: k.id,
            namn: k.namn || "Namnlös",
            belopp: (0, ekonomi_1.postFor)(manad, k.id)?.plan ?? 0,
            ton: k.ton,
        }))
            .filter((d) => d.belopp > 0)
        : [], [form.kategorier, manad]);
    const inkopIVy = (0, react_1.useMemo)(() => {
        if (visaAllaInkop || !manad) {
            return [...form.inkop].sort((a, b) => b.datum.localeCompare(a.datum));
        }
        return (0, ekonomi_1.inkopIManad)(form, manad.id);
    }, [form, manad, visaAllaInkop]);
    /* Inköpen i den valda månaden, oavsett vad listan visar. Summan under
       listan skall svara på samma fråga som tabellen ovanför. */
    const inkopDennaManad = (0, react_1.useMemo)(() => (manad ? (0, ekonomi_1.inkopIManad)(form, manad.id) : []), [form, manad]);
    const abonnemangNu = manad ? (0, ekonomi_1.abonnemangsKostnad)(form, manad.id) : null;
    const abonnemangAr = (0, react_1.useMemo)(() => (0, ekonomi_1.abonnemangPerAr)(form), [form]);
    const staplar = (0, react_1.useMemo)(() => form.manader.map((m) => ({
        id: m.id,
        etikett: tid_1.MANADER_KORT[Number(m.id.slice(5, 7)) - 1]?.toLowerCase() ?? m.id,
        plan: (0, ekonomi_1.sparandePlan)(form, m),
        utfall: (0, ekonomi_1.harUtfall)(m) ? (0, ekonomi_1.sparandeUtfall)(form, m) : null,
    })), [form]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 overflow-y-auto tunnskroll", children: [(0, jsx_runtime_1.jsxs)("div", { className: "matarpanel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-[8rem]", children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "M\u00E5nad" }), form.manader.length > 0 ? ((0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto", value: manad?.id ?? "", onChange: (e) => setValdId(e.target.value), "aria-label": "V\u00E4lj m\u00E5nad", children: [...form.manader].reverse().map((m) => ((0, jsx_runtime_1.jsx)("option", { value: m.id, children: (0, ekonomi_1.manadsText)(m.id) }, m.id))) })) : ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45", children: "Ingen \u00E4nnu" }))] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Inkomst" }), manad ? ((0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: manad.inkomst, onVarde: (n) => andraManad(manad.id, { inkomst: n }), etikett: "Inkomst f\u00F6r m\u00E5naden", platshallare: "25\u00A0000", className: "falt !w-[7.5rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona })) : ((0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: "\u2014" }))] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "F\u00F6rdelat" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: manad ? (0, ekonomi_1.kronor)((0, ekonomi_1.summaPlan)(manad)) : "—" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: kvar !== null && kvar < 0 ? "Övertrasserat" : "Kvar att fördela" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", "data-atgard": kvar !== null && kvar !== 0 ? "1" : "0", children: kvar === null ? "—" : (0, ekonomi_1.kronor)(Math.abs(kvar)) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Sparkvot" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: manad ? (0, ekonomi_1.procent)((0, ekonomi_1.sparkvot)(form, manad)) : "—" })] }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", onClick: laggManad, children: "+ M\u00E5nad" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] max-w-[1240px]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex flex-col gap-2.5 md:gap-3", children: [(0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: manad ? (0, ekonomi_1.manadsText)(manad.id) : "Ingen månad", bihang: "Belopp i kronor \u2014 andelen r\u00E4knas ut", atgard: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [visaUtfall && manad && inkopDennaManad.length > 0 && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => fyllUtfallUrInkop(manad.id), title: "S\u00E4tter utfallet till summan av m\u00E5nadens ink\u00F6p, kategori f\u00F6r kategori", children: "Fyll ur ink\u00F6pen" })), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": visaUtfall ? "1" : "0", onClick: () => setVisaUtfall((v) => !v), children: "Utfall" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": hanterar ? "1" : "0", onClick: () => setHanterar((v) => !v), children: "Kategorier" })] }), children: !manad ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-5 leading-relaxed", children: "Ingen m\u00E5nad upplagd. Tryck + M\u00E5nad \u2014 den fylls i ur mallen, s\u00E5 att kvarten f\u00F6re l\u00F6ning blir att justera och inte att b\u00F6rja om." })) : form.kategorier.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-5 leading-relaxed", children: "Inga kategorier. Tryck Kategorier och l\u00E4gg upp dem du f\u00F6rdelar till \u2014 Sparande, L\u00F6pande utgifter, Behov, N\u00F6jen." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(Fordelningsstapel_1.default, { delar: delar, kvar: kvar, inkomst: manad.inkomst }), (0, jsx_runtime_1.jsx)("div", { className: "tabellsvep px-2.5 pb-2.5", children: (0, jsx_runtime_1.jsxs)("table", { className: "ekotabell", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Kategori" }), (0, jsx_runtime_1.jsx)("th", { children: "Plan" }), (0, jsx_runtime_1.jsx)("th", { children: "Andel" }), visaUtfall && (0, jsx_runtime_1.jsx)("th", { children: "Ink\u00F6p" }), visaUtfall && (0, jsx_runtime_1.jsx)("th", { children: "Utfall" }), visaUtfall && (0, jsx_runtime_1.jsx)("th", { children: "Avvikelse" }), (0, jsx_runtime_1.jsx)("th", { children: "Mot f\u00F6rra" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: form.kategorier.map((k) => {
                                                            const post = (0, ekonomi_1.postFor)(manad, k.id);
                                                            const av = post ? (0, ekonomi_1.avvikelse)(post) : null;
                                                            const mot = (0, ekonomi_1.motForegaende)(form, manad.id, k.id);
                                                            const ink = (0, ekonomi_1.inkopFor)(form, manad.id, k.id);
                                                            return ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "ekoprick", style: { background: `var(--kal-${k.ton + 1})` }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { className: "min-w-0", children: k.namn || "Namnlös" }), k.sparande && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-35 shrink-0", children: "spar" }))] }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: post?.plan ?? null, onVarde: (n) => sattPost(manad.id, k.id, "plan", n), etikett: `Plan för ${k.namn || "kategorin"}`, platshallare: "0", className: "falt !w-[5.5rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona }) }), (0, jsx_runtime_1.jsx)("td", { className: "opacity-55", children: (0, ekonomi_1.procent)((0, ekonomi_1.andelAvInkomst)(post?.plan ?? null, manad)) }), visaUtfall && ((0, jsx_runtime_1.jsx)("td", { children: ink === null ? ((0, jsx_runtime_1.jsx)("span", { className: "opacity-25", children: "\u2014" })) : ink === (post?.utfall ?? null) ? ((0, jsx_runtime_1.jsx)("span", { className: "opacity-45", children: (0, ekonomi_1.kronor)(ink) })) : ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico tabnum", onClick: () => sattPost(manad.id, k.id, "utfall", ink), title: `Sätt utfallet till ${(0, ekonomi_1.kronor)(ink)} kr ur inköpen`, children: [(0, ekonomi_1.kronor)(ink), " \u2192"] })) })), visaUtfall && ((0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: post?.utfall ?? null, onVarde: (n) => sattPost(manad.id, k.id, "utfall", n), etikett: `Utfall för ${k.namn || "kategorin"}`, platshallare: "\u2014", className: "falt !w-[5.5rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona }) })), visaUtfall && ((0, jsx_runtime_1.jsx)("td", { className: "avvikelse", "data-over": av !== null && av > 0 ? "1" : "0", children: (0, ekonomi_1.kronorMedTecken)(av) })), (0, jsx_runtime_1.jsx)("td", { className: "opacity-45", children: mot === null ? "—" : (0, ekonomi_1.kronorMedTecken)(mot) })] }, k.id));
                                                        }) }), (0, jsx_runtime_1.jsx)("tfoot", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: "Summa" }), (0, jsx_runtime_1.jsx)("td", { children: (0, ekonomi_1.kronor)((0, ekonomi_1.summaPlan)(manad)) }), (0, jsx_runtime_1.jsx)("td", { className: "opacity-55", children: (0, ekonomi_1.procent)((0, ekonomi_1.andelAvInkomst)((0, ekonomi_1.summaPlan)(manad), manad)) }), visaUtfall && ((0, jsx_runtime_1.jsx)("td", { className: "opacity-55", children: inkopDennaManad.length === 0
                                                                        ? "—"
                                                                        : (0, ekonomi_1.kronor)((0, ekonomi_1.summaInkop)(inkopDennaManad)) })), visaUtfall && (0, jsx_runtime_1.jsx)("td", { children: (0, ekonomi_1.kronor)((0, ekonomi_1.summaUtfall)(manad)) }), visaUtfall && ((0, jsx_runtime_1.jsx)("td", { className: "avvikelse", "data-over": (0, ekonomi_1.harUtfall)(manad) &&
                                                                        (0, ekonomi_1.summaUtfall)(manad) > (0, ekonomi_1.summaPlan)(manad)
                                                                        ? "1"
                                                                        : "0", children: (0, ekonomi_1.harUtfall)(manad)
                                                                        ? (0, ekonomi_1.kronorMedTecken)((0, ekonomi_1.summaUtfall)(manad) - (0, ekonomi_1.summaPlan)(manad))
                                                                        : "—" })), (0, jsx_runtime_1.jsx)("td", {})] }) })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "px-2.5 pb-2.5", children: (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Anteckning om m\u00E5naden", value: manad.anteckning, onChange: (e) => andraManad(manad.id, { anteckning: e.target.value }), "aria-label": "Anteckning om m\u00E5naden" }) })] })) }), (0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: "Ink\u00F6p", bihang: "Enskilda utgifter v\u00E4rda att minnas", atgard: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": visaAllaInkop ? "1" : "0", onClick: () => setVisaAllaInkop((v) => !v), title: "Visa ink\u00F6pen fr\u00E5n alla m\u00E5nader", children: "Alla" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: nyttInkop, children: "+ Ink\u00F6p" })] }), children: [(0, jsx_runtime_1.jsx)(Rader_1.default, { rader: inkopIVy, onTaBort: taBortInkop, tomText: visaAllaInkop
                                            ? "Inga inköp inlagda. Här hör de stora hemma — Airpods Pro 2 500, klädesinköp 2 000 — inte dagens fika."
                                            : `Inga inköp i ${manad ? (0, ekonomi_1.manadsText)(manad.id).toLowerCase() : "månaden"}. Här hör de stora hemma — Airpods Pro 2 500, klädesinköp 2 000 — inte dagens fika.`, rita: (i) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt datumfalt", value: i.datum, onChange: (e) => andraInkop(i.id, { datum: e.target.value }), "aria-label": "Datum f\u00F6r ink\u00F6pet" }), (0, jsx_runtime_1.jsx)("input", { className: "falt min-w-[7rem] flex-1", placeholder: "Vad k\u00F6pte du?", value: i.namn, onChange: (e) => andraInkop(i.id, { namn: e.target.value }), "aria-label": "Vad ink\u00F6pet var" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: i.belopp, onVarde: (n) => andraInkop(i.id, { belopp: n }), etikett: "Belopp", platshallare: "0", className: "falt !w-[6rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona }), (0, jsx_runtime_1.jsxs)("select", { className: "falt !w-auto shrink-0", value: i.kategoriId, onChange: (e) => andraInkop(i.id, { kategoriId: e.target.value }), "aria-label": "Kategori f\u00F6r ink\u00F6pet", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Utan kategori" }), form.kategorier.map((k) => ((0, jsx_runtime_1.jsx)("option", { value: k.id, children: k.namn || "Namnlös" }, k.id)))] })] })) }), inkopIVy.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "px-3 py-2 flex items-baseline gap-2 border-t border-ink/15", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45", children: visaAllaInkop || !manad ? "Alla inköp" : (0, ekonomi_1.manadsText)(manad.id) }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsxs)("span", { className: "micro tabnum", children: [(0, ekonomi_1.kronor)((0, ekonomi_1.summaInkop)(inkopIVy)), " kr"] })] }))] }), hanterar && ((0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Kategorier", bihang: "Gemensamma f\u00F6r alla m\u00E5nader", atgard: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: nyKategori, children: "+ Kategori" }), children: form.kategorier.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-4 leading-relaxed", children: "Inga kategorier \u00E4nnu. De \u00E4r gemensamma f\u00F6r alla m\u00E5nader \u2014 det \u00E4r det som g\u00F6r att augusti g\u00E5r att j\u00E4mf\u00F6ra med juli." })) : (form.kategorier.map((k) => ((0, jsx_runtime_1.jsxs)("div", { className: "sidrad", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt min-w-[8rem] flex-1", placeholder: "Namn", value: k.namn, onChange: (e) => andraKategori(k.id, { namn: e.target.value }), "aria-label": "Kategorins namn" }), (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad shrink-0", children: [0, 1, 2, 3, 4, 5].map((t) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico !px-2", "data-aktiv": k.ton === t ? "1" : "0", onClick: () => andraKategori(k.id, { ton: t }), "aria-label": `Ton ${t + 1}`, children: (0, jsx_runtime_1.jsx)("span", { className: "inline-block w-3 h-3 border border-current", style: { background: `var(--kal-${t + 1})` } }) }, t))) }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", "data-aktiv": k.sparande ? "1" : "0", onClick: () => andraKategori(k.id, { sparande: !k.sparande }), title: "R\u00E4knas mot sparm\u00E5let", children: "Sparande" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => {
                                                if (window.confirm(`Ta bort ${k.namn || "kategorin"} ur alla månader? Går att ångra med ⌘Z.`)) {
                                                    taBortKategori(k.id);
                                                }
                                            }, "aria-label": "Ta bort kategorin", children: "\u2715" })] }, k.id)))) })), (0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Sparande \u00F6ver tid", bihang: "Ram \u00E4r plan, fylld \u00E4r utfall", children: (0, jsx_runtime_1.jsx)("div", { className: "px-2 pt-3 pb-1", children: (0, jsx_runtime_1.jsx)(Manadsstapel_1.default, { staplar: staplar, mal: manad ? (0, ekonomi_1.sparandePlan)(form, manad) : null }) }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2.5 md:gap-3 min-w-0", children: [(0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Sparm\u00E5l", bihang: "R\u00E4knas p\u00E5 utfall", children: (0, jsx_runtime_1.jsxs)("div", { className: "px-3 py-3 flex flex-col gap-2.5", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Vad sparar du till?", value: form.mal.namn, onChange: (e) => andra((d) => ({ ...d, mal: { ...d.mal, namn: e.target.value } })), "aria-label": "Sparm\u00E5lets namn" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 flex-wrap", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "M\u00E5l" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: form.mal.belopp, onVarde: (n) => andra((d) => ({ ...d, mal: { ...d.mal, belopp: n } })), etikett: "M\u00E5lbelopp", platshallare: "100\u00A0000", className: "falt !w-[7rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona })] }), (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Redan undan" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: form.mal.start, onVarde: (n) => andra((d) => ({ ...d, mal: { ...d.mal, start: n } })), etikett: "Redan undanlagt n\u00E4r du b\u00F6rjade", platshallare: "0", className: "falt !w-[7rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline gap-2 mb-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "matartal", children: (0, ekonomi_1.kronor)(fram.undanlagt) }), (0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-45 tabnum", children: ["av ", (0, ekonomi_1.kronor)(fram.mal)] }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("span", { className: "micro tabnum", children: (0, ekonomi_1.procent)(fram.andel) })] }), (0, jsx_runtime_1.jsx)("div", { className: "malstapel", children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                            width: `${Math.min(100, (fram.andel ?? 0) * 100)}%`,
                                                        } }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "faktarad", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Kvar" }), (0, jsx_runtime_1.jsx)("span", { className: "faktavarde tabnum", children: (0, ekonomi_1.kronor)(fram.kvar) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Takt per m\u00E5nad" }), (0, jsx_runtime_1.jsx)("span", { className: "faktavarde tabnum", children: (0, ekonomi_1.kronor)(takt) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Framme" }), (0, jsx_runtime_1.jsx)("span", { className: "faktavarde tabnum", children: prog ? (0, ekonomi_1.manadsText)(prog.manadsId) : "—" })] })] }), !prog && ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed", children: fram.mal === null
                                                ? "Sätt ett målbelopp, så räknas det ut när du är framme."
                                                : fram.kvar === 0
                                                    ? "Målet är nått."
                                                    : "Ingen takt att räkna på ännu. Fyll i utfall för en månad, eller planera ett sparande." }))] }) }), (0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Mall", bihang: "Fyller i nya m\u00E5nader", atgard: manad ? ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => andra((d) => ({
                                        ...d,
                                        mall: {
                                            inkomst: manad.inkomst,
                                            poster: manad.poster.map((p) => ({
                                                kategoriId: p.kategoriId,
                                                plan: p.plan,
                                            })),
                                        },
                                    })), title: "Spara den h\u00E4r m\u00E5nadens plan som mall", children: "Ur denna m\u00E5nad" })) : null, children: (0, jsx_runtime_1.jsxs)("div", { className: "px-3 py-3 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Inkomst" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: form.mall.inkomst, onVarde: (n) => andra((d) => ({ ...d, mall: { ...d.mall, inkomst: n } })), etikett: "Inkomst i mallen", platshallare: "25\u00A0000", className: "falt !w-[7.5rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona })] }), form.kategorier.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 leading-relaxed", children: "L\u00E4gg upp kategorier f\u00F6rst." })) : (form.kategorier.map((k) => {
                                            const p = form.mall.poster.find((x) => x.kategoriId === k.id);
                                            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico flex-1 min-w-0 truncate", children: k.namn || "Namnlös" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: p?.plan ?? null, onVarde: (n) => andra((d) => ({
                                                            ...d,
                                                            mall: {
                                                                ...d.mall,
                                                                poster: d.mall.poster.some((x) => x.kategoriId === k.id)
                                                                    ? d.mall.poster.map((x) => x.kategoriId === k.id ? { ...x, plan: n } : x)
                                                                    : [
                                                                        ...d.mall.poster,
                                                                        { kategoriId: k.id, plan: n },
                                                                    ],
                                                            },
                                                        })), etikett: `Mall för ${k.namn || "kategorin"}`, platshallare: "\u2014", className: "falt !w-[5.5rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona })] }, k.id));
                                        }))] }) }), (0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: "Abonnemang", bihang: "Hela avgiften i den m\u00E5nad den dras", atgard: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: nyttAbonnemang, children: "+ Abonnemang" }), children: [(0, jsx_runtime_1.jsx)("div", { className: "px-3 pt-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "faktarad", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: manad ? (0, ekonomi_1.manadsText)(manad.id) : "Denna månad" }), (0, jsx_runtime_1.jsx)("span", { className: "faktavarde tabnum", children: (0, ekonomi_1.kronor)(abonnemangNu) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Per \u00E5r" }), (0, jsx_runtime_1.jsx)("span", { className: "faktavarde tabnum", children: (0, ekonomi_1.kronor)(abonnemangAr) })] })] }) }), (0, jsx_runtime_1.jsx)(Rader_1.default, { rader: form.abonnemang, onTaBort: taBortAbonnemang, tomText: "Inga abonnemang inlagda. Claude Pro 250 i m\u00E5naden, Headway 250 om \u00E5ret \u2014 det som dras utan att du g\u00F6r n\u00E5got.", rita: (a) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "ekoprick shrink-0", style: {
                                                        background: manad && (0, ekonomi_1.dras)(a, manad.id)
                                                            ? "var(--ink)"
                                                            : "transparent",
                                                    }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("input", { className: "falt min-w-[6rem] flex-1", placeholder: "Vad?", value: a.namn, onChange: (e) => andraAbonnemang(a.id, { namn: e.target.value }), "aria-label": "Abonnemangets namn" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: a.belopp, onVarde: (n) => andraAbonnemang(a.id, { belopp: n }), etikett: "Avgift", platshallare: "0", className: "falt !w-[5rem] text-right tabnum", tolkTal: ekonomi_1.tolkaKrona, skrivTal: skrivKrona }), (0, jsx_runtime_1.jsxs)("div", { className: "knapp-rad shrink-0", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": a.period === "manad" ? "1" : "0", onClick: () => andraAbonnemang(a.id, { period: "manad" }), title: "Dras varje m\u00E5nad", children: "/ m\u00E5n" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": a.period === "ar" ? "1" : "0", onClick: () => andraAbonnemang(a.id, { period: "ar" }), title: "Dras en g\u00E5ng om \u00E5ret", children: "/ \u00E5r" })] }), a.period === "ar" && ((0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto shrink-0", value: a.dragManad, onChange: (e) => andraAbonnemang(a.id, {
                                                        dragManad: (0, ekonomi_1.klamManad)(e.target.value),
                                                    }), "aria-label": "M\u00E5nad d\u00E5 \u00E5rsavgiften dras", children: tid_1.MANADER.map((namn, i) => ((0, jsx_runtime_1.jsx)("option", { value: i + 1, children: namn }, namn))) })), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", "data-aktiv": a.aktiv ? "0" : "1", onClick: () => andraAbonnemang(a.id, { aktiv: !a.aktiv }), title: a.aktiv
                                                        ? "Pausa — ligger kvar men räknas inte"
                                                        : "Pausat — räknas inte", children: a.aktiv ? "Pausa" : "Pausat" }), a.aktiv && a.period === "ar" && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-40 shrink-0", title: "N\u00E4sta dragning", children: (0, ekonomi_1.manadsText)((0, ekonomi_1.nastaDragning)(a) ?? "") }))] })) })] })] })] })] }));
}
