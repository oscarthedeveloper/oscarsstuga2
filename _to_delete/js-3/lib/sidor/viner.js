"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPPDELNINGAR = exports.ORDNINGAR = exports.KODPREFIX = exports.TOM_VIN_DATA = exports.TOM_PROFIL = exports.SKALOR = exports.TYPER = exports.lagesIndex = exports.LAGEN = void 0;
exports.nastaLage = nastaLage;
exports.typNamn = typNamn;
exports.typTon = typTon;
exports.skala = skala;
exports.harProfil = harProfil;
exports.gruppTon = gruppTon;
exports.formateraKod = formateraKod;
exports.nastaLedigaKod = nastaLedigaKod;
exports.tolkaTal = tolkaTal;
exports.kronor = kronor;
exports.betygstext = betygstext;
exports.procenttext = procenttext;
exports.klam = klam;
exports.tolkaBetyg = tolkaBetyg;
exports.tolkaSkalvarde = tolkaSkalvarde;
exports.trygsamUrl = trygsamUrl;
exports.tolkaLista = tolkaLista;
exports.skrivLista = skrivLista;
exports.tolkaVinData = tolkaVinData;
exports.vinTitel = vinTitel;
exports.vinUnderrad = vinUnderrad;
exports.vinFakta = vinFakta;
exports.arTomt = arTomt;
exports.smaknotsFot = smaknotsFot;
exports.flaskor = flaskor;
exports.rakna = rakna;
exports.andelDrucken = andelDrucken;
exports.medelbetyg = medelbetyg;
exports.oense = oense;
exports.ofullstandiga = ofullstandiga;
exports.filtreraViner = filtreraViner;
exports.sorteraViner = sorteraViner;
exports.fordelning = fordelning;
exports.betygMotPris = betygMotPris;
exports.smakkarta = smakkarta;
exports.pristak = pristak;
exports.LAGEN = [
    { id: "vill", namn: "Vill prova", kort: "VILL" },
    { id: "har", namn: "I källaren", kort: "HAR" },
    { id: "drucken", namn: "Drucken", kort: "DRU" },
];
const lagesIndex = (l) => Math.max(0, exports.LAGEN.findIndex((x) => x.id === l));
exports.lagesIndex = lagesIndex;
/** Nästa läge i flödet. Från sista går det runt till första. */
function nastaLage(l) {
    return exports.LAGEN[((0, exports.lagesIndex)(l) + 1) % exports.LAGEN.length].id;
}
exports.TYPER = [
    { id: "rott", namn: "Rött", ton: 2 },
    { id: "vitt", namn: "Vitt", ton: 0 },
    { id: "rose", namn: "Rosé", ton: 5 },
    { id: "mousserande", namn: "Mousserande", ton: 1 },
    { id: "sott", namn: "Sött", ton: 4 },
    { id: "starkvin", namn: "Starkvin", ton: 3 },
];
function typNamn(t) {
    return exports.TYPER.find((x) => x.id === t)?.namn ?? "Rött";
}
function typTon(t) {
    return exports.TYPER.find((x) => x.id === t)?.ton ?? 2;
}
exports.SKALOR = [
    { id: "fyllighet", vanster: "Lätt", hoger: "Fyllig" },
    { id: "stravhet", vanster: "Len", hoger: "Sträv" },
    { id: "sotma", vanster: "Torr", hoger: "Söt" },
    { id: "syra", vanster: "Mjuk", hoger: "Syrlig" },
];
function skala(id) {
    const s = exports.SKALOR.find((x) => x.id === id);
    return s ? { vanster: s.vanster, hoger: s.hoger } : { vanster: "", hoger: "" };
}
exports.TOM_PROFIL = {
    fyllighet: null,
    stravhet: null,
    sotma: null,
    syra: null,
};
/** Sant om minst en av de fyra skalorna är ifylld. */
function harProfil(p) {
    return exports.SKALOR.some((s) => p[s.id] !== null);
}
/**
 * Färgen en smakgrupp får.
 *
 * Sex färger och betydligt fler grupper — krockar är oundvikliga, och
 * det gör inget: det är ORDET som bär betydelsen, färgen bara ordnar
 * kortet i raden. En okänd grupp får därför blyerts och ingen gissad
 * färg. En färg som betyder ingenting är värre än ingen färg.
 */
const GRUPPTON = {
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
function gruppTon(grupp) {
    return GRUPPTON[grupp.trim().toLowerCase()] ?? 3;
}
exports.TOM_VIN_DATA = { viner: [], nastaKod: 1 };
/* ==================================================================
   KODEN
   ================================================================== */
exports.KODPREFIX = "VIN";
function formateraKod(nummer) {
    return `${exports.KODPREFIX}-${String(Math.max(1, Math.round(nummer))).padStart(3, "0")}`;
}
/**
 * Nästa lediga löpnummer.
 *
 * Räknaren i lagret är sanningen, men den kan ha hamnat efter: två
 * enheter som lägger till varsitt vin offline får samma nummer, och den
 * som synkar sist skulle annars skriva en dubblett. Därför tas alltid
 * det största av räknaren och det högsta använda numret.
 */
function nastaLedigaKod(data) {
    let hogst = 0;
    for (const v of data.viner) {
        const m = v.kod.match(/(\d+)\s*$/);
        if (m)
            hogst = Math.max(hogst, Number(m[1]));
    }
    return Math.max(data.nastaKod, hogst + 1, 1);
}
/* ==================================================================
   TAL OCH TEXT
   ================================================================== */
const arObjekt = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
const text = (x) => (typeof x === "string" ? x : "");
function lista(x, tolk) {
    if (!Array.isArray(x))
        return [];
    return x.filter(arObjekt).map(tolk);
}
const idFor = (rad, prefix, i) => text(rad.id) || `${prefix}${i}`;
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
function tolkaTal(rå) {
    if (typeof rå === "number")
        return Number.isFinite(rå) ? rå : null;
    if (typeof rå !== "string")
        return null;
    const rensad = rå
        .replace(/\s/g, "")
        .replace(/ /g, "")
        .replace(/(kr|%)\.?$/i, "")
        .replace(",", ".");
    if (rensad === "" || rensad === "-")
        return null;
    const n = Number(rensad);
    return Number.isFinite(n) ? n : null;
}
/** "1 299" — hårt mellanrum, så att beloppet aldrig bryts över en rad. */
function kronor(n, streck = "—") {
    if (n === null)
        return streck;
    const avrundat = Math.round(n);
    const tecken = avrundat < 0 ? "−" : "";
    const siffror = String(Math.abs(avrundat)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${tecken}${siffror}`;
}
/** Betyg med en decimal och svenskt komma: "3,7". */
function betygstext(n, streck = "—") {
    if (n === null || !Number.isFinite(n))
        return streck;
    return n.toFixed(1).replace(".", ",");
}
/** Procenttal med en decimal: "13,5 %". */
function procenttext(n, streck = "—") {
    if (n === null || !Number.isFinite(n))
        return streck;
    const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
    return `${s.replace(".", ",")} %`;
}
/** Klämmer ett värde till ett spann. */
function klam(v, lag, hog) {
    return Math.min(hog, Math.max(lag, v));
}
/** Betyg hålls inom 1–5. Utanför skalan är det inget betyg. */
function tolkaBetyg(rå) {
    const n = tolkaTal(rå);
    if (n === null)
        return null;
    return klam(n, 0, 5);
}
/** Skalvärde hålls inom 0–100. */
function tolkaSkalvarde(rå) {
    const n = tolkaTal(rå);
    if (n === null)
        return null;
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
function trygsamUrl(rå) {
    const s = text(rå).trim();
    if (!s)
        return "";
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
function tolkaLista(rå) {
    if (Array.isArray(rå)) {
        return rå.map((x) => text(x).trim()).filter(Boolean);
    }
    return text(rå)
        .split(/[,\n;]/)
        .map((s) => s.trim())
        .filter(Boolean);
}
function skrivLista(rader) {
    return rader.join(", ");
}
/* ==================================================================
   TOLKNING
   ================================================================== */
function tolkaLage(x) {
    const l = text(x);
    return exports.LAGEN.some((y) => y.id === l) ? l : "vill";
}
function tolkaTyp(x) {
    const t = text(x);
    return exports.TYPER.some((y) => y.id === t) ? t : "rott";
}
function tolkaProfil(x) {
    const rå = arObjekt(x) ? x : {};
    return {
        fyllighet: tolkaSkalvarde(rå.fyllighet),
        stravhet: tolkaSkalvarde(rå.stravhet),
        sotma: tolkaSkalvarde(rå.sotma),
        syra: tolkaSkalvarde(rå.syra),
    };
}
const arDatum = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
function tolkaVinData(rå) {
    if (!arObjekt(rå))
        return exports.TOM_VIN_DATA;
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
function vinTitel(v) {
    const namn = v.namn.trim();
    const producent = v.producent.trim();
    const argang = v.argang.trim();
    let rad = namn;
    if (producent && !namn.toLowerCase().startsWith(producent.toLowerCase())) {
        rad = rad ? `${producent} ${rad}` : producent;
    }
    if (!rad)
        rad = "Namnlöst vin";
    return argang ? `${rad} ${argang}` : rad;
}
/** Underraden: land, region, druvor och alkohol, det som är ifyllt. */
function vinUnderrad(v) {
    const delar = [];
    const plats = [v.land.trim(), v.region.trim()].filter(Boolean).join(" · ");
    if (plats)
        delar.push(plats);
    if (v.druvor.length > 0)
        delar.push(skrivLista(v.druvor));
    if (v.alkohol !== null)
        delar.push(procenttext(v.alkohol));
    return delar;
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
function vinFakta(v) {
    const rader = [];
    const lagg = (etikett, varde) => {
        if (varde.trim())
            rader.push({ etikett, varde: varde.trim() });
    };
    lagg("Producent", v.producent);
    lagg("Årgång", v.argang);
    lagg("Druvor", skrivLista(v.druvor));
    lagg("Ursprung", [v.land.trim(), v.region.trim()].filter(Boolean).join(" / "));
    lagg("Vinstil", v.vinstil);
    lagg("Slag", typNamn(v.typ));
    if (v.alkohol !== null)
        lagg("Alkoholvolym", procenttext(v.alkohol));
    if (v.pris !== null)
        lagg("Pris per flaska", `${kronor(v.pris)} kr`);
    lagg("Inköpsställe", v.inkopsstalle);
    lagg("Artikelnummer", v.artikelnummer);
    /* Lagret och drickandet står bara där de betyder något. "0 flaskor"
       under ett vin man vill prova är inte en upplysning utan en gåta. */
    if (v.lage === "har") {
        const n = flaskor(v);
        lagg("I källaren", `${n} ${n === 1 ? "flaska" : "flaskor"}`);
    }
    if (v.lage === "drucken")
        lagg("Drucket", v.druckenDatum);
    if (v.passarTill.length > 0)
        lagg("Passar till", skrivLista(v.passarTill));
    return rader;
}
/**
 * Sant när det inte finns någonting alls att visa.
 *
 * Ett nyss tillagt vin har varken fakta, betyg, profil eller text, och
 * ett visningsläge som då ritar en tom yta ser trasigt ut. Sidan skall i
 * stället säga att det är tomt och peka på redigeringsknappen.
 */
function arTomt(v) {
    return (v.namn.trim() === "" &&
        // Ett vin har ALLTID ett slag — det har ett förval. En ensam rad i
        // faktatabellen är därför lika tomt som ingen rad alls.
        vinFakta(v).length <= 1 &&
        v.egetBetyg === null &&
        v.vivinoBetyg === null &&
        !harProfil(v.profil) &&
        v.smaknoter.length === 0 &&
        v.beskrivning.trim() === "" &&
        v.anteckning.trim() === "" &&
        v.bildUrl === "");
}
/** Kortets fot på Vivinos vis: "1 511 kommentarer om fatad toner". */
function smaknotsFot(n) {
    const grupp = n.grupp.trim();
    if (n.antal === null)
        return grupp ? `${grupp} toner` : "";
    const ord = `${kronor(n.antal)} ${n.antal === 1 ? "kommentar" : "kommentarer"}`;
    return grupp ? `${ord} om ${grupp} toner` : ord;
}
/**
 * Ett vin i källaren utan ifyllt antal räknas som EN flaska.
 *
 * Noll vore fel: man har uppenbarligen vinet, annars stod det inte i
 * källaren. Att i stället låta bli att räkna det alls hade gett en
 * flasksumma som är mindre än antalet viner, vilket ser ut som ett fel.
 */
function flaskor(v) {
    if (v.lage !== "har")
        return 0;
    return v.antal === null ? 1 : Math.max(0, Math.round(v.antal));
}
function rakna(data) {
    const ut = {
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
        if (v.pris !== null)
            ut.varde += v.pris * antal;
    }
    return ut;
}
/** Andelen av registret som är drucket, 0–1. */
function andelDrucken(r) {
    return r.totalt === 0 ? 0 : r.drucken / r.totalt;
}
/**
 * Snittet av ett betyg över de viner som HAR det betyget.
 *
 * Ofyllda viner räknas inte som nollor. Ett vin man inte satt betyg på
 * är inte ett dåligt vin, och en nolla i nämnaren hade dragit ned
 * snittet för varje vin man ännu inte hunnit bedöma.
 */
function medelbetyg(data, vems) {
    const tal = data.viner
        .map((v) => (vems === "eget" ? v.egetBetyg : v.vivinoBetyg))
        .filter((n) => n !== null);
    if (tal.length === 0)
        return null;
    return tal.reduce((s, n) => s + n, 0) / tal.length;
}
/** Ditt betyg minus Vivinos. Positivt betyder att du tyckte bättre. */
function oense(v) {
    if (v.egetBetyg === null || v.vivinoBetyg === null)
        return null;
    return v.egetBetyg - v.vivinoBetyg;
}
/**
 * Viner som saknar uppgifter och inte sagt ifrån om det.
 *
 * Detta är sidans "återstår att göra": vin som varken har smakprofil
 * eller är märkta som omöjliga att slå upp. De som ÄR märkta räknas
 * inte, för då finns ingenting kvar att göra åt dem.
 */
function ofullstandiga(data) {
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
function filtreraViner(data, fraga, lage, typ) {
    const termer = fraga.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.viner.filter((v) => {
        if (lage && v.lage !== lage)
            return false;
        if (typ && v.typ !== typ)
            return false;
        if (termer.length === 0)
            return true;
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
exports.ORDNINGAR = [
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
function sorteraViner(viner, efter = "kod") {
    const sist = (n, fallande) => n === null ? (fallande ? -Infinity : Infinity) : n;
    return [...viner].sort((a, b) => {
        switch (efter) {
            case "betyg":
                return (sist(b.egetBetyg ?? b.vivinoBetyg, true) -
                    sist(a.egetBetyg ?? a.vivinoBetyg, true) ||
                    a.kod.localeCompare(b.kod));
            case "pris":
                return (sist(a.pris, false) - sist(b.pris, false) || a.kod.localeCompare(b.kod));
            case "namn":
                return vinTitel(a).localeCompare(vinTitel(b), "sv") ||
                    a.kod.localeCompare(b.kod);
            default:
                return a.kod.localeCompare(b.kod);
        }
    });
}
exports.UPPDELNINGAR = [
    { id: "typ", namn: "Typ" },
    { id: "land", namn: "Land" },
    { id: "druva", namn: "Druva" },
    { id: "producent", namn: "Producent" },
    { id: "vinstil", namn: "Vinstil" },
];
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
function fordelning(viner, efter) {
    const rakning = new Map();
    const toner = new Map();
    const lagg = (namn, ton) => {
        const nyckel = namn.trim() || "Ej ifyllt";
        rakning.set(nyckel, (rakning.get(nyckel) ?? 0) + 1);
        if (!toner.has(nyckel))
            toner.set(nyckel, ton);
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
                if (v.druvor.length === 0)
                    lagg("", 0);
                else
                    for (const d of v.druvor)
                        lagg(d, 0);
                break;
        }
    }
    const delar = [...rakning.entries()]
        .map(([namn, antal]) => ({ id: namn, namn, antal, ton: toner.get(namn) ?? 0 }))
        .sort((a, b) => b.antal - a.antal || a.namn.localeCompare(b.namn, "sv"));
    /* Typen bär sin bundna färg; övriga uppdelningar har ingen naturlig
       och får paletten i storleksordning. Att ge dem slumpade toner hade
       betytt att stapeln bytte färg varje gång man lade till ett vin. */
    if (efter === "typ")
        return delar;
    return delar.map((d, i) => ({
        ...d,
        ton: d.namn === "Ej ifyllt" ? 3 : i % 6,
    }));
}
/**
 * Betyg mot pris.
 *
 * Bara viner som har BÅDA talen kommer med. Att sätta ett saknat pris
 * till noll hade lagt vinet längst till vänster, där det ser ut att
 * vara ett fynd — och ett diagram som ljuger åt det hållet är precis
 * det man inte vill ha när man står och väljer flaska.
 */
function betygMotPris(viner, oppetId) {
    const ut = [];
    for (const v of viner) {
        const betyg = v.egetBetyg ?? v.vivinoBetyg;
        if (v.pris === null || betyg === null)
            continue;
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
function smakkarta(viner, xSkala, ySkala, oppetId) {
    const ut = [];
    for (const v of viner) {
        const x = v.profil[xSkala];
        const y = v.profil[ySkala];
        if (x === null || y === null)
            continue;
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
function pristak(punkter) {
    const hogsta = punkter.reduce((h, p) => Math.max(h, p.x), 0);
    return Math.max(200, Math.ceil(hogsta / 100) * 100);
}
