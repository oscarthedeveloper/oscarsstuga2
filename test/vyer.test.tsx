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
import Parkering from "../components/Parkering";
import KalenderPanel from "../components/KalenderPanel";
import AttGora from "../components/AttGora";
import Anteckningar from "../components/Anteckningar";
import Annat from "../components/Annat";
import Litteratur from "../components/sidor/Litteratur";
import Viner from "../components/sidor/Viner";
import Betygsmatare from "../components/sidor/block/Betygsmatare";
import Delstapel from "../components/sidor/block/Delstapel";
import Punktdiagram from "../components/sidor/block/Punktdiagram";
import Smakskala from "../components/sidor/block/Smakskala";
import Vinuppslag from "../components/sidor/block/Vinuppslag";
import { tolkaVinData } from "../lib/sidor/viner";
import { normaliseraLapp, normaliseraSida } from "../lib/butik";
import { SIDOR } from "../components/sidor/register";
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
      tankPa: [],
      kalendrar: STANDARDKALENDRAR,
      onLaggTankPa: tomt,
      onAndraTankPa: tomt,
      onTaBortTankPa: tomt,
    })
  );
  innehaller(html, "Handskriftsseminarium");
  innehaller(html, "23:00");
  innehaller(html, "Tänk på");
  if (html.includes(">Gjort<")) {
    throw new Error("den borttagna Gjort-remsan finns kvar i gränssnittet");
  }
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

prov("överlappande händelser ritas som en trappa", () => {
  // Uträkningen provas för sig i layout.test.ts. Här kontrolleras bara
  // att vyn faktiskt SKRIVER ut inskjutet — ett block kan ha rätt
  // layout och ändå ritas i vänsterkant om style-raden tappar bort den.
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
  const vansterkanter = Array.from(
    html.matchAll(/left:calc\(([\d.]+)% \+ 1px\)/g)
  ).map((m) => Number(m[1]));
  const bredder = Array.from(
    html.matchAll(/width:calc\(([\d.]+)% - 2px\)/g)
  ).map((m) => Number(m[1]));

  if (bredder.length === 0) throw new Error("inga block ritades");
  if (!bredder.some((b) => b > 99)) {
    throw new Error("inget block fick full bredd");
  }
  if (!vansterkanter.some((v) => v > 0)) {
    throw new Error("inget block skjuts in — överlappen räknades inte");
  }
  // Trappan betyder att allt når högerkanten: vänster + bredd = 100.
  for (let i = 0; i < bredder.length; i++) {
    const summa = (vansterkanter[i] ?? 0) + bredder[i];
    if (Math.abs(summa - 100) > 0.01) {
      throw new Error(`block ${i} slutar vid ${summa}%, inte vid kanten`);
    }
  }
  // Lagret måste följa med ut i märkspråket, annars staplas trappan fel.
  if (!html.includes("--lager")) throw new Error("lagret skrevs inte ut");
  // Och genomskinligheten måste märkas ut, annars döljer det översta
  // blocket det under sig helt.
  if (!html.includes('data-over="1"')) {
    throw new Error("inget block märktes som täckande");
  }
});

/* ------------------------------------------------------------------
   Skalet — nav, sidopanel, redigeringspanel och palett
   ------------------------------------------------------------------ */

prov("appskalet ritas utan att kasta", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(KalenderApp))
  );
  innehaller(html, "Oscars databas");
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
        onOppnaMal: tomt,
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
  // Paletten läser numera butiken direkt — den söker i allt innehåll och
  // skapar poster — och måste därför renderas inuti leverantören.
  const html = renderToStaticMarkup(
    h(
      ButikProvider,
      null,
      h(Kommandopalett, {
        kommandon: [
          { id: "a", namn: "Gå till idag", grupp: "Navigering", utfor: tomt },
        ],
        onGaTill: tomt,
        onOppnaTraff: tomt,
        onFangad: tomt,
        onStang: tomt,
      })
    )
  );
  innehaller(html, "Gå till idag");
  innehaller(html, "Skriv för att fånga");
});

prov("anteckningsvyn ritar bibliotek och tomt läge", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Anteckningar, { onOppnaMal: tomt }))
  );
  innehaller(html, "Sök i anteckningar");
  innehaller(html, "Anteckningsböcker");
  innehaller(html, "Ny bok");
  // Tomt lager: biblioteket förklarar hur den första mappen skapas.
  innehaller(html, "Biblioteket är tomt");
  innehaller(html, "Italienska, Svenska eller Arbete");
});

prov("annat-avdelningen ritar listan och första sidan", () => {
  const html = renderToStaticMarkup(h(ButikProvider, null, h(Annat)));
  // Sidorna kommer ur registret, inte ur lagret: de finns i listan även
  // innan de fyllts i.
  for (const s of SIDOR) {
    innehaller(html, s.titel);
    innehaller(html, s.beskrivning);
  }
});

prov("högskoleprovssidan ritar sina avsnitt utan data", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Annat, { oppnaId: "hogskoleprov" }))
  );
  for (const rubrik of [
    "Avstånd till målet",
    "Resultat över tid",
    "Delpoäng per provdel",
    "Antagningspoäng",
    "Viktiga datum",
  ]) {
    innehaller(html, rubrik);
  }
  /*
   * Ingenting sås med siffror. Varje avsnitt skall stå tomt och be om
   * indata i stället för att visa ett påhittat värde — en föråldrad
   * antagningspoäng som ser ut som en sanning är sämre än ett tomt fält.
   */
  innehaller(html, "Inga lärosäten tillagda");
  innehaller(html, "Inga provtillfällen inlagda");
  innehaller(html, "Inga datum inlagda");
  // Delpoängen går inte att fylla i utan ett provtillfälle att fylla i
  // dem för, och avsnittet säger det i stället för att rita tomma fält.
  innehaller(html, "Lägg till ett provtillfälle ovan");
});

prov("vinsidan ritar sina avsnitt utan data", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Annat, { oppnaId: "viner" }))
  );
  for (const rubrik of ["Vinerna", "Fördelning", "Betyg mot pris", "Smakkarta"]) {
    innehaller(html, rubrik);
  }
  /*
   * Ingenting sås. Varje diagram står tomt och säger VARFÖR det är tomt
   * i stället för att rita en axel utan punkter — en tom ruta ser ut som
   * något som gått sönder, en mening gör det inte.
   */
  innehaller(html, "Registret är tomt");
  innehaller(html, "Inga viner att dela upp ännu");
  innehaller(html, "Ett vin kommer med när det har både pris och betyg");
});

prov("vinsidan ritar registret, mätarna och diagrammen", () => {
  const sida = normaliseraSida({
    id: "viner",
    data: {
      nastaKod: 3,
      viner: [
        {
          id: "a",
          kod: "VIN-001",
          namn: "Mucho Más Tinto",
          producent: "Félix Solís",
          argang: "N.V.",
          land: "Spanien",
          typ: "rott",
          druvor: ["Tempranillo"],
          lage: "har",
          antal: 3,
          pris: 89,
          egetBetyg: 4,
          vivinoBetyg: 3.7,
          profil: { fyllighet: 70, stravhet: 34, sotma: 38, syra: 28 },
          smaknoter: [
            { id: "n1", ord: "Vanilj, ek, tobak", grupp: "fatad", antal: 1511 },
          ],
        },
        {
          id: "b",
          kod: "VIN-002",
          namn: "Chablis",
          producent: "William Fèvre",
          argang: "2021",
          land: "Frankrike",
          typ: "vitt",
          lage: "drucken",
          pris: 249,
          vivinoBetyg: 4.1,
          profil: { fyllighet: 40, stravhet: 20, sotma: 10, syra: 82 },
        },
      ],
    },
  });
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Viner, { sida, spara: tomt }))
  );

  // Producenten fogas till namnet, och årgången sist.
  innehaller(html, "Félix Solís Mucho Más Tinto N.V.");
  innehaller(html, "VIN-001");
  // Källarens värde: 89 × 3. Det druckna vinet räknas inte.
  innehaller(html, "Källarens värde");
  innehaller(html, "267");
  // Fördelningsstapeln ritas med sina segment, inte som en tom ram.
  innehaller(html, "fordelning");
  innehaller(html, "Rött");
  innehaller(html, "Vitt");
  // Båda punktdiagrammen har fått punkter — en <title> per vin.
  innehaller(html, "Lätt");
  innehaller(html, "Fyllig");
});

prov("ett vin utan uppgifter online räknas inte som ofyllt", () => {
  /*
   * Sidans "återstår att göra" är viner utan smakprofil. Ett vin som
   * INTE går att slå upp skall kunna säga det och därmed lämna listan —
   * annars blir det en påminnelse om ett arbete som aldrig kan bli
   * gjort, varje gång man öppnar sidan.
   */
  const utan = normaliseraSida({
    id: "viner",
    data: { viner: [{ id: "a", namn: "Okänd flaska", lage: "vill" }] },
  });
  const med = normaliseraSida({
    id: "viner",
    data: {
      viner: [
        { id: "a", namn: "Okänd flaska", lage: "vill", uppgifterSaknas: true },
      ],
    },
  });
  const ett = renderToStaticMarkup(
    h(ButikProvider, null, h(Viner, { sida: utan, spara: tomt }))
  );
  const noll = renderToStaticMarkup(
    h(ButikProvider, null, h(Viner, { sida: med, spara: tomt }))
  );
  innehaller(ett, 'data-atgard="1"');
  if (noll.includes('data-atgard="1"')) {
    throw new Error("ett vin märkt som omöjligt att slå upp bär fortfarande accent");
  }
});

prov("vinsidans block ritar i redigeringsläge", () => {
  /*
   * Den utfällda vinraden går inte att öppna i ett statiskt ritprov —
   * den öppnas av ett klick. Blocken den består av ritas därför var för
   * sig i sitt REDIGERINGSLÄGE, vilket är där de skiljer sig mest från
   * visningsläget och där ett fel annars bara visar sig i webbläsaren.
   */
  const skala = renderToStaticMarkup(
    h(Smakskala, {
      profil: { fyllighet: 70, stravhet: null, sotma: 38, syra: 28 },
      ton: 2,
      onVarde: tomt,
    })
  );
  innehaller(skala, "Lätt");
  innehaller(skala, "Fyllig");
  innehaller(skala, "smakreglage");
  // En ofylld skala ritas som raster, inte som ett tomt spår: "ingen
  // uppgift" och "noll på skalan" får inte se likadana ut.
  innehaller(skala, 'data-tomt="1"');

  const betyg = renderToStaticMarkup(
    h(Betygsmatare, { varde: 3.7, onVarde: tomt, etikett: "provet", storlek: "stor" })
  );
  // Talet står alltid skrivet — skillnaden mellan 3,6 och 3,8 syns inte
  // i en cell men är hela skillnaden mellan två viner.
  innehaller(betyg, "3,7");
  innehaller(betyg, "betygscell");

  // Ett tomt betyg ritar fem tomma celler och ett streck, inte noll.
  innehaller(
    renderToStaticMarkup(h(Betygsmatare, { varde: null, etikett: "tomt" })),
    "—"
  );

  const stapel = renderToStaticMarkup(
    h(Delstapel, {
      delar: [
        { id: "a", namn: "Spanien", antal: 4, ton: 2 },
        { id: "b", namn: "Frankrike", antal: 1, ton: 0 },
      ],
      tomText: "tomt",
    })
  );
  innehaller(stapel, "Spanien");
  innehaller(stapel, "80 %");

  const diagram = renderToStaticMarkup(
    h(Punktdiagram, {
      punkter: [
        { id: "a", etikett: "Ett vin", x: 89, y: 4, ton: 2, framhavd: true },
      ],
      xAxel: { lag: "Billigt", hog: "Dyrt", min: 0, max: 600 },
      yAxel: { lag: "Lågt", hog: "Högt", min: 0, max: 5 },
      tomText: "tomt",
    })
  );
  innehaller(diagram, "Ett vin");
  innehaller(diagram, "Billigt");
});

prov("ett diagram med ett enda värde ritar ändå", () => {
  /*
   * Ett spann på noll ger division med noll, och ett NaN i ett
   * SVG-attribut ritar TYST ingenting alls — inget felmeddelande, bara
   * en tom ruta man får leta efter i en timme.
   */
  const html = renderToStaticMarkup(
    h(Punktdiagram, {
      punkter: [{ id: "a", etikett: "Ensam", x: 5, y: 5, ton: 0, framhavd: false }],
      xAxel: { lag: "a", hog: "b", min: 5, max: 5 },
      yAxel: { lag: "c", hog: "d", min: 5, max: 5 },
      tomText: "tomt",
    })
  );
  innehaller(html, "Ensam");
  if (html.includes("NaN")) throw new Error("ett NaN kom med i utdata");
});

prov("vinuppslaget ritar ett färdigt uppslag utan fält", () => {
  /*
   * Läsläget. Poängen är just att det INTE finns några fält — ett fält
   * som ser ut som en färdig sida är ändå ett fält: markören hamnar i
   * det, texten går att råka ändra, och skärmläsaren säger "inmatning"
   * där det står ett värde.
   */
  const vin = tolkaVinData({
    viner: [
      {
        id: "a",
        namn: "Mucho Más Tinto",
        producent: "Félix Solís",
        argang: "N.V.",
        land: "Spanien",
        region: "La Mancha",
        typ: "rott",
        druvor: ["Shiraz/Syrah", "Tempranillo"],
        alkohol: 13.5,
        lage: "har",
        antal: 3,
        pris: 89,
        egetBetyg: 4,
        vivinoBetyg: 3.7,
        vivinoAntal: 8503,
        profil: { fyllighet: 70, stravhet: 34, sotma: 38, syra: 28 },
        smaknoter: [
          { id: "n1", ord: "Vanilj, ek, tobak", grupp: "fatad", antal: 1511 },
        ],
        passarTill: ["nötkött", "pasta"],
        beskrivning: "Fruktigt men djupt fylligt.",
        anteckning: "Till lammet i somras.",
      },
    ],
  }).viner[0];

  const html = renderToStaticMarkup(h(Vinuppslag, { vin }));

  // Faktatabellen, med etikett och värde.
  innehaller(html, "Producent");
  innehaller(html, "Félix Solís");
  innehaller(html, "Ursprung");
  innehaller(html, "Spanien / La Mancha");
  innehaller(html, "3 flaskor");
  // Betyg, smakprofil, noter och båda texterna.
  innehaller(html, "3,7");
  innehaller(html, "8 503 rec.");
  innehaller(html, "Fyllig");
  innehaller(html, "Vanilj, ek, tobak");
  innehaller(html, "1 511 kommentarer om fatad toner");
  innehaller(html, "Till lammet i somras.");
  // Ni är oense med 0,3 — under tröskeln, alltså inget band.
  if (html.includes("Du tyckte")) {
    throw new Error("oense-raden ritades trots att skillnaden är brus");
  }
  // Och ingenting som tar emot inmatning.
  for (const tagg of ["<input", "<textarea", "<select"]) {
    if (html.includes(tagg)) throw new Error(`läsläget ritade ${tagg}`);
  }
});

prov("ett tomt vin säger att det är tomt", () => {
  // Ett visningsläge som ritar en tom yta ser trasigt ut. Det skall
  // säga vad som saknas och peka på knappen som rättar det.
  const vin = tolkaVinData({ viner: [{ id: "a" }] }).viner[0];
  const html = renderToStaticMarkup(h(Vinuppslag, { vin }));
  innehaller(html, "Ingenting ifyllt ännu");
  innehaller(html, "Redigera");
});

prov("ett vin utan smakprofil får ingen tom mätare", () => {
  /*
   * Fyra tomma spår under rubriken "Hur smakar detta vin?" ser ut som
   * ett fel. Är vinet märkt som omöjligt att slå upp säger uppslaget
   * det i ord; är det bara ofyllt utelämnas avsnittet helt, eftersom
   * det inte finns något att läsa där ännu.
   */
  const saknas = tolkaVinData({
    viner: [{ id: "a", namn: "Okänd flaska", uppgifterSaknas: true }],
  }).viner[0];
  const saknasHtml = renderToStaticMarkup(h(Vinuppslag, { vin: saknas }));
  innehaller(saknasHtml, "går inte att slå upp");

  const ofylld = tolkaVinData({
    viner: [{ id: "a", namn: "Ofylld flaska" }],
  }).viner[0];
  const ofylldHtml = renderToStaticMarkup(h(Vinuppslag, { vin: ofylld }));
  if (ofylldHtml.includes("Hur smakar detta vin")) {
    throw new Error("rubrik utan mätare att sätta under den");
  }
});

prov("uppslaget skriver ut åt vilket håll ni är oense", () => {
  // Vilken av två siffror som är "bättre" skall inte behöva räknas ut
  // av den som läser.
  const vin = tolkaVinData({
    viner: [{ id: "a", namn: "Chablis", egetBetyg: 3.2, vivinoBetyg: 4.1 }],
  }).viner[0];
  innehaller(renderToStaticMarkup(h(Vinuppslag, { vin })), "Du tyckte sämre");
});

prov("parkeringen ritar lapparna och det tomma läget", () => {
  const utanLappar = renderToStaticMarkup(
    h(Parkering, {
      lappar: [],
      kalendrar: STANDARDKALENDRAR,
      onSkapa: tomt,
      onAndra: tomt,
      onTaBort: tomt,
      onSlapper: tomt,
      onSlapp: tomt,
    })
  );
  innehaller(utanLappar, "Utan datum");
  // Ett tomt läge som bara är en tom yta säger ingenting om vad rutan
  // är till för.
  innehaller(utanLappar, "dra ut det när dagen är bestämd");

  const medLappar = renderToStaticMarkup(
    h(Parkering, {
      lappar: [
        normaliseraLapp({
          id: "a",
          titel: "Träffa Anna",
          minuter: 90,
          kalenderId: "privat",
        }),
      ],
      kalendrar: STANDARDKALENDRAR,
      onSkapa: tomt,
      onAndra: tomt,
      onTaBort: tomt,
      onSlapper: tomt,
      onSlapp: tomt,
    })
  );
  innehaller(medLappar, "Träffa Anna");
  // Längden står på lappen — det är den som avgör hur lång händelsen
  // blir, och den skall gå att läsa av utan att öppna raden.
  innehaller(medLappar, "1 h 30");
  innehaller(medLappar, "lapp");
});

prov("dagkolumnen bär det en lapp behöver för att hitta hem", () => {
  /*
   * Draget korsar en gräns React inte har någon väg över: lappen fångar
   * pekaren i sidopanelen och läser sedan rutnätet ur DOM. Försvinner
   * `data-dagnyckel` eller `data-timhojd` går släppet sönder TYST — man
   * kan dra hur mycket man vill, ingenting landar. Därför provas de som
   * det gränssnitt de faktiskt är.
   */
  const dagar = [tolka("2026-08-12"), tolka("2026-08-13")];
  const html = renderToStaticMarkup(
    h(TidsRutnat, {
      dagar,
      forekomster: [],
      timhojd: 52,
      vald: null,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
    })
  );
  innehaller(html, 'data-dagnyckel="2026-08-12"');
  innehaller(html, 'data-dagnyckel="2026-08-13"');
  innehaller(html, 'data-timhojd="52"');
});

prov("rutnätet ritar var lappen skulle landa", () => {
  const html = renderToStaticMarkup(
    h(TidsRutnat, {
      dagar: [tolka("2026-08-12"), tolka("2026-08-13")],
      forekomster: [],
      timhojd: 52,
      vald: null,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
      slapper: {
        id: "a",
        titel: "Träffa Anna",
        minuter: 90,
        ton: 1,
        mal: { dagnyckel: "2026-08-13", minut: 585 },
      },
    })
  );
  // Titeln syns i förhandsvisningen: man skall se VAD som landar och
  // inte bara när.
  innehaller(html, "Träffa Anna");
  innehaller(html, "09:45");
  innehaller(html, "lappritning");
  // Och bara den dag pekaren pekar på lyser upp.
  innehaller(html, 'data-dagnyckel="2026-08-13" data-timhojd="52" data-slappmal="1"');
});

prov("utan en lapp i luften lyser ingen dag", () => {
  const html = renderToStaticMarkup(
    h(TidsRutnat, {
      dagar: [tolka("2026-08-12")],
      forekomster: [],
      timhojd: 52,
      vald: null,
      onValj: tomt,
      onOppna: tomt,
      onFlytta: tomt,
      onSkapa: tomt,
    })
  );
  if (html.includes('data-slappmal="1"')) {
    throw new Error("en dag lyste upp utan att något drogs");
  }
  if (html.includes("lappritning")) {
    throw new Error("en förhandsvisning ritades utan att något drogs");
  }
});

prov("privatekonomisidan ritar mätarpanel och tomma lägen", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Annat, { oppnaId: "privatekonomi" }))
  );
  innehaller(html, "Kvar att fördela");
  innehaller(html, "Sparkvot");
  innehaller(html, "Sparmål");
  innehaller(html, "Mall");
  // Utan månad skall sidan be om en, inte visa nollor som ser ut som svar.
  innehaller(html, "Ingen månad upplagd");
  innehaller(html, "Sätt ett målbelopp");
});

prov("litteratursidan ritar hyllor, läslogg och tomt läge", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Litteratur, { sida: null, spara: tomt }))
  );
  innehaller(html, "Mitt litteraturbibliotek");
  innehaller(html, "Läslogg");
  innehaller(html, "Din första hylla väntar");
  innehaller(html, "+ Lägg till bok");
});

prov("mobilen kan bläddra, växla sida och nå paletten", () => {
  /*
   * Ritprovet ser DOM:en, inte bildskärmen, så det kan inte mäta om en
   * knapp syns. Det det KAN slå fast är att kontrollerna över huvud
   * taget finns i märkspråket — vilket är precis det som saknades:
   * stegknapparna låg bara i navigeringsraden, längst från tummen, och
   * palettknappen var helt bortgömd bakom `md:`.
   */
  const html = renderToStaticMarkup(h(ButikProvider, null, h(KalenderApp)));

  // Bläddring inom tummens räckvidd, i bottenraden.
  innehaller(html, 'aria-label="Föregående period"');
  innehaller(html, 'aria-label="Nästa period"');

  // Alla fem vyerna når man därifrån också.
  for (const v of ["Dag", "Tre dagar", "Vecka", "Månad", "År"]) {
    innehaller(html, `aria-label="${v}"`);
  }

  // Fångst och sök måste gå att nå utan tangentbord.
  innehaller(html, 'aria-label="Fånga, sök eller styr"');

  // Alla fyra sidorna skall gå att växla mellan.
  innehaller(html, "Anteckn.");
  innehaller(html, "Att göra");
  innehaller(html, "Annat");
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
