/**
 * Mina viner — samling och smakminne.
 *
 * Sidan är två saker på en gång, och det är med flit. Den är ett
 * LAGER — vad som står i källaren just nu — och ett MINNE av vad
 * vinerna smakade. Att skilja dem åt hade betytt två register där
 * samma flaska skrevs in två gånger, och den dag man drack upp den
 * hade minnet av vinet försvunnit tillsammans med flaskan.
 *
 * Läget bär därför hela flödet: VILL PROVA → I KÄLLAREN → DRUCKEN. Ett
 * drucket vin lämnar aldrig registret; det slutar bara räknas som en
 * flaska man äger.
 *
 * Uppgifterna FYLLS I FÖR HAND, också de som står på Vivino. Sidan
 * hämtar ingenting, och det är ett val: en sida som skrapar en annan
 * sida går sönder tyst den dag den andra sidan ritas om, och man
 * upptäcker det först när ett vin man litade på visar fel siffror.
 * Länken sparas i stället, så att källan alltid går att gå tillbaka
 * till — och ett vin som inte GÅR att slå upp får säga det rent ut i
 * stället för att se ut att vänta på en inmatning som aldrig kommer.
 */

/* ==================================================================
   LÄGEN

   Ordningen är ett flöde och inte en uppräkning. Den bär två saker:
   lägesmätarens fyllnad, och vad "nästa läge" betyder när man trycker.
   ================================================================== */

export type Lage = "vill" | "har" | "drucken";

export const LAGEN: { id: Lage; namn: string; kort: string }[] = [
  { id: "vill", namn: "Vill prova", kort: "VILL" },
  { id: "har", namn: "I källaren", kort: "HAR" },
  { id: "drucken", namn: "Drucken", kort: "DRU" },
];

export const lagesIndex = (l: Lage): number =>
  Math.max(0, LAGEN.findIndex((x) => x.id === l));

/** Nästa läge i flödet. Från sista går det runt till första. */
export function nastaLage(l: Lage): Lage {
  return LAGEN[(lagesIndex(l) + 1) % LAGEN.length].id;
}

/* ==================================================================
   VINETS SLAG

   Färgen är BUNDEN till slaget och väljs aldrig för hand. Ett rött vin
   som är terrakotta i fördelningsstapeln måste vara terrakotta i
   smakkartan och i punktdiagrammet också — annars måste ögat lära om
   färgerna för varje diagram, och då bär de ingen information alls.
   ================================================================== */

export type Typ =
  | "rott"
  | "vitt"
  | "rose"
  | "mousserande"
  | "sott"
  | "starkvin";

export const TYPER: { id: Typ; namn: string; ton: number }[] = [
  { id: "rott", namn: "Rött", ton: 2 },
  { id: "vitt", namn: "Vitt", ton: 0 },
  { id: "rose", namn: "Rosé", ton: 5 },
  { id: "mousserande", namn: "Mousserande", ton: 1 },
  { id: "sott", namn: "Sött", ton: 4 },
  { id: "starkvin", namn: "Starkvin", ton: 3 },
];

export function typNamn(t: Typ): string {
  return TYPER.find((x) => x.id === t)?.namn ?? "Rött";
}

export function typTon(t: Typ): number {
  return TYPER.find((x) => x.id === t)?.ton ?? 2;
}

/* ==================================================================
   SMAKSKALORNA

   De fyra axlarna Vivino visar. Var och en går från ett ord till ett
   annat, aldrig från "lågt" till "högt": ingen skala här har en bra
   och en dålig ände, och en axel märkt 0–100 hade fått det att se ut
   som ett betyg.
   ================================================================== */

export type SkalId = "fyllighet" | "stravhet" | "sotma" | "syra";

export const SKALOR: { id: SkalId; vanster: string; hoger: string }[] = [
  { id: "fyllighet", vanster: "Lätt", hoger: "Fyllig" },
  { id: "stravhet", vanster: "Len", hoger: "Sträv" },
  { id: "sotma", vanster: "Torr", hoger: "Söt" },
  { id: "syra", vanster: "Mjuk", hoger: "Syrlig" },
];

export function skala(id: SkalId): { vanster: string; hoger: string } {
  const s = SKALOR.find((x) => x.id === id);
  return s ? { vanster: s.vanster, hoger: s.hoger } : { vanster: "", hoger: "" };
}

/**
 * Var på skalan vinet ligger, 0–100. Null betyder ofylld.
 *
 * Vivino ritar ett BAND och inte en punkt. Här lagras ändå en punkt,
 * och bandet ritas runt den: bredden på ett band man skattat för hand
 * ur en skärmbild vore påhittad precision, och ett tal som ser noggrant
 * ut men inte är det är sämre än ett tal som ser ungefärligt ut.
 */
export type Smakprofil = Record<SkalId, number | null>;

export const TOM_PROFIL: Smakprofil = {
  fyllighet: null,
  stravhet: null,
  sotma: null,
  syra: null,
};

/** Sant om minst en av de fyra skalorna är ifylld. */
export function harProfil(p: Smakprofil): boolean {
  return SKALOR.some((s) => p[s.id] !== null);
}

/* ==================================================================
   SMAKNOTERNA

   Vivinos kort: en grupp ("fatad") och orden som hör till den
   ("Vanilj, ek, tobak"), plus hur många recensioner som nämnt gruppen.
   ================================================================== */

export interface Smaknot {
  id: string;
  /** Orden så som de står: "Vanilj, ek, tobak". */
  ord: string;
  /** Gruppen de hör till: "fatad", "svart frukt", "röd frukt". */
  grupp: string;
  /** Antal recensioner som nämner gruppen. Null när det inte står. */
  antal: number | null;
}

/**
 * Färgen en smakgrupp får.
 *
 * Sex färger och betydligt fler grupper — krockar är oundvikliga, och
 * det gör inget: det är ORDET som bär betydelsen, färgen bara ordnar
 * kortet i raden. En okänd grupp får därför blyerts och ingen gissad
 * färg. En färg som betyder ingenting är värre än ingen färg.
 */
const GRUPPTON: Record<string, number> = {
  fatad: 0,
  ek: 0,
  citrus: 0,
  tropisk: 0,
  nötaktig: 0,
  mousserande: 1,
  mikrobiologisk: 1,
  jäst: 1,
  "röd frukt": 2,
  kryddig: 2,
  "torkad frukt": 2,
  jordig: 3,
  mineral: 3,
  trä: 3,
  vegetal: 4,
  örtig: 4,
  gräsig: 4,
  "svart frukt": 5,
  blommig: 5,
  bär: 5,
};

export function gruppTon(grupp: string): number {
  return GRUPPTON[grupp.trim().toLowerCase()] ?? 3;
}

/* ==================================================================
   DATAMODELLEN
   ================================================================== */

export interface Vin {
  id: string;
  /**
   * Kort stabil nyckel, "VIN-014".
   *
   * Finns för att kunna hänvisa till en flaska utanför appen — i en
   * inköpslista, i ett meddelande. Namnet är för långt och ändrar sig
   * när man rättar en stavning; koden sätts en gång och rörs aldrig.
   */
  kod: string;
  namn: string;
  producent: string;
  /** Fri text: "2019", "N.V.", "2018/19". Årgång är inte alltid ett tal. */
  argang: string;
  land: string;
  region: string;
  /** Vivinos vinstil, t.ex. "Spanien Röda". */
  vinstil: string;
  typ: Typ;
  druvor: string[];
  /** Alkoholvolym i procent. */
  alkohol: number | null;

  lage: Lage;
  /** Flaskor i källaren. Bara meningsfullt i läget I källaren. */
  antal: number | null;
  /** Datumnyckel YYYY-MM-DD. Bara meningsfullt i läget Drucken. */
  druckenDatum: string;

  /** Kronor per flaska. */
  pris: number | null;
  inkopsstalle: string;
  /** Systembolagets artikelnummer. Fri text — det är inte alltid rena siffror. */
  artikelnummer: string;

  vivinoUrl: string;
  systembolagetUrl: string;
  /** Bildadress till etiketten. Bilden hämtas, aldrig kopieras hit. */
  bildUrl: string;

  /** Vivinos betyg, 1–5. */
  vivinoBetyg: number | null;
  /** Antal recensioner bakom betyget. */
  vivinoAntal: number | null;
  /** Ditt eget betyg, samma skala. */
  egetBetyg: number | null;

  profil: Smakprofil;
  smaknoter: Smaknot[];
  passarTill: string[];
  /** Vinbeskrivningen, klippt från Vivino eller Systembolaget. */
  beskrivning: string;
  anteckning: string;

  /**
   * Sant när vinet inte går att slå upp.
   *
   * Skilt från att bara vara ofyllt, och det är hela poängen. Ett vin
   * utan smakprofil ser likadant ut oavsett om du inte hunnit fylla i
   * den eller om den inte finns att hämta — och bara det senare är ett
   * avslutat ärende. Utan flaggan blir varje sådant vin en påminnelse
   * om ett arbete som aldrig kan bli gjort.
   */
  uppgifterSaknas: boolean;

  skapad: string;
}

export interface VinData {
  viner: Vin[];
  /** Löpnumret nästa vin får. Räknas aldrig ned. */
  nastaKod: number;
}

export const TOM_VIN_DATA: VinData = { viner: [], nastaKod: 1 };

/* ==================================================================
   KODEN
   ================================================================== */

export const KODPREFIX = "VIN";

export function formateraKod(nummer: number): string {
  return `${KODPREFIX}-${String(Math.max(1, Math.round(nummer))).padStart(3, "0")}`;
}

/**
 * Nästa lediga löpnummer.
 *
 * Räknaren i lagret är sanningen, men den kan ha hamnat efter: två
 * enheter som lägger till varsitt vin offline får samma nummer, och den
 * som synkar sist skulle annars skriva en dubblett. Därför tas alltid
 * det största av räknaren och det högsta använda numret.
 */
export function nastaLedigaKod(data: VinData): number {
  let hogst = 0;
  for (const v of data.viner) {
    const m = v.kod.match(/(\d+)\s*$/);
    if (m) hogst = Math.max(hogst, Number(m[1]));
  }
  return Math.max(data.nastaKod, hogst + 1, 1);
}

/* ==================================================================
   TAL OCH TEXT
   ================================================================== */

const arObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const text = (x: unknown): string => (typeof x === "string" ? x : "");

function lista<T>(
  x: unknown,
  tolk: (rad: Record<string, unknown>, i: number) => T
): T[] {
  if (!Array.isArray(x)) return [];
  return x.filter(arObjekt).map(tolk);
}

const idFor = (rad: Record<string, unknown>, prefix: string, i: number): string =>
  text(rad.id) || `${prefix}${i}`;

/**
 * Tolkar ett tal ur ett textfält.
 *
 * Mellanrum stryks, både vanliga och hårda, och komma duger som
 * decimaltecken: man skriver "13,5" och "1 299" precis som talen visas,
 * och ett fält som vägrar sin egen utskrift är ett fält man slutar lita
 * på. Ett avslutande "kr" eller "%" får finnas kvar.
 *
 * Tomt blir NULL och inte noll. Ett vin utan pris är inte gratis.
 */
export function tolkaTal(rå: unknown): number | null {
  if (typeof rå === "number") return Number.isFinite(rå) ? rå : null;
  if (typeof rå !== "string") return null;
  const rensad = rå
    .replace(/\s/g, "")
    .replace(/ /g, "")
    .replace(/(kr|%)\.?$/i, "")
    .replace(",", ".");
  if (rensad === "" || rensad === "-") return null;
  const n = Number(rensad);
  return Number.isFinite(n) ? n : null;
}

/** "1 299" — hårt mellanrum, så att beloppet aldrig bryts över en rad. */
export function kronor(n: number | null, streck = "—"): string {
  if (n === null) return streck;
  const avrundat = Math.round(n);
  const tecken = avrundat < 0 ? "−" : "";
  const siffror = String(Math.abs(avrundat)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    " "
  );
  return `${tecken}${siffror}`;
}

/** Betyg med en decimal och svenskt komma: "3,7". */
export function betygstext(n: number | null, streck = "—"): string {
  if (n === null || !Number.isFinite(n)) return streck;
  return n.toFixed(1).replace(".", ",");
}

/** Procenttal med en decimal: "13,5 %". */
export function procenttext(n: number | null, streck = "—"): string {
  if (n === null || !Number.isFinite(n)) return streck;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${s.replace(".", ",")} %`;
}

/** Klämmer ett värde till ett spann. */
export function klam(v: number, lag: number, hog: number): number {
  return Math.min(hog, Math.max(lag, v));
}

/** Betyg hålls inom 1–5. Utanför skalan är det inget betyg. */
export function tolkaBetyg(rå: unknown): number | null {
  const n = tolkaTal(rå);
  if (n === null) return null;
  return klam(n, 0, 5);
}

/** Skalvärde hålls inom 0–100. */
export function tolkaSkalvarde(rå: unknown): number | null {
  const n = tolkaTal(rå);
  if (n === null) return null;
  return klam(n, 0, 100);
}

/**
 * Bara adresser vi vågar sätta i ett href eller ett src.
 *
 * En godtycklig sträng här hamnar i en länk som klickas eller i en bild
 * som laddas, och `javascript:` i ett fält som synkas mellan enheter är
 * precis det man inte vill ha. Http och https räcker för Vivino och
 * Systembolaget.
 */
export function trygsamUrl(rå: unknown): string {
  const s = text(rå).trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : "";
}

/**
 * En kommaskild lista till fält.
 *
 * Både komma och radbrytning duger som skiljetecken, eftersom man
 * klistrar in "Shiraz/Syrah, Tempranillo" lika ofta som man skriver
 * ett i taget. Snedstreck får däremot INTE dela: "Shiraz/Syrah" är
 * druvans namn och inte två druvor.
 */
export function tolkaLista(rå: unknown): string[] {
  if (Array.isArray(rå)) {
    return rå.map((x) => text(x).trim()).filter(Boolean);
  }
  return text(rå)
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function skrivLista(rader: string[]): string {
  return rader.join(", ");
}

/* ==================================================================
   TOLKNING
   ================================================================== */

function tolkaLage(x: unknown): Lage {
  const l = text(x);
  return LAGEN.some((y) => y.id === l) ? (l as Lage) : "vill";
}

function tolkaTyp(x: unknown): Typ {
  const t = text(x);
  return TYPER.some((y) => y.id === t) ? (t as Typ) : "rott";
}

function tolkaProfil(x: unknown): Smakprofil {
  const rå = arObjekt(x) ? x : {};
  return {
    fyllighet: tolkaSkalvarde(rå.fyllighet),
    stravhet: tolkaSkalvarde(rå.stravhet),
    sotma: tolkaSkalvarde(rå.sotma),
    syra: tolkaSkalvarde(rå.syra),
  };
}

const arDatum = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

export function tolkaVinData(rå: unknown): VinData {
  if (!arObjekt(rå)) return TOM_VIN_DATA;

  const viner = lista(rå.viner, (v, i) => ({
    id: idFor(v, "v", i),
    kod: text(v.kod) || formateraKod(i + 1),
    namn: text(v.namn),
    producent: text(v.producent),
    argang: text(v.argang),
    land: text(v.land),
    region: text(v.region),
    vinstil: text(v.vinstil),
    typ: tolkaTyp(v.typ),
    druvor: tolkaLista(v.druvor),
    alkohol: tolkaTal(v.alkohol),

    lage: tolkaLage(v.lage),
    antal: tolkaTal(v.antal),
    druckenDatum: arDatum(text(v.druckenDatum)) ? text(v.druckenDatum) : "",

    pris: tolkaTal(v.pris),
    inkopsstalle: text(v.inkopsstalle),
    artikelnummer: text(v.artikelnummer),

    vivinoUrl: trygsamUrl(v.vivinoUrl),
    systembolagetUrl: trygsamUrl(v.systembolagetUrl),
    bildUrl: trygsamUrl(v.bildUrl),

    vivinoBetyg: tolkaBetyg(v.vivinoBetyg),
    vivinoAntal: tolkaTal(v.vivinoAntal),
    egetBetyg: tolkaBetyg(v.egetBetyg),

    profil: tolkaProfil(v.profil),
    smaknoter: lista(v.smaknoter, (n, j) => ({
      id: idFor(n, "n", j),
      ord: text(n.ord),
      grupp: text(n.grupp),
      antal: tolkaTal(n.antal),
    })),
    passarTill: tolkaLista(v.passarTill),
    beskrivning: text(v.beskrivning),
    anteckning: text(v.anteckning),

    uppgifterSaknas: v.uppgifterSaknas === true,
    skapad: arDatum(text(v.skapad)) ? text(v.skapad) : "",
  }));

  const raknare = Number(rå.nastaKod);

  return {
    viner,
    nastaKod: Number.isFinite(raknare) && raknare > 0 ? Math.round(raknare) : 1,
  };
}

/* ==================================================================
   VINETS NAMN
   ================================================================== */

/**
 * Raden man läser: producent, namn och årgång.
 *
 * Producenten utelämnas när namnet redan börjar med den — "Félix Solís
 * Félix Solís Mucho Más" är inte tydligare än utan dubbleringen, bara
 * längre.
 */
export function vinTitel(v: Vin): string {
  const namn = v.namn.trim();
  const producent = v.producent.trim();
  const argang = v.argang.trim();

  let rad = namn;
  if (producent && !namn.toLowerCase().startsWith(producent.toLowerCase())) {
    rad = rad ? `${producent} ${rad}` : producent;
  }
  if (!rad) rad = "Namnlöst vin";
  return argang ? `${rad} ${argang}` : rad;
}

/** Underraden: land, region, druvor och alkohol, det som är ifyllt. */
export function vinUnderrad(v: Vin): string[] {
  const delar: string[] = [];
  const plats = [v.land.trim(), v.region.trim()].filter(Boolean).join(" · ");
  if (plats) delar.push(plats);
  if (v.druvor.length > 0) delar.push(skrivLista(v.druvor));
  if (v.alkohol !== null) delar.push(procenttext(v.alkohol));
  return delar;
}

/* ==================================================================
   FAKTA OM VINET
   ================================================================== */

export interface Faktarad {
  etikett: string;
  varde: string;
}

/**
 * Uppgifterna som en läsbar tabell, uppställd som förlagan.
 *
 * TOMMA FÄLT LÄMNAR INGEN RAD EFTER SIG. En tabell med halva raderna
 * tomma ser ut som ett formulär man glömt fylla i, och visningsläget
 * finns just för att man skall slippa se ett formulär. Det man inte
 * skrivit in syns i redigeringsläget, som är där det hör hemma.
 *
 * Ordningen följer Vivinos: producent och druvor först, ursprunget
 * sedan, och det egna — pris, lager — sist. Man läser den uppifrån för
 * att känna igen ett vin, inte för att räkna på det.
 */
export function vinFakta(v: Vin): Faktarad[] {
  const rader: Faktarad[] = [];
  const lagg = (etikett: string, varde: string) => {
    if (varde.trim()) rader.push({ etikett, varde: varde.trim() });
  };

  lagg("Producent", v.producent);
  lagg("Årgång", v.argang);
  lagg("Druvor", skrivLista(v.druvor));
  lagg("Ursprung", [v.land.trim(), v.region.trim()].filter(Boolean).join(" / "));
  lagg("Vinstil", v.vinstil);
  lagg("Slag", typNamn(v.typ));
  if (v.alkohol !== null) lagg("Alkoholvolym", procenttext(v.alkohol));
  if (v.pris !== null) lagg("Pris per flaska", `${kronor(v.pris)} kr`);
  lagg("Inköpsställe", v.inkopsstalle);
  lagg("Artikelnummer", v.artikelnummer);

  /* Lagret och drickandet står bara där de betyder något. "0 flaskor"
     under ett vin man vill prova är inte en upplysning utan en gåta. */
  if (v.lage === "har") {
    const n = flaskor(v);
    lagg("I källaren", `${n} ${n === 1 ? "flaska" : "flaskor"}`);
  }
  if (v.lage === "drucken") lagg("Drucket", v.druckenDatum);

  if (v.passarTill.length > 0) lagg("Passar till", skrivLista(v.passarTill));

  return rader;
}

/**
 * Sant när det inte finns någonting alls att visa.
 *
 * Ett nyss tillagt vin har varken fakta, betyg, profil eller text, och
 * ett visningsläge som då ritar en tom yta ser trasigt ut. Sidan skall i
 * stället säga att det är tomt och peka på redigeringsknappen.
 */
export function arTomt(v: Vin): boolean {
  return (
    v.namn.trim() === "" &&
    // Ett vin har ALLTID ett slag — det har ett förval. En ensam rad i
    // faktatabellen är därför lika tomt som ingen rad alls.
    vinFakta(v).length <= 1 &&
    v.egetBetyg === null &&
    v.vivinoBetyg === null &&
    !harProfil(v.profil) &&
    v.smaknoter.length === 0 &&
    v.beskrivning.trim() === "" &&
    v.anteckning.trim() === "" &&
    v.bildUrl === ""
  );
}

/** Kortets fot på Vivinos vis: "1 511 kommentarer om fatad toner". */
export function smaknotsFot(n: Smaknot): string {
  const grupp = n.grupp.trim();
  if (n.antal === null) return grupp ? `${grupp} toner` : "";
  const ord = `${kronor(n.antal)} ${n.antal === 1 ? "kommentar" : "kommentarer"}`;
  return grupp ? `${ord} om ${grupp} toner` : ord;
}

/* ==================================================================
   RÄKNEVERK
   ================================================================== */

export interface Rakning {
  vill: number;
  har: number;
  drucken: number;
  totalt: number;
  /** Flaskor i källaren. Ett vin utan antal räknas som en flaska. */
  flaskor: number;
  /** Vad källaren är värd: pris gånger antal, för dem som har pris. */
  varde: number;
}

/**
 * Ett vin i källaren utan ifyllt antal räknas som EN flaska.
 *
 * Noll vore fel: man har uppenbarligen vinet, annars stod det inte i
 * källaren. Att i stället låta bli att räkna det alls hade gett en
 * flasksumma som är mindre än antalet viner, vilket ser ut som ett fel.
 */
export function flaskor(v: Vin): number {
  if (v.lage !== "har") return 0;
  return v.antal === null ? 1 : Math.max(0, Math.round(v.antal));
}

export function rakna(data: VinData): Rakning {
  const ut: Rakning = {
    vill: 0,
    har: 0,
    drucken: 0,
    totalt: data.viner.length,
    flaskor: 0,
    varde: 0,
  };
  for (const v of data.viner) {
    ut[v.lage] += 1;
    const antal = flaskor(v);
    ut.flaskor += antal;
    if (v.pris !== null) ut.varde += v.pris * antal;
  }
  return ut;
}

/** Andelen av registret som är drucket, 0–1. */
export function andelDrucken(r: Rakning): number {
  return r.totalt === 0 ? 0 : r.drucken / r.totalt;
}

/**
 * Snittet av ett betyg över de viner som HAR det betyget.
 *
 * Ofyllda viner räknas inte som nollor. Ett vin man inte satt betyg på
 * är inte ett dåligt vin, och en nolla i nämnaren hade dragit ned
 * snittet för varje vin man ännu inte hunnit bedöma.
 */
export function medelbetyg(
  data: VinData,
  vems: "eget" | "vivino"
): number | null {
  const tal = data.viner
    .map((v) => (vems === "eget" ? v.egetBetyg : v.vivinoBetyg))
    .filter((n): n is number => n !== null);
  if (tal.length === 0) return null;
  return tal.reduce((s, n) => s + n, 0) / tal.length;
}

/** Ditt betyg minus Vivinos. Positivt betyder att du tyckte bättre. */
export function oense(v: Vin): number | null {
  if (v.egetBetyg === null || v.vivinoBetyg === null) return null;
  return v.egetBetyg - v.vivinoBetyg;
}

/**
 * Viner som saknar uppgifter och inte sagt ifrån om det.
 *
 * Detta är sidans "återstår att göra": vin som varken har smakprofil
 * eller är märkta som omöjliga att slå upp. De som ÄR märkta räknas
 * inte, för då finns ingenting kvar att göra åt dem.
 */
export function ofullstandiga(data: VinData): Vin[] {
  return data.viner.filter((v) => !v.uppgifterSaknas && !harProfil(v.profil));
}

/* ==================================================================
   FILTER OCH ORDNING
   ================================================================== */

/**
 * Filtrerar registret.
 *
 * Frågan söks i namn, producent, land, region, druvor, vinstil, kod och
 * årgång — men inte i anteckningen eller beskrivningen. De är långa och
 * innehåller ord som finns i halva registret, och en fritextsökning som
 * träffar allt är ingen sökning.
 */
export function filtreraViner(
  data: VinData,
  fraga: string,
  lage: Lage | null,
  typ: Typ | null
): Vin[] {
  const termer = fraga.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return data.viner.filter((v) => {
    if (lage && v.lage !== lage) return false;
    if (typ && v.typ !== typ) return false;
    if (termer.length === 0) return true;
    const halm = [
      v.namn,
      v.producent,
      v.land,
      v.region,
      v.vinstil,
      v.kod,
      v.argang,
      v.inkopsstalle,
      skrivLista(v.druvor),
      skrivLista(v.passarTill),
    ]
      .join(" ")
      .toLowerCase();
    return termer.every((t) => halm.includes(t));
  });
}

export type Ordning = "kod" | "betyg" | "pris" | "namn";

export const ORDNINGAR: { id: Ordning; namn: string }[] = [
  { id: "kod", namn: "Kod" },
  { id: "betyg", namn: "Betyg" },
  { id: "pris", namn: "Pris" },
  { id: "namn", namn: "Namn" },
];

/**
 * Registrets ordning.
 *
 * Ofyllda tal hamnar alltid SIST, oavsett vilken väg listan sorteras.
 * Ett vin utan pris är inte billigast, och att låta det ligga överst
 * när man sorterar på pris hade gjort listan obrukbar just när man
 * använder den.
 */
export function sorteraViner(viner: Vin[], efter: Ordning = "kod"): Vin[] {
  const sist = (n: number | null, fallande: boolean) =>
    n === null ? (fallande ? -Infinity : Infinity) : n;

  return [...viner].sort((a, b) => {
    switch (efter) {
      case "betyg":
        return (
          sist(b.egetBetyg ?? b.vivinoBetyg, true) -
            sist(a.egetBetyg ?? a.vivinoBetyg, true) ||
          a.kod.localeCompare(b.kod)
        );
      case "pris":
        return (
          sist(a.pris, false) - sist(b.pris, false) || a.kod.localeCompare(b.kod)
        );
      case "namn":
        return vinTitel(a).localeCompare(vinTitel(b), "sv") ||
          a.kod.localeCompare(b.kod);
      default:
        return a.kod.localeCompare(b.kod);
    }
  });
}

/* ==================================================================
   FÖRDELNINGEN ÖVER SAMLINGEN
   ================================================================== */

export type Uppdelning = "typ" | "land" | "druva" | "producent" | "vinstil";

export const UPPDELNINGAR: { id: Uppdelning; namn: string }[] = [
  { id: "typ", namn: "Typ" },
  { id: "land", namn: "Land" },
  { id: "druva", namn: "Druva" },
  { id: "producent", namn: "Producent" },
  { id: "vinstil", namn: "Vinstil" },
];

export interface Del {
  id: string;
  namn: string;
  antal: number;
  ton: number;
}

/**
 * Delar upp samlingen.
 *
 * Ett vin med två druvor räknas i BÅDA grupperna. Summan av delarna
 * blir därmed större än antalet viner, och det är rätt: frågan
 * uppdelningen svarar på är "hur mycket tempranillo har jag", inte "hur
 * många viner har jag" — det talet står redan i mätarpanelen.
 *
 * Viner utan värde samlas under "Ej ifyllt" i stället för att
 * utelämnas. En stapel som tyst hoppar över hälften av samlingen ser ut
 * som en fullständig bild av något den inte beskriver.
 */
export function fordelning(viner: Vin[], efter: Uppdelning): Del[] {
  const rakning = new Map<string, number>();
  const toner = new Map<string, number>();

  const lagg = (namn: string, ton: number) => {
    const nyckel = namn.trim() || "Ej ifyllt";
    rakning.set(nyckel, (rakning.get(nyckel) ?? 0) + 1);
    if (!toner.has(nyckel)) toner.set(nyckel, ton);
  };

  for (const v of viner) {
    switch (efter) {
      case "typ":
        lagg(typNamn(v.typ), typTon(v.typ));
        break;
      case "land":
        lagg(v.land, 0);
        break;
      case "producent":
        lagg(v.producent, 0);
        break;
      case "vinstil":
        lagg(v.vinstil, 0);
        break;
      case "druva":
        if (v.druvor.length === 0) lagg("", 0);
        else for (const d of v.druvor) lagg(d, 0);
        break;
    }
  }

  const delar = [...rakning.entries()]
    .map(([namn, antal]) => ({ id: namn, namn, antal, ton: toner.get(namn) ?? 0 }))
    .sort((a, b) => b.antal - a.antal || a.namn.localeCompare(b.namn, "sv"));

  /* Typen bär sin bundna färg; övriga uppdelningar har ingen naturlig
     och får paletten i storleksordning. Att ge dem slumpade toner hade
     betytt att stapeln bytte färg varje gång man lade till ett vin. */
  if (efter === "typ") return delar;
  return delar.map((d, i) => ({
    ...d,
    ton: d.namn === "Ej ifyllt" ? 3 : i % 6,
  }));
}

/* ==================================================================
   DIAGRAMUNDERLAG
   ================================================================== */

export interface Punkt {
  id: string;
  etikett: string;
  x: number;
  y: number;
  ton: number;
  /** Sant för det vin som är öppnat i registret. */
  framhavd: boolean;
}

/**
 * Betyg mot pris.
 *
 * Bara viner som har BÅDA talen kommer med. Att sätta ett saknat pris
 * till noll hade lagt vinet längst till vänster, där det ser ut att
 * vara ett fynd — och ett diagram som ljuger åt det hållet är precis
 * det man inte vill ha när man står och väljer flaska.
 */
export function betygMotPris(viner: Vin[], oppetId: string | null): Punkt[] {
  const ut: Punkt[] = [];
  for (const v of viner) {
    const betyg = v.egetBetyg ?? v.vivinoBetyg;
    if (v.pris === null || betyg === null) continue;
    ut.push({
      id: v.id,
      etikett: `${vinTitel(v)} — ${kronor(v.pris)} kr, ${betygstext(betyg)}`,
      x: v.pris,
      y: betyg,
      ton: typTon(v.typ),
      framhavd: v.id === oppetId,
    });
  }
  return ut;
}

/** Smakkartan: två av de fyra skalorna mot varandra. */
export function smakkarta(
  viner: Vin[],
  xSkala: SkalId,
  ySkala: SkalId,
  oppetId: string | null
): Punkt[] {
  const ut: Punkt[] = [];
  for (const v of viner) {
    const x = v.profil[xSkala];
    const y = v.profil[ySkala];
    if (x === null || y === null) continue;
    ut.push({
      id: v.id,
      etikett: vinTitel(v),
      x,
      y,
      ton: typTon(v.typ),
      framhavd: v.id === oppetId,
    });
  }
  return ut;
}

/**
 * Skalans topp för prisaxeln.
 *
 * Rundas upp till närmaste hundra så att axeln får jämna tal, och har
 * ett golv: en samling med bara billiga viner skall inte få en axel som
 * slutar på 60, där varje prisskillnad ser dramatisk ut.
 */
export function pristak(punkter: Punkt[]): number {
  const hogsta = punkter.reduce((h, p) => Math.max(h, p.x), 0);
  return Math.max(200, Math.ceil(hogsta / 100) * 100);
}
