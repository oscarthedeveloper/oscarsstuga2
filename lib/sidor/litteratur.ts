/**
 * Litteraturbiblioteket — rena typer, tolkning och beräkningar.
 *
 * Sidan ligger i `sidor`-tabellens JSONB-fält, så databasen kan inte
 * garantera formen. Allt som kommer in behandlas därför som `unknown` och
 * blir antingen användbart innehåll eller ett ärligt tomt värde.
 */

export type BokKategori =
  | "skonlitteratur"
  | "klassiker"
  | "fakta"
  | "poesi"
  | "dramatik"
  | "ovrigt";

export const KATEGORIER: {
  id: BokKategori;
  namn: string;
  kort: string;
}[] = [
  { id: "skonlitteratur", namn: "Skönlitteratur", kort: "SK" },
  { id: "klassiker", namn: "Klassiker", kort: "KL" },
  { id: "fakta", namn: "Fakta", kort: "FA" },
  { id: "poesi", namn: "Poesi", kort: "PO" },
  { id: "dramatik", namn: "Dramatik", kort: "DR" },
  { id: "ovrigt", namn: "Övrigt", kort: "ÖV" },
];

export type BokStatus = "laser" | "vill-lasa" | "last" | "vill-kopa" | "ager";

export const STATUSAR: { id: BokStatus; namn: string }[] = [
  { id: "laser", namn: "Läser nu" },
  { id: "vill-lasa", namn: "Skall läsa" },
  { id: "last", namn: "Läst" },
  { id: "vill-kopa", namn: "Vill köpa" },
  { id: "ager", namn: "Äger" },
];

export interface Bok {
  id: string;
  titel: string;
  forfattare: string;
  kategori: BokKategori;
  status: BokStatus;
  /** Krympt JPEG som data-URL. */
  omslag: string | null;
  utgiven: string;
  totaltSidor: number | null;
  aktuellSida: number | null;
  avslutad: string | null;
  betyg: number | null;
  anteckning: string;
  skapad: string;
}

export interface Laspass {
  id: string;
  datum: string;
  bokId: string;
  sidor: number | null;
  /** Sidposition före och efter passet, när antal lästa sidor angavs. */
  franSida: number | null;
  tillSida: number | null;
  minuter: number | null;
  anteckning: string;
  skapad: string;
}

export interface LitteraturData {
  version: 1;
  bocker: Bok[];
  laspass: Laspass[];
}

export const TOM_LITTERATUR: LitteraturData = {
  version: 1,
  bocker: [],
  laspass: [],
};

const arObjekt = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);

const text = (x: unknown) => (typeof x === "string" ? x : "");

const dag = (x: unknown): string | null => {
  const s = text(x);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const heltal = (x: unknown, min: number, max: number): number | null => {
  if (x === null || x === undefined || x === "") return null;
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const kategori = (x: unknown): BokKategori =>
  KATEGORIER.some((k) => k.id === x) ? (x as BokKategori) : "skonlitteratur";

const status = (x: unknown): BokStatus =>
  STATUSAR.some((s) => s.id === x) ? (x as BokStatus) : "vill-lasa";

function tolkaBok(x: unknown, index: number): Bok | null {
  if (!arObjekt(x)) return null;
  const totaltSidor = heltal(x.totaltSidor, 1, 100_000);
  const aktuell = heltal(x.aktuellSida, 0, 100_000);
  return {
    id: text(x.id) || `bok-${index}`,
    titel: text(x.titel),
    forfattare: text(x.forfattare),
    kategori: kategori(x.kategori),
    status: status(x.status),
    omslag:
      typeof x.omslag === "string" && x.omslag.startsWith("data:image/")
        ? x.omslag
        : null,
    utgiven: text(x.utgiven),
    totaltSidor,
    aktuellSida:
      aktuell === null
        ? null
        : totaltSidor === null
          ? aktuell
          : Math.min(aktuell, totaltSidor),
    avslutad: dag(x.avslutad),
    betyg: heltal(x.betyg, 1, 5),
    anteckning: text(x.anteckning),
    skapad: text(x.skapad) || "1970-01-01T00:00:00.000Z",
  };
}

function tolkaLaspass(x: unknown, index: number, bokIder: Set<string>): Laspass | null {
  if (!arObjekt(x)) return null;
  const datum = dag(x.datum);
  const bokId = text(x.bokId);
  if (!datum || !bokIder.has(bokId)) return null;
  return {
    id: text(x.id) || `laspass-${index}`,
    datum,
    bokId,
    sidor: heltal(x.sidor, 0, 100_000),
    franSida: heltal(x.franSida, 0, 100_000),
    tillSida: heltal(x.tillSida, 0, 100_000),
    minuter: heltal(x.minuter, 0, 100_000),
    anteckning: text(x.anteckning),
    skapad: text(x.skapad) || "1970-01-01T00:00:00.000Z",
  };
}

export function tolkaLitteraturData(rå: unknown): LitteraturData {
  if (!arObjekt(rå)) return { ...TOM_LITTERATUR, bocker: [], laspass: [] };
  const bocker = Array.isArray(rå.bocker)
    ? rå.bocker.map(tolkaBok).filter((x): x is Bok => !!x)
    : [];
  const bokIder = new Set(bocker.map((b) => b.id));
  const laspass = Array.isArray(rå.laspass)
    ? rå.laspass
        .map((x, i) => tolkaLaspass(x, i, bokIder))
        .filter((x): x is Laspass => !!x)
    : [];
  return { version: 1, bocker, laspass };
}

export function kategoriNamn(id: BokKategori): string {
  return KATEGORIER.find((k) => k.id === id)?.namn ?? "Övrigt";
}

export function statusNamn(id: BokStatus): string {
  return STATUSAR.find((s) => s.id === id)?.namn ?? "Skall läsa";
}

/**
 * Lägger in ett läspass och flyttar samtidigt bokens sidmarkör framåt.
 * Passet minns intervallet så att läsloggen kan visa exempelvis 130 → 150.
 */
export function registreraLaspass(
  data: LitteraturData,
  pass: Laspass
): LitteraturData {
  const bok = data.bocker.find((b) => b.id === pass.bokId);
  if (!bok || pass.sidor === null) {
    return { ...data, laspass: [...data.laspass, pass] };
  }

  const franSida = bok.aktuellSida ?? 0;
  const okapadTill = franSida + pass.sidor;
  const tillSida = bok.totaltSidor === null
    ? okapadTill
    : Math.min(okapadTill, bok.totaltSidor);
  return {
    ...data,
    bocker: data.bocker.map((b) =>
      b.id === bok.id ? { ...b, aktuellSida: tillSida } : b
    ),
    laspass: [...data.laspass, { ...pass, franSida, tillSida }],
  };
}

/**
 * Tar bort ett läspass och backar samma verkliga sidintervall som passet
 * flyttade boken. Vid bokens slut kan det vara mindre än det inmatade
 * sidantalet (190 + 20 blev exempelvis 200, inte 210).
 */
export function taBortLaspass(
  data: LitteraturData,
  id: string
): LitteraturData {
  const pass = data.laspass.find((p) => p.id === id);
  if (!pass) return data;

  const verkligtAntal =
    pass.franSida !== null && pass.tillSida !== null
      ? Math.max(0, pass.tillSida - pass.franSida)
      : (pass.sidor ?? 0);

  return {
    ...data,
    bocker: data.bocker.map((bok) =>
      bok.id === pass.bokId && bok.aktuellSida !== null
        ? { ...bok, aktuellSida: Math.max(0, bok.aktuellSida - verkligtAntal) }
        : bok
    ),
    laspass: data.laspass.filter((p) => p.id !== id),
  };
}

/** Stabil färg på standardomslaget, härledd ur titeln och kategorin. */
export function omslagston(bok: Pick<Bok, "titel" | "kategori">): number {
  let summa = KATEGORIER.findIndex((k) => k.id === bok.kategori) + 1;
  for (let i = 0; i < bok.titel.length; i++) summa += bok.titel.charCodeAt(i);
  return ((summa % 6) + 6) % 6;
}

export function framsteg(bok: Bok): number | null {
  if (bok.totaltSidor === null || bok.aktuellSida === null) return null;
  return Math.min(1, Math.max(0, bok.aktuellSida / bok.totaltSidor));
}

export function summeraLasning(pass: Laspass[]): { sidor: number; minuter: number } {
  return pass.reduce(
    (summa, p) => ({
      sidor: summa.sidor + (p.sidor ?? 0),
      minuter: summa.minuter + (p.minuter ?? 0),
    }),
    { sidor: 0, minuter: 0 }
  );
}

export function lasningPaDag(pass: Laspass[], datum: string): Laspass[] {
  return pass
    .filter((p) => p.datum === datum)
    .sort((a, b) => a.skapad.localeCompare(b.skapad));
}

export function sorteraLaspass(pass: Laspass[]): Laspass[] {
  return [...pass].sort(
    (a, b) => b.datum.localeCompare(a.datum) || b.skapad.localeCompare(a.skapad)
  );
}

export function filtreraBocker(
  bocker: Bok[],
  sok: string,
  statusfilter: BokStatus | "alla" = "alla"
): Bok[] {
  const q = sok.trim().toLocaleLowerCase("sv");
  return bocker.filter((b) => {
    if (statusfilter !== "alla" && b.status !== statusfilter) return false;
    if (!q) return true;
    return [b.titel, b.forfattare, b.utgiven, b.anteckning]
      .join(" ")
      .toLocaleLowerCase("sv")
      .includes(q);
  });
}
