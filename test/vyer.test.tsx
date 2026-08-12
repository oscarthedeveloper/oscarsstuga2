/**
 * Ritprov för vyerna.
 *
 * Provet renderar varje vy till en sträng och kontrollerar att den
 * innehåller det den skall. Syftet är inte att mäta utseendet utan att
 * fånga de fel som annars bara visar sig i webbläsaren: felaktiga hooks,
 * uppslag mot odefinierade värden, och vyer som tyst ritar tomt.
 *
 * Körs med `npm test`.
 */

import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TidsRutnat from "../components/vyer/TidsRutnat";
import ManadsVy from "../components/vyer/ManadsVy";
import ArsVy from "../components/vyer/ArsVy";
import ButikProvider from "../components/Butik";
import KalenderApp from "../components/KalenderApp";
import HandelsePanel from "../components/HandelsePanel";
import Kommandopalett, { tolkaDatum } from "../components/Kommandopalett";
import KalenderPanel from "../components/KalenderPanel";
import AttGora from "../components/AttGora";
import { STANDARDKALENDRAR } from "../lib/butik";
import { provdata } from "./provdata";
import { expanderaAlla } from "../lib/upprepning";
import {
  addDagar,
  dagsspann,
  nyckel,
  startAvAr,
  startAvManad,
  startAvVecka,
  tolka,
} from "../lib/tid";
import type { Forekomst } from "../lib/typer";

let antal = 0;
let fel = 0;

function prov(namn: string, f: () => void) {
  antal += 1;
  try {
    f();
    process.stdout.write(`  ok   ${namn}\n`);
  } catch (e) {
    fel += 1;
    process.stdout.write(`  FEL  ${namn}\n       ${(e as Error).message}\n`);
  }
}

function innehaller(html: string, text: string) {
  if (!html.includes(text)) {
    throw new Error(`hittade inte ${JSON.stringify(text)} i utdata`);
  }
}

// Fast referensdatum, så att provet ger samma svar varje gång det körs.
const IDAG = tolka("2026-08-12T10:30");
const handelser = provdata(IDAG);
const toner = new Map(STANDARDKALENDRAR.map((k) => [k.id, k.ton]));

function forekomsterFor(fran: Date, dygn: number): Forekomst[] {
  return expanderaAlla(handelser, addDagar(fran, -8), addDagar(fran, dygn + 8)).map(
    (f) => ({ ...f, ton: toner.get(f.handelse.kalenderId) ?? 0 })
  );
}

const tomt = () => {};

process.stdout.write("\nVyerna\n");

prov("veckovyn ritar sju kolumner och veckans händelser", () => {
  const start = startAvVecka(IDAG);
  const html = renderToStaticMarkup(
    h(TidsRutnat, {
      dagar: dagsspann(start, 7),
      forekomster: forekomsterFor(start, 7),
      timhojd: 52,
      vald: null,
      visaVecka: true,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
    })
  );
  innehaller(html, "Veckostart");
  innehaller(html, "Handskriftsseminarium");
  innehaller(html, "Heldag");
  // Sju dagskolumner i rutnätet plus sju i huvudet och sju i heldagsremsan.
  const kolumner = (html.match(/dagkolumn/g) ?? []).length;
  if (kolumner < 21) throw new Error(`för få dagskolumner: ${kolumner}`);
});

prov("dagsvyn ritar en kolumn", () => {
  const html = renderToStaticMarkup(
    h(TidsRutnat, {
      dagar: dagsspann(IDAG, 1),
      forekomster: forekomsterFor(IDAG, 1),
      timhojd: 52,
      vald: null,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
    })
  );
  innehaller(html, "Handskriftsseminarium");
  innehaller(html, "23:00");
});

prov("tredagarsvyn ritar tre kolumner", () => {
  const html = renderToStaticMarkup(
    h(TidsRutnat, {
      dagar: dagsspann(IDAG, 3),
      forekomster: forekomsterFor(IDAG, 3),
      timhojd: 52,
      vald: null,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
    })
  );
  const kolumner = (html.match(/dagkolumn/g) ?? []).length;
  if (kolumner < 9) throw new Error(`för få dagskolumner: ${kolumner}`);
});

prov("månadsvyn ritar 42 rutor och sex veckonummer", () => {
  const start = startAvVecka(startAvManad(IDAG));
  const html = renderToStaticMarkup(
    h(ManadsVy, {
      peka: IDAG,
      forekomster: forekomsterFor(start, 42),
      vald: null,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
      onGaTillDag: tomt,
    })
  );
  const rutor = (html.match(/manadsruta /g) ?? []).length;
  if (rutor !== 42) throw new Error(`fel antal rutor: ${rutor}`);
  innehaller(html, "Veckostart");
});

prov("årsvyn ritar tolv månader", () => {
  const html = renderToStaticMarkup(
    h(ArsVy, {
      peka: IDAG,
      forekomster: forekomsterFor(startAvAr(IDAG), 366),
      onGaTillDag: tomt,
      onGaTillManad: tomt,
    })
  );
  for (const m of [
    "Januari",
    "Februari",
    "Mars",
    "April",
    "Maj",
    "Juni",
    "Juli",
    "Augusti",
    "September",
    "Oktober",
    "November",
    "December",
  ]) {
    innehaller(html, m);
  }
  const dagar = (html.match(/minidag/g) ?? []).length;
  if (dagar < 365) throw new Error(`för få dagsrutor: ${dagar}`);
});

prov("överlappande händelser får olika bredd", () => {
  // Onsdagen i provdatan har både seminarium 09–10 och lunch 12–13,
  // plus djupt arbete 13–17: inget av dem skall ligga på 100 % bredd
  // om de krockar, och alla skall ligga på 100 % om de inte gör det.
  const start = startAvVecka(IDAG);
  const html = renderToStaticMarkup(
    h(TidsRutnat, {
      dagar: dagsspann(start, 7),
      forekomster: forekomsterFor(start, 7),
      timhojd: 52,
      vald: null,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
    })
  );
  const bredder = Array.from(html.matchAll(/width:calc\(([\d.]+)% - 2px\)/g)).map(
    (m) => Number(m[1])
  );
  if (bredder.length === 0) throw new Error("inga block ritades");
  if (!bredder.some((b) => b > 99)) {
    throw new Error("inget block fick full bredd");
  }
  if (!bredder.some((b) => b < 99)) {
    throw new Error("inget block delades — överlappen räknades inte");
  }
});

/* ------------------------------------------------------------------
   Skalet — nav, sidopanel, redigeringspanel och palett
   ------------------------------------------------------------------ */

prov("appskalet ritas utan att kasta", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(KalenderApp))
  );
  innehaller(html, "Kalendariet");
  innehaller(html, "Vecka");
  innehaller(html, "Ny händelse");
  innehaller(html, "Hantera");
  // Sidväxeln mellan kalendern och att göra.
  innehaller(html, "Att göra");
  // Tvångshämtningen kan inte göra något utan inloggning och skall inte
  // ritas — men statusknappen SKALL finnas, annars har den som undrar
  // varför inget synkas ingenstans att fråga.
  if (html.includes('aria-label="Hämta om allt från molnet"')) {
    throw new Error("hämtaknappen visas trots att molnet är avstängt");
  }
  innehaller(html, "Konto och synkning");
  // Remsan som varnar för att inget synkas ritas medvetet FÖRST efter
  // monteringen: den läser localStorage för att se om den avfärdats, och
  // det går inte att göra under serverrenderingen utan att riskera en
  // hydreringskrock. Därför mäts den inte här.
  // Kolofonremsan finns kvar som designelement, men bär numera bara
  // tangentbordshjälpen. Posträknare och "Inget att ångra" togs bort:
  // en remsa som fylls för att den har tre fack blir dekoration, och
  // dekoration som ser ut som information är värre än tom plats.
  innehaller(html, "växlar vy");
  for (const fyllnad of ["Inget att ångra", "Offline först", "poster ·"]) {
    if (html.includes(fyllnad)) {
      throw new Error(`fyllnadstexten "${fyllnad}" finns kvar`);
    }
  }
});

prov("redigeringspanelen ritar upprepningsreglerna", () => {
  const html = renderToStaticMarkup(
    h(
      ButikProvider,
      null,
      h(HandelsePanel, {
        forekomst: null,
        utkast: {
          start: "2026-08-12T09:00",
          slut: "2026-08-12T10:00",
          heldag: false,
        },
        onStang: tomt,
      })
    )
  );
  innehaller(html, "Varje vardag (mån–fre)");
  innehaller(html, "Varje månad");
  innehaller(html, "Heldag");
  innehaller(html, "Upprepning");
});

prov("kalenderpanelen listar kalendrarna och kan lägga till nya", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(KalenderPanel, { onStang: tomt }))
  );
  for (const k of STANDARDKALENDRAR) innehaller(html, k.namn);
  innehaller(html, "Ny kalender");
  innehaller(html, "Lägg till");
  innehaller(html, "Ta bort");
});

prov("att göra ritar inmatning, filter och tomt läge", () => {
  const html = renderToStaticMarkup(h(ButikProvider, null, h(AttGora)));
  innehaller(html, "Vad behöver göras?");
  innehaller(html, "Lägg till");
  // Kalendrarna skall gå att filtrera på, med samma namn som i kalendern.
  for (const k of STANDARDKALENDRAR) innehaller(html, k.namn);
  innehaller(html, "Visa klara");
  // Tomt lager: anvisningen skall stå där, inte en tom yta.
  innehaller(html, "Ingenting att göra");
});

prov("paletten listar kommandon och tolkar datum", () => {
  const html = renderToStaticMarkup(
    h(Kommandopalett, {
      kommandon: [
        { id: "a", namn: "Gå till idag", grupp: "Navigering", utfor: tomt },
      ],
      forekomster: [],
      onGaTill: tomt,
      onOppna: tomt,
      onStang: tomt,
    })
  );
  innehaller(html, "Gå till idag");
  innehaller(html, "Sök kommando");
});

prov("datumtolkningen förstår svenska uttryck", () => {
  const bas = tolka("2026-08-12T00:00");
  const som = (q: string) => {
    const d = tolkaDatum(q, bas);
    return d ? nyckel(d) : null;
  };
  lika(som("idag"), "2026-08-12");
  lika(som("imorgon"), "2026-08-13");
  lika(som("igår"), "2026-08-11");
  lika(som("+10"), "2026-08-22");
  lika(som("-5"), "2026-08-07");
  lika(som("2026-12-24"), "2026-12-24");
  lika(som("24/12"), "2026-12-24");
  lika(som("24/12 2027"), "2027-12-24");
  lika(som("24 dec"), "2026-12-24");
  lika(som("3 mars"), "2026-03-03");
  lika(som("struntprat"), null);
});

function lika<T>(fick: T, vantat: T) {
  if (JSON.stringify(fick) !== JSON.stringify(vantat)) {
    throw new Error(
      `fick ${JSON.stringify(fick)}, väntade ${JSON.stringify(vantat)}`
    );
  }
}

process.stdout.write(
  `\n${antal - fel} av ${antal} prov gick igenom.${fel ? " ✗" : " ✓"}\n\n`
);
process.exit(fel ? 1 : 0);
