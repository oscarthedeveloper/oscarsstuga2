"use strict";
/**
 * Datamodellen. Allt som skrivs till lagret är serialiserbart JSON —
 * inga Date-objekt lagras, eftersom de förlorar tidszonen vid en rundtur
 * genom JSON.stringify. Tidpunkter skrivs som lokal väggklocka
 * ("2026-08-10T09:00") och tolkas alltid i besökarens egen zon.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TON_VAR = exports.TON_NAMN = exports.PRIORITETER = exports.VYER = void 0;
exports.VYER = [
    { id: "dag", namn: "Dag", kort: "D", tangent: "1" },
    { id: "tredag", namn: "Tre dagar", kort: "3D", tangent: "2" },
    { id: "vecka", namn: "Vecka", kort: "V", tangent: "3" },
    { id: "manad", namn: "Månad", kort: "M", tangent: "4" },
    { id: "ar", namn: "År", kort: "Å", tangent: "5" },
];
exports.PRIORITETER = [
    { varde: 1, namn: "Styrka 1 — först", kort: "1" },
    { varde: 2, namn: "Styrka 2 — sedan", kort: "2" },
    { varde: 3, namn: "Styrka 3 — när det finns tid", kort: "3" },
];
exports.TON_NAMN = [
    "Guld",
    "Ärg",
    "Terrakotta",
    "Blyerts",
    "Mossa",
    "Ametist",
];
exports.TON_VAR = [
    "var(--kal-1-stark)",
    "var(--kal-2-stark)",
    "var(--kal-3-stark)",
    "var(--kal-4-stark)",
    "var(--kal-5-stark)",
    "var(--kal-6-stark)",
];
