/**
 * Prov för att göra-listan.
 *
 * Tyngdpunkten ligger på ordningen. En att göra-lista är i praktiken sin
 * sortering: står fel sak överst gör man fel sak, och det märks inte
 * förrän dagen är slut.
 */

import {
  normaliseraUppgift,
  sorteraUppgifter,
  taBortKalender,
  vaxlaKlar,
  levande,
  normaliseraKalender,
  normalisera,
  type Ogonblick,
} from "../lib/butik";
import { antalIvag, osynkade } from "../lib/synk";
import type { Prioritet, Uppgift } from "../lib/typer";

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

function u(
  id: string,
  prioritet: Prioritet,
  extra: Partial<Uppgift> = {}
): Uppgift {
  return normaliseraUppgift({
    id,
    titel: id,
    prioritet,
    kalenderId: "arbete",
    skapad: "2026-08-12T10:00:00.000Z",
    ...extra,
  });
}

const ordning = (lista: Uppgift[]) => sorteraUppgifter(lista).map((x) => x.id);

process.stdout.write("\nAtt göra\n");

/* --- ordningen ---------------------------------------------------- */

prov("starkast styrka först", () => {
  lika(ordning([u("c", 3), u("a", 1), u("b", 2)]), ["a", "b", "c"]);
});

prov("inom samma styrka går det som förfaller snarast först", () => {
  lika(
    ordning([
      u("sen", 2, { forfaller: "2026-09-01" }),
      u("tidig", 2, { forfaller: "2026-08-13" }),
    ]),
    ["tidig", "sen"]
  );
});

prov("ett satt datum går före inget datum alls", () => {
  // Ett datum är ett löfte, ett tomt fält är ett önskemål.
  lika(
    ordning([u("utan", 2), u("med", 2, { forfaller: "2026-12-24" })]),
    ["med", "utan"]
  );
});

prov("styrkan väger tyngre än datumet", () => {
  // En stark uppgift utan datum skall stå före en svag som förfaller
  // imorgon. Annars styr kalendern prioriteringen i stället för du.
  lika(
    ordning([u("svag", 3, { forfaller: "2026-08-13" }), u("stark", 1)]),
    ["stark", "svag"]
  );
});

prov("klara hamnar sist oavsett styrka", () => {
  lika(
    ordning([
      u("klar", 1, { klar: true, klarVid: "2026-08-12T11:00:00.000Z" }),
      u("kvar", 3),
    ]),
    ["kvar", "klar"]
  );
});

prov("senast avbockad överst bland de klara", () => {
  lika(
    ordning([
      u("gammal", 1, { klar: true, klarVid: "2026-08-10T09:00:00.000Z" }),
      u("ny", 1, { klar: true, klarVid: "2026-08-12T09:00:00.000Z" }),
    ]),
    ["ny", "gammal"]
  );
});

prov("lika i allt avgörs av skapelseordningen, aldrig av slumpen", () => {
  const a = u("a", 2, { skapad: "2026-08-01T00:00:00.000Z" });
  const b = u("b", 2, { skapad: "2026-08-02T00:00:00.000Z" });
  // Två körningar med olika utgångsordning måste ge samma svar.
  lika(ordning([b, a]), ["a", "b"]);
  lika(ordning([a, b]), ["a", "b"]);
});

prov("sorteringen muterar inte sitt indata", () => {
  const lista = [u("c", 3), u("a", 1)];
  const kopia = JSON.parse(JSON.stringify(lista));
  sorteraUppgifter(lista);
  lika(lista, kopia);
});

/* --- normalisering ------------------------------------------------ */

prov("styrka utanför skalan hamnar i mitten", () => {
  lika(normaliseraUppgift({ prioritet: 0 as Prioritet }).prioritet, 2);
  lika(normaliseraUppgift({ prioritet: 9 as Prioritet }).prioritet, 2);
  lika(normaliseraUppgift({}).prioritet, 2);
  lika(normaliseraUppgift({ prioritet: 1 }).prioritet, 1);
  lika(normaliseraUppgift({ prioritet: 3 }).prioritet, 3);
});

prov("tomt förfallodatum blir null, inte tom sträng", () => {
  // En tom sträng sorterar före alla riktiga datum och hade lagt
  // datumlösa uppgifter överst.
  lika(normaliseraUppgift({ forfaller: "" }).forfaller, null);
});

/* --- avbockning --------------------------------------------------- */

prov("avbockning sätter tidpunkt och gör posten osynkad", () => {
  const start = { ...u("a", 1), synkad: true };
  const efter = vaxlaKlar(start, "2026-08-12T12:00:00.000Z");
  lika(efter.klar, true);
  lika(efter.klarVid, "2026-08-12T12:00:00.000Z");
  lika(efter.synkad, false);
  lika(efter.andrad, "2026-08-12T12:00:00.000Z");
});

prov("att ångra avbockningen tar bort tidpunkten", () => {
  const klar = vaxlaKlar(u("a", 1), "2026-08-12T12:00:00.000Z");
  const angrad = vaxlaKlar(klar, "2026-08-12T13:00:00.000Z");
  lika(angrad.klar, false);
  lika(angrad.klarVid, null);
});

/* --- kopplingen till kalendrarna ---------------------------------- */

function bas(): Ogonblick {
  return {
    anteckningar: [],
    kalendrar: [
      normaliseraKalender({ id: "a", namn: "Arbete", ton: 3 }),
      normaliseraKalender({ id: "s", namn: "Studier", ton: 0 }),
    ],
    handelser: [
      normalisera({
        id: "h1",
        titel: "Möte",
        kalenderId: "s",
        start: "2026-08-12T09:00",
        slut: "2026-08-12T10:00",
      }),
    ],
    uppgifter: [
      u("u1", 1, { kalenderId: "s" }),
      u("u2", 2, { kalenderId: "a" }),
    ],
  };
}

prov("uppgifter följer med när deras kalender flyttas", () => {
  const o = taBortKalender(bas(), "s", "a");
  lika(
    levande(o.uppgifter).map((x) => [x.id, x.kalenderId]),
    [
      ["u1", "a"],
      ["u2", "a"],
    ]
  );
  lika(o.uppgifter[0].synkad, false, "flytten måste skickas upp");
});

prov("uppgifter gravsätts när kalendern raderas utan flyttmål", () => {
  const o = taBortKalender(bas(), "s", null);
  lika(levande(o.uppgifter).map((x) => x.id), ["u2"]);
  // Gravstenen ligger kvar tills den nått molnet.
  lika(o.uppgifter.length, 2);
});

prov("ingen uppgift blir kvar med en kalender som inte finns", () => {
  for (const mal of ["a", null]) {
    const o = taBortKalender(bas(), "s", mal);
    const kvar = new Set(levande(o.kalendrar).map((k) => k.id));
    for (const x of levande(o.uppgifter)) {
      if (!kvar.has(x.kalenderId)) {
        throw new Error(`${x.titel} pekar på en borttagen kalender`);
      }
    }
  }
});

/* --- synken ------------------------------------------------------- */

prov("osynkade uppgifter räknas med i kön", () => {
  const o = bas();
  lika(osynkade(o.uppgifter).length, 2);
  // Två uppgifter, en händelse och två kalendrar, alla nyskapade.
  lika(antalIvag(o), 5);
});

process.stdout.write(
  `\n${antal - fel} av ${antal} prov gick igenom.${fel ? " ✗" : " ✓"}\n\n`
);
process.exit(fel ? 1 : 0);
