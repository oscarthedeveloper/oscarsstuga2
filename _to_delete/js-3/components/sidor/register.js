"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIDOR = void 0;
exports.sidDefinition = sidDefinition;
const Hogskoleprov_1 = __importDefault(require("./Hogskoleprov"));
const Sprak_1 = __importDefault(require("./Sprak"));
const Fornsvenska_1 = __importDefault(require("./Fornsvenska"));
const Privatekonomi_1 = __importDefault(require("./Privatekonomi"));
const Viner_1 = __importDefault(require("./Viner"));
exports.SIDOR = [
    {
        id: "hogskoleprov",
        titel: "Högskoleprov och läkarprogrammet",
        kort: "HP",
        beskrivning: "Resultat, delpoäng, antagningspoäng och plugglogg",
        Komponent: Hogskoleprov_1.default,
    },
    {
        id: "sprak",
        titel: "Språk",
        kort: "SP",
        beskrivning: "Hyllor, mappar och blad för italienska, tyska, svenska och engelska",
        Komponent: Sprak_1.default,
    },
    {
        id: "fornsvenska",
        titel: "Fornsvenska",
        kort: "FS",
        beskrivning: "Litteraturregister, att göra för hemsidan och idéer",
        Komponent: Fornsvenska_1.default,
    },
    {
        id: "viner",
        titel: "Mina viner",
        kort: "VIN",
        beskrivning: "Samling och smakminne — källare, smakprofiler, betyg och diagram",
        Komponent: Viner_1.default,
    },
    {
        id: "privatekonomi",
        titel: "Privatekonomi",
        kort: "EK",
        beskrivning: "Månadsplanering före löning — kategorier, utfall, inköp, abonnemang och sparmål",
        Komponent: Privatekonomi_1.default,
    },
];
function sidDefinition(id) {
    return exports.SIDOR.find((s) => s.id === id) ?? null;
}
