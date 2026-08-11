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

const NOLLTID = "1970-01-01T00:00:00.000Z";

/**
 * Säkerhetsmarginal på markören.
 *
 * `now()` i Postgres är transaktionens STARTTID, inte dess committid. En
 * transaktion som börjar tidigt men blir klar sent får därför en
 * `synk_vid` som ligger före rader vi redan hunnit se. Utan marginal
 * skulle markören kunna passera en rad som ännu inte var synlig, och den
 * raden vore borta för alltid.
 *
 * En minut bakåt kostar bara att ett fåtal rader hämtas om — sammanfogningen
 * är idempotent — och stänger luckan.
 */
const MARGINAL_MS = 60_000;

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

/** Nollställer markören så att nästa körning hämtar hem allt på nytt. */
export function nollstallMarkor(anvandarId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${MARKORNYCKEL}.${anvandarId}`);
}

export function backaMarkor(markor: string, ms = MARGINAL_MS): string {
  if (markor === NOLLTID) return NOLLTID;
  const t = Date.parse(markor);
  if (Number.isNaN(t)) return NOLLTID;
  return new Date(Math.max(0, t - ms)).toISOString();
}

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
  if (fjarran.length === 0) return lokala;

  const ut = new Map<string, T>();
  for (const l of lokala) ut.set(l.id, l);
  let andrat = fjarran.length > lokala.length;

  for (const f of fjarran) {
    const l = ut.get(f.id);
    if (!l) {
      ut.set(f.id, f);
      andrat = true;
      continue;
    }

    let vinnare: T;
    if (l.andrad > f.andrad) {
      vinnare = l;
    } else if (l.andrad < f.andrad) {
      vinnare = f;
    } else if (l.synkad) {
      // Samma version, och den lokala vet redan om att den finns i
      // molnet: behåll det lokala OBJEKTET. Innehållet är detsamma, men
      // referensen bevaras — annars skulle varje synkrunda skapa nya
      // objekt, rita om hela kalendern och skriva om localStorage utan
      // att något faktiskt ändrats.
      vinnare = l;
    } else {
      // Samma stämpel men en osparad lokal ändring. Här måste fjärrsidan
      // vinna, annars kan två enheter landa på var sitt svar och skriva
      // över varandra i all evighet.
      vinnare = f;
    }

    const slutlig = efterat ? efterat(l, vinnare) : vinnare;
    if (slutlig !== l) andrat = true;
    ut.set(f.id, slutlig);
  }

  return andrat ? Array.from(ut.values()) : lokala;
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
  return sammanfoga(lokala, fjarran, (lokal, vinnare) =>
    // Bevara referensen när ingenting faktiskt skiljer sig.
    vinnare.synlig === lokal.synlig
      ? vinnare
      : { ...vinnare, synlig: lokal.synlig }
  );
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

  const sparad = lasMarkor(anvandarId);
  const franMarkor = backaMarkor(sparad);

  /**
   * Markören får ENDAST flyttas fram av rader vi faktiskt hämtat.
   *
   * Det är frestande att också räkna med de rader vi själva skickat upp —
   * de är ju bevisligen i molnet — men det är ett allvarligt fel. Vår egen
   * skrivning får en senare servertid än en annan enhets skrivning som
   * skedde mellan vår hämtning och vår sändning. Flyttas markören fram av
   * vår egen rad hoppar den över den andra enhetens rad, och den blir
   * aldrig hämtad. Just det felet ser ut precis så här: "jag lägger till
   * något på en enhet och den andra får det aldrig".
   */
  let nyMarkor = sparad;
  const senare = (t?: string) => {
    if (t && t > nyMarkor) nyMarkor = t;
  };

  /* --- 1. Hämta allt som rört sig sedan förra körningen ------------ */
  const [svarH, svarK] = await Promise.all([
    klient
      .from(TABELL_HANDELSER)
      .select("*")
      .gt("synk_vid", franMarkor)
      .order("synk_vid", { ascending: true }),
    klient
      .from(TABELL_KALENDRAR)
      .select("*")
      .gt("synk_vid", franMarkor)
      .order("synk_vid", { ascending: true }),
  ]);

  if (svarH.error) throw new Error(oversattRadfel(svarH.error.message));
  if (svarK.error) throw new Error(oversattRadfel(svarK.error.message));

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
      .select("id");
    if (svar.error) throw new Error(oversattRadfel(svar.error.message));
    // Markören rörs INTE här. Se kommentaren vid `nyMarkor`.
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
        .select("id");
      if (svar.error) throw new Error(oversattRadfel(svar.error.message));
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

/**
 * Postgres och PostgREST svarar på engelska och ofta kryptiskt. De fel
 * som faktiskt inträffar när något är felkonfigurerat får en text som
 * säger vad man skall göra åt saken.
 */
export function oversattRadfel(meddelande: string): string {
  const m = meddelande.toLowerCase();
  if (m.includes("does not exist") || m.includes("could not find the table")) {
    return "Tabellerna saknas i databasen. Kör supabase/schema.sql i SQL Editor.";
  }
  if (m.includes("column") && m.includes("schema cache")) {
    return "Databasen har en äldre tabellform. Kör om supabase/schema.sql.";
  }
  if (m.includes("row-level security") || m.includes("violates row-level")) {
    return "Radnivåsäkerheten avvisade skrivningen. Kontrollera att policyerna i schema.sql är körda.";
  }
  if (m.includes("jwt") || m.includes("expired")) {
    return "Sessionen har gått ut. Logga ut och in igen.";
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Ingen kontakt med molnet. Ändringarna ligger kvar på enheten.";
  }
  return meddelande;
}

/* ==================================================================
   DIAGNOS
   ================================================================== */

export interface Diagnos {
  nycklar: boolean;
  inloggad: boolean;
  tabeller: "ok" | "saknas" | "fel" | "okand";
  antalIMolnet: number | null;
  markor: string;
  meddelande: string;
}

/**
 * Svarar på frågan "varför synkas det inte". Kör en riktig förfrågan mot
 * båda tabellerna i stället för att gissa — de fel som faktiskt uppstår
 * (schema inte kört, RLS inte påslagen, fel nycklar) syns bara då.
 */
export async function diagnostisera(
  anvandarId: string | null,
  klient: SupabaseClient | null = hamtaKlient()
): Promise<Diagnos> {
  const bas: Diagnos = {
    nycklar: !!klient,
    inloggad: !!anvandarId,
    tabeller: "okand",
    antalIMolnet: null,
    markor: anvandarId ? lasMarkor(anvandarId) : NOLLTID,
    meddelande: "",
  };

  if (!klient) {
    return {
      ...bas,
      meddelande:
        "Bygget saknar molnnycklar. Sätt NEXT_PUBLIC_SUPABASE_URL och NEXT_PUBLIC_SUPABASE_ANON_KEY i Netlify och bygg om.",
    };
  }
  if (!anvandarId) {
    return { ...bas, meddelande: "Inte inloggad." };
  }

  try {
    const svar = await klient
      .from(TABELL_HANDELSER)
      .select("id", { count: "exact", head: true });
    if (svar.error) {
      const text = oversattRadfel(svar.error.message);
      return {
        ...bas,
        tabeller: text.includes("saknas") ? "saknas" : "fel",
        meddelande: text,
      };
    }
    return {
      ...bas,
      tabeller: "ok",
      antalIMolnet: svar.count ?? null,
      meddelande: "Molnet svarar och tabellerna finns.",
    };
  } catch (e) {
    return {
      ...bas,
      tabeller: "fel",
      meddelande: oversattRadfel((e as Error).message),
    };
  }
}
