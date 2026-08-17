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
import Anteckningar from "../components/Anteckningar";
import Annat from "../components/Annat";
import Sprak from "../components/sidor/Sprak";
import Bladtrad from "../components/sidor/block/Bladtrad";
import { normaliseraSida } from "../lib/butik";
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

prov("anteckningsvyn ritar lista och tomt läge", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Anteckningar, { onOppnaMal: tomt }))
  );
  innehaller(html, "Sök i anteckningar");
  for (const k of STANDARDKALENDRAR) innehaller(html, k.namn);
  // Tomt lager: anvisningen skall stå där, inte en tom yta.
  innehaller(html, "Inga anteckningar");
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

prov("språksidan ritar hyllvyn och det tomma läget", () => {
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Annat, { oppnaId: "sprak" }))
  );
  innehaller(html, "Inga språk ännu");
  innehaller(html, "+ Språk");
  // Brödsmulan är det enda som talar om var man är i fyra nivåer.
  innehaller(html, "Språk");
});

prov("varje språk får en egen rad med sina mappar", () => {
  // Hyllan ÄR raden. Alla språk syns samtidigt, och mapparna ligger på
  // respektive språks rad — man skall inte behöva välja ett språk för
  // att få se vad som står i det.
  const sida = normaliseraSida({
    id: "sprak",
    data: {
      hyllor: [
        { id: "it", namn: "Italienska", ton: 2 },
        { id: "de", namn: "Tyska", ton: 3 },
      ],
      mappar: [
        { id: "verb", hyllaId: "it", titel: "Verb", bihang: "A2–B1" },
        { id: "idiom", hyllaId: "it", titel: "Idiom" },
        { id: "kasus", hyllaId: "de", titel: "Kasus" },
      ],
      blad: [],
    },
  });
  const html = renderToStaticMarkup(
    h(ButikProvider, null, h(Sprak, { sida, spara: tomt }))
  );
  // Båda hyllorna ritas samtidigt, utan att någon behöver väljas.
  innehaller(html, "Italienska");
  innehaller(html, "Tyska");
  // Och båda hyllornas mappar syns.
  innehaller(html, "Verb");
  innehaller(html, "Idiom");
  innehaller(html, "Kasus");
  // Raden radbryter inte — då vore den inte en hylla.
  innehaller(html, "hyllrad");
  // Mappen utan omslag ritas som en mapp.
  innehaller(html, "Mapp utan omslag");
});

prov("trädsidlisten visar hela hyllan med filsystemets vokabulär", () => {
  const html = renderToStaticMarkup(
    h(Bladtrad, {
      hyllnamn: "Tyska",
      mappar: [
        { id: "subst", hyllaId: "de", titel: "Substantiv", bihang: "" },
        { id: "verb", hyllaId: "de", titel: "Verb", bihang: "" },
      ],
      bladFor: (id: string) =>
        id === "subst"
          ? [
              {
                id: "dativ",
                mappId: "subst",
                titel: "Dativ",
                underrubrik: "",
                utkast: true,
                block: [],
              },
            ]
          : [],
      oppenMapp: "subst",
      oppetBlad: "dativ",
      onOppnaMapp: tomt,
      onOppnaBlad: tomt,
      onTillHyllan: tomt,
    })
  );
  // Hela hyllans mappar, inte bara den öppnade — man skall kunna hoppa
  // mellan mappar utan att backa ut.
  innehaller(html, "Substantiv/");
  innehaller(html, "Verb/");
  // Snedstrecket och triangeln skiljer mapp från blad utan färg, som
  // måste hållas ledig för "det här är du".
  innehaller(html, "▾");
  innehaller(html, "▸");
  // Bladet i den öppna mappen, med utkastmärke.
  innehaller(html, "Dativ");
  innehaller(html, "utkast");
  // Aktiv rad markeras.
  innehaller(html, 'data-aktiv="1"');
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
