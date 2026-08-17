/**
 * Krympning av omslagsbilder.
 *
 * Bilderna läggs i lagret som data-URL:er och synkas med resten. Det
 * ställer ett hårt krav: de måste vara SMÅ. En bild rakt från telefonens
 * kamera är flera megabyte, och localStorage rymmer ungefär fem — ett
 * enda omslag skulle kunna fylla lagret och tysta varje efterföljande
 * skrivning, inklusive kalenderns.
 *
 * Därför skalas allt ned i webbläsaren innan det sparas. 300 pixlars
 * bredd räcker för ett omslag som visas i ungefär halva den storleken,
 * och JPEG på 0,72 landar på tjugo kilobyte. Fyrtio mappar blir under en
 * megabyte, vilket ryms med god marginal.
 *
 * Genomskinlighet offras med flit. PNG med alfa blir tre gånger så stor,
 * och ett bokomslag har ingen genomskinlighet att bevara.
 */

/** Största bredd som sparas. Höjden följer proportionerna. */
export const MAX_BREDD = 300;

/** JPEG-kvalitet. Under 0,6 syns artefakter i text på omslagen. */
const KVALITET = 0.72;

/** Största fil vi ens försöker läsa, innan krympning. */
export const MAX_KALLA_BYTE = 12 * 1024 * 1024;

export class Bildfel extends Error {}

/**
 * Läser en fil och lämnar tillbaka en krympt JPEG som data-URL.
 *
 * Kastar `Bildfel` med ett meddelande som går att visa för en människa.
 * Anroparen skall aldrig behöva tolka ett DOMException.
 */
export async function krympBild(fil: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Bildfel("Bilder kan bara läsas i webbläsaren.");
  }
  if (!fil.type.startsWith("image/")) {
    throw new Bildfel("Filen är inte en bild.");
  }
  if (fil.size > MAX_KALLA_BYTE) {
    throw new Bildfel("Bilden är för stor. Välj en under 12 MB.");
  }

  const bild = await lasBild(fil);
  const skala = Math.min(1, MAX_BREDD / bild.width);
  const bredd = Math.max(1, Math.round(bild.width * skala));
  const hojd = Math.max(1, Math.round(bild.height * skala));

  const duk = document.createElement("canvas");
  duk.width = bredd;
  duk.height = hojd;
  const ritare = duk.getContext("2d");
  if (!ritare) throw new Bildfel("Webbläsaren kunde inte rita om bilden.");

  // Vit botten. Utan den blir genomskinliga bildpunkter svarta när JPEG
  // kastar alfakanalen, och ett omslag med rundad kant får svarta hörn.
  ritare.fillStyle = "#ffffff";
  ritare.fillRect(0, 0, bredd, hojd);
  ritare.drawImage(bild, 0, 0, bredd, hojd);

  if ("close" in bild) (bild as ImageBitmap).close();

  const url = duk.toDataURL("image/jpeg", KVALITET);
  if (!url.startsWith("data:image/")) {
    throw new Bildfel("Bilden gick inte att spara.");
  }
  return url;
}

/**
 * `createImageBitmap` är snabbare och slipper en omväg via DOM, men
 * saknas i äldre Safari. Där får en vanlig <img> göra jobbet.
 */
async function lasBild(fil: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(fil);
    } catch {
      // Faller igenom till reservvägen nedan.
    }
  }

  const url = URL.createObjectURL(fil);
  try {
    return await new Promise<HTMLImageElement>((klar, fel) => {
      const bild = new Image();
      bild.onload = () => klar(bild);
      bild.onerror = () => fel(new Bildfel("Bilden gick inte att läsa."));
      bild.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Ungefärlig storlek i byte på en data-URL, för att kunna visa den. */
export function dataUrlByte(url: string): number {
  const komma = url.indexOf(",");
  if (komma === -1) return 0;
  return Math.round((url.length - komma - 1) * 0.75);
}
