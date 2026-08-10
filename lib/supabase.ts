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
