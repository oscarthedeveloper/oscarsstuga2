/**
 * Gjort — dagens avklarade, fört in i efterhand.
 *
 * "Sprungit", "1,45 h HP-plugg", "Läst 40 sidor av Nordisk tid". Det man
 * skriver ned på kvällen för att det HÄNDE, inte för att det skall
 * hända.
 *
 * FEMTE SORTEN, och gränsen mot de fyra andra går vid tempus. En
 * händelse äger en plats i tiden och är en avsikt tills den passerat.
 * En uppgift äger en avsikt och bockas av när den är gjord. En lapp
 * blir en händelse. Ett gjort går inte att bocka av — det är redan
 * gjort — och det har ingen varaktighet att rita ut i rutnätet, bara en
 * dag och en rad text.
 *
 * Att pressa in det i uppgifterna hade betytt en att göra-lista full av
 * saker man redan gjort, och en bock som var satt i samma stund raden
 * skrevs. Att göra det till en heldagshändelse hade fyllt heldagsremsan
 * med sådant som inte upptar en dag.
 *
 * TEXTEN ÄR FRI, med flit. "1,45 h HP-plugg" är hur man själv skriver
 * det, och ett fält som krävde ett tal i en ruta och en etikett i en
 * annan hade gjort en anteckning på fem sekunder till ett formulär.
 * Sidan räknar därför ingenting på dem — den minns.
 */

import type { Gjort } from "./typer";

/** Datumnyckel, YYYY-MM-DD. Allt annat är inte en dag. */
export function arDagnyckel(s: unknown): boolean {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/* ==================================================================
   DAGEN
   ================================================================== */

/**
 * Det som gjordes en bestämd dag, i den ordning det skrevs in.
 *
 * Äldst först, till skillnad från parkeringen. Remsan läses från
 * vänster som en rad, och en rad som kastar om sig varje gång man
 * lägger till något är svår att sikta i — dessutom är ordningen man
 * skrev ned dem i oftast ordningen de skedde i.
 */
export function gjortForDag(lista: Gjort[], dagnyckel: string): Gjort[] {
  // En rad vars datum inte är en dagnyckel hör inte till NÅGON dag, och
  // får inte råka höra till den tomma. Utan den här raden dök en rad med
  // trasigt datum upp så fort någon frågade efter dagen "".
  if (!arDagnyckel(dagnyckel)) return [];
  return lista
    .filter((g) => g.datum === dagnyckel)
    .sort((a, b) => a.skapad.localeCompare(b.skapad) || a.id.localeCompare(b.id));
}

/**
 * Alla dagar med något gjort, som en uppslagstabell.
 *
 * Byggs en gång per ritning i stället för att filtrera listan en gång
 * per dagkolumn. Med sju kolumner och ett år av rader är skillnaden
 * mellan att gå igenom listan sju gånger och en enda.
 */
export function gjortPerDag(lista: Gjort[]): Map<string, Gjort[]> {
  const ut = new Map<string, Gjort[]>();
  for (const g of lista) {
    // Samma sak här: en rad utan giltig dag ritas ingenstans. Den ligger
    // kvar i lagret och går att rätta, men den hittar inte på en dag.
    if (!arDagnyckel(g.datum)) continue;
    const rad = ut.get(g.datum);
    if (rad) rad.push(g);
    else ut.set(g.datum, [g]);
  }
  for (const rad of ut.values()) {
    rad.sort((a, b) => a.skapad.localeCompare(b.skapad) || a.id.localeCompare(b.id));
  }
  return ut;
}

/**
 * Städar en inskriven rad.
 *
 * Bara ytterkanterna och dubbla mellanrum. Innehållet rörs inte:
 * "1,45 h" skall stå kvar precis som det skrevs, och ett fält som
 * rättar sitt eget innehåll är ett fält man slutar lita på.
 */
export function rensaText(rå: unknown): string {
  return typeof rå === "string" ? rå.replace(/\s+/g, " ").trim() : "";
}

/* ==================================================================
   RÄKNEVERK
   ================================================================== */

/**
 * Hur många dagar i rad, räknat bakåt från och med `till`, som bär
 * minst en rad.
 *
 * Sviten bryts av den första tomma dagen — inte av den första dagen
 * utan just den sortens rad, och inte heller av dagar som ligger i
 * framtiden. Räknas från och med `till` och bakåt, så att en dag man
 * ännu inte hunnit fylla i inte nollar gårdagens svit.
 */
export function svit(lista: Gjort[], till: string, tak = 400): number {
  if (!arDagnyckel(till)) return 0;
  const dagar = new Set(lista.map((g) => g.datum));
  let antal = 0;
  const d = new Date(`${till}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  for (let i = 0; i < tak; i++) {
    const nyckel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    if (!dagar.has(nyckel)) break;
    antal += 1;
    d.setDate(d.getDate() - 1);
  }
  return antal;
}
