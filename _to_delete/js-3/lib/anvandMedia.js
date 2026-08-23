"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMedia = useMedia;
exports.useMobil = useMobil;
exports.useSmal = useSmal;
exports.useBeroring = useBeroring;
exports.useInstallerad = useInstallerad;
exports.useTangentbord = useTangentbord;
/**
 * Mediefrågor som React-tillstånd.
 *
 * Värdet startar alltid som `false` och rättas efter monteringen. Att
 * fråga `matchMedia` under första renderingen vore frestande, men servern
 * har inget fönster och statisk export ritar sidan i förväg — svaret
 * skulle bli fel och hydreringen krascha. En bildruta med skrivbordsläget
 * är ett billigare pris.
 */
const react_1 = require("react");
function useMedia(fraga) {
    const [traffar, setTraffar] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (typeof window === "undefined" || !window.matchMedia)
            return;
        const mql = window.matchMedia(fraga);
        const uppdatera = () => setTraffar(mql.matches);
        uppdatera();
        mql.addEventListener("change", uppdatera);
        return () => mql.removeEventListener("change", uppdatera);
    }, [fraga]);
    return traffar;
}
/** Telefonbredd. Samma brytpunkt som Tailwinds `md`. */
function useMobil() {
    return useMedia("(max-width: 767px)");
}
/** Smalt men inte telefon — surfplatta på höjden, delad fönstervy. */
function useSmal() {
    return useMedia("(max-width: 1023px)");
}
/** Sant när pekdonet är ett finger. Styr långtryck i stället för drag. */
function useBeroring() {
    return useMedia("(pointer: coarse)");
}
/** Sant när appen körs installerad, utan webbläsarens ram. */
function useInstallerad() {
    return useMedia("(display-mode: standalone)");
}
/**
 * Mäter hur mycket av skärmen tangentbordet äter, och skriver svaret som
 * `--tangentbord` på dokumentet.
 *
 * Problemet är att `100dvh` inte vet något om tangentbordet. På iOS
 * krymper `visualViewport` när det fälls upp medan `innerHeight` står
 * kvar, så appen fortsätter tro att den är hela skärmen hög — och
 * skrivytan, bottenraden och panelernas knappar hamnar bakom
 * tangentbordet. Eftersom skalet dessutom är `overflow: hidden` kan
 * webbläsaren inte rulla fram det fokuserade fältet heller.
 *
 * Skillnaden mellan de två höjderna ÄR tangentbordet. Med den som
 * CSS-variabel kan varje yta som behöver det krympa av sig själv.
 *
 * Värdet skrivs direkt på documentElement i stället för att lämnas
 * tillbaka som tillstånd: det ändras med varje bildruta medan
 * tangentbordet glider upp, och en omrendering av hela kalendern per
 * bildruta är precis vad man inte vill ha mitt i en animering.
 */
function useTangentbord() {
    (0, react_1.useEffect)(() => {
        const vv = window.visualViewport;
        if (!vv)
            return;
        const uppdatera = () => {
            const dolt = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            // Under ett par tiotal pixlar är det adressfältet som rör sig,
            // inte ett tangentbord. Att låta appen hoppa för det vore värre
            // än att låta bli.
            const varde = dolt > 80 ? Math.round(dolt) : 0;
            document.documentElement.style.setProperty("--tangentbord", `${varde}px`);
        };
        uppdatera();
        vv.addEventListener("resize", uppdatera);
        vv.addEventListener("scroll", uppdatera);
        return () => {
            vv.removeEventListener("resize", uppdatera);
            vv.removeEventListener("scroll", uppdatera);
            document.documentElement.style.removeProperty("--tangentbord");
        };
    }, []);
}
