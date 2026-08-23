"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Offline;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Registrering av service workern, plus två små remsor: en när nätet är
 * borta, och en när en ny version väntar på att tas i bruk.
 *
 * Uppdateringen sker aldrig av sig själv mitt i arbetet. En sida som
 * laddas om medan man skriver i ett formulär är ett datatapp, oavsett hur
 * ny versionen är. Användaren får trycka.
 */
const react_1 = require("react");
function Offline() {
    const [offline, setOffline] = (0, react_1.useState)(false);
    const [nyVersion, setNyVersion] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const uppdatera = () => setOffline(!navigator.onLine);
        uppdatera();
        window.addEventListener("online", uppdatera);
        window.addEventListener("offline", uppdatera);
        return () => {
            window.removeEventListener("online", uppdatera);
            window.removeEventListener("offline", uppdatera);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }
        // I utvecklingsläge gör en service worker mest skada: den serverar
        // gamla buntar medan Next skickar nya, och man felsöker spöken.
        if (process.env.NODE_ENV !== "production")
            return;
        let avbruten = false;
        let stadning = null;
        navigator.serviceWorker
            .register("/sw.js", { scope: "/" })
            .then((reg) => {
            if (avbruten)
                return;
            const kolla = () => {
                const inkommande = reg.installing ?? reg.waiting;
                if (!inkommande)
                    return;
                if (reg.waiting && navigator.serviceWorker.controller) {
                    setNyVersion(reg.waiting);
                    return;
                }
                inkommande.addEventListener("statechange", () => {
                    if (inkommande.state === "installed" &&
                        navigator.serviceWorker.controller) {
                        setNyVersion(inkommande);
                    }
                });
            };
            kolla();
            reg.addEventListener("updatefound", kolla);
            // Fråga aktivt efter en ny arbetare när fliken blir synlig igen.
            // Utan detta upptäcks en ny version först vid nästa hela omstart,
            // vilket för en installerad app kan dröja mycket länge.
            const paSynlig = () => {
                if (document.visibilityState === "visible")
                    void reg.update();
            };
            document.addEventListener("visibilitychange", paSynlig);
            stadning = () => document.removeEventListener("visibilitychange", paSynlig);
        })
            .catch(() => {
            // Ingen service worker betyder ingen offlinestart, men appen
            // fungerar ändå — allt innehåll ligger i localStorage.
        });
        return () => {
            avbruten = true;
            stadning?.();
        };
    }, []);
    if (!offline && !nyVersion)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed left-0 right-0 bottom-0 z-[95] flex flex-col items-center gap-1 p-2 pointer-events-none sakeromrade-botten", children: [offline && ((0, jsx_runtime_1.jsxs)("div", { className: "pointer-events-auto bg-ink text-paper border border-ink px-3 py-1.5 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "inline-block border border-paper", style: { width: 7, height: 7 } }), (0, jsx_runtime_1.jsx)("span", { className: "pico", children: "Offline \u2014 \u00E4ndringar sparas och skickas n\u00E4r n\u00E4tet \u00E4r tillbaka" })] })), nyVersion && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "pointer-events-auto knapp micro", "data-ton": "accent", onClick: () => {
                    nyVersion.postMessage("hoppa-over-vantan");
                    // Vänta tills den nya arbetaren tagit över innan sidan laddas
                    // om, annars serveras den gamla versionen en gång till.
                    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
                }, children: "Ny version finns \u2014 l\u00E4s in" }))] }));
}
