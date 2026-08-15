/**
 * Prov för fångsttolken.
 *
 * Tolken är den enda delen av appen som gissar. Proven finns därför lika
 * mycket för att slå fast vad den INTE skall göra: ett tal som råkar se
 * ut som ett klockslag får inte bli ett möte, och en rad utan tidsuttryck
 * får aldrig hamna i rutnätet.
 *
 * Allt räknas mot en fast tidpunkt — torsdag 13 augusti 2026, 10:00 —
 * så att "på fredag" betyder samma sak i mars som i november.
 */

import { tolkaFangst } from "../lib/tolka";

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

function lika<T>(fick: T, vantat: T, vad = "") {
  if (JSON.stringify(fick) !== JSON.stringify(vantat)) {
    throw new Error(
      `${vad}\n       fick    ${JSON.stringify(fick)}\n       väntade ${JSON.stringify(vantat)}`
    );
  }
}

/** Torsdag 13 augusti 2026, kl 10:00. */
const NU = new Date(2026, 7, 13, 10, 0);
const KALENDRAR = ["Arbete", "Privat", "Studier", "Träning", "Resor", "Annat"];

const t = (text: string) => tolkaFangst(text, KALENDRAR, NU);

process.stdout.write("\nFÅNGSTTOLKEN\n");

/* ------------------------------------------------------------------
   Sorten
   ------------------------------------------------------------------ */

prov("klockslag ger en händelse", () => {
  const f = t("lunch med Anna kl 12");
  lika(f.sort, "handelse");
  lika(f.titel, "lunch med Anna");
  lika(f.start, "2026-08-13T12:00");
  lika(f.slut, "2026-08-13T13:00", "standardlängd är en timme");
});

prov("datum utan klockslag ger en uppgift", () => {
  const f = t("ring tandläkaren på fredag");
  lika(f.sort, "uppgift");
  lika(f.titel, "ring tandläkaren");
  lika(f.forfaller, "2026-08-14");
  lika(f.start, null, "en uppgift tar ingen plats i rutnätet");
});

prov("varken tid eller datum ger en uppgift utan datum", () => {
  const f = t("köp mjölk");
  lika(f.sort, "uppgift");
  lika(f.titel, "köp mjölk");
  lika(f.forfaller, null);
  lika(f.tom, true, "inget tolkat alls");
});

prov("möte: tvingar fram en händelse utan klockslag", () => {
  const f = t("möte: kickoff imorgon");
  lika(f.sort, "handelse");
  lika(f.titel, "kickoff");
  lika(f.start, "2026-08-14T09:00", "utan tid börjar dagen kl 9");
});

prov("uppgift: tvingar fram en uppgift trots klockslag", () => {
  const f = t("uppgift: ring banken kl 14");
  lika(f.sort, "uppgift");
  lika(f.titel, "ring banken");
  lika(f.start, null);
});

/* ------------------------------------------------------------------
   Tid
   ------------------------------------------------------------------ */

prov("tidsspann", () => {
  const f = t("workshop 13:00-16:30");
  lika(f.start, "2026-08-13T13:00");
  lika(f.slut, "2026-08-13T16:30");
  lika(f.titel, "workshop");
});

prov("tidsspann med kl och till", () => {
  const f = t("stand-up kl 9 till 9.30 imorgon");
  lika(f.start, "2026-08-14T09:00");
  lika(f.slut, "2026-08-14T09:30");
});

prov("spann över midnatt räknas till nästa dygn", () => {
  const f = t("nattpass kl 23-01");
  lika(f.start, "2026-08-13T23:00");
  lika(f.slut, "2026-08-14T01:00");
});

prov("angiven längd styr slutet", () => {
  const f = t("djuparbete kl 14 i 2 timmar");
  lika(f.start, "2026-08-13T14:00");
  lika(f.slut, "2026-08-13T16:00");
});

prov("halvtimme", () => {
  const f = t("samtal kl 15 en halvtimme");
  lika(f.slut, "2026-08-13T15:30");
});

prov("passerat klockslag utan datum flyttas till imorgon", () => {
  // Klockan är 10:00. Ett möte kl 8 kan inte rimligen betyda idag.
  const f = t("möte kl 8");
  lika(f.start, "2026-08-14T08:00");
});

prov("klockslag som ännu inte varit ligger kvar idag", () => {
  const f = t("möte kl 16");
  lika(f.start, "2026-08-13T16:00");
});

/* ------------------------------------------------------------------
   Datum
   ------------------------------------------------------------------ */

prov("imorgon och övermorgon", () => {
  lika(t("x imorgon").forfaller, "2026-08-14");
  lika(t("x i morgon").forfaller, "2026-08-14");
  lika(t("x övermorgon").forfaller, "2026-08-15");
});

prov("veckodag är nästa förekomst", () => {
  // Torsdag den 13:e. Måndag är den 17:e.
  lika(t("x på måndag").forfaller, "2026-08-17");
  lika(t("x på torsdag").forfaller, "2026-08-13", "idag är torsdag");
});

prov("nästa veckodag hoppar över den närmaste", () => {
  lika(t("x nästa måndag").forfaller, "2026-08-24");
});

prov("kortform och saknade prickar över bokstäverna", () => {
  lika(t("x fre").forfaller, "2026-08-14");
  lika(t("x lordag").forfaller, "2026-08-15");
});

prov("om N dagar och veckor", () => {
  lika(t("x om 3 dagar").forfaller, "2026-08-16");
  lika(t("x om en vecka").forfaller, "2026-08-20");
  lika(t("x nästa vecka").forfaller, "2026-08-20");
});

prov("skrivna datum", () => {
  lika(t("x 2026-12-24").forfaller, "2026-12-24");
  lika(t("x 24/12").forfaller, "2026-12-24");
  lika(t("x 24 dec").forfaller, "2026-12-24");
  lika(t("x den 24 december").forfaller, "2026-12-24");
});

prov("datum som redan varit rullar till nästa år", () => {
  lika(t("x 3 mars").forfaller, "2027-03-03");
  lika(t("x 3/1").forfaller, "2027-01-03");
});

prov("mars före maj vid prefixmatchning", () => {
  lika(t("x 3 mar").forfaller, "2027-03-03");
});

prov("heldag", () => {
  const f = t("semester heldag imorgon");
  lika(f.sort, "handelse");
  lika(f.heldag, true);
  lika(f.start, "2026-08-14T00:00");
  lika(f.slut, "2026-08-15T00:00");
  lika(f.titel, "semester");
});

/* ------------------------------------------------------------------
   Styrka och kalender
   ------------------------------------------------------------------ */

prov("styrka", () => {
  const f = t("skicka in ansökan !1 på fredag");
  lika(f.prioritet, 1);
  lika(f.titel, "skicka in ansökan");
});

prov("styrka saknas ger mitten", () => {
  lika(t("köp mjölk").prioritet, 2);
});

prov("kalender med prefix", () => {
  lika(t("x #arb").kalenderNamn, "Arbete");
  lika(t("x #privat").kalenderNamn, "Privat");
  lika(t("x #träning").kalenderNamn, "Träning");
});

prov("okänd kalender behålls som skriven", () => {
  lika(t("x #hobby").kalenderNamn, "hobby");
});

/* ------------------------------------------------------------------
   Det tolken INTE får göra
   ------------------------------------------------------------------ */

prov("tal som inte är klockslag lämnas i fred", () => {
  const f = t("köp 2-3 liter mjölk");
  lika(f.sort, "uppgift", "inget möte klockan två");
  lika(f.start, null);
  lika(f.titel, "köp 2-3 liter mjölk");
});

prov("om i betydelsen angående äts inte upp", () => {
  const f = t("möte: samtal om budget kl 14");
  lika(f.titel, "samtal om budget");
});

prov("ord som liknar månader men inte är det", () => {
  const f = t("boka 3 stolar");
  lika(f.forfaller, null);
  lika(f.titel, "boka 3 stolar");
});

prov("orimliga klockslag avvisas", () => {
  const f = t("x kl 99");
  lika(f.sort, "uppgift", "99 är inget klockslag");
});

prov("tom rad ger tom titel", () => {
  const f = t("   ");
  lika(f.titel, "");
  lika(f.tom, true);
});

/* ------------------------------------------------------------------
   Allt på en gång
   ------------------------------------------------------------------ */

prov("full rad", () => {
  const f = t("möte med styrelsen #arbete kl 14:00-15:30 på måndag");
  lika(f.sort, "handelse");
  lika(f.titel, "möte med styrelsen");
  lika(f.kalenderNamn, "Arbete");
  lika(f.start, "2026-08-17T14:00");
  lika(f.slut, "2026-08-17T15:30");
});

prov("full uppgiftsrad", () => {
  const f = t("lämna in deklarationen !1 #privat den 2 maj");
  lika(f.sort, "uppgift");
  lika(f.titel, "lämna in deklarationen");
  lika(f.prioritet, 1);
  lika(f.kalenderNamn, "Privat");
  lika(f.forfaller, "2027-05-02");
});

process.stdout.write(
  `\n${antal - fel}/${antal} prov gick igenom${fel ? ` — ${fel} FEL` : ""}\n\n`
);
if (fel > 0) process.exit(1);
