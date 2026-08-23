"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useButik = useButik;
exports.default = ButikProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Butiken som React ser den.
 *
 * Komponenterna rör aldrig localStorage direkt; de anropar metoderna här.
 * Metoderna arbetar på FÖREKOMSTER och tar emot en räckvidd — "denna",
 * "framåt" eller "alla" — eftersom en händelse i en serie inte kan ändras
 * utan att man först bestämt vad ändringen skall gälla. Den regeln är
 * själva skillnaden mellan en kalender som fungerar och en som inte gör
 * det, så den ligger i lagret och inte i gränssnittet.
 */
const react_1 = require("react");
const butik_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/butik");
const upprepning_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/upprepning");
const tid_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tid");
const tolka_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/tolka");
const supabase_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/supabase");
const synk_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/synk");
const Sammanhang = (0, react_1.createContext)(null);
function useButik() {
    const v = (0, react_1.useContext)(Sammanhang);
    if (!v)
        throw new Error("useButik måste ligga inuti <ButikProvider>");
    return v;
}
const TAK_HISTORIK = 60;
function ButikProvider({ children, }) {
    const lager = (0, react_1.useRef)(new butik_1.LokaltLager());
    // Händelser och kalendrar hålls i ETT tillstånd, inte två. Skälet är
    // ångra-historiken: att radera en kalender och flytta dess händelser är
    // en enda ändring, och den måste kunna tas tillbaka som en enda.
    const [data, setData] = (0, react_1.useState)({
        handelser: [],
        kalendrar: butik_1.STANDARDKALENDRAR,
        uppgifter: [],
        anteckningar: [],
        sidor: [],
    });
    const [laddad, setLaddad] = (0, react_1.useState)(false);
    // Gravstenar bor i lagret men får aldrig lämna butiken: gränssnittet
    // ser bara levande poster.
    const handelser = (0, react_1.useMemo)(() => (0, butik_1.levande)(data.handelser), [data.handelser]);
    const kalendrar = (0, react_1.useMemo)(() => (0, butik_1.levande)(data.kalendrar), [data.kalendrar]);
    const uppgifter = (0, react_1.useMemo)(() => (0, butik_1.levande)(data.uppgifter), [data.uppgifter]);
    const anteckningar = (0, react_1.useMemo)(() => (0, butik_1.levande)(data.anteckningar), [data.anteckningar]);
    const sidor = (0, react_1.useMemo)(() => (0, butik_1.levande)(data.sidor), [data.sidor]);
    const historik = (0, react_1.useRef)([]);
    const framtid = (0, react_1.useRef)([]);
    const [historikVersion, setHistorikVersion] = (0, react_1.useState)(0);
    // Läsningen sker efter montering, aldrig under rendering: servern har
    // ingen localStorage och en avvikelse mellan de två ger hydreringsfel.
    (0, react_1.useEffect)(() => {
        const sparat = lager.current.las();
        if (sparat) {
            setData({
                handelser: sparat.handelser,
                kalendrar: sparat.kalendrar.length > 0 ? sparat.kalendrar : butik_1.STANDARDKALENDRAR,
                uppgifter: sparat.uppgifter,
                anteckningar: sparat.anteckningar,
                sidor: sparat.sidor,
            });
        }
        // Utan sparat läge börjar kalendern tom. Ingen exempeldata sås:
        // det som står i kalendern skall vara sådant användaren själv skrivit.
        setLaddad(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!laddad)
            return;
        lager.current.skriv(data);
    }, [data, laddad]);
    /** Ändrar innehållet och lägger föregående läge på ångra-stacken. */
    const andra = (0, react_1.useCallback)((f) => {
        setData((tidigare) => {
            const nasta = f(tidigare);
            if (nasta === tidigare)
                return tidigare;
            historik.current = [...historik.current, tidigare].slice(-TAK_HISTORIK);
            framtid.current = [];
            setHistorikVersion((v) => v + 1);
            return nasta;
        });
    }, []);
    /**
     * Ändring som INTE hamnar i historiken. Används för att visa och dölja
     * kalendrar: det är en inställning för ögat, inte en ändring av
     * innehållet, och ⌘Z skall inte behöva kliva bakåt genom filterklick.
     */
    const sattTyst = (0, react_1.useCallback)((f) => {
        setData(f);
    }, []);
    /**
     * Ändrar händelselistan och stämplar det som faktiskt rörde sig.
     *
     * Stämplingen sker här och inte hos anroparen, av ett skäl som är värt
     * att vara noggrann med: en post som ändras utan att få ny `andrad`-tid
     * blir kvar på enheten för alltid — synkmotorn ser den som redan
     * skickad. Genom att jämföra objektidentitet före och efter fångas
     * varje ändring automatiskt, och det går inte att glömma.
     *
     * Poster som försvinner ur listan blir gravstenar i stället för att
     * kastas. En post som bara raderas lokalt återuppstår vid nästa synk
     * från en enhet som ännu inte hört talas om borttagningen.
     */
    const andraHandelser = (0, react_1.useCallback)((f) => {
        andra((o) => {
            const nya = f(o.handelser);
            const tidpunkt = (0, butik_1.nu)();
            const fore = new Map(o.handelser.map((h) => [h.id, h]));
            const kvar = nya.map((h) => fore.get(h.id) === h ? h : (0, butik_1.rord)(h, tidpunkt));
            const kvarIder = new Set(nya.map((h) => h.id));
            const gravar = o.handelser
                .filter((h) => !kvarIder.has(h.id) && !h.raderad)
                .map((h) => (0, butik_1.gravsatt)(h, tidpunkt));
            return { ...o, handelser: [...kvar, ...gravar] };
        });
    }, [andra]);
    /**
     * Samma mekanik som för händelser: identiteten före och efter avgör
     * vad som stämplas, och det som försvinner ur listan blir en gravsten.
     * Att skriva om den logiken en gång till hade varit ett sätt att få
     * den fel på ett av de två ställena.
     */
    const andraUppgifter = (0, react_1.useCallback)((f) => {
        andra((o) => {
            const nya = f(o.uppgifter);
            const tidpunkt = (0, butik_1.nu)();
            const fore = new Map(o.uppgifter.map((u) => [u.id, u]));
            const kvar = nya.map((u) => fore.get(u.id) === u ? u : (0, butik_1.rord)(u, tidpunkt));
            const kvarIder = new Set(nya.map((u) => u.id));
            const gravar = o.uppgifter
                .filter((u) => !kvarIder.has(u.id) && !u.raderad)
                .map((u) => (0, butik_1.gravsatt)(u, tidpunkt));
            return { ...o, uppgifter: [...kvar, ...gravar] };
        });
    }, [andra]);
    const skapaUppgift = (0, react_1.useCallback)((utkast) => {
        const u = (0, butik_1.normaliseraUppgift)({ ...utkast, id: utkast.id ?? (0, butik_1.nyId)() });
        andraUppgifter((lista) => [...lista, u]);
        return u;
    }, [andraUppgifter]);
    const sparaUppgift = (0, react_1.useCallback)((u) => {
        andraUppgifter((lista) => lista.some((x) => x.id === u.id)
            ? lista.map((x) => (x.id === u.id ? (0, butik_1.normaliseraUppgift)(u) : x))
            : [...lista, (0, butik_1.normaliseraUppgift)(u)]);
    }, [andraUppgifter]);
    const vaxlaKlar = (0, react_1.useCallback)((id) => {
        andraUppgifter((lista) => lista.map((u) => (u.id === id ? (0, butik_1.vaxlaKlar)(u) : u)));
    }, [andraUppgifter]);
    const taBortUppgift = (0, react_1.useCallback)((id) => {
        andraUppgifter((lista) => lista.filter((u) => u.id !== id));
    }, [andraUppgifter]);
    /**
     * Tredje kopian av samma mekanik. Att bryta ut den till en generisk
     * hjälpare hade sparat rader men krävt att typen bar både `id` och
     * `Synkbar` genom tre lager generics — och den dagen någon behöver
     * göra något olika för en av sorterna är delningen i vägen.
     */
    const andraAnteckningar = (0, react_1.useCallback)((f) => {
        andra((o) => {
            const nya = f(o.anteckningar);
            const tidpunkt = (0, butik_1.nu)();
            const fore = new Map(o.anteckningar.map((a) => [a.id, a]));
            const kvar = nya.map((a) => fore.get(a.id) === a ? a : (0, butik_1.rord)(a, tidpunkt));
            const kvarIder = new Set(nya.map((a) => a.id));
            const gravar = o.anteckningar
                .filter((a) => !kvarIder.has(a.id) && !a.raderad)
                .map((a) => (0, butik_1.gravsatt)(a, tidpunkt));
            return { ...o, anteckningar: [...kvar, ...gravar] };
        });
    }, [andra]);
    const skapaAnteckning = (0, react_1.useCallback)((utkast) => {
        const a = (0, butik_1.normaliseraAnteckning)({ ...utkast, id: utkast.id ?? (0, butik_1.nyId)() });
        andraAnteckningar((lista) => [...lista, a]);
        return a;
    }, [andraAnteckningar]);
    const sparaAnteckning = (0, react_1.useCallback)((a) => {
        andraAnteckningar((lista) => lista.some((x) => x.id === a.id)
            ? lista.map((x) => (x.id === a.id ? (0, butik_1.normaliseraAnteckning)(a) : x))
            : [...lista, (0, butik_1.normaliseraAnteckning)(a)]);
    }, [andraAnteckningar]);
    const taBortAnteckning = (0, react_1.useCallback)((id) => {
        andraAnteckningar((lista) => lista.filter((a) => a.id !== id));
    }, [andraAnteckningar]);
    const vaxlaNalad = (0, react_1.useCallback)((id) => {
        andraAnteckningar((lista) => lista.map((a) => (a.id === id ? { ...a, nalad: !a.nalad } : a)));
    }, [andraAnteckningar]);
    /**
     * Sidorna under Annat.
     *
     * Ingen egen `andraSidor`: en sida skrivs alltid hel, aldrig i en
     * lista som kan växa och krympa, så gravstenslogiken har ingenting
     * att göra här. Det enda som behövs är stämplingen — och den får
     * aldrig glömmas bort, annars blir sidan kvar på enheten.
     */
    const sparaSida = (0, react_1.useCallback)((id, sidData) => {
        andra((o) => {
            const tidpunkt = (0, butik_1.nu)();
            const fanns = o.sidor.some((x) => x.id === id);
            const post = (0, butik_1.rord)((0, butik_1.normaliseraSida)({
                id,
                data: sidData,
                skapad: o.sidor.find((x) => x.id === id)?.skapad,
            }), tidpunkt);
            return {
                ...o,
                sidor: fanns
                    ? o.sidor.map((x) => (x.id === id ? post : x))
                    : [...o.sidor, post],
            };
        });
    }, [andra]);
    const sidaMed = (0, react_1.useCallback)((id) => sidor.find((x) => x.id === id) ?? null, [sidor]);
    const angra = (0, react_1.useCallback)(() => {
        const forra = historik.current[historik.current.length - 1];
        if (!forra)
            return;
        historik.current = historik.current.slice(0, -1);
        setData((nuvarande) => {
            framtid.current = [...framtid.current, nuvarande];
            return forra;
        });
        setHistorikVersion((v) => v + 1);
    }, []);
    const gorOm = (0, react_1.useCallback)(() => {
        const nasta = framtid.current[framtid.current.length - 1];
        if (!nasta)
            return;
        framtid.current = framtid.current.slice(0, -1);
        setData((nuvarande) => {
            historik.current = [...historik.current, nuvarande];
            return nasta;
        });
        setHistorikVersion((v) => v + 1);
    }, []);
    const skapa = (0, react_1.useCallback)((utkast) => {
        const h = (0, butik_1.normalisera)({ ...utkast, id: utkast.id ?? (0, butik_1.nyId)() });
        andraHandelser((lista) => [...lista, h]);
        return h;
    }, [andraHandelser]);
    /**
     * Sparar ett redigerat formulär. Räckvidden avgör om posten skrivs över,
     * om serien kapas i två, eller om bara en förekomst bryts ut.
     */
    const sparaHandelse = (0, react_1.useCallback)((h, forekomst, rackvidd) => {
        andraHandelser((lista) => {
            const original = lista.find((x) => x.id === h.id);
            // Ny post, eller en post utan serie: skriv rakt av.
            if (!original)
                return [...lista, (0, butik_1.normalisera)(h)];
            const arSerie = !!original.upprepning && original.upprepning.frekvens !== "ingen";
            if (!arSerie || rackvidd === "alla" || !forekomst) {
                return lista.map((x) => (x.id === h.id ? (0, butik_1.normalisera)(h) : x));
            }
            if (rackvidd === "denna") {
                // Bryt ut förekomsten som en fristående post, och stryk den ur
                // serien. Fristående, eftersom en enskild ändring inte skall
                // ärva seriens framtida ändringar.
                const utbruten = (0, butik_1.normalisera)({
                    ...h,
                    id: (0, butik_1.nyId)(),
                    upprepning: null,
                    undantag: [],
                    avvikelser: {},
                });
                return [
                    ...lista.map((x) => x.id === original.id ? (0, upprepning_1.strykForekomst)(x, forekomst.ursprung) : x),
                    utbruten,
                ];
            }
            // "framåt": kapa den gamla serien dagen innan och starta en ny.
            const kapad = (0, upprepning_1.kapaSerie)(original, forekomst.ursprung);
            const nyserie = (0, butik_1.normalisera)({
                ...h,
                id: (0, butik_1.nyId)(),
                undantag: [],
                avvikelser: {},
            });
            return [
                ...lista.map((x) => (x.id === original.id ? kapad : x)),
                nyserie,
            ];
        });
    }, [andraHandelser]);
    const flytta = (0, react_1.useCallback)((f, nyStart, nySlut, rackvidd) => {
        andraHandelser((lista) => lista.flatMap((x) => {
            if (x.id !== f.handelseId)
                return [x];
            const arSerie = !!x.upprepning && x.upprepning.frekvens !== "ingen";
            if (!arSerie) {
                return [{ ...x, start: (0, tid_1.stampel)(nyStart), slut: (0, tid_1.stampel)(nySlut) }];
            }
            if (rackvidd === "denna") {
                return [(0, upprepning_1.flyttaForekomst)(x, f.ursprung, nyStart, nySlut)];
            }
            const deltaDygn = (0, tid_1.dygnMellan)(f.start, nyStart);
            const deltaMin = (nyStart.getHours() - f.start.getHours()) * 60 +
                (nyStart.getMinutes() - f.start.getMinutes());
            const langdMin = Math.round((nySlut.getTime() - nyStart.getTime()) / 60000);
            if (rackvidd === "alla") {
                return [skiftSerie(x, deltaDygn, deltaMin, langdMin)];
            }
            // "framåt": den gamla serien slutar dagen innan, en ny tar vid
            // från den flyttade tidpunkten.
            const kapad = (0, upprepning_1.kapaSerie)(x, f.ursprung);
            const ny = skiftSerie({ ...x, id: (0, butik_1.nyId)(), undantag: [], avvikelser: {} }, deltaDygn, deltaMin, langdMin, f.start);
            return [kapad, ny];
        }));
    }, [andraHandelser]);
    const radera = (0, react_1.useCallback)((f, rackvidd) => {
        andraHandelser((lista) => lista.flatMap((x) => {
            if (x.id !== f.handelseId)
                return [x];
            const arSerie = !!x.upprepning && x.upprepning.frekvens !== "ingen";
            if (!arSerie || rackvidd === "alla")
                return [];
            if (rackvidd === "denna")
                return [(0, upprepning_1.strykForekomst)(x, f.ursprung)];
            // "framåt": kapa serien dagen före förekomsten.
            const dagenInnan = (0, tid_1.addDagar)((0, tid_1.tolka)(f.ursprung), -1);
            if (dagenInnan.getTime() < (0, tid_1.tolka)(x.start).getTime())
                return [];
            return [(0, upprepning_1.kapaSerie)(x, f.ursprung)];
        }));
    }, [andraHandelser]);
    /* ---------------------------------------------------------------
       Synlighet — inställningar för ögat, inte innehåll. Utanför ⌘Z.
       --------------------------------------------------------------- */
    const vaxlaKalender = (0, react_1.useCallback)((id) => {
        sattTyst((o) => ({
            ...o,
            kalendrar: o.kalendrar.map((x) => x.id === id ? { ...x, synlig: !x.synlig } : x),
        }));
    }, [sattTyst]);
    const visaEndast = (0, react_1.useCallback)((id) => {
        sattTyst((o) => ({
            ...o,
            kalendrar: o.kalendrar.map((x) => ({ ...x, synlig: x.id === id })),
        }));
    }, [sattTyst]);
    const visaAlla = (0, react_1.useCallback)(() => {
        sattTyst((o) => ({
            ...o,
            kalendrar: o.kalendrar.map((x) => ({ ...x, synlig: true })),
        }));
    }, [sattTyst]);
    /* ---------------------------------------------------------------
       Kalendrarna själva
       --------------------------------------------------------------- */
    const skapaKalender = (0, react_1.useCallback)((namn, ton) => {
        const id = (0, butik_1.nyId)();
        andra((o) => (0, butik_1.laggTillKalender)(o, namn, ton, id));
        return (0, butik_1.normaliseraKalender)({
            id,
            namn: namn.trim() || "Namnlös",
            ton: (0, butik_1.klamTon)(ton),
            synlig: true,
        });
    }, [andra]);
    const uppdateraKalender = (0, react_1.useCallback)((id, delar) => {
        andra((o) => (0, butik_1.andraKalender)(o, id, delar));
    }, [andra]);
    const taBortKalender = (0, react_1.useCallback)((id, flyttaTill) => {
        andra((o) => (0, butik_1.taBortKalender)(o, id, flyttaTill));
    }, [andra]);
    /** Hur många händelser som ligger i en viss kalender. */
    const antalIKalender = (0, react_1.useCallback)((id) => handelser.filter((h) => h.kalenderId === id).length, [handelser]);
    /**
     * Fångsten.
     *
     * En rad fri text in, en riktig post ut. Att den bor i butiken och
     * inte i paletten är avsiktligt: fångsten skall gå att nå från vilken
     * yta som helst — paletten, bottenraden, en framtida delningsmeny —
     * och alla måste ge exakt samma resultat för samma text.
     *
     * En rad utan titel skapar ingenting. "imorgon" ensamt är ett datum,
     * inte en anteckning om något, och en tom post i kalendern är värre
     * än ingen post alls.
     */
    const fanga = (0, react_1.useCallback)((text) => {
        const namn = kalendrar.map((k) => k.namn);
        const f = (0, tolka_1.tolkaFangst)(text, namn);
        const titel = f.titel.trim();
        if (!titel)
            return null;
        const standard = kalendrar[0]?.id ?? "arbete";
        const kalenderId = f.kalenderNamn
            ? (kalendrar.find((k) => k.namn.toLowerCase() === f.kalenderNamn.toLowerCase())?.id ?? standard)
            : standard;
        if (f.sort === "handelse" && f.start && f.slut) {
            const h = skapa({
                titel,
                start: f.start,
                slut: f.slut,
                heldag: f.heldag,
                kalenderId,
            });
            return { sort: "handelse", id: h.id, titel, datum: (0, tid_1.tolka)(h.start) };
        }
        const u = skapaUppgift({
            titel,
            prioritet: f.prioritet,
            forfaller: f.forfaller,
            kalenderId,
        });
        return {
            sort: "uppgift",
            id: u.id,
            titel,
            datum: f.forfaller ? (0, tid_1.tolka)(f.forfaller) : null,
        };
    }, [kalendrar, skapa, skapaUppgift]);
    /** Raderar allt innehåll. Går att ångra med ⌘Z, som allt annat. */
    const tomKalendern = (0, react_1.useCallback)(() => {
        andraHandelser(() => []);
    }, [andraHandelser]);
    /* ===============================================================
       MOLNET
       Allt här är frivilligt. Saknas nycklarna i bygget står tillståndet
       på "av" och appen beter sig exakt som en rent lokal kalender.
       =============================================================== */
    const [session, setSession] = (0, react_1.useState)(null);
    const [synkLage, setSynkLage] = (0, react_1.useState)({
        tillstand: supabase_1.MOLNET_FINNS ? "utloggad" : "av",
        ivag: 0,
        ner: 0,
        sist: null,
    });
    // En ref för att synkkörningen alltid skall se det senaste innehållet,
    // även om den startade före den senaste tangenttryckningen.
    const dataRef = (0, react_1.useRef)(data);
    dataRef.current = data;
    const synkarNu = (0, react_1.useRef)(false);
    const timerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const klient = (0, supabase_1.hamtaKlient)();
        if (!klient)
            return;
        let paplats = true;
        klient.auth.getSession().then(({ data: d }) => {
            if (paplats)
                setSession(d.session);
        });
        const { data: lyssnare } = klient.auth.onAuthStateChange((_, s) => {
            setSession(s);
        });
        return () => {
            paplats = false;
            lyssnare.subscription.unsubscribe();
        };
    }, []);
    const synkaNu = (0, react_1.useCallback)(async () => {
        const klient = (0, supabase_1.hamtaKlient)();
        const anvandare = session?.user?.id;
        if (!klient || !anvandare || synkarNu.current)
            return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            setSynkLage((l) => ({ ...l, tillstand: "offline" }));
            return;
        }
        synkarNu.current = true;
        setSynkLage((l) => ({ ...l, tillstand: "synkar", meddelande: undefined }));
        try {
            const resultat = await (0, synk_1.synka)(dataRef.current, anvandare, klient);
            // Ett spår i konsolen. När något inte kommer fram är devtools det
            // första man öppnar, och då skall det stå något där.
            console.info(`[kalendariet] synk klar — ${resultat.ner} ner, ${resultat.upp} upp`);
            // Innehållet kan ha ändrats under tiden nätverket arbetade. Därför
            // sätts resultatet inte rakt av, utan sammanfogas en gång till mot
            // det som råkar vara aktuellt just nu. En ändring som gjorts under
            // synkrundan har nyare stämpel och överlever därför.
            setData((nuvarande) => {
                const handelser = (0, synk_1.sammanfoga)(nuvarande.handelser, resultat.data.handelser);
                const kalendrar = (0, synk_1.sammanfogaKalendrar)(nuvarande.kalendrar, resultat.data.kalendrar);
                const uppgifter = (0, synk_1.sammanfoga)(nuvarande.uppgifter, resultat.data.uppgifter);
                const anteckningar = (0, synk_1.sammanfoga)(nuvarande.anteckningar, resultat.data.anteckningar);
                const sidor = (0, synk_1.sammanfoga)(nuvarande.sidor, resultat.data.sidor);
                // Sammanfogningen lämnar tillbaka samma referens när ingenting
                // skilde sig. Då skall tillståndet inte röras alls: annars ritas
                // hela kalendern om var trettionde sekund utan anledning.
                if (handelser === nuvarande.handelser &&
                    kalendrar === nuvarande.kalendrar &&
                    uppgifter === nuvarande.uppgifter &&
                    anteckningar === nuvarande.anteckningar &&
                    sidor === nuvarande.sidor) {
                    return nuvarande;
                }
                return { handelser, kalendrar, uppgifter, anteckningar, sidor };
            });
            setSynkLage({
                tillstand: "vilande",
                ivag: 0,
                ner: resultat.ner,
                sist: new Date().toISOString(),
            });
        }
        catch (e) {
            // Ett misslyckande är inte en katastrof: allt ligger kvar lokalt
            // och försöket görs om. Felet visas men blockerar ingenting.
            console.warn("[kalendariet] synk misslyckades:", e);
            setSynkLage((l) => ({
                ...l,
                tillstand: "fel",
                meddelande: (0, synk_1.oversattRadfel)(e.message),
            }));
        }
        finally {
            synkarNu.current = false;
        }
    }, [session]);
    /** Håller räknaren "på väg upp" aktuell och schemalägger en körning. */
    (0, react_1.useEffect)(() => {
        if (!session) {
            setSynkLage((l) => l.tillstand === "av"
                ? l
                : { ...l, tillstand: "utloggad", ivag: (0, synk_1.antalIvag)(data) });
            return;
        }
        const ivag = (0, synk_1.antalIvag)(data);
        setSynkLage((l) => ({ ...l, ivag }));
        if (ivag === 0)
            return;
        // Kort fördröjning så att ett drag inte blir tjugo skrivningar.
        if (timerRef.current)
            window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => void synkaNu(), 1500);
        return () => {
            if (timerRef.current)
                window.clearTimeout(timerRef.current);
        };
    }, [data, session, synkaNu]);
    /** Synka vid inloggning, när nätet kommer tillbaka, och med jämna mellanrum. */
    (0, react_1.useEffect)(() => {
        if (!session)
            return;
        void synkaNu();
        const paNat = () => void synkaNu();
        const paSynlig = () => {
            if (document.visibilityState === "visible")
                void synkaNu();
        };
        window.addEventListener("online", paNat);
        document.addEventListener("visibilitychange", paSynlig);
        // Reservlösning bakom realtidslyssnaren nedan. Trettio sekunder är
        // valt för att en enhet som missat en realtidsavisering — sovande
        // flik, tappad websocket — ändå skall komma ikapp innan man hinner
        // undra varför.
        const id = window.setInterval(() => void synkaNu(), 30000);
        const paOffline = () => setSynkLage((l) => ({ ...l, tillstand: "offline" }));
        window.addEventListener("offline", paOffline);
        return () => {
            window.removeEventListener("online", paNat);
            window.removeEventListener("offline", paOffline);
            document.removeEventListener("visibilitychange", paSynlig);
            window.clearInterval(id);
        };
    }, [session, synkaNu]);
    /**
     * Realtid: molnet knackar på när en annan enhet skrivit något.
     *
     * Utan detta syns en ändring från telefonen först vid nästa
     * pollningsvarv, och en kalender som ligger uppslagen på två skärmar
     * känns trasig även när den fungerar. Aviseringen bär ingen data — den
     * säger bara "något har hänt" — och en vanlig synkrunda gör resten.
     * Slås realtid inte på i Supabase skadar det ingenting; pollningen
     * fortsätter som förut.
     */
    (0, react_1.useEffect)(() => {
        const klient = (0, supabase_1.hamtaKlient)();
        const anvandare = session?.user?.id;
        if (!klient || !anvandare)
            return;
        let timer = null;
        const knuff = () => {
            // Ett drag på den andra enheten ger en avisering per skrivning.
            // Kort fördröjning samlar ihop dem till en enda körning.
            if (timer)
                window.clearTimeout(timer);
            timer = window.setTimeout(() => void synkaNu(), 400);
        };
        const kanal = klient
            .channel(`kalendariet-${anvandare}`)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "handelser",
            filter: `agare=eq.${anvandare}`,
        }, knuff)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "kalendrar",
            filter: `agare=eq.${anvandare}`,
        }, knuff)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "uppgifter",
            filter: `agare=eq.${anvandare}`,
        }, knuff)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "anteckningar",
            filter: `agare=eq.${anvandare}`,
        }, knuff)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "sidor",
            filter: `agare=eq.${anvandare}`,
        }, knuff)
            .subscribe();
        return () => {
            if (timer)
                window.clearTimeout(timer);
            klient.removeChannel(kanal);
        };
    }, [session, synkaNu]);
    const loggaIn = (0, react_1.useCallback)(async (epost, losenord) => {
        const klient = (0, supabase_1.hamtaKlient)();
        if (!klient)
            return "Molnet är inte konfigurerat i det här bygget.";
        const { error } = await klient.auth.signInWithPassword({
            email: epost.trim(),
            password: losenord,
        });
        return error ? error.message : null;
    }, []);
    /**
     * Hämtar hem allt på nytt genom att glömma markören. Utvägen när en
     * enhet av någon anledning hamnat ur fas med molnet — inget lokalt
     * innehåll rörs, det sammanfogas som vanligt.
     */
    const synkaOmAllt = (0, react_1.useCallback)(async () => {
        const anvandare = session?.user?.id;
        if (!anvandare)
            return;
        (0, synk_1.nollstallMarkor)(anvandare);
        await synkaNu();
    }, [session, synkaNu]);
    const stallDiagnos = (0, react_1.useCallback)(() => (0, synk_1.diagnostisera)(session?.user?.id ?? null, session?.user?.email ?? null), [session]);
    const loggaUt = (0, react_1.useCallback)(async () => {
        const klient = (0, supabase_1.hamtaKlient)();
        if (!klient)
            return;
        await klient.auth.signOut();
        setSynkLage({
            tillstand: "utloggad",
            ivag: (0, synk_1.antalIvag)(dataRef.current),
            ner: 0,
            sist: null,
        });
    }, []);
    const synligaIder = (0, react_1.useMemo)(() => new Set(kalendrar.filter((k) => k.synlig).map((k) => k.id)), [kalendrar]);
    const synligaHandelser = (0, react_1.useMemo)(() => handelser.filter((h) => synligaIder.has(h.kalenderId)), [handelser, synligaIder]);
    const kalenderKarta = (0, react_1.useMemo)(() => new Map(kalendrar.map((k) => [k.id, k])), [kalendrar]);
    const kalenderFor = (0, react_1.useCallback)((id) => kalenderKarta.get(id) ?? kalendrar[kalendrar.length - 1], [kalenderKarta, kalendrar]);
    const varde = (0, react_1.useMemo)(() => ({
        handelser,
        kalendrar,
        synligaHandelser,
        laddad,
        kanAngra: historik.current.length > 0,
        kanGorOm: framtid.current.length > 0,
        skapa,
        sparaHandelse,
        flytta,
        radera,
        vaxlaKalender,
        visaEndast,
        visaAlla,
        skapaKalender,
        uppdateraKalender,
        taBortKalender,
        antalIKalender,
        uppgifter,
        skapaUppgift,
        sparaUppgift,
        vaxlaKlar,
        taBortUppgift,
        anteckningar,
        skapaAnteckning,
        sparaAnteckning,
        taBortAnteckning,
        vaxlaNalad,
        sidor,
        sidaMed,
        sparaSida,
        fanga,
        angra,
        gorOm,
        tomKalendern,
        kalenderFor,
        molnetFinns: supabase_1.MOLNET_FINNS,
        session,
        synkLage,
        synkaNu,
        synkaOmAllt,
        stallDiagnos,
        loggaIn,
        loggaUt,
    }), 
    // historikVersion är med på ett hörn: den finns bara för att tvinga
    // fram en omräkning av kanAngra/kanGorOm, som bor i refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        handelser,
        kalendrar,
        synligaHandelser,
        laddad,
        historikVersion,
        skapa,
        sparaHandelse,
        flytta,
        radera,
        vaxlaKalender,
        visaEndast,
        visaAlla,
        skapaKalender,
        uppdateraKalender,
        taBortKalender,
        antalIKalender,
        uppgifter,
        skapaUppgift,
        sparaUppgift,
        vaxlaKlar,
        taBortUppgift,
        anteckningar,
        skapaAnteckning,
        sparaAnteckning,
        taBortAnteckning,
        vaxlaNalad,
        sidor,
        sidaMed,
        sparaSida,
        fanga,
        angra,
        gorOm,
        tomKalendern,
        kalenderFor,
        session,
        synkLage,
        synkaNu,
        synkaOmAllt,
        stallDiagnos,
        loggaIn,
        loggaUt,
    ]);
    return (0, jsx_runtime_1.jsx)(Sammanhang.Provider, { value: varde, children: children });
}
/**
 * Skjuter en hel serie i tid. Om serien är veckovis måste veckodagarna
 * följa med — annars hamnar "varje tisdag" på en onsdag som fortfarande
 * påstår sig vara tisdag.
 */
function skiftSerie(h, deltaDygn, deltaMin, langdMin, franForekomst) {
    const gammalStart = (0, tid_1.tolka)(h.start);
    const nyStart = new Date(gammalStart.getFullYear(), gammalStart.getMonth(), gammalStart.getDate() + deltaDygn, gammalStart.getHours(), gammalStart.getMinutes() + deltaMin);
    const nySlut = new Date(nyStart.getTime() + langdMin * 60000);
    let upprepning = h.upprepning;
    if (upprepning && upprepning.frekvens === "veckovis" && deltaDygn !== 0) {
        const skift = ((deltaDygn % 7) + 7) % 7;
        upprepning = {
            ...upprepning,
            veckodagar: upprepning.veckodagar.map((v) => (v + skift) % 7),
        };
    }
    // Undantag och avvikelser pekar på gamla datum; de flyttas med.
    const flyttaNyckel = (k) => (0, tid_1.nyckel)((0, tid_1.addDagar)((0, tid_1.tolka)(k), deltaDygn));
    const bas = {
        ...h,
        start: (0, tid_1.stampel)(nyStart),
        slut: (0, tid_1.stampel)(nySlut),
        upprepning,
        undantag: h.undantag.map(flyttaNyckel),
        avvikelser: Object.fromEntries(Object.entries(h.avvikelser).map(([k, v]) => [flyttaNyckel(k), v])),
    };
    if (franForekomst) {
        // Den nya serien skall börja vid den flyttade förekomsten, inte vid
        // den ursprungliga seriens allra första datum.
        const start = new Date(franForekomst.getFullYear(), franForekomst.getMonth(), franForekomst.getDate() + deltaDygn, franForekomst.getHours(), franForekomst.getMinutes() + deltaMin);
        return {
            ...bas,
            start: (0, tid_1.stampel)(start),
            slut: (0, tid_1.stampel)(new Date(start.getTime() + langdMin * 60000)),
            undantag: [],
            avvikelser: {},
        };
    }
    return bas;
}
