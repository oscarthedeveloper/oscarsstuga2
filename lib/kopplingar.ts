/**
 * Kopplingar.
 *
 * Det som skiljer en andrahjärna från tre register är att sakerna i den
 * pekar på varandra: anteckningen som hör till mötet, uppgiften som hör
 * till projektet. Syntaxen är [[dubbla hakparenteser]] runt en titel,
 * och den fungerar i varje fritextfält appen har — anteckningens
 * brödtext, händelsens anteckning, uppgiftens anteckning.
 *
 * TITELN ÄR IDENTITETEN, inte id:t. Det är ett medvetet val med en känd
 * kostnad: byter man namn på en post slutar länkarna till den att peka
 * rätt. Alternativet — att skriva in ett id i texten — gör länken osynlig
 * för människan som läser, och en länk man inte kan läsa är inte en
 * anteckning utan en databaspost. Kostnaden syns dessutom direkt: en
 * länk utan mål ritas som ett tomrum att fylla, inte som ett fel.
 *
 * En länk som ännu inte har något mål är för övrigt det normala läget,
 * inte undantaget. Man skriver [[kvartalsrapporten]] när man tänker på
 * den, och skapar posten sedan.
 */

import type { Anteckning, Handelse, Uppgift } from "./typer";
import type { Kalla, Slag } from "./sok";

export interface Mal {
  slag: Slag;
  id: string;
  titel: string;
}

/** Uppslag från normaliserad titel till posten som bär den. */
export type Register = Map<string, Mal>;

/** En post som pekar hit. */
export interface Referens extends Mal {
  /** Raden i källans text där länken står. */
  utdrag: string;
}

/** Textbit att rita: antingen vanlig text eller en länk. */
export type Bit =
  | { typ: "text"; text: string }
  | { typ: "lank"; text: string; mal: Mal | null };

const LANK = /\[\[([^\]\n]+)\]\]/g;

/**
 * Nyckeln en titel slås upp under.
 *
 * Skiftläge och extra blanksteg får aldrig avgöra om en länk hittar
 * fram — man skriver [[Kvartalsrapporten]] i en anteckning och
 * [[kvartalsrapporten]] i nästa och menar samma sak.
 */
export function nyckelFor(titel: string): string {
  return titel.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Alla titlar som texten länkar till, i ordning och utan dubbletter. */
export function hittaLankar(text: string): string[] {
  if (!text) return [];
  const ut: string[] = [];
  const sedda = new Set<string>();
  for (const m of text.matchAll(LANK)) {
    const titel = m[1].trim();
    if (!titel) continue;
    const n = nyckelFor(titel);
    if (sedda.has(n)) continue;
    sedda.add(n);
    ut.push(titel);
  }
  return ut;
}

/**
 * Bygger uppslaget över allt som går att länka till.
 *
 * Ordningen är anteckningar, händelser, uppgifter — och den spelar roll.
 * Delar två poster titel vinner den första, och en anteckning som HETER
 * "Kvartalsrapporten" är nästan alltid det man menar framför ett möte
 * som råkar heta likadant.
 */
export function byggRegister(kalla: Kalla): Register {
  const reg: Register = new Map();
  const lagg = (slag: Slag, id: string, titel: string) => {
    const n = nyckelFor(titel);
    if (!n || reg.has(n)) return;
    reg.set(n, { slag, id, titel });
  };

  for (const a of kalla.anteckningar ?? []) lagg("anteckning", a.id, a.titel);
  for (const h of kalla.handelser) lagg("handelse", h.id, h.titel);
  for (const u of kalla.uppgifter) lagg("uppgift", u.id, u.titel);
  return reg;
}

export function slaUpp(reg: Register, titel: string): Mal | null {
  return reg.get(nyckelFor(titel)) ?? null;
}

/**
 * Delar upp en text i bitar för rendering.
 *
 * Anledningen att den lämnar tillbaka data i stället för märkspråk är
 * att texten är användarens egen: bygger man en HTML-sträng måste den
 * saneras, och den dagen saneringen har ett hål är det ett hål i något
 * som visas för den som skrev det. Bitar renderas av React och kan inte
 * bli märkspråk av misstag.
 */
export function delaText(text: string, reg: Register): Bit[] {
  if (!text) return [];
  const ut: Bit[] = [];
  let sist = 0;

  for (const m of text.matchAll(LANK)) {
    const i = m.index ?? 0;
    if (i > sist) ut.push({ typ: "text", text: text.slice(sist, i) });
    const titel = m[1].trim();
    ut.push({ typ: "lank", text: titel, mal: slaUpp(reg, titel) });
    sist = i + m[0].length;
  }

  if (sist < text.length) ut.push({ typ: "text", text: text.slice(sist) });
  return ut;
}

/**
 * Allt som pekar på en viss post.
 *
 * Matchningen sker på titel och inte på id, av samma skäl som länken
 * skrivs med titel: källan känner bara till namnet. Två poster med samma
 * namn får därför samma bakåtlänkar, vilket är rätt — texten som skrev
 * [[möte]] menade det som heter möte, och appen kan inte veta vilket.
 */
export function bakatlankar(kalla: Kalla, mal: { titel: string; id: string }): Referens[] {
  const sokt = nyckelFor(mal.titel);
  if (!sokt) return [];
  const ut: Referens[] = [];

  const provaKalla = (
    slag: Slag,
    id: string,
    titel: string,
    kropp: string
  ) => {
    // En post länkar inte till sig själv, hur gärna den än vill.
    if (id === mal.id) return;
    if (!kropp) return;
    const traff = hittaLankar(kropp).some((t) => nyckelFor(t) === sokt);
    if (!traff) return;
    ut.push({ slag, id, titel: titel || "Utan rubrik", utdrag: radMed(kropp, sokt) });
  };

  for (const a of kalla.anteckningar ?? [])
    provaKalla("anteckning", a.id, a.titel, a.brodtext);
  for (const h of kalla.handelser)
    provaKalla("handelse", h.id, h.titel, h.anteckning);
  for (const u of kalla.uppgifter)
    provaKalla("uppgift", u.id, u.titel, u.anteckning);

  return ut;
}

/**
 * Raden där länken står, med hakparenteserna borttagna.
 *
 * Att visa själva meningen är hela värdet av en bakåtlänkslista: "Nämns
 * i Veckoplanering" säger nästan ingenting, "…bestämde att
 * kvartalsrapporten skjuts till mars" säger allt.
 */
function radMed(kropp: string, sokt: string, bredd = 90): string {
  const rader = kropp.split(/\n+/);
  const traff =
    rader.find((r) => hittaLankar(r).some((t) => nyckelFor(t) === sokt)) ??
    rader[0] ??
    "";
  const ren = traff.replace(LANK, "$1").replace(/\s+/g, " ").trim();
  return ren.length > bredd ? ren.slice(0, bredd) + "…" : ren;
}

/**
 * Titlar som ännu inte har någon post. Underlaget till "skapa den
 * anteckning du redan hänvisat till" — utan den listan blir en trasig
 * länk något man ser och glömmer i stället för något man kan åtgärda.
 */
export function svavandeLankar(kalla: Kalla): string[] {
  const reg = byggRegister(kalla);
  const ut = new Map<string, string>();
  const samla = (kropp: string) => {
    for (const t of hittaLankar(kropp)) {
      const n = nyckelFor(t);
      if (!reg.has(n) && !ut.has(n)) ut.set(n, t);
    }
  };
  for (const a of kalla.anteckningar ?? []) samla(a.brodtext);
  for (const h of kalla.handelser) samla(h.anteckning);
  for (const u of kalla.uppgifter) samla(u.anteckning);
  return Array.from(ut.values());
}

/** Typerna finns med för att anropare skall slippa importera två filer. */
export type { Anteckning, Handelse, Uppgift };
