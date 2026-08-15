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
export function useTangentbord(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

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
