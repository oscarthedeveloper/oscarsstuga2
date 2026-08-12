/*
 * ===================================================================
 * KONTROLL AV MOLNNYCKLARNA — körs vid varje bygge
 *
 * Utan den här kontrollen bygger Next tyst en app helt utan molnnycklar.
 * Resultatet ser fullt fungerande ut: kalendern startar, händelser kan
 * skapas, ingenting kraschar. Det enda som saknas är synken, och den
 * saknas ljudlöst. Det är den värsta sortens fel.
 *
 * Nu skriver bygget i stället ut svaret i klartext i loggen. På Netlify
 * står det under Deploys → det aktuella bygget, och gissningarna om
 * huruvida variablerna nådde fram tar slut där.
 * ===================================================================
 */
function kontrolleraNycklar() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const nyckel = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const linje = "─".repeat(66);

  if (url && nyckel) {
    let vard = url;
    try {
      vard = new URL(url).host;
    } catch {
      console.log(`\n${linje}\n  VARNING: NEXT_PUBLIC_SUPABASE_URL ser inte ut som en adress:\n  ${url}\n${linje}\n`);
    }
    console.log(
      `\n${linje}\n` +
        `  MOLNET: inkopplat\n` +
        `  Projekt : ${vard}\n` +
        `  Nyckel  : ${nyckel.slice(0, 12)}… (${nyckel.length} tecken)\n` +
        `${linje}\n`
    );
    return;
  }

  // Namnen på de publika variabler som FAKTISKT finns med i bygget.
  // Bara namnen — värdena är inte vår sak att skriva ut, och en stavfelad
  // variabel syns ändå direkt i listan.
  const publika = Object.keys(process.env)
    .filter((k) => k.startsWith("NEXT_PUBLIC_"))
    .sort();

  console.log(
    `\n${linje}\n` +
      `  MOLNET: INTE INKOPPLAT — appen byggs utan synk\n\n` +
      `  Saknas: ${[
        !url && "NEXT_PUBLIC_SUPABASE_URL",
        !nyckel && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]
        .filter(Boolean)
        .join(", ")}\n\n` +
      `  NEXT_PUBLIC_-variabler som bygget ser:\n` +
      (publika.length
        ? publika.map((k) => `    · ${k}`).join("\n")
        : "    (inga alls)") +
      `\n\n` +
      `  Lokalt : värdena skall stå i .env.local — INTE i\n` +
      `           .env.local.example, som bara är en mall.\n` +
      `  Netlify: Site configuration → Environment variables.\n` +
      `           Kontrollera att scope omfattar Builds och att\n` +
      `           kontexten är Production.\n` +
      `${linje}\n`
  );
}

kontrolleraNycklar();

/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * Statisk export: bygget blir en mapp med HTML, JS och CSS och
   * ingenting annat. Appen är helt klientburen — all logik, allt lagrande
   * och all synk sker i webbläsaren — så det finns ingen serverdel att
   * sakna. Vinsten är påtaglig: inga kallstarter, inga funktioner som kan
   * fallera, och en service worker kan cacha varje fil appen behöver.
   */
  output: "export",

  /*
   * Slutstreck i adresserna. Netlify serverar då /om/ som /om/index.html
   * utan omskrivningar, och service workern får förutsägbara nycklar att
   * cacha under.
   */
  trailingSlash: true,

  images: {
    // Bildoptimeringen kräver en server. Appen har inga bilder utöver
    // ikonerna, så det kostar ingenting att stänga av den.
    unoptimized: true,
  },

  reactStrictMode: true,

  /*
   * Byggstämpel.
   *
   * "Är jag ens på den nya deployen?" är den första frågan när något inte
   * ser ut som väntat, och den går annars inte att svara på från
   * webbläsaren. COMMIT_REF sätts av Netlify; lokalt blir det "lokalt".
   */
  env: {
    NEXT_PUBLIC_BYGGTID: new Date().toISOString(),
    NEXT_PUBLIC_BYGGCOMMIT: (
      process.env.COMMIT_REF ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      "lokalt"
    ).slice(0, 7),
  },
};

export default nextConfig;
