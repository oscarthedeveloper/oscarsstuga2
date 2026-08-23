"use strict";
"use client";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = KalenderApp;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Appens skal: navigering, vyval, tangentbord och limmet mellan butiken
 * och vyerna.
 *
 * Ett medvetet val: fönstret som händelserna expanderas i är alltid något
 * vidare än det som visas. Då slipper vyn räkna om vid varje litet
 * bläddringssteg, och en händelse som börjar strax utanför kanten finns
 * redan uträknad när den blir synlig.
 */
const react_1 = require("react");
const typer_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/typer");
const Butik_1 = require("./Butik");
const upprepning_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/upprepning");
const ColophonStrip_1 = __importDefault(require("./ColophonStrip"));
const Marke_1 = __importDefault(require("./Marke"));
const Sidopanel_1 = __importDefault(require("./Sidopanel"));
const TidsRutnat_1 = __importDefault(require("./vyer/TidsRutnat"));
const ManadsVy_1 = __importDefault(require("./vyer/ManadsVy"));
const ArsVy_1 = __importDefault(require("./vyer/ArsVy"));
const HandelsePanel_1 = __importDefault(require("./HandelsePanel"));
const KalenderPanel_1 = __importDefault(require("./KalenderPanel"));
const Kommandopalett_1 = __importDefault(require("./Kommandopalett"));
const Konto_1 = __importStar(require("./Konto"));
const AttGora_1 = __importDefault(require("./AttGora"));
const Anteckningar_1 = __importDefault(require("./Anteckningar"));
const Annat_1 = __importDefault(require("./Annat"));
const register_1 = require("./sidor/register");
const anvandMedia_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/anvandMedia");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const TIMHOJD_MIN = 26;
const TIMHOJD_MAX = 110;
/** Hur länge fångstkvittot ligger kvar innan det tonar bort. */
const KVITTO_MS = 6000;
function KalenderApp() {
    const butik = (0, Butik_1.useButik)();
    const [vy, setVy] = (0, react_1.useState)("vecka");
    const [peka, setPeka] = (0, react_1.useState)(() => (0, tid_1.startAvDag)(new Date()));
    const [timhojd, setTimhojd] = (0, react_1.useState)(52);
    const [vald, setVald] = (0, react_1.useState)(null);
    const [redigerar, setRedigerar] = (0, react_1.useState)(null);
    const [palett, setPalett] = (0, react_1.useState)(false);
    const [hanterarKalendrar, setHanterarKalendrar] = (0, react_1.useState)(false);
    const [lada, setLada] = (0, react_1.useState)(false);
    const [konto, setKonto] = (0, react_1.useState)(false);
    /*
     * Kalendern och att göra-listan är två sidor av samma app, inte två
     * appar. De delar butik, kalendrar, synk och tangentbord — därför är
     * det ett vylägesbyte och inte en egen adress. Skalet, panelerna och
     * det pågående tillståndet överlever bytet.
     */
    const [sida, setSida] = (0, react_1.useState)("kalender");
    /*
     * Post som en sökträff eller en länk pekat ut, att öppna på sin sida.
     *
     * Räknaren `n` finns för att samma post skall gå att öppna två gånger.
     * Med bara ett id blir andra försöket en tilldelning av det värde som
     * redan står där, React ser ingen ändring, och sökningen gör tyst
     * ingenting — vilket ser ut precis som en trasig sökfunktion.
     */
    const [oppnaUppgift, setOppnaUppgift] = (0, react_1.useState)(null);
    const [oppnaAnteckning, setOppnaAnteckning] = (0, react_1.useState)(null);
    const [oppnaAnnat, setOppnaAnnat] = (0, react_1.useState)(null);
    const pekning = (0, react_1.useRef)(0);
    const pekaPa = (0, react_1.useCallback)((id) => {
        pekning.current += 1;
        return { id, n: pekning.current };
    }, []);
    /*
     * Kvittot efter en fångst.
     *
     * Fångsten skall inte flytta vyn. Skriver man in tre saker i rad mitt
     * i en veckoplanering är det planeringen man tittar på, och att kastas
     * till en annan dag för varje rad gör funktionen obrukbar. Remsan säger
     * i stället vad som hände och erbjuder resan — den som vill går dit.
     */
    const [kvitto, setKvitto] = (0, react_1.useState)(null);
    /* Bottenradens plusknapp kan inte nå textfältet inne i AttGora. Den
       räknar upp en signal i stället, och fältet tar fokus när den ändras. */
    const [fokusera, setFokusera] = (0, react_1.useState)(0);
    const mobil = (0, anvandMedia_1.useMobil)();
    (0, anvandMedia_1.useTangentbord)();
    /*
     * Första gången appen öppnas i ett bygge som HAR molnnycklar men saknar
     * session öppnas kontopanelen av sig själv. Att bara visa en liten
     * knapp räckte inte: appen fungerar perfekt utan inloggning, så det
     * finns ingenting som får en att leta efter den.
     */
    const harFragat = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        if (harFragat.current || !butik.laddad || !butik.molnetFinns)
            return;
        if (butik.session)
            return;
        if (window.localStorage.getItem("kalendariet.harfragat") === "1")
            return;
        harFragat.current = true;
        window.localStorage.setItem("kalendariet.harfragat", "1");
        setKonto(true);
    }, [butik.laddad, butik.molnetFinns, butik.session]);
    // Veckovyn är rätt förstaval på en skärm, men sju kolumner på en telefon
    // blir sju remsor som ingen kan läsa. Byte sker en gång, vid första
    // mätningen av skärmen, och aldrig mot ett aktivt val.
    const harBytt = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        if (harBytt.current || !mobil)
            return;
        harBytt.current = true;
        setVy("dag");
    }, [mobil]);
    /* ---------------------------------------------------------------
       Vilket spann visar vyn?
       --------------------------------------------------------------- */
    const spann = (0, react_1.useMemo)(() => {
        switch (vy) {
            case "dag":
                return { fran: (0, tid_1.startAvDag)(peka), antal: 1 };
            case "tredag":
                return { fran: (0, tid_1.startAvDag)(peka), antal: 3 };
            case "vecka":
                return { fran: (0, tid_1.startAvVecka)(peka), antal: 7 };
            case "manad": {
                const forsta = (0, tid_1.startAvManad)(peka);
                return { fran: (0, tid_1.startAvVecka)(forsta), antal: 42 };
            }
            case "ar":
                return { fran: (0, tid_1.startAvAr)(peka), antal: 366 };
        }
    }, [vy, peka]);
    const dagar = (0, react_1.useMemo)(() => (0, tid_1.dagsspann)(spann.fran, Math.min(spann.antal, 7)), [spann]);
    const fonster = (0, react_1.useMemo)(() => {
        // Marginal åt båda håll: flerdygnshändelser och nyss bläddrade dagar.
        const fran = (0, tid_1.addDagar)(spann.fran, -8);
        const till = (0, tid_1.addDagar)(spann.fran, spann.antal + 8);
        return { fran, till };
    }, [spann]);
    const forekomster = (0, react_1.useMemo)(() => {
        const lista = (0, upprepning_1.expanderaAlla)(butik.synligaHandelser, fonster.fran, fonster.till);
        // Tonen bor på kalendern, inte på händelsen; den fylls i här så att
        // vyerna slipper slå upp den.
        return lista.map((f) => ({
            ...f,
            ton: butik.kalenderFor(f.handelse.kalenderId).ton,
        }));
    }, [butik, fonster]);
    /* ---------------------------------------------------------------
       Navigering
       --------------------------------------------------------------- */
    const stega = (0, react_1.useCallback)((riktning) => {
        setPeka((p) => {
            switch (vy) {
                case "dag":
                    return (0, tid_1.addDagar)(p, riktning);
                case "tredag":
                    return (0, tid_1.addDagar)(p, riktning * 3);
                case "vecka":
                    return (0, tid_1.addDagar)(p, riktning * 7);
                case "manad":
                    return (0, tid_1.addManader)((0, tid_1.startAvManad)(p), riktning);
                case "ar":
                    return new Date(p.getFullYear() + riktning, p.getMonth(), 1);
            }
        });
    }, [vy]);
    const gaTillIdag = (0, react_1.useCallback)(() => setPeka((0, tid_1.startAvDag)(new Date())), []);
    /* ---------------------------------------------------------------
       Svep i sidled — bläddra en period
  
       Knappar räcker inte på en telefon. Att bläddra en vecka är den
       vanligaste handlingen i en kalender, och den skall inte kräva att
       man siktar på en knapp: fingret drar åt vänster och nästa vecka
       kommer. Steget följer vyn, precis som pilarna gör.
  
       Gesten läses PÅ SLÄPPET och inget preventDefault sker under vägen.
       Det är avgörande: hade rörelsen fångats medan den pågick skulle
       rutnätets lodräta rullning dö, och rullningen är det man gör
       oftast. Här är svepet en tolkning i efterhand av en rörelse
       webbläsaren redan skött.
       --------------------------------------------------------------- */
    const svep = (0, react_1.useRef)(null);
    /** Minsta vågräta sträcka som räknas som ett svep. */
    const SVEP_MIN = 60;
    const svepStart = (0, react_1.useCallback)((e) => {
        // Blocken äger sina egna gester: långtryck armerar och drar dem.
        const mal = e.target;
        if (e.touches.length !== 1 ||
            sida !== "kalender" ||
            document.body.classList.contains("drar-pagar") ||
            mal?.closest(".handelse, .heldag-block, .grepp, .nyritning")) {
            svep.current = null;
            return;
        }
        const t = e.touches[0];
        svep.current = { x: t.clientX, y: t.clientY, tid: Date.now() };
    }, [sida]);
    const svepSlut = (0, react_1.useCallback)((e) => {
        const start = svep.current;
        svep.current = null;
        if (!start || document.body.classList.contains("drar-pagar"))
            return;
        const t = e.changedTouches[0];
        if (!t)
            return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        // Vågrätt måste vinna tydligt över lodrätt, annars blir varje
        // snedställd rullning ett veckohopp.
        if (Math.abs(dx) < SVEP_MIN || Math.abs(dx) < Math.abs(dy) * 1.6)
            return;
        if (Date.now() - start.tid > 800)
            return;
        // Svep åt vänster för framåt — innehållet drar med fingret.
        stega(dx < 0 ? 1 : -1);
        /*
         * Släppet kan annars också bli ett klick på det som råkade ligga
         * under fingret när det stannade. Ett enda klick sväljs, en gång,
         * i fångstfasen — utan detta öppnar ett svep över årsvyn en dag
         * man aldrig siktade på.
         */
        const svalj = (klick) => {
            klick.preventDefault();
            klick.stopPropagation();
        };
        window.addEventListener("click", svalj, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener("click", svalj, { capture: true }), 400);
    }, [stega]);
    const gaTillDag = (0, react_1.useCallback)((d) => setPeka((0, tid_1.startAvDag)(d)), []);
    const oppnaDag = (0, react_1.useCallback)((d) => {
        setPeka((0, tid_1.startAvDag)(d));
        setVy("dag");
    }, []);
    /* ---------------------------------------------------------------
       Händelseoperationer
       --------------------------------------------------------------- */
    const oppnaHandelse = (0, react_1.useCallback)((f) => {
        setVald(f.nyckel);
        setRedigerar({ forekomst: f, utkast: null });
    }, []);
    /**
     * Öppnar en händelse man bara känner till id och dag för.
     *
     * Vyerna ritar FÖREKOMSTER, inte händelser, så panelen behöver en
     * sådan. Den räknas fram genom att expandera just den här händelsen
     * över ett litet fönster kring dagen — billigare än att leta i hela
     * den expanderade listan, och fungerar även när träffen ligger utanför
     * det fönster vyn råkar visa just nu.
     */
    const oppnaHandelseVid = (0, react_1.useCallback)((handelseId, dag) => {
        const h = butik.handelser.find((x) => x.id === handelseId);
        if (!h)
            return;
        const d = (0, tid_1.startAvDag)(dag ?? (0, tid_1.tolka)(h.start));
        setSida("kalender");
        setPeka(d);
        setVy("dag");
        const traffar = (0, upprepning_1.expanderaAlla)([h], (0, tid_1.addDagar)(d, -1), (0, tid_1.addDagar)(d, 2));
        const f = traffar[0];
        if (!f)
            return;
        const ton = butik.kalenderFor(h.kalenderId).ton;
        setVald(f.nyckel);
        setRedigerar({ forekomst: { ...f, ton }, utkast: null });
    }, [butik]);
    /** En sökträff — kan ligga på vilken av de tre sidorna som helst. */
    const oppnaTraff = (0, react_1.useCallback)((t) => {
        if (t.slag === "handelse") {
            oppnaHandelseVid(t.id, t.datum);
        }
        else if (t.slag === "uppgift") {
            setSida("attgora");
            setOppnaUppgift(pekaPa(t.id));
        }
        else {
            setSida("anteckningar");
            setOppnaAnteckning(pekaPa(t.id));
        }
    }, [oppnaHandelseVid, pekaPa]);
    /** Målet för en [[koppling]]. Samma resa, annan startpunkt. */
    const oppnaMal = (0, react_1.useCallback)((mal) => {
        if (mal.slag === "handelse") {
            oppnaHandelseVid(mal.id, null);
        }
        else if (mal.slag === "uppgift") {
            setSida("attgora");
            setOppnaUppgift(pekaPa(mal.id));
        }
        else {
            setSida("anteckningar");
            setOppnaAnteckning(pekaPa(mal.id));
        }
    }, [oppnaHandelseVid, pekaPa]);
    /**
     * Skapar anteckningen en [[länk]] pekade på men som inte fanns.
     *
     * Utan den här vägen fungerar svävande länkar bara inifrån
     * anteckningsvyn, och löftet att kopplingarna är desamma överallt är
     * inte sant: skriver man [[kvartalsrapporten]] i ett mötes anteckning
     * blir chipset en död knapp i stället för en väg framåt.
     */
    const skapaLankadAnteckning = (0, react_1.useCallback)((titel) => {
        const a = butik.skapaAnteckning({
            titel,
            kalenderId: butik.kalendrar[0]?.id ?? "arbete",
        });
        setRedigerar(null);
        setSida("anteckningar");
        setOppnaAnteckning(pekaPa(a.id));
    }, [butik, pekaPa]);
    const nyAnteckning = (0, react_1.useCallback)(() => {
        setSida("anteckningar");
        setFokusera((n) => n + 1);
    }, []);
    const nyHandelse = (0, react_1.useCallback)((start, slut, heldag = false) => {
        const s = start ??
            (() => {
                const nu = new Date();
                const bas = (0, tid_1.arSammaDag)(peka, nu)
                    ? new Date(nu.getFullYear(), nu.getMonth(), nu.getDate(), nu.getHours() + 1)
                    : new Date(peka.getFullYear(), peka.getMonth(), peka.getDate(), 9);
                return bas;
            })();
        const e = slut ?? new Date(s.getTime() + 3600000);
        setRedigerar({
            forekomst: null,
            utkast: { start: (0, tid_1.stampel)(s), slut: (0, tid_1.stampel)(e), heldag },
        });
    }, [peka]);
    /**
     * Flytt via drag. En serie kan inte flyttas utan att man bestämt
     * räckvidden, så frågan ställs i en liten ruta i stället för att appen
     * gissar. Enstaka händelser flyttas direkt.
     */
    const [flyttfraga, setFlyttfraga] = (0, react_1.useState)(null);
    const flytta = (0, react_1.useCallback)((f, nyStart, nySlut) => {
        if (f.serie) {
            setFlyttfraga({ f, start: nyStart, slut: nySlut });
            return;
        }
        butik.flytta(f, nyStart, nySlut, "alla");
    }, [butik]);
    /* Kvittot tonar bort av sig själv. Ett meddelande man måste stänga är
       ett meddelande till, inte ett mindre. */
    (0, react_1.useEffect)(() => {
        if (!kvitto)
            return;
        const id = window.setTimeout(() => setKvitto(null), KVITTO_MS);
        return () => window.clearTimeout(id);
    }, [kvitto]);
    /* ---------------------------------------------------------------
       Tangentbord
       --------------------------------------------------------------- */
    const kvarAttGora = (0, react_1.useMemo)(() => butik.uppgifter.filter((u) => !u.klar).length, [butik.uppgifter]);
    const valdForekomst = (0, react_1.useMemo)(() => forekomster.find((f) => f.nyckel === vald) ?? null, [forekomster, vald]);
    const kommandon = (0, react_1.useMemo)(() => [
        ...typer_1.VYER.map((v) => ({
            id: `vy-${v.id}`,
            namn: `Visa ${v.namn.toLowerCase()}`,
            grupp: "Vy",
            tangent: v.tangent,
            utfor: () => setVy(v.id),
        })),
        {
            id: "idag",
            namn: "Gå till idag",
            grupp: "Navigering",
            tangent: "T",
            utfor: gaTillIdag,
        },
        {
            id: "nasta",
            namn: "Nästa period",
            grupp: "Navigering",
            tangent: "→",
            utfor: () => stega(1),
        },
        {
            id: "forra",
            namn: "Föregående period",
            grupp: "Navigering",
            tangent: "←",
            utfor: () => stega(-1),
        },
        {
            id: "ny",
            namn: "Ny händelse",
            grupp: "Händelser",
            tangent: "N",
            utfor: () => nyHandelse(),
        },
        {
            id: "angra",
            namn: "Ångra",
            grupp: "Redigering",
            tangent: "⌘Z",
            utfor: butik.angra,
        },
        {
            id: "gorom",
            namn: "Gör om",
            grupp: "Redigering",
            tangent: "⇧⌘Z",
            utfor: butik.gorOm,
        },
        {
            id: "sida-kalender",
            namn: "Visa kalendern",
            grupp: "Sidor",
            utfor: () => setSida("kalender"),
        },
        {
            id: "sida-attgora",
            namn: "Visa att göra",
            grupp: "Sidor",
            utfor: () => setSida("attgora"),
        },
        {
            id: "sida-anteckningar",
            namn: "Visa anteckningar",
            grupp: "Sidor",
            utfor: () => setSida("anteckningar"),
        },
        {
            id: "ny-anteckning",
            namn: "Ny anteckning",
            grupp: "Anteckningar",
            utfor: nyAnteckning,
        },
        {
            id: "sida-annat",
            namn: "Visa annat",
            grupp: "Sidor",
            utfor: () => setSida("annat"),
        },
        // Varje sida under Annat får en egen väg in. Med bara en handfull
        // sidor är listan kort, och paletten är den snabbaste vägen dit.
        ...register_1.SIDOR.map((x) => ({
            id: `annat-${x.id}`,
            namn: `Öppna ${x.titel}`,
            grupp: "Annat",
            utfor: () => {
                setSida("annat");
                setOppnaAnnat(x.id);
            },
        })),
        {
            id: "hamta-om",
            namn: "Hämta om allt från molnet",
            grupp: "Molnet",
            utfor: () => void butik.synkaOmAllt(),
        },
        {
            id: "synka",
            namn: "Synka nu",
            grupp: "Molnet",
            utfor: () => void butik.synkaNu(),
        },
        {
            id: "hantera-kalendrar",
            namn: "Hantera kalendrar — lägg till, byt namn, ta bort",
            grupp: "Kalendrar",
            utfor: () => setHanterarKalendrar(true),
        },
        {
            id: "visa-alla",
            namn: "Visa alla kalendrar",
            grupp: "Filter",
            utfor: butik.visaAlla,
        },
        ...butik.kalendrar.map((k) => ({
            id: `kal-${k.id}`,
            namn: `Växla kalendern ${k.namn}`,
            grupp: "Filter",
            utfor: () => butik.vaxlaKalender(k.id),
        })),
        {
            id: "zoom-in",
            namn: "Zooma in rutnätet",
            grupp: "Vy",
            tangent: "+",
            utfor: () => setTimhojd((h) => (0, tid_1.klam)(h + 10, TIMHOJD_MIN, TIMHOJD_MAX)),
        },
        {
            id: "zoom-ut",
            namn: "Zooma ut rutnätet",
            grupp: "Vy",
            tangent: "−",
            utfor: () => setTimhojd((h) => (0, tid_1.klam)(h - 10, TIMHOJD_MIN, TIMHOJD_MAX)),
        },
        {
            id: "tom",
            namn: "Töm kalendern",
            grupp: "Data",
            utfor: () => {
                if (butik.handelser.length === 0)
                    return;
                if (window.confirm(`Radera alla ${butik.handelser.length} poster? Går att ångra med ⌘Z.`)) {
                    butik.tomKalendern();
                }
            },
        },
    ], [butik, gaTillIdag, nyAnteckning, nyHandelse, stega]);
    const redigerarRef = (0, react_1.useRef)(redigerar);
    redigerarRef.current = redigerar;
    const hanterarRef = (0, react_1.useRef)(hanterarKalendrar);
    hanterarRef.current = hanterarKalendrar;
    const kontoRef = (0, react_1.useRef)(konto);
    kontoRef.current = konto;
    const ladaRef = (0, react_1.useRef)(lada);
    ladaRef.current = lada;
    const sidaRef = (0, react_1.useRef)(sida);
    sidaRef.current = sida;
    (0, react_1.useEffect)(() => {
        const paTangent = (e) => {
            const mal = e.target;
            const iFalt = mal &&
                (mal.tagName === "INPUT" ||
                    mal.tagName === "TEXTAREA" ||
                    mal.tagName === "SELECT" ||
                    mal.isContentEditable);
            // Paletten når man alltid, även från ett fält.
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setPalett(true);
                return;
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
                if (iFalt)
                    return;
                e.preventDefault();
                if (e.shiftKey)
                    butik.gorOm();
                else
                    butik.angra();
                return;
            }
            if (iFalt || redigerarRef.current || hanterarRef.current)
                return;
            if (kontoRef.current || ladaRef.current)
                return;
            // Att göra-sidan har inga vyer att växla mellan och inget datum
            // att bläddra i. Att låta tangenterna verka i bakgrunden vore ett
            // sätt att hamna någon helt annanstans utan att förstå varför.
            if (sidaRef.current !== "kalender") {
                // N betyder "nytt" på alla tre sidorna — bara olika sorts nytt.
                if (e.key === "n" || e.key === "N") {
                    e.preventDefault();
                    setFokusera((n) => n + 1);
                }
                return;
            }
            const v = typer_1.VYER.find((x) => x.tangent === e.key);
            if (v) {
                setVy(v.id);
                return;
            }
            switch (e.key) {
                case "ArrowRight":
                    e.preventDefault();
                    stega(1);
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    stega(-1);
                    break;
                case "t":
                case "T":
                    gaTillIdag();
                    break;
                case "n":
                case "N":
                    e.preventDefault();
                    nyHandelse();
                    break;
                case "+":
                    setTimhojd((h) => (0, tid_1.klam)(h + 8, TIMHOJD_MIN, TIMHOJD_MAX));
                    break;
                case "-":
                    setTimhojd((h) => (0, tid_1.klam)(h - 8, TIMHOJD_MIN, TIMHOJD_MAX));
                    break;
                case "Escape":
                    setVald(null);
                    break;
                case "Backspace":
                case "Delete":
                    if (valdForekomst) {
                        e.preventDefault();
                        if (valdForekomst.serie)
                            oppnaHandelse(valdForekomst);
                        else
                            butik.radera(valdForekomst, "alla");
                    }
                    break;
                case "Enter":
                    if (valdForekomst) {
                        e.preventDefault();
                        oppnaHandelse(valdForekomst);
                    }
                    break;
            }
        };
        window.addEventListener("keydown", paTangent);
        return () => window.removeEventListener("keydown", paTangent);
    }, [butik, gaTillIdag, nyHandelse, oppnaHandelse, stega, valdForekomst]);
    /* ---------------------------------------------------------------
       Rubrik
       --------------------------------------------------------------- */
    const rubrik = (0, react_1.useMemo)(() => {
        switch (vy) {
            case "dag":
                return (0, tid_1.langtDatum)(peka);
            case "tredag": {
                const sista = (0, tid_1.addDagar)(peka, 2);
                return peka.getMonth() === sista.getMonth()
                    ? `${peka.getDate()}–${sista.getDate()} ${tid_1.MANADER[peka.getMonth()].toLowerCase()} ${peka.getFullYear()}`
                    : `${(0, tid_1.langtDatum)(peka)} – ${(0, tid_1.langtDatum)(sista)}`;
            }
            case "vecka": {
                const m = (0, tid_1.startAvVecka)(peka);
                const s = (0, tid_1.addDagar)(m, 6);
                return m.getMonth() === s.getMonth()
                    ? `${m.getDate()}–${s.getDate()} ${tid_1.MANADER[m.getMonth()].toLowerCase()} ${m.getFullYear()}`
                    : `${m.getDate()} ${tid_1.MANADER[m.getMonth()]
                        .slice(0, 3)
                        .toLowerCase()} – ${s.getDate()} ${tid_1.MANADER[s.getMonth()]
                        .slice(0, 3)
                        .toLowerCase()} ${s.getFullYear()}`;
            }
            case "manad":
                return `${tid_1.MANADER[peka.getMonth()]} ${peka.getFullYear()}`;
            case "ar":
                return String(peka.getFullYear());
        }
    }, [vy, peka]);
    const underrubrik = (0, react_1.useMemo)(() => {
        if (vy === "ar")
            return `${forekomster.length} poster i fönstret`;
        if (vy === "manad")
            return `Vecka ${(0, tid_1.isoVecka)((0, tid_1.startAvVecka)(peka))} och framåt`;
        return `Vecka ${(0, tid_1.isoVecka)(vy === "vecka" ? (0, tid_1.startAvVecka)(peka) : peka)}`;
    }, [vy, peka, forekomster.length]);
    /* ---------------------------------------------------------------
       Ritning
       --------------------------------------------------------------- */
    return ((0, jsx_runtime_1.jsxs)("main", { className: "viewport-lock appram", 
        /* Bottenraden är två våningar på kalendersidan och en på de andra.
           Kvittot måste lägga sig ovanför den, och kan inte gissa. */
        style: {
            ["--bottenrad"]: sida === "kalender" ? "74px" : "42px",
        }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "border border-ink flex flex-col h-[calc(100dvh-2.4vw)] min-h-[420px] overflow-hidden bg-paper", children: [(0, jsx_runtime_1.jsx)(Konto_1.MolnRemsa, { onOppna: () => setKonto(true) }), (0, jsx_runtime_1.jsxs)("nav", { className: "h-[50px] md:h-[52px] shrink-0 bg-azure border-b border-ink flex items-center justify-between px-2 md:px-3 gap-2 md:gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 md:gap-3 min-w-0", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro lg:hidden shrink-0", onClick: () => setLada(true), "aria-label": "Kalendrar och minim\u00E5nad", children: "\u2630" }), (0, jsx_runtime_1.jsxs)("span", { className: "hidden lg:flex items-center gap-2 shrink-0", children: [(0, jsx_runtime_1.jsx)(Marke_1.default, {}), (0, jsx_runtime_1.jsx)("span", { className: "display text-ink text-[1.25rem] leading-none", children: "Kalendariet" })] }), sida === "kalender" && ((0, jsx_runtime_1.jsxs)("div", { className: "knapp-rad shrink-0", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro hidden md:block", onClick: () => stega(-1), "aria-label": "F\u00F6reg\u00E5ende", children: "\u2039" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", onClick: gaTillIdag, children: "Idag" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro hidden md:block", onClick: () => stega(1), "aria-label": "N\u00E4sta", children: "\u203A" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h1", { className: "display text-[0.98rem] md:text-[1.1rem] leading-none truncate", children: sida === "kalender"
                                                    ? rubrik
                                                    : sida === "attgora"
                                                        ? "Att göra"
                                                        : sida === "anteckningar"
                                                            ? "Anteckningar"
                                                            : "Annat" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-60 truncate", children: sida === "kalender"
                                                    ? underrubrik
                                                    : sida === "attgora"
                                                        ? `${kvarAttGora} kvar`
                                                        : sida === "anteckningar"
                                                            ? `${butik.anteckningar.length} ${butik.anteckningar.length === 1
                                                                ? "anteckning"
                                                                : "anteckningar"}`
                                                            : `${register_1.SIDOR.length} ${register_1.SIDOR.length === 1 ? "sida" : "sidor"}` })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 shrink-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "knapp-rad hidden md:flex", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", "data-aktiv": sida === "kalender" ? "1" : "0", onClick: () => setSida("kalender"), children: "Kalender" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp micro", "data-aktiv": sida === "attgora" ? "1" : "0", onClick: () => setSida("attgora"), children: ["Att g\u00F6ra", kvarAttGora > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "tabnum", children: [" ", kvarAttGora] }))] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", "data-aktiv": sida === "anteckningar" ? "1" : "0", onClick: () => setSida("anteckningar"), children: "Anteckningar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", "data-aktiv": sida === "annat" ? "1" : "0", onClick: () => setSida("annat"), children: "Annat" })] }), (0, jsx_runtime_1.jsx)("div", { className: "knapp-rad hidden md:flex", children: sida === "kalender" &&
                                            typer_1.VYER.map((v) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro", "data-aktiv": vy === v.id ? "1" : "0", onClick: () => setVy(v.id), title: `${v.namn} (${v.tangent})`, children: v.namn }, v.id))) }), (0, jsx_runtime_1.jsx)(Konto_1.HamtaKnapp, {}), (0, jsx_runtime_1.jsx)(Konto_1.KontoKnapp, { onOppna: () => setKonto(true) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp micro", onClick: () => setPalett(true), title: "F\u00E5nga, s\u00F6k eller styr (\u2318K)", "aria-label": "F\u00E5nga, s\u00F6k eller styr", children: [(0, jsx_runtime_1.jsx)("span", { className: "hidden md:inline", children: "\u2318K" }), (0, jsx_runtime_1.jsx)("span", { className: "md:hidden", children: "\u2315" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-h-0 flex", children: [sida === "kalender" && ((0, jsx_runtime_1.jsx)(Sidopanel_1.default, { peka: peka, vy: vy, forekomster: forekomster, onGaTill: gaTillDag, onOppna: oppnaHandelse, onNy: () => nyHandelse(), onHanteraKalendrar: () => setHanterarKalendrar(true) })), sida === "kalender" && lada && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "lada-overlay lg:hidden", onClick: () => setLada(false) }), (0, jsx_runtime_1.jsx)("div", { className: "sidolada lg:hidden", "data-oppen": "1", children: (0, jsx_runtime_1.jsx)(Sidopanel_1.default, { lada: true, peka: peka, vy: vy, forekomster: forekomster, onGaTill: (d) => {
                                                gaTillDag(d);
                                                setLada(false);
                                            }, onOppna: (f) => {
                                                setLada(false);
                                                oppnaHandelse(f);
                                            }, onNy: () => {
                                                setLada(false);
                                                nyHandelse();
                                            }, onHanteraKalendrar: () => {
                                                setLada(false);
                                                setHanterarKalendrar(true);
                                            }, onStang: () => setLada(false) }) })] })), (0, jsx_runtime_1.jsx)("section", { className: "flex-1 min-w-0 min-h-0 bg-paper relative", onTouchStart: svepStart, onTouchEnd: svepSlut, onTouchCancel: () => {
                                    svep.current = null;
                                }, children: sida === "annat" ? ((0, jsx_runtime_1.jsx)(Annat_1.default, { oppnaId: oppnaAnnat })) : sida === "anteckningar" ? ((0, jsx_runtime_1.jsx)(Anteckningar_1.default, { fokusera: fokusera, oppna: oppnaAnteckning, onOppnaMal: oppnaMal })) : sida === "attgora" ? ((0, jsx_runtime_1.jsx)(AttGora_1.default, { fokusera: fokusera, oppna: oppnaUppgift, onOppnaMal: oppnaMal, onSkapaLank: skapaLankadAnteckning })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [butik.laddad && butik.handelser.length === 0 && vy !== "ar" && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 z-10 flex items-center justify-center pointer-events-none", children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink px-4 py-3 max-w-[300px]", style: { ["--cf"]: "9px" }, children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("p", { className: "micro mb-1.5", children: "Kalendern \u00E4r tom" }), (0, jsx_runtime_1.jsxs)("p", { className: "pico opacity-60 leading-[1.8]", children: ["Dra upp ett spann i rutn\u00E4tet f\u00F6r att skapa en h\u00E4ndelse.", (0, jsx_runtime_1.jsx)("br", {}), "Eller tryck ", (0, jsx_runtime_1.jsx)("b", { children: "N" }), " f\u00F6r en ny, ", (0, jsx_runtime_1.jsx)("b", { children: "\u2318K" }), " f\u00F6r paletten."] })] }) })), !butik.laddad ? ((0, jsx_runtime_1.jsx)("div", { className: "h-full flex items-center justify-center", children: (0, jsx_runtime_1.jsx)("p", { className: "micro opacity-45", children: "L\u00E4ser kalendern\u2026" }) })) : vy === "ar" ? ((0, jsx_runtime_1.jsx)(ArsVy_1.default, { peka: peka, forekomster: forekomster, onGaTillDag: oppnaDag, onGaTillManad: (d) => {
                                                setPeka((0, tid_1.startAvManad)(d));
                                                setVy("manad");
                                            } })) : vy === "manad" ? ((0, jsx_runtime_1.jsx)(ManadsVy_1.default, { peka: peka, forekomster: forekomster, vald: vald, onValj: (f) => setVald(f?.nyckel ?? null), onOppna: oppnaHandelse, onFlytta: flytta, onSkapa: (s, e, heldag) => nyHandelse(s, e, heldag), onGaTillDag: oppnaDag })) : ((0, jsx_runtime_1.jsx)(TidsRutnat_1.default, { dagar: dagar, forekomster: forekomster, timhojd: timhojd, vald: vald, visaVecka: vy === "vecka", onValj: (f) => setVald(f?.nyckel ?? null), onOppna: oppnaHandelse, onFlytta: flytta, onSkapa: (s, e, heldag) => nyHandelse(s, e, heldag) }, vy))] })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "md:hidden bottenrad shrink-0 sakeromrade-botten", children: [sida === "kalender" && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-stretch bottenrad-vyer", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico !px-3 shrink-0 !border-x-0 !border-t-0", onClick: () => stega(-1), "aria-label": "F\u00F6reg\u00E5ende period", children: "\u2039" }), typer_1.VYER.map((v) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico flex-1 !border-x-0 !border-t-0", "data-aktiv": vy === v.id ? "1" : "0", onClick: () => setVy(v.id), "aria-label": v.namn, children: v.kort }, v.id))), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico !px-3 shrink-0 !border-x-0 !border-t-0", onClick: () => stega(1), "aria-label": "N\u00E4sta period", children: "\u203A" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-stretch", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico flex-1 !border-y-0 !border-l-0", "data-aktiv": sida === "kalender" ? "1" : "0", onClick: () => setSida("kalender"), children: "Kalender" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "knapp pico flex-1 !border-y-0", "data-aktiv": sida === "attgora" ? "1" : "0", onClick: () => setSida("attgora"), children: ["Att g\u00F6ra", kvarAttGora > 0 && (0, jsx_runtime_1.jsxs)("span", { className: "tabnum", children: [" ", kvarAttGora] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico flex-1 !border-y-0", "data-aktiv": sida === "anteckningar" ? "1" : "0", onClick: () => setSida("anteckningar"), children: "Anteckn." }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico flex-1 !border-y-0", "data-aktiv": sida === "annat" ? "1" : "0", onClick: () => setSida("annat"), children: "Annat" }), sida !== "annat" && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico px-4 !border-y-0 !border-r-0", "data-ton": "accent", onClick: () => {
                                            if (sida === "kalender")
                                                nyHandelse();
                                            else
                                                setFokusera((n) => n + 1);
                                        }, "aria-label": sida === "kalender"
                                            ? "Ny händelse"
                                            : sida === "attgora"
                                                ? "Ny uppgift"
                                                : "Ny anteckning", children: "+" }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "hidden md:block", children: (0, jsx_runtime_1.jsx)(ColophonStrip_1.default, { centre: sida === "kalender"
                                ? "1 · 2 · 3 · 4 · 5 växlar vy — N ny — T idag — ⌘K fånga & sök"
                                : sida === "attgora"
                                    ? "⌘K fånga & sök — N nytt — klicka en rad för att redigera"
                                    : sida === "anteckningar"
                                        ? "⌘K fånga & sök — N ny — [[titel]] länkar till annat"
                                        : "⌘K fånga & sök — sidorna sparas medan du skriver" }) })] }), redigerar && ((0, jsx_runtime_1.jsx)(HandelsePanel_1.default, { forekomst: redigerar.forekomst, utkast: redigerar.utkast, onStang: () => setRedigerar(null), onOppnaMal: (mal) => {
                    setRedigerar(null);
                    oppnaMal(mal);
                }, onSkapaLank: skapaLankadAnteckning })), hanterarKalendrar && ((0, jsx_runtime_1.jsx)(KalenderPanel_1.default, { onStang: () => setHanterarKalendrar(false) })), konto && (0, jsx_runtime_1.jsx)(Konto_1.default, { onStang: () => setKonto(false) }), palett && ((0, jsx_runtime_1.jsx)(Kommandopalett_1.default, { kommandon: kommandon, onGaTill: gaTillDag, onOppnaTraff: oppnaTraff, onFangad: setKvitto, onStang: () => setPalett(false) })), kvitto && ((0, jsx_runtime_1.jsx)(FangstKvitto, { fangad: kvitto, onGa: () => {
                    if (kvitto.sort === "handelse") {
                        oppnaHandelseVid(kvitto.id, kvitto.datum);
                    }
                    else {
                        setSida("attgora");
                        setOppnaUppgift(pekaPa(kvitto.id));
                    }
                    setKvitto(null);
                }, onStang: () => setKvitto(null) })), flyttfraga && ((0, jsx_runtime_1.jsx)(FlyttFraga, { onVal: (r) => {
                    butik.flytta(flyttfraga.f, flyttfraga.start, flyttfraga.slut, r);
                    setFlyttfraga(null);
                }, onAvbryt: () => setFlyttfraga(null) }))] }));
}
/**
 * Kvittot efter en fångst.
 *
 * Remsan finns för att fångsten annars är osynlig: man skriver en rad,
 * paletten stängs, och ingenting på skärmen ändrar sig — posten hamnade
 * på en annan dag eller en annan sida. Utan kvitto blir det första man
 * gör att leta rätt på den för att kontrollera att den kom fram, och då
 * har snabbheten inte tjänat någonting.
 *
 * Den ligger ovanför bottenraden på telefonen så att den inte skymmer
 * navigeringen, och försvinner av sig själv.
 */
function FangstKvitto({ fangad, onGa, onStang, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "fangstkvitto sakeromrade-botten", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-ink text-paper border border-ink flex items-center gap-2 px-2.5 py-1.5 max-w-[92vw]", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-70 shrink-0 hidden sm:inline", children: fangad.sort === "handelse" ? "Händelse" : "Uppgift" }), (0, jsx_runtime_1.jsx)("span", { className: "micro truncate normal-case", children: fangad.titel }), fangad.datum && ((0, jsx_runtime_1.jsx)("span", { className: "pico opacity-70 shrink-0 tabnum", children: (0, tid_1.kortDatum)(fangad.datum) })), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0 !bg-transparent !text-paper !border-paper/40", onClick: onGa, children: "Visa" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0 !bg-transparent !text-paper !border-paper/40", onClick: onStang, "aria-label": "St\u00E4ng", children: "\u2715" })] }) }));
}
/** Samma fråga som i redigeringspanelen, men för ett drag. */
function FlyttFraga({ onVal, onAvbryt, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "palett-overlay !items-center !pt-0", onClick: onAvbryt, children: (0, jsx_runtime_1.jsxs)("div", { className: "cf bg-panel border border-ink p-3 w-[300px]", style: { ["--cf"]: "8px" }, onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("span", { className: "cf-in", "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("p", { className: "micro mb-1", children: "Flytta \u2014 vad skall det g\u00E4lla?" }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-55 mb-2.5 leading-relaxed", children: "H\u00E4ndelsen ing\u00E5r i en serie." }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [[
                            ["denna", "Endast denna händelse"],
                            ["framat", "Denna och alla senare"],
                            ["alla", "Hela serien"],
                        ].map(([r, namn]) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp micro text-left", onClick: () => onVal(r), children: namn }, r))), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico mt-1 opacity-70", onClick: onAvbryt, children: "Avbryt" })] })] }) }));
}
