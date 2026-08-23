"use client";

/**
 * ⌘B, ⌘I och ⌘E i textfälten.
 *
 * Lyssnaren binds på fältet självt och inte på fönstret. Ett globalt
 * lyssnande hade behövt lista ut vilket av ett dussin fält som var i
 * fokus, och gissat fel den dagen ett fält till lades till.
 *
 * Markörens läge återställs EFTER renderingen. React ritar om fältet med
 * den nya texten, och skulle markeringen sättas före det hoppar markören
 * till slutet — vilket i praktiken gör kommandot obrukbart för allt utom
 * det sista ordet i ett stycke.
 */

import type { KeyboardEvent } from "react";
import { teckenForTangent, vaxlaMarkering } from "@/lib/sidor/markering";

type Falt = HTMLTextAreaElement | HTMLInputElement;

export function markeringstangenter(satt: (text: string) => void) {
  return (e: KeyboardEvent<Falt>) => {
    // Ctrl på Windows och Linux, ⌘ på Mac. Alt utesluts: ⌥⌘I är
    // webbläsarens egen genväg och skall inte kapas.
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const tecken = teckenForTangent(e.key);
    if (!tecken) return;

    const falt = e.currentTarget;
    const start = falt.selectionStart ?? 0;
    const slut = falt.selectionEnd ?? start;

    e.preventDefault();
    const ut = vaxlaMarkering(falt.value, start, slut, tecken);
    satt(ut.text);

    // Två bildrutor: en för Reacts omritning, en för att fältet skall
    // hinna få den nya texten innan markeringen sätts.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        falt.setSelectionRange(ut.start, ut.slut);
        falt.focus();
      });
    });
  };
}
