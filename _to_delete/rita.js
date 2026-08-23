/* Tillfälligt: renderar vinsidan till en fristående HTML-fil för att
   kunna titta på den. Ligger i _to_delete och hör inte till projektet. */
const { createElement: h } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const path = require("path");
const fs = require("fs");

const rot = path.resolve(__dirname, "js");
const Viner = require(path.join(rot, "components/sidor/Viner.js")).default;
const { normaliseraSida } = require(path.join(rot, "lib/butik.js"));

const sida = normaliseraSida({
  id: "viner",
  data: {
    nastaKod: 6,
    viner: [
      {
        id: "a",
        kod: "VIN-001",
        namn: "Mucho Más Tinto",
        producent: "Félix Solís",
        argang: "N.V.",
        land: "Spanien",
        region: "La Mancha",
        vinstil: "Spanien Röda",
        typ: "rott",
        druvor: ["Shiraz/Syrah", "Tempranillo"],
        alkohol: 13.5,
        lage: "har",
        antal: 3,
        pris: 89,
        inkopsstalle: "Systembolaget",
        artikelnummer: "2288",
        vivinoUrl: "https://www.vivino.com/x",
        bildUrl: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 900'%3E%3Crect width='300' height='900' fill='%23222'/%3E%3Ctext x='150' y='450' fill='white' font-size='60' text-anchor='middle'%3EFLASKA%3C/text%3E%3C/svg%3E",
        vivinoBetyg: 3.7,
        vivinoAntal: 8503,
        egetBetyg: 4,
        profil: { fyllighet: 70, stravhet: 34, sotma: 38, syra: 28 },
        smaknoter: [
          { id: "n1", ord: "Vanilj, ek, tobak", grupp: "fatad", antal: 1511 },
          { id: "n2", ord: "Björnbär, plommon", grupp: "svart frukt", antal: 1033 },
          { id: "n3", ord: "Körsbär, röd frukt", grupp: "röd frukt", antal: 940 },
        ],
        passarTill: ["nötkött", "pasta", "kalv", "fjäderfä"],
        beskrivning:
          "Fruktigt men djupt fylligt rött vin från Félix Solís, med toner av vanilj, ek och tobak.",
        anteckning: "Till lammet i somras. Höll bättre än priset antyder.",
      },
      {
        id: "b",
        kod: "VIN-002",
        namn: "Chablis Champs Royaux",
        producent: "William Fèvre",
        argang: "2021",
        land: "Frankrike",
        region: "Bourgogne",
        vinstil: "Chablis",
        typ: "vitt",
        druvor: ["Chardonnay"],
        alkohol: 12.5,
        lage: "drucken",
        druckenDatum: "2026-07-04",
        pris: 249,
        vivinoBetyg: 4.1,
        vivinoAntal: 12400,
        egetBetyg: 3.2,
        profil: { fyllighet: 40, stravhet: 20, sotma: 10, syra: 82 },
      },
      {
        id: "c",
        kod: "VIN-003",
        namn: "Barolo Castiglione",
        producent: "Vietti",
        argang: "2018",
        land: "Italien",
        region: "Piemonte",
        typ: "rott",
        druvor: ["Nebbiolo"],
        alkohol: 14.5,
        lage: "har",
        pris: 599,
        vivinoBetyg: 4.4,
        profil: { fyllighet: 88, stravhet: 76, sotma: 14, syra: 70 },
      },
      {
        id: "d",
        kod: "VIN-004",
        namn: "Rosé från resan",
        land: "Portugal",
        typ: "rose",
        lage: "vill",
        uppgifterSaknas: true,
      },
      {
        id: "e",
        kod: "VIN-005",
        namn: "Bollinger Special Cuvée",
        producent: "Bollinger",
        argang: "N.V.",
        land: "Frankrike",
        region: "Champagne",
        typ: "mousserande",
        druvor: ["Pinot Noir", "Chardonnay"],
        lage: "vill",
        pris: 549,
        vivinoBetyg: 4.3,
        profil: { fyllighet: 58, stravhet: 30, sotma: 22, syra: 76 },
      },
    ],
  },
});

const inre = renderToStaticMarkup(h(Viner, { sida, spara: () => {} }));
const css = fs.readFileSync(process.argv[2], "utf8");

const html = `<!doctype html>
<html lang="sv"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Martian+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>:root{--font-display:"Newsreader",serif;--font-mono:"Martian Mono",monospace}
html,body{height:100%}</style>
<style>${css}</style>
</head><body><div style="height:100vh">${inre}</div></body></html>`;

fs.writeFileSync(path.resolve(__dirname, "sida.html"), html);
console.log("skrev sida.html", html.length, "tecken");
