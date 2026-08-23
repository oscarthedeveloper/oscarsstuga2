"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markeringstangenter = markeringstangenter;
const markering_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/markering");
function markeringstangenter(satt) {
    return (e) => {
        // Ctrl på Windows och Linux, ⌘ på Mac. Alt utesluts: ⌥⌘I är
        // webbläsarens egen genväg och skall inte kapas.
        if (!(e.metaKey || e.ctrlKey) || e.altKey)
            return;
        const tecken = (0, markering_1.teckenForTangent)(e.key);
        if (!tecken)
            return;
        const falt = e.currentTarget;
        const start = falt.selectionStart ?? 0;
        const slut = falt.selectionEnd ?? start;
        e.preventDefault();
        const ut = (0, markering_1.vaxlaMarkering)(falt.value, start, slut, tecken);
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
