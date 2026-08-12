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
