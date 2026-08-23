"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABELL_SIDOR = exports.TABELL_ANTECKNINGAR = exports.TABELL_UPPGIFTER = exports.TABELL_KALENDRAR = exports.TABELL_HANDELSER = exports.BYGGE = exports.SUPABASE_VARD = exports.MOLNET_FINNS = void 0;
exports.hamtaKlient = hamtaKlient;
const supabase_js_1 = require("@supabase/supabase-js");
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NYCKEL = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/** Sant om bygget har fått nycklar. Avgör om molnfunktionerna visas alls. */
exports.MOLNET_FINNS = Boolean(URL && NYCKEL);
/**
 * Värdnamnet, för diagnosen. Att se vilket projekt appen faktiskt pratar
 * med är ofta hela svaret: nycklarna kan mycket väl peka på ett annat
 * Supabase-projekt än det man tittar i.
 */
exports.SUPABASE_VARD = (() => {
    if (!URL)
        return null;
    try {
        return new globalThis.URL(URL).host;
    }
    catch {
        return URL;
    }
})();
/** När och från vilken commit det här bygget kom. Se next.config.mjs. */
exports.BYGGE = {
    tid: process.env.NEXT_PUBLIC_BYGGTID ?? "okänt",
    commit: process.env.NEXT_PUBLIC_BYGGCOMMIT ?? "okänt",
};
let klient = null;
function hamtaKlient() {
    if (!exports.MOLNET_FINNS)
        return null;
    if (typeof window === "undefined")
        return null;
    if (!klient) {
        klient = (0, supabase_js_1.createClient)(URL, NYCKEL, {
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
exports.TABELL_HANDELSER = "handelser";
exports.TABELL_KALENDRAR = "kalendrar";
exports.TABELL_UPPGIFTER = "uppgifter";
exports.TABELL_ANTECKNINGAR = "anteckningar";
exports.TABELL_SIDOR = "sidor";
