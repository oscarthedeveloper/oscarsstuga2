/**
 * Språkbiblioteket.
 *
 * Tre nivåer och ett innehåll:
 *
 *   HYLLA   ett språk. Bär en ton ur kalenderpaletten, som allt annat
 *           i appen som behöver skiljas åt med färg.
 *   MAPP    en "bok". Har ett omslag om man valt en bild, annars ritas
 *           den som en mapp i hyllans ton.
 *   BLAD    ett "papper". Innehållet är en lista BLOCK.
 *
 * ORDNINGEN ÄR LISTANS ORDNING, inte ett sorteringsfält. Ett `ordning`-
 * tal måste hållas i takt vid varje infogning och flytt, och den dagen
 * två poster får samma tal är ordningen godtycklig — vilket syns som att
 * listan hoppar mellan två renderingar. En array vet redan vad som kommer
 * först.
 *
 * TOLKNINGEN ÄR DEFENSIV, av samma skäl som på högskoleprovssidan:
 * innehållet ligger i en JSONB-kolumn databasen inte kontrollerar, kan
 * vara skrivet av ett äldre bygge och kan ha synkats ned halvvägs. Allt
 * som inte går att tolka faller bort tyst i stället för att kasta. Ett
 * bibliotek som vägrar öppna för att ett block har fel form är ett
 * bibliotek man har tappat.
 */

/* ==================================================================
   BLOCK
   ================================================================== */

export type Blockslag =
  | "text"
  | "rubrik"
  | "tabell"
  | "flikar"
  | "ruta"
  | "bojning"
  | "ordpar"
  | "parallell"
  | "belagg"
  | "fakta";

/** Anmärkningsrutans tre tonlägen. */
export type Rutslag = "info" | "varning" | "tips";

export interface Textblock {
  id: string;
  typ: "text";
  /** Fri text. **fet**, *kursiv* och `kod` tolkas vid rendering. */
  text: string;
}

export interface Rubrikblock {
  id: string;
  typ: "rubrik";
  text: string;
}

export interface Tabellblock {
  id: string;
  typ: "tabell";
  /** Bildtext över tabellen, i kapitäler. Frivillig. */
  rubrik: string;
  rubriker: string[];
  rader: string[][];
  /**
   * Radindex som skall framhävas.
   *
   * En tabell i en grammatikanteckning finns nästan alltid för EN rads
   * skull — paradigmet visas helt, men det är dativen man skriver om.
   * Utan framhävningen får läsaren leta själv varje gång.
   */
  framhavda: number[];
}

export interface Flikblock {
  id: string;
  typ: "flikar";
  flikar: { namn: string; text: string }[];
}

export interface Rutblock {
  id: string;
  typ: "ruta";
  slag: Rutslag;
  titel: string;
  text: string;
}

/**
 * Böjningstabell.
 *
 * Egen typ och inte bara en tabell, trots att formen liknar. Skillnaden
 * är att första kolumnen är en ETIKETTKOLUMN — person, kasus, numerus —
 * och att den ritas som en sådan. Dessutom finns färdiga uppsättningar
 * att fylla i, vilket är hela vinsten: ingen skriver io/tu/lui/noi/voi/
 * loro för hand mer än en gång.
 */
export interface Bojningsblock {
  id: string;
  typ: "bojning";
  rubrik: string;
  /** Kolumnrubriker, t.ex. ["Presens", "Imperfekt"]. */
  kolumner: string[];
  rader: { etikett: string; former: string[] }[];
}

export interface Ordparsblock {
  id: string;
  typ: "ordpar";
  /** Rubriker över de två spalterna, t.ex. "Italienska" / "Svenska". */
  vansterNamn: string;
  hogerNamn: string;
  par: { vanster: string; hoger: string }[];
}

/**
 * Paralleltext — samma stycke på två språk, sida vid sida.
 *
 * Skiljer sig från ordpar genom att vara LÖPANDE text och inte en lista.
 * Spalterna radbryts var för sig, så raderna hamnar sällan i jämnhöjd —
 * det är avsiktligt. Att tvinga fram radvis parallellitet skulle kräva
 * att man styckar texten i meningar, och en översättning följer sällan
 * meningsindelningen ändå.
 */
export interface Parallellblock {
  id: string;
  typ: "parallell";
  vansterNamn: string;
  hogerNamn: string;
  vanster: string;
  hoger: string;
}

/**
 * Ett belägg: ett citat med källa, och en kommentar till det.
 *
 * Layouten följer innehållet i stället för att styras av ett fält.
 * Saknas kommentaren går citatet i full bredd och stor grad — det är
 * ett anslag, det man skall läsa först. Finns kommentaren blir citatet
 * en vänsterspalt och kommentaren står intill i mindre grad. Samma
 * block, två uppställningar, inget val att göra fel.
 */
export interface Belaggsblock {
  id: string;
  typ: "belagg";
  citat: string;
  /** Varifrån citatet kommer. Sätts i kapitäler under. */
  kalla: string;
  kommentar: string;
}

/**
 * Faktaraden: etikett över värde, i spalter mellan två streckade linjer.
 *
 * Skild från tabellen med flit. En tabell jämför rader med varandra; en
 * faktarad räknar upp egenskaper hos EN sak. Att uttrycka det senare som
 * en tvåradig tabell fungerar men läser fel — och blir dessutom knökigt
 * på en telefon, där faktaraden hellre lägger sig i två spalter.
 */
export interface Faktablock {
  id: string;
  typ: "fakta";
  rader: { etikett: string; varde: string }[];
}

export type Block =
  | Textblock
  | Rubrikblock
  | Tabellblock
  | Flikblock
  | Rutblock
  | Bojningsblock
  | Ordparsblock
  | Parallellblock
  | Belaggsblock
  | Faktablock;

/* ==================================================================
   TRÄDET
   ================================================================== */

export interface Hylla {
  id: string;
  namn: string;
  /** 0–5, pekar in i --kal-1…--kal-6. */
  ton: number;
}

export interface Mapp {
  id: string;
  hyllaId: string;
  titel: string;
  /** Kort underrad, t.ex. "A2–B1" eller "Från kursboken". */
  bihang: string;
}

export interface Blad {
  id: string;
  mappId: string;
  titel: string;
  /** Underrubrik i kapitäler under titeln. Frivillig. */
  underrubrik: string;
  /** Visar ett UTKAST-märke vid titeln. */
  utkast: boolean;
  block: Block[];
}

export interface SprakData {
  hyllor: Hylla[];
  mappar: Mapp[];
  blad: Blad[];
}

export const TOM_SPRAK: SprakData = { hyllor: [], mappar: [], blad: [] };

/** Omslagen bor i en EGEN lagerpost. Se kommentaren i Sprak.tsx. */
export type Omslag = Record<string, string>;

/* ==================================================================
   FÄRDIGA UPPSÄTTNINGAR
   ================================================================== */

/**
 * Personformer per språk.
 *
 * Ligger här och inte i komponenten för att det är kunskap om språken,
 * inte om gränssnittet — och för att det går att prova.
 */
export const PERSONER: { id: string; namn: string; rader: string[] }[] = [
  {
    id: "it",
    namn: "Italienska",
    rader: ["io", "tu", "lui/lei", "noi", "voi", "loro"],
  },
  {
    id: "de",
    namn: "Tyska",
    rader: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"],
  },
  { id: "sv", namn: "Svenska", rader: ["jag", "du", "hen", "vi", "ni", "de"] },
  {
    id: "en",
    namn: "Engelska",
    rader: ["I", "you", "he/she/it", "we", "you", "they"],
  },
  {
    id: "kasus",
    namn: "Kasus (tyska)",
    rader: ["Nominativ", "Akkusativ", "Dativ", "Genitiv"],
  },
];

/* ==================================================================
   TOLKNING
   ================================================================== */

const arObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const text = (x: unknown): string => (typeof x === "string" ? x : "");

const textlista = (x: unknown): string[] =>
  Array.isArray(x) ? x.map(text) : [];

function lista<T>(
  x: unknown,
  tolk: (rad: Record<string, unknown>, i: number) => T | null
): T[] {
  if (!Array.isArray(x)) return [];
  const ut: T[] = [];
  for (let i = 0; i < x.length; i++) {
    const rad = x[i];
    if (!arObjekt(rad)) continue;
    const tolkad = tolk(rad, i);
    if (tolkad !== null) ut.push(tolkad);
  }
  return ut;
}

const idFor = (rad: Record<string, unknown>, prefix: string, i: number): string =>
  text(rad.id) || `${prefix}${i}`;

/** Klämmer tonen till paletten, precis som butiken gör för kalendrar. */
export function klamTon(n: unknown): number {
  const t = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(t)) return 0;
  return ((Math.round(t) % 6) + 6) % 6;
}

export function tolkaSprakData(rå: unknown): SprakData {
  if (!arObjekt(rå)) return TOM_SPRAK;

  const hyllor = lista(rå.hyllor, (h, i) => ({
    id: idFor(h, "h", i),
    namn: text(h.namn),
    ton: klamTon(h.ton),
  }));

  const mappar = lista(rå.mappar, (m, i) => ({
    id: idFor(m, "m", i),
    hyllaId: text(m.hyllaId),
    titel: text(m.titel),
    bihang: text(m.bihang),
  }));

  const blad = lista(rå.blad, (b, i) => ({
    id: idFor(b, "b", i),
    mappId: text(b.mappId),
    titel: text(b.titel),
    underrubrik: text(b.underrubrik),
    utkast: b.utkast === true,
    block: tolkaBlock(b.block),
  }));

  return { hyllor, mappar, blad };
}

export function tolkaBlock(rå: unknown): Block[] {
  return lista(rå, (b, i): Block | null => {
    const id = idFor(b, "bl", i);
    switch (text(b.typ)) {
      case "text":
        return { id, typ: "text", text: text(b.text) };
      case "rubrik":
        return { id, typ: "rubrik", text: text(b.text) };
      case "tabell": {
        const rubriker = textlista(b.rubriker);
        // Något som inte är en array är inte en rad. Att göra en tom rad
        // av den vore att lägga till innehåll som aldrig funnits — och en
        // tom rad mitt i en tabell ser ut som ett fel man själv gjort.
        const rader = Array.isArray(b.rader)
          ? b.rader.filter(Array.isArray).map(textlista)
          : [];
        return {
          id,
          typ: "tabell",
          rubrik: text(b.rubrik),
          rubriker,
          rader,
          // Index utanför tabellen skulle framhäva en rad som inte finns.
          framhavda: Array.isArray(b.framhavda)
            ? b.framhavda
                .map((n) => Math.round(Number(n)))
                .filter((n) => Number.isInteger(n) && n >= 0 && n < rader.length)
            : [],
        };
      }
      case "flikar":
        return {
          id,
          typ: "flikar",
          flikar: lista(b.flikar, (f) => ({
            namn: text(f.namn),
            text: text(f.text),
          })),
        };
      case "ruta": {
        const slag = text(b.slag);
        return {
          id,
          typ: "ruta",
          slag:
            slag === "varning" || slag === "tips" ? (slag as Rutslag) : "info",
          titel: text(b.titel),
          text: text(b.text),
        };
      }
      case "bojning":
        return {
          id,
          typ: "bojning",
          rubrik: text(b.rubrik),
          kolumner: textlista(b.kolumner),
          rader: lista(b.rader, (r) => ({
            etikett: text(r.etikett),
            former: textlista(r.former),
          })),
        };
      case "ordpar":
        return {
          id,
          typ: "ordpar",
          vansterNamn: text(b.vansterNamn),
          hogerNamn: text(b.hogerNamn),
          par: lista(b.par, (p) => ({
            vanster: text(p.vanster),
            hoger: text(p.hoger),
          })),
        };
      case "parallell":
        return {
          id,
          typ: "parallell",
          vansterNamn: text(b.vansterNamn),
          hogerNamn: text(b.hogerNamn),
          vanster: text(b.vanster),
          hoger: text(b.hoger),
        };
      case "belagg":
        return {
          id,
          typ: "belagg",
          citat: text(b.citat),
          kalla: text(b.kalla),
          kommentar: text(b.kommentar),
        };
      case "fakta":
        return {
          id,
          typ: "fakta",
          rader: lista(b.rader, (r) => ({
            etikett: text(r.etikett),
            varde: text(r.varde),
          })),
        };
      default:
        // Ett block av okänd typ kommer från ett nyare bygge. Det tas
        // bort tyst hellre än att ritas som ett fel — men det är också
        // skälet att aldrig byta namn på en typ som varit i bruk.
        return null;
    }
  });
}

/** Omslagsposten: mapp-id till data-URL. */
export function tolkaOmslag(rå: unknown): Omslag {
  if (!arObjekt(rå)) return {};
  const ut: Omslag = {};
  for (const [nyckel, varde] of Object.entries(rå)) {
    // Bara riktiga bild-URL:er. En godtycklig sträng här skulle hamna i
    // ett src-attribut, och det är inte ett fält man vill vara slarvig med.
    if (typeof varde === "string" && varde.startsWith("data:image/")) {
      ut[nyckel] = varde;
    }
  }
  return ut;
}

/* ==================================================================
   TRÄDFRÅGOR
   ================================================================== */

export const mapparI = (data: SprakData, hyllaId: string): Mapp[] =>
  data.mappar.filter((m) => m.hyllaId === hyllaId);

export const bladI = (data: SprakData, mappId: string): Blad[] =>
  data.blad.filter((b) => b.mappId === mappId);

export const hyllaMed = (data: SprakData, id: string | null): Hylla | null =>
  data.hyllor.find((h) => h.id === id) ?? null;

export const mappMed = (data: SprakData, id: string | null): Mapp | null =>
  data.mappar.find((m) => m.id === id) ?? null;

export const bladMed = (data: SprakData, id: string | null): Blad | null =>
  data.blad.find((b) => b.id === id) ?? null;

/**
 * Tar bort en hylla och allt som hänger under den.
 *
 * Att bara ta bort hyllan lämnar mapparna och bladen kvar i lagret utan
 * någon väg fram till dem — osynliga men fortfarande synkade, och de
 * växer för varje språk man ångrar. Trädet städas därför nedifrån.
 */
export function taBortHylla(data: SprakData, hyllaId: string): SprakData {
  const mappIder = new Set(
    data.mappar.filter((m) => m.hyllaId === hyllaId).map((m) => m.id)
  );
  return {
    hyllor: data.hyllor.filter((h) => h.id !== hyllaId),
    mappar: data.mappar.filter((m) => m.hyllaId !== hyllaId),
    blad: data.blad.filter((b) => !mappIder.has(b.mappId)),
  };
}

export function taBortMapp(data: SprakData, mappId: string): SprakData {
  return {
    ...data,
    mappar: data.mappar.filter((m) => m.id !== mappId),
    blad: data.blad.filter((b) => b.mappId !== mappId),
  };
}

/* ==================================================================
   LISTOPERATIONER
   ================================================================== */

/**
 * Flyttar posten ett steg. Utanför kanterna händer ingenting — en
 * knapp som tyst gör fel är sämre än en som inte gör något.
 */
export function flytta<T>(lista: T[], index: number, steg: number): T[] {
  const mal = index + steg;
  if (index < 0 || index >= lista.length || mal < 0 || mal >= lista.length) {
    return lista;
  }
  const ut = [...lista];
  const [posten] = ut.splice(index, 1);
  ut.splice(mal, 0, posten);
  return ut;
}

/** Ett tomt block av angiven typ. */
export function nyttBlock(typ: Blockslag, id: string): Block {
  switch (typ) {
    case "rubrik":
      return { id, typ: "rubrik", text: "" };
    case "tabell":
      return {
        id,
        typ: "tabell",
        rubrik: "",
        rubriker: ["", ""],
        rader: [["", ""]],
        framhavda: [],
      };
    case "flikar":
      return { id, typ: "flikar", flikar: [{ namn: "", text: "" }] };
    case "ruta":
      return { id, typ: "ruta", slag: "info", titel: "", text: "" };
    case "bojning":
      return {
        id,
        typ: "bojning",
        rubrik: "",
        kolumner: ["Presens"],
        rader: PERSONER[0].rader.map((etikett) => ({ etikett, former: [""] })),
      };
    case "ordpar":
      return {
        id,
        typ: "ordpar",
        vansterNamn: "",
        hogerNamn: "",
        par: [{ vanster: "", hoger: "" }],
      };
    case "parallell":
      return {
        id,
        typ: "parallell",
        vansterNamn: "",
        hogerNamn: "",
        vanster: "",
        hoger: "",
      };
    case "belagg":
      return { id, typ: "belagg", citat: "", kalla: "", kommentar: "" };
    case "fakta":
      return {
        id,
        typ: "fakta",
        rader: [
          { etikett: "", varde: "" },
          { etikett: "", varde: "" },
        ],
      };
    default:
      return { id, typ: "text", text: "" };
  }
}

export const BLOCKNAMN: { typ: Blockslag; namn: string; beskrivning: string }[] =
  [
    { typ: "text", namn: "Text", beskrivning: "**fet**, *kursiv*, `kod`" },
    { typ: "rubrik", namn: "Rubrik", beskrivning: "Delar upp bladet" },
    { typ: "belagg", namn: "Belägg", beskrivning: "Citat, källa och kommentar" },
    { typ: "fakta", namn: "Faktarad", beskrivning: "Etikett över värde" },
    { typ: "tabell", namn: "Tabell", beskrivning: "Rader och kolumner" },
    { typ: "bojning", namn: "Böjning", beskrivning: "Person i första spalten" },
    { typ: "ordpar", namn: "Ordpar", beskrivning: "Glosor i två spalter" },
    { typ: "parallell", namn: "Paralleltext", beskrivning: "Text och översättning" },
    { typ: "flikar", namn: "Flikar", beskrivning: "Växla mellan varianter" },
    { typ: "ruta", namn: "Anmärkning", beskrivning: "Info, varning eller tips" },
  ];
