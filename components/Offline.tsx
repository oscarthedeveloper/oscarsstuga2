"use client";

/**
 * Registrering av service workern, plus två små remsor: en när nätet är
 * borta, och en när en ny version väntar på att tas i bruk.
 *
 * Uppdateringen sker aldrig av sig själv mitt i arbetet. En sida som
 * laddas om medan man skriver i ett formulär är ett datatapp, oavsett hur
 * ny versionen är. Användaren får trycka.
 */

import { useEffect, useState } from "react";

export default function Offline() {
  const [offline, setOffline] = useState(false);
  const [nyVersion, setNyVersion] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const uppdatera = () => setOffline(!navigator.onLine);
    uppdatera();
    window.addEventListener("online", uppdatera);
    window.addEventListener("offline", uppdatera);
    return () => {
      window.removeEventListener("online", uppdatera);
      window.removeEventListener("offline", uppdatera);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // I utvecklingsläge gör en service worker mest skada: den serverar
    // gamla buntar medan Next skickar nya, och man felsöker spöken.
    if (process.env.NODE_ENV !== "production") return;

    let avbruten = false;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (avbruten) return;
        const kolla = () => {
          const inkommande = reg.installing ?? reg.waiting;
          if (!inkommande) return;
          if (reg.waiting && navigator.serviceWorker.controller) {
            setNyVersion(reg.waiting);
            return;
          }
          inkommande.addEventListener("statechange", () => {
            if (
              inkommande.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setNyVersion(inkommande);
            }
          });
        };
        kolla();
        reg.addEventListener("updatefound", kolla);
      })
      .catch(() => {
        // Ingen service worker betyder ingen offlinestart, men appen
        // fungerar ändå — allt innehåll ligger i localStorage.
      });

    return () => {
      avbruten = true;
    };
  }, []);

  if (!offline && !nyVersion) return null;

  return (
    <div className="fixed left-0 right-0 bottom-0 z-[95] flex flex-col items-center gap-1 p-2 pointer-events-none sakeromrade-botten">
      {offline && (
        <div className="pointer-events-auto bg-ink text-paper border border-ink px-3 py-1.5 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block border border-paper"
            style={{ width: 7, height: 7 }}
          />
          <span className="pico">
            Offline — ändringar sparas och skickas när nätet är tillbaka
          </span>
        </div>
      )}
      {nyVersion && (
        <button
          type="button"
          className="pointer-events-auto knapp micro"
          data-ton="accent"
          onClick={() => {
            nyVersion.postMessage("hoppa-over-vantan");
            // Vänta tills den nya arbetaren tagit över innan sidan laddas
            // om, annars serveras den gamla versionen en gång till.
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => window.location.reload(),
              { once: true }
            );
          }}
        >
          Ny version finns — läs in
        </button>
      )}
    </div>
  );
}
