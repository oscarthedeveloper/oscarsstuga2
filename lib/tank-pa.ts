import type { SidData } from "./typer";

export const TANK_PA_SIDA = "tank-pa";

export interface TankPa {
  id: string;
  text: string;
  datum: string;
  kalenderId: string;
  skapad: string;
}

/** Läser sidan defensivt så att äldre eller halvskriven data aldrig kraschar kalendern. */
export function tolkaTankPa(data: SidData | undefined): TankPa[] {
  const rader = data?.rader;
  if (!Array.isArray(rader)) return [];
  return rader.flatMap((v): TankPa[] => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return [];
    const r = v as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.text !== "string") return [];
    if (typeof r.datum !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.datum)) return [];
    return [{
      id: r.id,
      text: r.text,
      datum: r.datum,
      kalenderId: typeof r.kalenderId === "string" ? r.kalenderId : "arbete",
      skapad: typeof r.skapad === "string" ? r.skapad : new Date(0).toISOString(),
    }];
  });
}

export function tankPaPerDag(rader: TankPa[]): Map<string, TankPa[]> {
  const karta = new Map<string, TankPa[]>();
  for (const rad of [...rader].sort((a, b) => a.skapad.localeCompare(b.skapad))) {
    karta.set(rad.datum, [...(karta.get(rad.datum) ?? []), rad]);
  }
  return karta;
}

export function tankPaData(rader: TankPa[]): SidData {
  return { rader };
}
