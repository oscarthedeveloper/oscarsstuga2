"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Viner;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Mina viner — samling och smakminne.
 *
 * Sidan svarar på två frågor samtidigt, och därför ligger registret till
 * vänster och diagrammen till höger: registret är vad man ARBETAR i,
 * diagrammen vad man ser NÄR man arbetar. Ett vin man öppnar i listan
 * framhävs samtidigt i båda punktdiagrammen — det är den kopplingen som
 * gör diagrammen till en del av sidan i stället för prydnader under
 * den.
 *
 * "Avancerat" byggs här av täthet och precision, inte av nya färger.
 * Vinets slag bär en bunden ton som är densamma i stapeln, i smakkartan
 * och i punktdiagrammet; hade färgerna valts per diagram vore de
 * dekoration.
 *
 * Ingenting hämtas från Vivino. Uppgifterna skrivs in för hand och
 * länken sparas, så att källan går att gå tillbaka till. Ett vin som
 * inte GÅR att slå upp får säga det rent ut i stället för att i
 * evighet se ut att vänta på en inmatning.
 *
 * Ett öppnat vin har två lägen, som bladen på språksidan. LÄSLÄGET är
 * förvalet och ritar ett färdigt uppslag — fakta, betyg, smakprofil,
 * noter och text. REDIGERINGSLÄGET ritar samma sak som fält. Ett fält
 * som ser ut som en färdig sida är ändå ett fält: markören hamnar i
 * det, texten går att råka ändra, och skärmläsaren säger "inmatning"
 * där det står ett värde.
 */
const react_1 = require("react");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const viner_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/viner");
const Avsnitt_1 = __importDefault(require("./block/Avsnitt"));
const Betygsmatare_1 = __importDefault(require("./block/Betygsmatare"));
const Delstapel_1 = __importDefault(require("./block/Delstapel"));
const Listfalt_1 = __importDefault(require("./block/Listfalt"));
const Punktdiagram_1 = __importDefault(require("./block/Punktdiagram"));
const Smakskala_1 = __importDefault(require("./block/Smakskala"));
const Talfalt_1 = __importDefault(require("./block/Talfalt"));
const Vinuppslag_1 = __importDefault(require("./block/Vinuppslag"));
const VILA_MS = 600;
const samma = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Belopp skrivs "1 299". Talfältet får därför egna regler. */
const skrivKrona = (n) => (n === null ? "" : (0, viner_1.kronor)(n));
/** Övriga tal skrivs med svenskt komma. */
const skrivTal = (n) => n === null ? "" : String(n).replace(".", ",");
function Viner({ sida, spara, }) {
    const utifran = (0, react_1.useMemo)(() => (0, viner_1.tolkaVinData)(sida?.data), [sida]);
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
    const [typfilter, setTypfilter] = (0, react_1.useState)(null);
    const [ordning, setOrdning] = (0, react_1.useState)("kod");
    const [oppet, setOppet] = (0, react_1.useState)(null);
    /*
     * Läsläge eller redigeringsläge.
     *
     * Läget hör till SESSIONEN och inte till vinet, precis som på
     * språksidan. Sitter man en kväll och skriver in tio flaskor ur
     * Vivino skall inte varje byte av vin kasta tillbaka en till läsläget
     * och kräva ett tryck till. Vid omladdning börjar man däremot i
     * läsläge — det är så man oftast öppnar ett vin.
     */
    const [redigerar, setRedigerar] = (0, react_1.useState)(false);
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
    const raknat = (0, react_1.useMemo)(() => (0, viner_1.rakna)(form), [form]);
    const synliga = (0, react_1.useMemo)(() => (0, viner_1.sorteraViner)((0, viner_1.filtreraViner)(form, fraga, filter, typfilter), ordning), [form, fraga, filter, typfilter, ordning]);
    const nyttVin = () => {
        const nummer = (0, viner_1.nastaLedigaKod)(form);
        const id = (0, butik_1.nyId)();
        andra((d) => ({
            nastaKod: nummer + 1,
            viner: [
                ...d.viner,
                {
                    id,
                    kod: (0, viner_1.formateraKod)(nummer),
                    namn: "",
                    producent: "",
                    argang: "",
                    land: "",
                    region: "",
                    vinstil: "",
                    typ: "rott",
                    druvor: [],
                    alkohol: null,
                    lage: "vill",
                    antal: null,
                    druckenDatum: "",
                    pris: null,
                    inkopsstalle: "",
                    artikelnummer: "",
                    vivinoUrl: "",
                    systembolagetUrl: "",
                    bildUrl: "",
                    vivinoBetyg: null,
                    vivinoAntal: null,
                    egetBetyg: null,
                    profil: { ...viner_1.TOM_PROFIL },
                    smaknoter: [],
                    passarTill: [],
                    beskrivning: "",
                    anteckning: "",
                    uppgifterSaknas: false,
                    skapad: (0, tid_1.nyckel)((0, tid_1.startAvDag)(new Date())),
                },
            ],
        }));
        setFilter(null);
        setTypfilter(null);
        setFraga("");
        setOppet(id);
        // Ett tomt vin har ingenting att läsa.
        setRedigerar(true);
    };
    const andraVin = (id, delar) => andra((d) => ({
        ...d,
        viner: d.viner.map((v) => (v.id === id ? { ...v, ...delar } : v)),
    }));
    const taBortVin = (id) => andra((d) => ({ ...d, viner: d.viner.filter((v) => v.id !== id) }));
    /* ---------------------------------------------------------------
       Diagrammen
       --------------------------------------------------------------- */
    const [uppdelning, setUppdelning] = (0, react_1.useState)("typ");
    const [xSkala, setXSkala] = (0, react_1.useState)("fyllighet");
    const [ySkala, setYSkala] = (0, react_1.useState)("stravhet");
    /* Diagrammen ritar det FILTRERADE registret och inte allt.
       Ett filter man satt i listan och ett diagram som struntar i det är
       två svar på samma fråga, och man tror på fel av dem. */
    const delar = (0, react_1.useMemo)(() => (0, viner_1.fordelning)(synliga, uppdelning), [synliga, uppdelning]);
    const prispunkter = (0, react_1.useMemo)(() => (0, viner_1.betygMotPris)(synliga, oppet), [synliga, oppet]);
    const smakpunkter = (0, react_1.useMemo)(() => (0, viner_1.smakkarta)(synliga, xSkala, ySkala, oppet), [synliga, xSkala, ySkala, oppet]);
    const mittSnitt = (0, react_1.useMemo)(() => (0, viner_1.medelbetyg)(form, "eget"), [form]);
    const vivinoSnitt = (0, react_1.useMemo)(() => (0, viner_1.medelbetyg)(form, "vivino"), [form]);
    const kvarAttFylla = (0, react_1.useMemo)(() => (0, viner_1.ofullstandiga)(form).length, [form]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-full min-h-0 overflow-y-auto tunnskroll", children: [(0, jsx_runtime_1.jsxs)("div", { className: "matarpanel", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Flaskor" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: raknat.flaskor })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "K\u00E4llarens v\u00E4rde" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: raknat.varde > 0 ? (0, viner_1.kronor)(raknat.varde) : "—" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Ditt snitt" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: (0, viner_1.betygstext)(mittSnitt) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Vivinos snitt" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", children: (0, viner_1.betygstext)(vivinoSnitt) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Att fylla i" }), (0, jsx_runtime_1.jsx)("span", { className: "matartal block", "data-atgard": kvarAttFylla > 0 ? "1" : "0", children: kvarAttFylla })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-[9rem]", children: [(0, jsx_runtime_1.jsxs)("span", { className: "matarnamn", children: ["K\u00E4llaren \u2014 ", raknat.totalt, " ", raknat.totalt === 1 ? "vin" : "viner", ",", " ", Math.round((0, viner_1.andelDrucken)(raknat) * 100), " % druckna"] }), (0, jsx_runtime_1.jsx)("span", { className: "andelsstapel", role: "img", "aria-label": `${raknat.vill} vill prova, ${raknat.har} i källaren, ${raknat.drucken} druckna`, children: raknat.totalt > 0 &&
                                    viner_1.LAGEN.map((l) => ((0, jsx_runtime_1.jsx)("span", { "data-lage": l.id, style: { flexGrow: raknat[l.id], flexBasis: 0 } }, l.id))) })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", "data-ton": "accent", onClick: nyttVin, children: "+ Vin" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] max-w-[1400px]", children: [(0, jsx_runtime_1.jsx)("div", { className: "min-w-0", children: (0, jsx_runtime_1.jsxs)(Avsnitt_1.default, { rubrik: "Vinerna", bihang: "Vill prova, i k\u00E4llaren, druckna", atgard: (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad shrink-0", children: viner_1.ORDNINGAR.map((o) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": ordning === o.id ? "1" : "0", onClick: () => setOrdning(o.id), title: `Sortera på ${o.namn.toLowerCase()}`, children: o.namn }, o.id))) }), children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-ink/15 px-2.5 py-2 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "S\u00F6k namn, producent, land, druva, vinstil eller kod", value: fraga, onChange: (e) => setFraga(e.target.value), "aria-label": "S\u00F6k i registret" }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad items-center", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico", "data-aktiv": filter === null ? "1" : "0", onClick: () => setFilter(null), children: ["Alla ", raknat.totalt] }), viner_1.LAGEN.map((l) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico", "data-aktiv": filter === l.id ? "1" : "0", onClick: () => setFilter(filter === l.id ? null : l.id), children: [l.namn, " ", raknat[l.id]] }, l.id)))] }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad items-center", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": typfilter === null ? "1" : "0", onClick: () => setTypfilter(null), children: "Alla slag" }), viner_1.TYPER.map((t) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex items-center gap-1.5", "data-aktiv": typfilter === t.id ? "1" : "0", onClick: () => setTypfilter(typfilter === t.id ? null : t.id), children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block w-2 h-2 border border-current shrink-0", style: { background: `var(--kal-${t.ton + 1})` }, "aria-hidden": "true" }), t.namn] }, t.id)))] })] }), synliga.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-3 py-5 leading-relaxed", children: form.viner.length === 0
                                        ? "Registret är tomt. Tryck + Vin och skriv in det första — namnet räcker för att börja, resten kan fyllas i när flaskan står framför dig."
                                        : "Inget i registret matchar. Pröva ett annat ord eller ta bort filtret." })) : (synliga.map((v) => ((0, jsx_runtime_1.jsx)(Vinrad, { vin: v, oppen: oppet === v.id, redigerar: redigerar, onRedigera: setRedigerar, onOppna: () => setOppet(oppet === v.id ? null : v.id), onAndra: (delar) => andraVin(v.id, delar), onTaBort: () => {
                                        setOppet(null);
                                        taBortVin(v.id);
                                    } }, v.id))))] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2.5 md:gap-3 min-w-0", children: [(0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "F\u00F6rdelning", bihang: synliga.length === form.viner.length
                                    ? "Hela samlingen"
                                    : `${synliga.length} av ${form.viner.length}`, atgard: (0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto shrink-0", value: uppdelning, onChange: (e) => setUppdelning(e.target.value), "aria-label": "Vad f\u00F6rdelningen delas upp p\u00E5", children: viner_1.UPPDELNINGAR.map((u) => ((0, jsx_runtime_1.jsx)("option", { value: u.id, children: u.namn }, u.id))) }), children: (0, jsx_runtime_1.jsx)(Delstapel_1.default, { delar: delar, tomText: "Inga viner att dela upp \u00E4nnu. L\u00E4gg till ett vin, s\u00E5 ritas f\u00F6rdelningen h\u00E4r." }) }), (0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Betyg mot pris", bihang: "Ditt betyg, annars Vivinos", children: (0, jsx_runtime_1.jsx)(Punktdiagram_1.default, { punkter: prispunkter, xAxel: {
                                        lag: "Billigt",
                                        hog: `Dyrt — ${(0, viner_1.kronor)((0, viner_1.pristak)(prispunkter))} kr`,
                                        min: 0,
                                        max: (0, viner_1.pristak)(prispunkter),
                                    }, yAxel: {
                                        lag: "Lågt betyg",
                                        hog: "Högt betyg",
                                        min: 0,
                                        max: 5,
                                        // Fem steg: hela betyg på hjälplinjerna, inte 1,3 och 3,8.
                                        steg: 5,
                                        skrivTal: (v) => (0, viner_1.betygstext)(v),
                                    }, tomText: "Inget att rita \u00E4nnu. Ett vin kommer med n\u00E4r det har b\u00E5de pris och betyg \u2014 ett saknat pris s\u00E4tts inte till noll, eftersom vinet d\u00E5 hade sett ut som ett fynd." }) }), (0, jsx_runtime_1.jsx)(Avsnitt_1.default, { rubrik: "Smakkarta", 
                                /* Ingen förklaring här: de två väljarna säger redan
                                   "Fyllig mot Sträv", och ett bihang bredvid dem blir
                                   avklippt på mitten — sämre än inget alls. */
                                atgard: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1 shrink-0", children: [(0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto", value: xSkala, onChange: (e) => setXSkala(e.target.value), "aria-label": "V\u00E5gr\u00E4t skala", children: viner_1.SKALOR.map((s) => ((0, jsx_runtime_1.jsx)("option", { value: s.id, children: s.hoger }, s.id))) }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-40", children: "mot" }), (0, jsx_runtime_1.jsx)("select", { className: "falt !w-auto", value: ySkala, onChange: (e) => setYSkala(e.target.value), "aria-label": "Lodr\u00E4t skala", children: viner_1.SKALOR.map((s) => ((0, jsx_runtime_1.jsx)("option", { value: s.id, children: s.hoger }, s.id))) })] }), children: (0, jsx_runtime_1.jsx)(Punktdiagram_1.default, { punkter: smakpunkter, xAxel: {
                                        lag: (0, viner_1.skala)(xSkala).vanster,
                                        hog: (0, viner_1.skala)(xSkala).hoger,
                                        min: 0,
                                        max: 100,
                                    }, yAxel: {
                                        lag: (0, viner_1.skala)(ySkala).vanster,
                                        hog: (0, viner_1.skala)(ySkala).hoger,
                                        min: 0,
                                        max: 100,
                                    }, tomText: "Inget att rita \u00E4nnu. Ett vin kommer med n\u00E4r b\u00E5da de valda skalorna \u00E4r ifyllda \u2014 \u00F6ppna ett vin och dra reglagen efter Vivinos smak\u00F6versikt." }) })] })] })] }));
}
/* ==================================================================
   EN RAD I REGISTRET

   Tät i stängt läge, formulär i öppet — samma mekanik som
   litteraturregistret på fornsvenskasidan. Att en post är en RAD och
   inte ett kort är vad som gör att femtio viner går att överblicka.
   ================================================================== */
function Vinrad({ vin, oppen, redigerar, onRedigera, onOppna, onAndra, onTaBort, }) {
    const fylld = (0, viner_1.lagesIndex)(vin.lage);
    const under = (0, viner_1.vinUnderrad)(vin);
    const betyg = vin.egetBetyg ?? vin.vivinoBetyg;
    const antalFlaskor = (0, viner_1.flaskor)(vin);
    const skillnad = (0, viner_1.oense)(vin);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "verkrad", "data-oppen": oppen ? "1" : "0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 px-2.5 py-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "lagesmatare shrink-0 mt-1", "data-lage": vin.lage, onClick: () => onAndra({ lage: (0, viner_1.nastaLage)(vin.lage) }), "aria-label": `Läge: ${viner_1.LAGEN[fylld].namn}. Tryck för nästa.`, title: `${viner_1.LAGEN[fylld].namn} — tryck för nästa läge`, children: viner_1.LAGEN.map((l, i) => ((0, jsx_runtime_1.jsx)("span", { "data-fylld": i <= fylld ? "1" : "0" }, l.id))) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "flex-1 min-w-0 text-left", onClick: onOppna, children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-baseline gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "kodmarke", children: vin.kod }), (0, jsx_runtime_1.jsx)("span", { className: "vinprick shrink-0", style: { background: `var(--kal-${(0, viner_1.typTon)(vin.typ) + 1})` }, title: (0, viner_1.typNamn)(vin.typ), "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { className: "verktitel flex-1 min-w-0", children: (0, viner_1.vinTitel)(vin) })] }), under.length > 0 && ((0, jsx_runtime_1.jsx)("span", { className: "verkmeta pico opacity-50 block mt-0.5", children: under.map((m) => ((0, jsx_runtime_1.jsx)("span", { children: m }, m))) }))] }), vin.lage === "har" && ((0, jsx_runtime_1.jsxs)("span", { className: "pico opacity-55 tabnum shrink-0 mt-1 hidden sm:inline", title: `${antalFlaskor} ${antalFlaskor === 1 ? "flaska" : "flaskor"} i källaren`, children: [antalFlaskor, "\u00D7"] })), vin.pris !== null && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 tabnum shrink-0 mt-1 hidden sm:inline", children: (0, viner_1.kronor)(vin.pris) })), betyg !== null && ((0, jsx_runtime_1.jsx)("span", { className: "shrink-0 mt-0.5", children: (0, jsx_runtime_1.jsx)(Betygsmatare_1.default, { varde: betyg, etikett: (0, viner_1.vinTitel)(vin) }) })), vin.vivinoUrl && ((0, jsx_runtime_1.jsx)("a", { href: vin.vivinoUrl, target: "_blank", rel: "noreferrer noopener", className: "blockknapp shrink-0", onClick: (e) => e.stopPropagation(), "aria-label": "\u00D6ppna p\u00E5 Vivino", title: vin.vivinoUrl, children: "\u2197" }))] }), oppen && ((0, jsx_runtime_1.jsxs)("div", { className: "px-2.5 pb-3 border-t border-ink/10 pt-2.5 flex flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 flex-wrap", children: [vin.vivinoUrl && ((0, jsx_runtime_1.jsx)("a", { href: vin.vivinoUrl, target: "_blank", rel: "noreferrer noopener", className: "knapp pico", children: "Vivino \u2197" })), vin.systembolagetUrl && ((0, jsx_runtime_1.jsx)("a", { href: vin.systembolagetUrl, target: "_blank", rel: "noreferrer noopener", className: "knapp pico", children: "Systembolaget \u2197" })), vin.uppgifterSaknas && !redigerar && ((0, jsx_runtime_1.jsx)("span", { className: "dokmarke", children: "Saknas online" })), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro shrink-0", "data-aktiv": redigerar ? "1" : "0", onClick: () => onRedigera(!redigerar), title: redigerar ? "Lämna redigeringsläget (Esc)" : "Redigera vinet", children: redigerar ? "✓ Klar" : "✎ Redigera" })] }), redigerar ? ((0, jsx_runtime_1.jsx)(VinFormular, { vin: vin, onAndra: onAndra, onTaBort: onTaBort })) : ((0, jsx_runtime_1.jsx)(Vinuppslag_1.default, { vin: vin }))] })), !oppen && skillnad !== null && Math.abs(skillnad) >= 0.5 && ((0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-45 px-2.5 pb-1.5 -mt-1", children: ["Du ", skillnad > 0 ? "tyckte bättre" : "tyckte sämre", " \u00E4n Vivino:", " ", (0, jsx_runtime_1.jsxs)("span", { className: "tabnum", children: [(0, viner_1.betygstext)(vin.egetBetyg), " mot ", (0, viner_1.betygstext)(vin.vivinoBetyg)] })] }))] }));
}
/* ==================================================================
   FORMULÄRET

   Uppställt i samma ordning som visningsläget, så att man vet var man
   skall leta när något ser fel ut. Att fälten står i en annan ordning
   än värdena hade betytt en översättning vid varje rättelse.
   ================================================================== */
function VinFormular({ vin, onAndra, onTaBort, }) {
    const [nyNot, setNyNot] = (0, react_1.useState)("");
    const [nyGrupp, setNyGrupp] = (0, react_1.useState)("");
    const laggNot = () => {
        const ord = nyNot.trim();
        if (!ord)
            return;
        onAndra({
            smaknoter: [
                ...vin.smaknoter,
                { id: (0, butik_1.nyId)(), ord, grupp: nyGrupp.trim(), antal: null },
            ],
        });
        setNyNot("");
        setNyGrupp("");
    };
    const andraNot = (id, delar) => onAndra({
        smaknoter: vin.smaknoter.map((n) => n.id === id ? { ...n, ...delar } : n),
    });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "vinspalt", children: [(0, jsx_runtime_1.jsx)("span", { className: "vinbild", children: vin.bildUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                (0, jsx_runtime_1.jsx)("img", { src: vin.bildUrl, alt: `Etikett för ${(0, viner_1.vinTitel)(vin)}`, loading: "lazy", referrerPolicy: "no-referrer" })) : ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-35 text-center px-2 leading-relaxed", children: "Ingen bild" })) }), (0, jsx_runtime_1.jsx)("input", { className: "falt mt-2", placeholder: "Bildadress", inputMode: "url", value: vin.bildUrl, onChange: (e) => onAndra({ bildUrl: e.target.value }), onBlur: (e) => onAndra({ bildUrl: (0, viner_1.trygsamUrl)(e.target.value) }), "aria-label": "Bildadress till etiketten" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-35 mt-1 leading-relaxed", children: "H\u00E4mtas fr\u00E5n adressen, sparas inte h\u00E4r." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0 flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt flex-1", placeholder: "Vinets namn", value: vin.namn, onChange: (e) => onAndra({ namn: e.target.value }), "aria-label": "Vinets namn", autoFocus: true }), (0, jsx_runtime_1.jsx)("input", { className: "falt md:!w-[6rem]", placeholder: "\u00C5rg\u00E5ng", value: vin.argang, onChange: (e) => onAndra({ argang: e.target.value }), "aria-label": "\u00C5rg\u00E5ng", title: "Fri text \u2014 N.V. och 2018/19 \u00E4r ocks\u00E5 \u00E5rg\u00E5ngar" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt flex-1", placeholder: "Producent", value: vin.producent, onChange: (e) => onAndra({ producent: e.target.value }), "aria-label": "Producent" }), (0, jsx_runtime_1.jsx)("select", { className: "falt md:!w-auto", value: vin.typ, onChange: (e) => onAndra({ typ: e.target.value }), "aria-label": "Vinets slag", children: viner_1.TYPER.map((t) => ((0, jsx_runtime_1.jsx)("option", { value: t.id, children: t.namn }, t.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt md:!w-[9rem]", placeholder: "Land", value: vin.land, onChange: (e) => onAndra({ land: e.target.value }), "aria-label": "Land" }), (0, jsx_runtime_1.jsx)("input", { className: "falt flex-1", placeholder: "Region", value: vin.region, onChange: (e) => onAndra({ region: e.target.value }), "aria-label": "Region" }), (0, jsx_runtime_1.jsx)("input", { className: "falt md:!w-[10rem]", placeholder: "Vinstil", value: vin.vinstil, onChange: (e) => onAndra({ vinstil: e.target.value }), "aria-label": "Vinstil", title: "Vivinos vinstil, t.ex. Spanien R\u00F6da" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsx)(Listfalt_1.default, { varden: vin.druvor, onVarden: (rader) => onAndra({ druvor: rader }), etikett: "Druvor", platshallare: "Druvor \u2014 Shiraz/Syrah, Tempranillo", className: "falt flex-1" }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 shrink-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45", children: "Alkohol" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: vin.alkohol, onVarde: (n) => onAndra({ alkohol: n }), etikett: "Alkoholvolym i procent", platshallare: "13,5", className: "falt !w-[4.5rem] text-right tabnum", tolkTal: viner_1.tolkaTal, skrivTal: skrivTal })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "faktarad", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "L\u00E4ge" }), (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad", children: viner_1.LAGEN.map((l) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": vin.lage === l.id ? "1" : "0", onClick: () => onAndra({ lage: l.id }), children: l.namn }, l.id))) })] }), vin.lage === "har" && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Flaskor" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: vin.antal, onVarde: (n) => onAndra({ antal: n }), etikett: "Antal flaskor i k\u00E4llaren", platshallare: "1", className: "falt !w-[4.5rem] text-right tabnum", tolkTal: viner_1.tolkaTal, skrivTal: skrivTal })] })), vin.lage === "drucken" && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Drucket" }), (0, jsx_runtime_1.jsx)("input", { type: "date", className: "falt datumfalt", value: vin.druckenDatum, onChange: (e) => onAndra({ druckenDatum: e.target.value }), "aria-label": "Datum d\u00E5 vinet dracks" })] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Pris per flaska" }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: vin.pris, onVarde: (n) => onAndra({ pris: n }), etikett: "Pris per flaska i kronor", platshallare: "0", className: "falt !w-[6rem] text-right tabnum", tolkTal: viner_1.tolkaTal, skrivTal: skrivKrona })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Ink\u00F6psst\u00E4lle" }), (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Systembolaget, ving\u00E5rd, resa\u2026", value: vin.inkopsstalle, onChange: (e) => onAndra({ inkopsstalle: e.target.value }), "aria-label": "Ink\u00F6psst\u00E4lle" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Artikelnummer" }), (0, jsx_runtime_1.jsx)("input", { className: "falt tabnum", placeholder: "Systembolaget", value: vin.artikelnummer, onChange: (e) => onAndra({ artikelnummer: e.target.value }), "aria-label": "Systembolagets artikelnummer" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 flex-1 min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 shrink-0 w-[5.5rem]", children: "Vivino" }), (0, jsx_runtime_1.jsx)("input", { className: "falt flex-1 min-w-0", placeholder: "https://vivino.com/\u2026", inputMode: "url", value: vin.vivinoUrl, onChange: (e) => onAndra({ vivinoUrl: e.target.value }), onBlur: (e) => onAndra({ vivinoUrl: (0, viner_1.trygsamUrl)(e.target.value) }), "aria-label": "L\u00E4nk till Vivino" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 flex-1 min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 shrink-0 w-[5.5rem]", children: "Systembolaget" }), (0, jsx_runtime_1.jsx)("input", { className: "falt flex-1 min-w-0", placeholder: "https://systembolaget.se/\u2026", inputMode: "url", value: vin.systembolagetUrl, onChange: (e) => onAndra({ systembolagetUrl: e.target.value }), onBlur: (e) => onAndra({ systembolagetUrl: (0, viner_1.trygsamUrl)(e.target.value) }), "aria-label": "L\u00E4nk till Systembolaget" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "faktarad", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Ditt betyg" }), (0, jsx_runtime_1.jsx)(Betygsmatare_1.default, { varde: vin.egetBetyg, onVarde: (n) => onAndra({ egetBetyg: n }), etikett: "ditt betyg", storlek: "stor" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: "Vivinos betyg" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: vin.vivinoBetyg, onVarde: (n) => onAndra({ vivinoBetyg: n }), etikett: "Vivinos betyg", platshallare: "3,7", className: "falt !w-[4.5rem] text-right tabnum", tolkTal: viner_1.tolkaTal, skrivTal: skrivTal }), (0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: vin.vivinoAntal, onVarde: (n) => onAndra({ vivinoAntal: n }), etikett: "Antal recensioner p\u00E5 Vivino", platshallare: "8 503", className: "falt !w-[6rem] text-right tabnum", tolkTal: viner_1.tolkaTal, skrivTal: skrivKrona }), (0, jsx_runtime_1.jsx)("span", { className: "pico opacity-40 shrink-0", children: "rec." })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline gap-2 mb-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn !mb-0", children: "Hur smakar detta vin?" }), (0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", "data-aktiv": vin.uppgifterSaknas ? "1" : "0", onClick: () => onAndra({ uppgifterSaknas: !vin.uppgifterSaknas }), title: "Vinet g\u00E5r inte att sl\u00E5 upp \u2014 sluta r\u00E4kna det som ofyllt", children: "Saknas online" })] }), vin.uppgifterSaknas && !(0, viner_1.harProfil)(vin.profil) ? ((0, jsx_runtime_1.jsx)("p", { className: "pico opacity-45 px-1 py-2 leading-relaxed", children: "M\u00E4rkt som att det inte g\u00E5r att sl\u00E5 upp. Vinet r\u00E4knas inte l\u00E4ngre bland dem som \u00E5terst\u00E5r att fylla i, och kommer inte med i smakkartan." })) : ((0, jsx_runtime_1.jsx)(Smakskala_1.default, { profil: vin.profil, ton: (0, viner_1.typTon)(vin.typ), onVarde: (id, varde) => onAndra({ profil: { ...vin.profil, [id]: varde } }) }))] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "matarnamn", children: "Smaknoter" }), vin.smaknoter.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "smakkortrad", children: vin.smaknoter.map((n) => ((0, jsx_runtime_1.jsxs)("div", { className: "smakkort", style: {
                                borderColor: `var(--kal-${(0, viner_1.gruppTon)(n.grupp) + 1}-stark, var(--ink))`,
                            }, children: [(0, jsx_runtime_1.jsx)("span", { className: "smakkorthuvud", style: {
                                        background: `var(--kal-${(0, viner_1.gruppTon)(n.grupp) + 1})`,
                                    }, children: (0, jsx_runtime_1.jsx)("input", { className: "falt !bg-transparent !border-0 !px-0", placeholder: "Vanilj, ek, tobak", value: n.ord, onChange: (e) => andraNot(n.id, { ord: e.target.value }), "aria-label": "Smakorden" }) }), (0, jsx_runtime_1.jsxs)("span", { className: "smakkortfot", children: [(0, jsx_runtime_1.jsx)(Talfalt_1.default, { varde: n.antal, onVarde: (x) => andraNot(n.id, { antal: x }), etikett: "Antal kommentarer", platshallare: "\u2014", className: "falt !w-[4.5rem] text-right tabnum", tolkTal: viner_1.tolkaTal, skrivTal: skrivKrona }), (0, jsx_runtime_1.jsx)("input", { className: "falt flex-1 min-w-0", placeholder: "grupp \u2014 fatad, r\u00F6d frukt\u2026", value: n.grupp, onChange: (e) => andraNot(n.id, { grupp: e.target.value }), "aria-label": "Smakgrupp" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp shrink-0", onClick: () => onAndra({
                                                smaknoter: vin.smaknoter.filter((x) => x.id !== n.id),
                                            }), "aria-label": "Ta bort smaknoten", children: "\u2715" })] })] }, n.id))) })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-2 mt-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt flex-1", placeholder: "Vanilj, ek, tobak", value: nyNot, onChange: (e) => setNyNot(e.target.value), onKeyDown: (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        laggNot();
                                    }
                                }, "aria-label": "Nya smakord" }), (0, jsx_runtime_1.jsx)("input", { className: "falt md:!w-[11rem]", placeholder: "Grupp \u2014 fatad", value: nyGrupp, onChange: (e) => setNyGrupp(e.target.value), onKeyDown: (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        laggNot();
                                    }
                                }, "aria-label": "Smakgrupp" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: laggNot, disabled: nyNot.trim().length === 0, children: "+ Not" })] })] }), (0, jsx_runtime_1.jsx)(Listfalt_1.default, { varden: vin.passarTill, onVarden: (rader) => onAndra({ passarTill: rader }), etikett: "Passar till", platshallare: "Passar till \u2014 n\u00F6tk\u00F6tt, pasta, kalv, fj\u00E4derf\u00E4" }), (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 3, placeholder: "Vinbeskrivning \u2014 klippt fr\u00E5n Vivino eller Systembolaget", value: vin.beskrivning, onChange: (e) => onAndra({ beskrivning: e.target.value }), "aria-label": "Vinbeskrivning" }), (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 2, placeholder: "Din anteckning \u2014 vad tyckte du, till vad, med vem?", value: vin.anteckning, onChange: (e) => onAndra({ anteckning: e.target.value }), "aria-label": "Din anteckning" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex-1" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => {
                            if (window.confirm(`Ta bort ${vin.kod} — ${(0, viner_1.vinTitel)(vin)}? Går att ångra med ⌘Z.`)) {
                                onTaBort();
                            }
                        }, children: "Radera" })] })] }));
}
