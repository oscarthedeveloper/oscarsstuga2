/**
 * Synkmotorn.
 *
 * Modellen är "offline först": den lokala kopian är den appen ritar och
 * skriver mot, alltid. Molnet är en spegel som hinner ikapp när nätet
 * finns. Ingenting i gränssnittet väntar någonsin på en nätverksrunda.
 *
 * Sammanfogningen är senaste-skrivningen-vinner per post. Två stämplar
 * håller isär två helt olika frågor, och att blanda ihop dem är det
 * klassiska sättet att tappa data:
 *
 *   `andrad`   — när posten ändrades, satt av den enhet som ändrade den.
 *                Detta är den enda nyckel som avgör vem som vinner.
 *   `synk_vid` — när raden senast rördes i databasen, satt av servern.
 *                Används enbart som markör för "vad har jag inte hämtat
 *                än". Serverns klocka är den enda som är gemensam, så en
 *                enhet med fel klocka kan aldrig göra sig osynlig.
 *
 * Ordningen i en körning är: hämta först, skjut upp sedan. Då hinner en
 * lokalt nyare post skriva över det vi just hämtade, i stället för att
 * bli överskriven av en äldre fjärrkopia.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Handelse, Kalender, Synkbar, Upprepning } from "./typer";
import {
  TABELL_HANDELSER,
  TABELL_KALENDRAR,
  hamtaKlient,
} from "./supabase";
import { normalisera, normaliseraKalender, type Ogonblick } from "./butik";

export type SynkTillstand =
  | "av" // inga nycklar i bygget
  | "utloggad"
  | "offline"
  | "vilande"
  | "synkar"
  | "fel";

export interface SynkLage {
  tillstand: SynkTillstand;
  /** Antal poster som väntar på att skickas upp. */
  ivag: number;
  /** När den senaste lyckade körningen avslutades. */
  sist: string | null;
  meddelande?: string;
}

/** Markören sparas per konto: byter man konto skall allt hämtas om. */
const MARKORNYCKEL = "kalendariet.synkmarkor";

export function lasMarkor(anvandarId: string): string {
  if (typeof window === "undefined") return NOLLTID;
  return (
    window.localStorage.getItem(`${MARKORNYCKEL}.${anvandarId}`) ?? NOLLTID
  );
}

export function skrivMarkor(anvandarId: string, markor: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${MARKORNYCKEL}.${anvandarId}`, markor);
}

const NOLLTID = "1970-01-01T00:00:00.000Z";

/* ==================================================================
   RADFORM — översättning mellan appens objekt och databasens kolumner
   ================================================================== */

interface HandelseRad {
  agare: string;
  id: string;
  titel: string;
  anteckning: string;
  plats: string;
  starttid: string;
  sluttid: string;
  heldag: boolean;
  kalender_id: string;
  upprepning: Upprepning | null;
  undantag: string[];
  avvikelser: Record<string, { start: string; slut: string }>;
  skapad: string;
  andrad: string;
  raderad: string | null;
  synk_vid?: string;
}

interface KalenderRad {
  agare: string;
  id: string;
  namn: string;
  ton: number;
  synlig: boolean;
  andrad: string;
  raderad: string | null;
  synk_vid?: string;
}

function tillRad(h: Handelse, agare: string): HandelseRad {
  return {
    agare,
    id: h.id,
    titel: h.titel,
    anteckning: h.anteckning,
    plats: h.plats,
    // "start" och "slut" är olämpliga kolumnnamn i Postgres; de heter
    // starttid/sluttid i databasen och översätts här.
    starttid: h.start,
    sluttid: h.slut,
    heldag: h.heldag,
    kalender_id: h.kalenderId,
    upprepning: h.upprepning,
    undantag: h.undantag,
    avvikelser: h.avvikelser,
    skapad: h.skapad,
    andrad: h.andrad,
    raderad: h.raderad,
  };
}

function franRad(r: HandelseRad): Handelse {
  return normalisera({
    id: r.id,
    titel: r.titel,
    anteckning: r.anteckning ?? "",
    plats: r.plats ?? "",
    start: r.starttid,
    slut: r.sluttid,
    heldag: !!r.heldag,
    kalenderId: r.kalender_id,
    upprepning: r.upprepning ?? null,
    undantag: r.undantag ?? [],
    avvikelser: r.avvikelser ?? {},
    skapad: r.skapad,
    andrad: r.andrad,
    raderad: r.raderad ?? null,
    // Den kommer från molnet, alltså är den per definition synkad.
    synkad: true,
  });
}

function kalenderTillRad(k: Kalender, agare: string): KalenderRad {
  return {
    agare,
    id: k.id,
    namn: k.namn,
    ton: k.ton,
    synlig: k.synlig,
    andrad: k.andrad,
    raderad: k.raderad,
  };
}

function kalenderFranRad(r: KalenderRad): Kalender {
  return normaliseraKalender({
    id: r.id,
    namn: r.namn,
    ton: r.ton,
    synlig: r.synlig !== false,
    andrad: r.andrad,
    raderad: r.raderad ?? null,
    synkad: true,
  });
}

/* ==================================================================
   SAMMANFOGNING
   ================================================================== */

/**
 * Slår ihop en lokal och en fjärrlista. Ren funktion, utan nätverk —
 * det är den här biten som proven mäter, eftersom det är här data kan
 * gå förlorad.
 *
 * Regeln är enkel och likadan för både händelser och kalendrar:
 *
 *   - post som bara finns på ena sidan tas rakt av
 *   - annars vinner den med senast `andrad`
 *   - vid exakt samma stämpel vinner fjärrkopian, så att alla enheter
 *     landar på samma svar oavsett i vilken ordning de synkar
 *
 * En lokal post som vann behåller `synkad: false` och skickas upp i
 * samma körning.
 */
export function sammanfoga<T extends Synkbar & { id: string }>(
  lokala: T[],
  fjarran: T[],
  /** Får sista ordet om enskilda fält, t.ex. sådana som är per enhet. */
  efterat?: (lokal: T, vinnare: T) => T
): T[] {
  const ut = new Map<string, T>();
  for (const l of lokala) ut.set(l.id, l);

  for (const f of fjarran) {
    const l = ut.get(f.id);
    if (!l) {
      ut.set(f.id, f);
      continue;
    }
    // Strikt större: vid oavgjort tar fjärrkopian hem det.
    const vinnare = l.andrad > f.andrad ? l : f;
    ut.set(f.id, efterat ? efterat(l, vinnare) : vinnare);
  }

  return Array.from(ut.values());
}

/**
 * Kalendrar sammanfogas som allt annat, med ett undantag: `synlig` är en
 * inställning per ENHET. Att dölja Arbete på telefonen skall inte dölja
 * den på datorn. Fältet finns kvar i tabellen för enkelhetens skull, men
 * den lokala kopian vinner alltid över molnets.
 */
export function sammanfogaKalendrar(
  lokala: Kalender[],
  fjarran: Kalender[]
): Kalender[] {
  return sammanfoga(lokala, fjarran, (lokal, vinnare) => ({
    ...vinnare,
    synlig: lokal.synlig,
  }));
}

/** Poster som har lokala ändringar molnet inte sett. */
export function osynkade<T extends Synkbar>(lista: T[]): T[] {
  return lista.filter((x) => !x.synkad);
}

export function antalIvag(o: Ogonblick): number {
  return osynkade(o.handelser).length + osynkade(o.kalendrar).length;
}

/* ==================================================================
   KÖRNINGEN
   ================================================================== */

export interface SynkResultat {
  data: Ogonblick;
  markor: string;
  /** Antal poster som hämtades respektive skickades. */
  ner: number;
  upp: number;
}

/**
 * En hel synkrunda. Kastar vid nätverks- eller behörighetsfel; anroparen
 * avgör om det skall visas eller bara försökas igen senare.
 */
export async function synka(
  lokal: Ogonblick,
  anvandarId: string,
  klient: SupabaseClient | null = hamtaKlient()
): Promise<SynkResultat> {
  if (!klient) throw new Error("Molnet är inte konfigurerat");

  const markor = lasMarkor(anvandarId);
  let nyMarkor = markor;
  const senare = (t?: string) => {
    if (t && t > nyMarkor) nyMarkor = t;
  };

  /* --- 1. Hämta allt som rört sig sedan förra körningen ------------ */
  const [svarH, svarK] = await Promise.all([
    klient
      .from(TABELL_HANDELSER)
      .select("*")
      .gt("synk_vid", markor)
      .order("synk_vid", { ascending: true }),
    klient
      .from(TABELL_KALENDRAR)
      .select("*")
      .gt("synk_vid", markor)
      .order("synk_vid", { ascending: true }),
  ]);

  if (svarH.error) throw new Error(svarH.error.message);
  if (svarK.error) throw new Error(svarK.error.message);

  const fjarrH = (svarH.data ?? []) as HandelseRad[];
  const fjarrK = (svarK.data ?? []) as KalenderRad[];
  for (const r of fjarrH) senare(r.synk_vid);
  for (const r of fjarrK) senare(r.synk_vid);

  let data: Ogonblick = {
    handelser: sammanfoga(lokal.handelser, fjarrH.map(franRad)),
    kalendrar: sammanfogaKalendrar(
      lokal.kalendrar,
      fjarrK.map(kalenderFranRad)
    ),
  };

  /* --- 2. Skjut upp det som molnet inte sett ----------------------- */
  const uppH = osynkade(data.handelser);
  const uppK = osynkade(data.kalendrar);

  // Kalendrarna först: en händelse pekar på sin kalender, och den bör
  // finnas uppe innan händelsen gör det. Databasen har medvetet ingen
  // främmandenyckel — en enhet kan ha skapat händelsen offline innan
  // kalendern hann upp — men ordningen gör ändå läget snyggare.
  if (uppK.length > 0) {
    const svar = await klient
      .from(TABELL_KALENDRAR)
      .upsert(
        uppK.map((k) => kalenderTillRad(k, anvandarId)),
        { onConflict: "agare,id" }
      )
      .select("id,synk_vid");
    if (svar.error) throw new Error(svar.error.message);
    for (const r of svar.data ?? []) senare((r as KalenderRad).synk_vid);
  }

  if (uppH.length > 0) {
    // Skicka i lagom stora klumpar: en telefon som varit borta en månad
    // kan ha hundratals poster på kö, och en enda jätteförfrågan är det
    // som oftast tajmar ut på ett dåligt mobilnät.
    for (const klump of dela(uppH, 200)) {
      const svar = await klient
        .from(TABELL_HANDELSER)
        .upsert(
          klump.map((h) => tillRad(h, anvandarId)),
          { onConflict: "agare,id" }
        )
        .select("id,synk_vid");
      if (svar.error) throw new Error(svar.error.message);
      for (const r of svar.data ?? []) senare((r as HandelseRad).synk_vid);
    }
  }

  // Först när skrivningen gått igenom får posterna räknas som synkade.
  const uppH_ider = new Set(uppH.map((h) => h.id));
  const uppK_ider = new Set(uppK.map((k) => k.id));
  data = {
    handelser: data.handelser.map((h) =>
      uppH_ider.has(h.id) ? { ...h, synkad: true } : h
    ),
    kalendrar: data.kalendrar.map((k) =>
      uppK_ider.has(k.id) ? { ...k, synkad: true } : k
    ),
  };

  skrivMarkor(anvandarId, nyMarkor);

  return {
    data,
    markor: nyMarkor,
    ner: fjarrH.length + fjarrK.length,
    upp: uppH.length + uppK.length,
  };
}

function dela<T>(lista: T[], storlek: number): T[][] {
  const ut: T[][] = [];
  for (let i = 0; i < lista.length; i += storlek) {
    ut.push(lista.slice(i, i + storlek));
  }
  return ut;
}
