/**
 * Service worker — det som gör att appen startar utan nät.
 *
 * Strategin är olika för olika sorters förfrågningar, och skillnaden är
 * hela poängen:
 *
 *   Sidnavigering   → cache först, nät i bakgrunden.
 *                     Appen måste öppnas ögonblickligen i tunnelbanan.
 *                     Ett svar från igår är oändligt mycket bättre än en
 *                     felsida.
 *   Byggda filer    → cache först, för alltid.
 *                     Next ger varje bunt ett innehållshash i namnet, så
 *                     en fil med ett visst namn kan aldrig ändras.
 *   Typsnitt/bilder → cache först, uppdatera i bakgrunden.
 *   Supabase        → ALDRIG cache.
 *                     Ett cachat svar från databasen vore en lögn om vad
 *                     som står i molnet, och synkmotorn skulle fatta
 *                     beslut på gammal data. Misslyckas anropet får det
 *                     misslyckas; ändringarna ligger kvar lokalt.
 *
 * Skrivningar (POST/PATCH) rörs aldrig heller — synkmotorn har redan en
 * kö i localStorage och behöver ingen andra kö här.
 */

const VERSION = "kalendariet-v1";
const SKAL = `${VERSION}-skal`;
const RESURSER = `${VERSION}-resurser`;

/** Det minsta som måste finnas för att appen skall kunna rita något. */
const GRUNDSKAL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(SKAL);
      // addAll faller på första 404. Filerna hämtas var för sig så att en
      // saknad ikon inte hindrar hela installationen.
      await Promise.all(
        GRUNDSKAL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const namn = await caches.keys();
      await Promise.all(
        namn
          .filter((n) => !n.startsWith(VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "hoppa-over-vantan") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Allt som inte ligger på vår egen domän lämnas till nätet. Det gäller
  // i synnerhet Supabase: ett cachat databassvar vore aktivt skadligt.
  if (url.origin !== self.location.origin) return;

  /*
   * Sidnavigering: NÄTET FÖRST, med kort tålamod och cachen som fallskärm.
   *
   * Det frestande valet är cache först — appen öppnas ögonblickligen och
   * det nya hämtas i bakgrunden. Men då visar varje besök föregående
   * versions HTML, som i sin tur pekar ut föregående versions buntar, och
   * de ligger redan cachade som oföränderliga. Följden är att en ny deploy
   * inte syns förrän andra gången appen öppnas, utan att något säger till.
   * Det är en usel egenskap hos en app som deployas ofta.
   *
   * Två och en halv sekund är avvägningen: så länge väntar vi på nätet
   * innan vi ger upp och tar det vi har. På ett fungerande nät märks det
   * inte; utan nät är fallskärmen omedelbar, eftersom fetch då avslutas
   * direkt i stället för att räkna ned.
   */
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        const cache = await caches.open(SKAL);
        const franCache = async () =>
          (await cache.match(req)) ??
          (await cache.match("/index.html")) ??
          (await cache.match("/"));

        try {
          const svar = await Promise.race([
            fetch(req),
            new Promise((_, avvisa) =>
              setTimeout(() => avvisa(new Error("tidsgräns")), 2500)
            ),
          ]);
          if (svar && svar.ok) {
            cache.put("/index.html", svar.clone());
            return svar;
          }
          return (await franCache()) ?? svar;
        } catch {
          return (await franCache()) ?? Response.error();
        }
      })()
    );
    return;
  }

  const cachebar =
    url.pathname.startsWith("/_next/") ||
    /\.(?:js|css|woff2?|png|svg|ico|webmanifest|json)$/.test(url.pathname);
  if (!cachebar) return;

  e.respondWith(
    (async () => {
      const cache = await caches.open(RESURSER);
      const traff = await cache.match(req);
      if (traff) {
        // Hashade buntar ändras aldrig; övrigt uppdateras i bakgrunden.
        if (!url.pathname.startsWith("/_next/static/")) {
          fetch(req)
            .then((svar) => {
              if (svar.ok) cache.put(req, svar.clone());
            })
            .catch(() => {});
        }
        return traff;
      }
      try {
        const svar = await fetch(req);
        if (svar.ok) cache.put(req, svar.clone());
        return svar;
      } catch (fel) {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })()
  );
});
