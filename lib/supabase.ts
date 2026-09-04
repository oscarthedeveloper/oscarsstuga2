/**
 * Supabase-klienten.
 *
 * Appen är byggd för att fungera helt utan Supabase. Saknas nycklarna
 * returnerar `hamtaKlient()` null och allt fortsätter lokalt — inga fel,
 * ingen inloggningsruta, ingen skillnad mot hur appen betedde sig innan
 * molnet fanns. Det är avsiktligt: en kalender som slutar fungera för att
 * en miljövariabel saknas är värdelös.
 *
 * Nycklarna är publika (anon-nyckeln är avsedd att ligga i klienten).
 * Det som skyddar innehållet är radnivåsäkerheten i databasen, där varje
 * rad är knuten till `auth.uid()`. Se supabase/schema.sql.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NYCKEL = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sant om bygget har fått nycklar. Avgör om molnfunktionerna visas alls. */
export const MOLNET_FINNS = Boolean(URL && NYCKEL);

/**
 * Värdnamnet, för diagnosen. Att se vilket projekt appen faktiskt pratar
 * med är ofta hela svaret: nycklarna kan mycket väl peka på ett annat
 * Supabase-projekt än det man tittar i.
 */
export const SUPABASE_VARD = (() => {
  if (!URL) return null;
  try {
    return new globalThis.URL(URL).host;
  } catch {
    return URL;
  }
})();

/** När och från vilken commit det här bygget kom. Se next.config.mjs. */
export const BYGGE = {
  tid: process.env.NEXT_PUBLIC_BYGGTID ?? "okänt",
  commit: process.env.NEXT_PUBLIC_BYGGCOMMIT ?? "okänt",
};

let klient: SupabaseClient | null = null;

export function hamtaKlient(): SupabaseClient | null {
  if (!MOLNET_FINNS) return null;
  if (typeof window === "undefined") return null;
  if (!klient) {
    klient = createClient(URL!, NYCKEL!, {
      auth: {
        // Sessionen sparas i localStorage och förnyas av sig själv, så
        // appen förblir inloggad mellan besök och över omstarter — även
        // när enheten startar utan nät.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "kalendariet.session",
      },
    });
  }
  return klient;
}

export const TABELL_HANDELSER = "handelser";
export const TABELL_KALENDRAR = "kalendrar";
export const TABELL_UPPGIFTER = "uppgifter";
export const TABELL_ANTECKNINGAR = "anteckningar";
export const TABELL_SIDOR = "sidor";
export const TABELL_LAPPAR = "lappar";
export const TABELL_GJORT = "gjort";

/**
 * Varje tabell som bär innehåll, i en enda uppräkning.
 *
 * Finns för att det skall gå att glömma en sort på ETT ställe i stället
 * för på fem. Synken, realtidsprenumerationen och diagnosen räknade
 * tidigare upp tabellerna var för sig, och `lappar` och `gjort` hamnade
 * med i den första men inte i de andra: raderna gick upp i molnet men
 * kom aldrig ner till den andra enheten av sig själva, och diagnosen
 * intygade samtidigt att allt stod rätt till.
 */
export const TABELLER = [
  TABELL_HANDELSER,
  TABELL_KALENDRAR,
  TABELL_UPPGIFTER,
  TABELL_ANTECKNINGAR,
  TABELL_SIDOR,
  TABELL_LAPPAR,
  TABELL_GJORT,
] as const;

/**
 * De tabeller vars ändringar knackar på i realtid.
 *
 * Samma lista. Den ligger under eget namn för att en tabell en dag kan
 * behöva undantas — inte för att listorna får skilja sig åt av misstag.
 */
export const TABELLER_I_REALTID: readonly string[] = TABELLER;
