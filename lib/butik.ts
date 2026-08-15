/**
 * Datalagret.
 *
 * Butiken är avsiktligt ett tunt lager mellan React och lagringen. All
 * läsning och skrivning går genom `Lager`-gränssnittet, så att
 * localStorage kan bytas mot Supabase utan att en enda komponent ändras:
 * det enda som behöver skrivas är en ny klass med samma fyra metoder.
 *
 * Ångra/gör om hanteras här och inte i komponenterna, eftersom en ändring
 * kan röra flera händelser samtidigt (t.ex. när en serie kapas i två).
 */

import type {
  Anteckning,
  Handelse,
  Kalender,
  Prioritet,
  Synkbar,
  Uppgift,
} from "./typer";
import { STANDARD_UPPREPNING } from "./upprepning";
import { stampel } from "./tid";

export interface Ogonblick {
  handelser: Handelse[];
  kalendrar: Kalender[];
  uppgifter: Uppgift[];
  anteckningar: Anteckning[];
}

export interface Lager {
  las(): Ogonblick | null;
  skriv(o: Ogonblick): void;
}

/**
 * Versionen i nyckeln bumpas när lagrets innehåll inte längre går att
 * lita på. v1 innehöll exempeldata som såddes automatiskt; v2 startar
 * tom; v3 bär tidsstämplar och gravstenar för synkningen.
 *
 * Anteckningarna bumpade den INTE, och det är ett medvetet val. Ett nytt
 * fält som saknas i äldre lager är inte ett trasigt lager utan ett äldre,
 * och det läses som en tom lista precis som uppgifterna gjorde när de
 * tillkom. Hade nyckeln bumpats till v4 skulle varje befintlig enhet ha
 * öppnat appen och funnit den tom.
 */
const LAGRINGSNYCKEL = "kalendariet.v3";

/** Hur länge en gravsten sparas innan den städas bort. */
const GRAVSTEN_DYGN = 90;

/**
 * Antalet tillgängliga toner. Fler kalendrar än så får dela på dem.
 *
 * Deklarationen måste ligga FÖRE STANDARDKALENDRAR. En konstant som läses
 * innan den tilldelats blir undefined när modulen körs som CommonJS, och
 * klamTon räknade då fram NaN för varje standardkalender — vilket gav
 * färglösa block utan att något kastade fel.
 */
export const ANTAL_TONER = 6;

export function klamTon(ton: number): number {
  return ((Math.round(ton) % ANTAL_TONER) + ANTAL_TONER) % ANTAL_TONER;
}

/** Nu, som ISO-sträng i UTC. Alla synkstämplar är UTC — aldrig lokala. */
export function nu(): string {
  return new Date().toISOString();
}

/** Standardlagret: webbläsarens localStorage. */
export class LokaltLager implements Lager {
  las(): Ogonblick | null {
    if (typeof window === "undefined") return null;
    try {
      const rå = window.localStorage.getItem(LAGRINGSNYCKEL);
      if (!rå) return null;
      const data = JSON.parse(rå) as Ogonblick;
      if (!Array.isArray(data.handelser) || !Array.isArray(data.kalendrar)) {
        return null;
      }
      // Migrering: fyll i fält som saknas i äldre poster hellre än att
      // kasta hela lagret. `uppgifter` tillkom efter att appen redan
      // haft riktiga användare — ett lager utan dem är inte trasigt,
      // bara äldre, och skall läsas som en tom lista.
      return stadaGravstenar({
        handelser: data.handelser.map(normalisera),
        kalendrar: data.kalendrar.map(normaliseraKalender),
        uppgifter: (data.uppgifter ?? []).map(normaliseraUppgift),
        anteckningar: (data.anteckningar ?? []).map(normaliseraAnteckning),
      });
    } catch {
      return null;
    }
  }

  skriv(o: Ogonblick) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAGRINGSNYCKEL, JSON.stringify(o));
    } catch {
      // Kvoten full eller privat läge — appen fortsätter i minnet.
    }
  }
}

/** Lager som inte sparar något. Används vid serverrendering och i test. */
export class TomtLager implements Lager {
  private data: Ogonblick | null = null;
  las() {
    return this.data;
  }
  skriv(o: Ogonblick) {
    this.data = o;
  }
}

/**
 * Gravstenar får inte ligga kvar för evigt. Efter en kvartal har varje
 * enhet rimligen hunnit se borttagningen, och posten kan tas bort på
 * riktigt. En synkad gravsten som städas bort kan inte återuppstå,
 * eftersom molnet också städat sin.
 */
export function stadaGravstenar(o: Ogonblick, idag = new Date()): Ogonblick {
  const grans = new Date(
    idag.getTime() - GRAVSTEN_DYGN * 86400000
  ).toISOString();
  const lever = <T extends Synkbar>(x: T) =>
    !x.raderad || x.raderad > grans || !x.synkad;
  return {
    handelser: o.handelser.filter(lever),
    kalendrar: o.kalendrar.filter(lever),
    uppgifter: o.uppgifter.filter(lever),
    anteckningar: o.anteckningar.filter(lever),
  };
}

export function normalisera(h: Partial<Handelse>): Handelse {
  return {
    id: h.id ?? nyId(),
    titel: h.titel ?? "Utan titel",
    anteckning: h.anteckning ?? "",
    plats: h.plats ?? "",
    start: h.start ?? stampel(new Date()),
    slut: h.slut ?? stampel(new Date()),
    heldag: !!h.heldag,
    kalenderId: h.kalenderId ?? "arbete",
    upprepning: h.upprepning
      ? { ...STANDARD_UPPREPNING, ...h.upprepning }
      : null,
    undantag: h.undantag ?? [],
    avvikelser: h.avvikelser ?? {},
    skapad: h.skapad ?? nu(),
    andrad: h.andrad ?? h.skapad ?? nu(),
    raderad: h.raderad ?? null,
    synkad: h.synkad ?? false,
  };
}

export function normaliseraKalender(k: Partial<Kalender>): Kalender {
  return {
    id: k.id ?? nyId(),
    namn: k.namn ?? "Namnlös",
    ton: klamTon(k.ton ?? 0),
    synlig: k.synlig !== false,
    andrad: k.andrad ?? nu(),
    raderad: k.raderad ?? null,
    synkad: k.synkad ?? false,
  };
}

export function normaliseraUppgift(u: Partial<Uppgift>): Uppgift {
  const p = Math.round(Number(u.prioritet ?? 2));
  return {
    id: u.id ?? nyId(),
    titel: u.titel ?? "",
    anteckning: u.anteckning ?? "",
    // Utanför skalan är alltid ett fel i indata, inte en avsikt. Mitten
    // är det minst dramatiska svaret.
    prioritet: (p === 1 || p === 2 || p === 3 ? p : 2) as Prioritet,
    kalenderId: u.kalenderId ?? "arbete",
    klar: !!u.klar,
    klarVid: u.klarVid ?? null,
    forfaller: u.forfaller || null,
    skapad: u.skapad ?? nu(),
    andrad: u.andrad ?? u.skapad ?? nu(),
    raderad: u.raderad ?? null,
    synkad: u.synkad ?? false,
  };
}

export function normaliseraAnteckning(a: Partial<Anteckning>): Anteckning {
  return {
    id: a.id ?? nyId(),
    titel: a.titel ?? "",
    brodtext: a.brodtext ?? "",
    kalenderId: a.kalenderId ?? "arbete",
    // Tom sträng och null betyder samma sak — ingen dag — och måste
    // lagras likadant, annars ser två identiska anteckningar olika ut
    // för synkningen och skickas fram och tillbaka i all evighet.
    datum: a.datum || null,
    nalad: !!a.nalad,
    skapad: a.skapad ?? nu(),
    andrad: a.andrad ?? a.skapad ?? nu(),
    raderad: a.raderad ?? null,
    synkad: a.synkad ?? false,
  };
}

/**
 * Stämplar en post som ändrad just nu och osynkad. Varje väg som ändrar
 * innehåll går igenom den här funktionen — glöms den bort blir posten
 * kvar på enheten och når aldrig molnet.
 */
export function rord<T extends Synkbar>(x: T, tidpunkt = nu()): T {
  return { ...x, andrad: tidpunkt, synkad: false };
}

/** Markerar en post som borttagen utan att kasta den. */
export function gravsatt<T extends Synkbar>(x: T, tidpunkt = nu()): T {
  return { ...x, raderad: tidpunkt, andrad: tidpunkt, synkad: false };
}

export function nyId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Poster som lever, dvs. inte är gravsatta. */
export function levande<T extends Synkbar>(lista: T[]): T[] {
  return lista.filter((x) => !x.raderad);
}

export const STANDARDKALENDRAR: Kalender[] = [
  { id: "arbete", namn: "Arbete", ton: 3 },
  { id: "privat", namn: "Privat", ton: 1 },
  { id: "studier", namn: "Studier", ton: 0 },
  { id: "traning", namn: "Träning", ton: 4 },
  { id: "resor", namn: "Resor", ton: 2 },
  { id: "annat", namn: "Annat", ton: 5 },
].map((k) =>
  normaliseraKalender({
    ...k,
    synlig: true,
    // Fast stämpel: standardkalendrarna skapas identiskt på varje enhet,
    // och skall därför inte se ut som en ändring bara för att appen
    // öppnats på en ny telefon. Molnets kopia vinner alltid över dem.
    andrad: "1970-01-01T00:00:00.000Z",
  })
);

/* ==================================================================
   KALENDEROPERATIONER
   Rena funktioner: in ett ögonblick, ut ett nytt. De ligger här och
   inte i React-lagret dels för att kunna provköras utan renderare,
   dels för att en kalenderborttagning rör både kalendrar och händelser
   och därför måste ske i ett enda odelbart steg.
   ================================================================== */

export function laggTillKalender(
  o: Ogonblick,
  namn: string,
  ton: number,
  id = nyId()
): Ogonblick {
  const kalender = normaliseraKalender({
    id,
    namn: namn.trim() || "Namnlös",
    ton: klamTon(ton),
    synlig: true,
  });
  return { ...o, kalendrar: [...o.kalendrar, kalender] };
}

export function andraKalender(
  o: Ogonblick,
  id: string,
  delar: Partial<Omit<Kalender, "id">>
): Ogonblick {
  return {
    ...o,
    kalendrar: o.kalendrar.map((k) =>
      k.id === id
        ? rord({
            ...k,
            ...delar,
            // Ett tomt namn är alltid ett misstag; behåll det gamla.
            namn: delar.namn !== undefined ? delar.namn.trim() || k.namn : k.namn,
            ton: delar.ton !== undefined ? klamTon(delar.ton) : k.ton,
          })
        : k
    ),
  };
}

/**
 * Tar bort en kalender. Händelserna i den måste ta vägen någonstans:
 * `flyttaTill` pekar ut en annan kalender, eller null för att radera dem
 * med. Att lämna dem kvar utan kalender vore värst av allt — de skulle
 * bli osynliga men fortsätta ligga i lagret.
 *
 * Den sista LEVANDE kalendern går inte att ta bort; då finns ingenstans
 * att lägga nya händelser. Anropet blir då en tom operation.
 *
 * Borttagning sker med gravsten, inte genom att posten kastas: en post
 * som bara försvinner ur listan skulle återuppstå vid nästa synk från en
 * enhet som ännu inte hört talas om borttagningen.
 */
export function taBortKalender(
  o: Ogonblick,
  id: string,
  flyttaTill: string | null
): Ogonblick {
  const levandeKal = levande(o.kalendrar);
  if (levandeKal.length <= 1) return o;
  const mål = levandeKal.find((k) => k.id === id);
  if (!mål) return o;

  const tidpunkt = nu();
  const kvar = levandeKal.filter((k) => k.id !== id);
  const flyttmal =
    flyttaTill && flyttaTill !== id && kvar.some((k) => k.id === flyttaTill)
      ? flyttaTill
      : null;

  // Uppgifter och anteckningar delar kalender med händelserna och måste
  // följa med samma väg. Glöms de bort blir de osynliga men ligger kvar
  // i lagret.
  const flyttaEller = <T extends Synkbar & { kalenderId: string }>(x: T): T => {
    if (x.kalenderId !== id || x.raderad) return x;
    return flyttmal
      ? rord({ ...x, kalenderId: flyttmal }, tidpunkt)
      : gravsatt(x, tidpunkt);
  };

  return {
    kalendrar: o.kalendrar.map((k) =>
      k.id === id ? gravsatt(k, tidpunkt) : k
    ),
    handelser: o.handelser.map(flyttaEller),
    uppgifter: o.uppgifter.map(flyttaEller),
    anteckningar: o.anteckningar.map(flyttaEller),
  };
}

/* ==================================================================
   UPPGIFTER
   ================================================================== */

/**
 * Ordningen på att göra-listan.
 *
 * Klara sist — de är kvitton, inte arbete. Sedan starkast styrka först,
 * och inom samma styrka det som förfaller snarast. Uppgifter utan datum
 * hamnar efter dem som har ett: ett satt datum är ett löfte, och löften
 * går före önskemål. Sist skapelseordning, så att listan aldrig hoppar
 * omkring mellan två renderingar.
 */
export function sorteraUppgifter(lista: Uppgift[]): Uppgift[] {
  return [...lista].sort((a, b) => {
    if (a.klar !== b.klar) return a.klar ? 1 : -1;
    if (a.klar && b.klar) {
      // Senast avklarad överst bland de klara.
      return (b.klarVid ?? "").localeCompare(a.klarVid ?? "");
    }
    if (a.prioritet !== b.prioritet) return a.prioritet - b.prioritet;
    if (a.forfaller !== b.forfaller) {
      if (!a.forfaller) return 1;
      if (!b.forfaller) return -1;
      return a.forfaller.localeCompare(b.forfaller);
    }
    return a.skapad.localeCompare(b.skapad);
  });
}

/** Sätter eller river av bocken, med tidsstämpel för sorteringen. */
export function vaxlaKlar(u: Uppgift, tidpunkt = nu()): Uppgift {
  return rord(
    { ...u, klar: !u.klar, klarVid: u.klar ? null : tidpunkt },
    tidpunkt
  );
}

/* ==================================================================
   ANTECKNINGAR
   ================================================================== */

/**
 * Ordningen i anteckningslistan.
 *
 * Nålade först — det är hela poängen med att nåla. Sedan senast ändrad,
 * inte senast skapad: den anteckning man höll på med är den man med
 * största sannolikhet vill tillbaka till, och en lista sorterad på
 * skapelsedatum begraver den under allt man skrivit sedan dess.
 */
export function sorteraAnteckningar(lista: Anteckning[]): Anteckning[] {
  return [...lista].sort((a, b) => {
    if (a.nalad !== b.nalad) return a.nalad ? -1 : 1;
    if (a.andrad !== b.andrad) return b.andrad.localeCompare(a.andrad);
    return a.id.localeCompare(b.id);
  });
}
