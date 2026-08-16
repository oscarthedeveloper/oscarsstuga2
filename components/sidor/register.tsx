"use client";

/**
 * Registret över sidor under Annat.
 *
 * Att lägga till en sida är att lägga till en rad här och en komponent
 * bredvid. Det är avsiktligt kod och inte data: sidorna är olika i
 * GRUNDEN — en väg till läkarprogrammet har ingenting gemensamt med
 * ett bilunderhåll utom att båda är saker man följer över tid — och ett
 * blocksystem som kunde uttrycka båda hade gjort dem lika.
 *
 * Vad som däremot är data är sidans INNEHÅLL. Det bor i lagret, synkas
 * som allt annat, och tolkas av sidan själv. Registernyckeln är också
 * postens id, så två enheter som öppnar samma sida skapar samma post.
 */

import type { ComponentType } from "react";
import type { SidData, Sida } from "@/lib/typer";
import Hogskoleprov from "./Hogskoleprov";

export interface SidProps {
  /** Sidans sparade innehåll, eller null om den aldrig fyllts i. */
  sida: Sida | null;
  spara(data: SidData): void;
}

export interface SidDefinition {
  /** Nyckel i registret OCH id på posten i lagret. Byt aldrig. */
  id: string;
  titel: string;
  /** Två–tre tecken till listmärket. */
  kort: string;
  beskrivning: string;
  Komponent: ComponentType<SidProps>;
}

export const SIDOR: SidDefinition[] = [
  {
    id: "hogskoleprov",
    titel: "Högskoleprov och läkarprogrammet",
    kort: "HP",
    beskrivning: "Resultat, delpoäng, antagningspoäng och plugglogg",
    Komponent: Hogskoleprov,
  },
];

export function sidDefinition(id: string): SidDefinition | null {
  return SIDOR.find((s) => s.id === id) ?? null;
}
