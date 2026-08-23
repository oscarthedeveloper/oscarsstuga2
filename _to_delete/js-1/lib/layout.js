"use strict";
/**
 * Layout för överlappande händelser — en trappa, inte en delad bredd.
 *
 * Två möten på samma tid LÄGGER SIG PÅ VARANDRA, förskjutna åt höger,
 * i stället för att halvera varandras bredd. Skälet är att den delade
 * bredden straffar hela dagen för en enda krock: tre möten mellan nio
 * och tio gjorde varje block en tredjedel brett, och i en dagsvy på en
 * telefon blev det tre remsor där ingen titel gick att läsa. Trappan
 * kostar i stället bara det som faktiskt ligger under — och den som
 * ligger underst behåller sin vänsterkant, sin färgribba och början av
 * sin titel.
 *
 * Priset är ärligt: det understa mötets HÖGERdel är dold. Det är en
 * medveten avvägning — man ser att något ligger där, och ett klick
 * lyfter fram det — mot att inget alls går att läsa.
 *
 * Uträkningen sker i tre steg:
 *
 *   1. Dela upp dagens förekomster i KLUSTER — grupper som hänger ihop
 *      genom överlapp. Två block i olika kluster kan aldrig krocka, så de
 *      får räknas var för sig.
 *   2. Ge varje block det första SPÅR där föregående block redan slutat.
 *      Spåret är inte längre en kolumn att dela bredden på, utan bara
 *      hur djupt in i trappan blocket hamnar. Att spåren återanvänds är
 *      poängen: ett möte klockan fjorton skjuts inte in bara för att två
 *      möten krockade klockan nio.
 *   3. Räkna ut inskjutet ur spåret, och stapla efter STARTTID — och vid
 *      samma starttid efter LÄNGD, kortast överst.
 *
 *      Att den som börjar först ligger överst är den ordning man läser
 *      dagen i. Längdregeln är den som gör det användbart på en riktig
 *      arbetsdag: ett halvtimmesmöte inne i ett tvåtimmarspass skall
 *      ligga ovanpå passet, inte begravas under det. Tvärtom vore det
 *      långa blocket alltid överst helt enkelt för att det är långt, och
 *      då syns aldrig de korta mötena — som är just de man behöver se.
 *
 *      Notera att staplingen därför INTE följer spåren. Spåren fördelas
 *      längsta först, eftersom det packar snyggast och låter det långa
 *      passet ligga kvar i vänsterkant i full bredd; staplingen räknas
 *      för sig.
 *
 * Ett block som täcker något annat får en delvis genomskinlig yta, så
 * att det undre blockets text går att ana igenom. Ramen och den egna
 * texten förblir helt täckande — hade hela blocket tonats ned vore även
 * det översta mötet svårläst, och då vore ingenting vunnet.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.laggUt = laggUt;
exports.laggUtBand = laggUtBand;
/** Hur långt in varje steg i trappan skjuts, som andel av kolumnbredden. */
const TRAPPSTEG = 0.18;
/**
 * Trappan får aldrig äta mer än så här mycket av bredden.
 *
 * Utan taket blir sex krockande möten en trappa som går ut ur kolumnen
 * och lämnar det sista blocket några pixlar brett. Med taket trycks
 * stegen ihop i stället, och det understa blocket behåller alltid minst
 * drygt en fjärdedel av bredden.
 */
const MAX_INSKJUT = 0.72;
/** Minsta längd ett block räknas som vid layout, i millisekunder.
 *  Ett femminutersmöte skall inte kunna gömma sig helt under ett annat. */
const MINSTA = 12 * 60000;
function laggUt(forekomster) {
    const ut = new Map();
    if (forekomster.length === 0)
        return ut;
    const poster = forekomster
        .map((f) => ({
        f,
        start: f.start.getTime(),
        slut: Math.max(f.slut.getTime(), f.start.getTime() + MINSTA),
        spar: -1,
        langd: f.slut.getTime() - f.start.getTime(),
        ordning: 0,
    }))
        .sort((a, b) => a.start - b.start || b.slut - a.slut);
    // Steg 1 — klustra.
    let kluster = [];
    let klusterSlut = -Infinity;
    const avslutaKluster = () => {
        if (kluster.length > 0)
            packa(kluster, ut);
        kluster = [];
        klusterSlut = -Infinity;
    };
    for (const p of poster) {
        if (p.start >= klusterSlut && kluster.length > 0)
            avslutaKluster();
        kluster.push(p);
        klusterSlut = Math.max(klusterSlut, p.slut);
    }
    avslutaKluster();
    return ut;
}
function packa(kluster, ut) {
    // Steg 2 — tilldela spår. Ett spår återanvänds så snart det är fritt.
    const spar = [];
    for (const p of kluster) {
        let placerad = false;
        for (let i = 0; i < spar.length; i++) {
            const sist = spar[i][spar[i].length - 1];
            if (sist.slut <= p.start) {
                spar[i].push(p);
                p.spar = i;
                placerad = true;
                break;
            }
        }
        if (!placerad) {
            p.spar = spar.length;
            spar.push([p]);
        }
    }
    // Steg 3 — trappan.
    const antal = spar.length;
    const steg = antal <= 1 ? 0 : Math.min(TRAPPSTEG, MAX_INSKJUT / (antal - 1));
    /*
     * Staplingen sorteras för sig, inte ur spåren.
     *
     * Sist i jämförelsen står nyckeln. Den avgör aldrig något man bryr sig
     * om, men den gör ordningen TOTAL — utan den kan två likadana möten
     * byta plats mellan två renderingar, och blocket man siktade på hinner
     * hoppa upp eller ned medan fingret är på väg.
     */
    const stapling = [...kluster].sort((a, b) => a.start - b.start ||
        a.langd - b.langd ||
        a.f.nyckel.localeCompare(b.f.nyckel));
    stapling.forEach((p, i) => {
        p.ordning = i;
    });
    const toppen = kluster.length;
    for (const p of kluster) {
        const vanster = p.spar * steg;
        /*
         * Täcker blocket något? Bara ett block som verkligen ligger över ett
         * annat I TIDEN skall bli genomskinligt. Att gå på spår räcker inte:
         * ett möte klockan fjorton kan mycket väl ligga i spår noll utan att
         * ha något under sig alls.
         */
        const over = kluster.some((q) => q.ordning > p.ordning && q.start < p.slut && p.start < q.slut);
        ut.set(p.f.nyckel, {
            vanster,
            // Varje block når högerkanten. Det är det som gör att titeln på
            // det översta blocket får hela den plats den behöver.
            bredd: 1 - vanster,
            lager: toppen - p.ordning,
            over,
        });
    }
}
function laggUtBand(poster, antalKolumner) {
    const sorterade = [...poster].sort((a, b) => a.fran - b.fran || b.till - b.fran - (a.till - a.fran));
    // Varje rad håller reda på vilka kolumner som är upptagna.
    const rader = [];
    const band = [];
    for (const p of sorterade) {
        const fran = Math.max(0, p.fran);
        const till = Math.min(antalKolumner, p.till);
        if (till <= fran)
            continue;
        let radIndex = rader.findIndex((rad) => {
            for (let i = fran; i < till; i++)
                if (rad[i])
                    return false;
            return true;
        });
        if (radIndex === -1) {
            radIndex = rader.length;
            rader.push(new Array(antalKolumner).fill(false));
        }
        for (let i = fran; i < till; i++)
            rader[radIndex][i] = true;
        band.push({
            nyckel: p.forekomst.nyckel,
            forekomst: p.forekomst,
            fran,
            till,
            rad: radIndex,
            klipptVanster: p.fran < 0,
            klipptHoger: p.till > antalKolumner,
        });
    }
    return { band, rader: rader.length };
}
