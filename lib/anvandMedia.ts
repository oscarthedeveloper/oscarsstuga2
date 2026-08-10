"use client";

/**
 * Mediefrågor som React-tillstånd.
 *
 * Värdet startar alltid som `false` och rättas efter monteringen. Att
 * fråga `matchMedia` under första renderingen vore frestande, men servern
 * har inget fönster och statisk export ritar sidan i förväg — svaret
 * skulle bli fel och hydreringen krascha. En bildruta med skrivbordsläget
 * är ett billigare pris.
 */

import { useEffect, useState } from "react";

export function useMedia(fraga: string): boolean {
  const [traffar, setTraffar] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(fraga);
    const uppdatera = () => setTraffar(mql.matches);
    uppdatera();
    mql.addEventListener("change", uppdatera);
    return () => mql.removeEventListener("change", uppdatera);
  }, [fraga]);

  return traffar;
}

/** Telefonbredd. Samma brytpunkt som Tailwinds `md`. */
export function useMobil(): boolean {
  return useMedia("(max-width: 767px)");
}

/** Smalt men inte telefon — surfplatta på höjden, delad fönstervy. */
export function useSmal(): boolean {
  return useMedia("(max-width: 1023px)");
}

/** Sant när pekdonet är ett finger. Styr långtryck i stället för drag. */
export function useBeroring(): boolean {
  return useMedia("(pointer: coarse)");
}

/** Sant när appen körs installerad, utan webbläsarens ram. */
export function useInstallerad(): boolean {
  return useMedia("(display-mode: standalone)");
}
