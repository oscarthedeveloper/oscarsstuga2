"use strict";
/**
 * Privatekonomi — månadsplanering.
 *
 * Sidan är gjord för ritualen strax före löning: pengarna kommer in och
 * skall fördelas. PLANEN handlar därför om KATEGORIER och aldrig om
 * enskilda utgifter. En kaffe för 49 kronor hör inte hemma någonstans på
 * sidan; "Nöjen 2 000" hör hemma i planen.
 *
 * Tre saker hänger ihop och måste hållas isär:
 *
 *   KATEGORIERNA lever ovanför månaderna. Att de är gemensamma är hela
 *   förutsättningen för att kunna jämföra augusti med juli — hade varje
 *   månad haft sina egna rader vore "samma kategori" bara en förhoppning
 *   om att man stavat likadant.
 *
 *   MÅNADEN bär ett belopp per kategori: PLAN före löning och UTFALL
 *   efter månadens slut. Utfallet är frivilligt; en månad man aldrig
 *   summerade är inte en trasig månad.
 *
 *   MALLEN fyller i en ny månad. Ritualen skall vara att justera, inte
 *   att börja om från ett tomt papper varje gång.
 *
 * Två register ligger BREDVID månadsplanen och inte i den:
 *
 *   INKÖPEN är de enskilda utgifter som är stora nog att minnas —
 *   "Airpods Pro 2 500", inte dagens fika. De hör till ett datum och
 *   därmed till en månad, och de FÖRESLÅR månadens utfall utan att
 *   skriva det. Ett utfall som räknades fram av sig självt vore ett tal
 *   man slutade äga: den dag ett inköp glömdes bort skulle summan se
 *   lika färdig ut som annars, fast den vore fel.
 *
 *   ABONNEMANGEN är det som dras utan att man gör något. Hela avgiften
 *   räknas i den månad den faktiskt dras — 250 kronor om året belastar
 *   en månad och inte tolv med tjugoen kronor styck, eftersom det förra
 *   är vad kontoutdraget visar. Årskostnaden står bredvid, för det är
 *   den frågan man ställer när man överväger att säga upp något.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOM_EKONOMI = void 0;
exports.tolkaKrona = tolkaKrona;
exports.kronor = kronor;
exports.kronorMedTecken = kronorMedTecken;
exports.procent = procent;
exports.manadsNyckel = manadsNyckel;
exports.manadsText = manadsText;
exports.nastaManad = nastaManad;
exports.manadAvDatum = manadAvDatum;
exports.klamManad = klamManad;
exports.foregaendeManad = foregaendeManad;
exports.klamTon = klamTon;
exports.tolkaEkonomiData = tolkaEkonomiData;
exports.summaPlan = summaPlan;
exports.summaUtfall = summaUtfall;
exports.harUtfall = harUtfall;
exports.kvarAttFordela = kvarAttFordela;
exports.andelAvInkomst = andelAvInkomst;
exports.avvikelse = avvikelse;
exports.postFor = postFor;
exports.manadMed = manadMed;
exports.motForegaende = motForegaende;
exports.summaInkop = summaInkop;
exports.inkopIManad = inkopIManad;
exports.inkopPerKategori = inkopPerKategori;
exports.inkopFor = inkopFor;
exports.dras = dras;
exports.abonnemangIManad = abonnemangIManad;
exports.abonnemangsKostnad = abonnemangsKostnad;
exports.abonnemangPerAr = abonnemangPerAr;
exports.nastaDragning = nastaDragning;
exports.arSparande = arSparande;
exports.sparandePlan = sparandePlan;
exports.sparandeUtfall = sparandeUtfall;
exports.sparkvot = sparkvot;
exports.framsteg = framsteg;
exports.genomsnittligtSparande = genomsnittligtSparande;
exports.prognos = prognos;
exports.manadUrMall = manadUrMall;
exports.nastaLedigaManad = nastaLedigaManad;
const tid_1 = require("../tid");
exports.TOM_EKONOMI = {
    kategorier: [],
    manader: [],
    mall: { inkomst: null, poster: [] },
    mal: { namn: "", belopp: null, start: null },
    inkop: [],
    abonnemang: [],
};
/* ==================================================================
   BELOPP
   ================================================================== */
/**
 * Tolkar ett belopp ur ett textfält.
 *
 * Mellanrum stryks, både vanliga och hårda: man skriver "7 500" precis
 * som beloppet visas, och ett fält som vägrar sin egen utskrift är ett
 * fält man slutar lita på. Komma duger som decimaltecken, och ett
 * avslutande "kr" får finnas kvar.
 *
 * Tomt blir NULL och inte noll. Skillnaden är hela poängen: en kategori
 * utan siffra är ofylld, en kategori med noll är medvetet nollad, och
 * bara det senare skall räknas in i en summa som ser färdig ut.
 */
function tolkaKrona(rå) {
    if (typeof rå === "number") {
        return Number.isFinite(rå) ? rå : null;
    }
    if (typeof rå !== "string")
        return null;
    const rensad = rå
        .replace(/ /g, "")
        .replace(/\s/g, "")
        .replace(/kr\.?$/i, "")
        .replace(",", ".");
    if (rensad === "" || rensad === "-")
        return null;
    const n = Number(rensad);
    return Number.isFinite(n) ? n : null;
}
/** "7 500" — hårt mellanrum, så att beloppet aldrig bryts över en rad. */
function kronor(n, streck = "—") {
    if (n === null)
        return streck;
    const avrundat = Math.round(n);
    const tecken = avrundat < 0 ? "−" : "";
    const siffror = String(Math.abs(avrundat)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${tecken}${siffror}`;
}
/** Med tecken utsatt: "+380" eller "−1 300". */
function kronorMedTecken(n, streck = "—") {
    if (n === null)
        return streck;
    const avrundat = Math.round(n);
    if (avrundat === 0)
        return "0";
    return `${avrundat > 0 ? "+" : "−"}${kronor(Math.abs(avrundat))}`;
}
function procent(andel, streck = "—") {
    if (andel === null || !Number.isFinite(andel))
        return streck;
    return `${Math.round(andel * 100)} %`;
}
/* ==================================================================
   MÅNADSNYCKLAR
   ================================================================== */
function manadsNyckel(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function manadsText(id) {
    const m = id.match(/^(\d{4})-(\d{2})$/);
    if (!m)
        return id;
    const index = Number(m[2]) - 1;
    const namn = tid_1.MANADER[index] ?? id;
    return `${namn} ${m[1]}`;
}
function nastaManad(id) {
    const m = id.match(/^(\d{4})-(\d{2})$/);
    if (!m)
        return id;
    const ar = Number(m[1]);
    const manad = Number(m[2]);
    return manad === 12
        ? `${ar + 1}-01`
        : `${ar}-${String(manad + 1).padStart(2, "0")}`;
}
/** Månaden ett datum ("2026-08-14") hör till, eller null om det är skräp. */
function manadAvDatum(datum) {
    const m = datum.match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[1]}-${m[2]}` : null;
}
/** 1–12. Allt annat blir januari — ett värde utanför skalan är ingen månad. */
function klamManad(n) {
    const t = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(t))
        return 1;
    return Math.min(12, Math.max(1, Math.round(t)));
}
function foregaendeManad(id) {
    const m = id.match(/^(\d{4})-(\d{2})$/);
    if (!m)
        return id;
    const ar = Number(m[1]);
    const manad = Number(m[2]);
    return manad === 1
        ? `${ar - 1}-12`
        : `${ar}-${String(manad - 1).padStart(2, "0")}`;
}
/* ==================================================================
   TOLKNING
   ================================================================== */
const arObjekt = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
const text = (x) => (typeof x === "string" ? x : "");
function lista(x, tolk) {
    if (!Array.isArray(x))
        return [];
    const ut = [];
    for (let i = 0; i < x.length; i++) {
        const rad = x[i];
        if (!arObjekt(rad))
            continue;
        const tolkad = tolk(rad, i);
        if (tolkad !== null)
            ut.push(tolkad);
    }
    return ut;
}
function klamTon(n) {
    const t = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(t))
        return 0;
    return ((Math.round(t) % 6) + 6) % 6;
}
function tolkaEkonomiData(rå) {
    if (!arObjekt(rå))
        return exports.TOM_EKONOMI;
    const kategorier = lista(rå.kategorier, (k, i) => ({
        id: text(k.id) || `k${i}`,
        namn: text(k.namn),
        sparande: k.sparande === true,
        ton: klamTon(k.ton),
    }));
    const kanda = new Set(kategorier.map((k) => k.id));
    /* En post mot en kategori som inte finns går inte att rita, inte att
       summera och inte att rätta. Den faller bort tyst. */
    const poster = (x) => lista(x, (p) => {
        const kategoriId = text(p.kategoriId);
        if (!kanda.has(kategoriId))
            return null;
        return {
            kategoriId,
            plan: tolkaKrona(p.plan),
            utfall: tolkaKrona(p.utfall),
        };
    });
    const manader = lista(rå.manader, (m) => {
        const id = text(m.id);
        if (!/^\d{4}-\d{2}$/.test(id))
            return null;
        return {
            id,
            inkomst: tolkaKrona(m.inkomst),
            poster: poster(m.poster),
            anteckning: text(m.anteckning),
        };
    }).sort((a, b) => a.id.localeCompare(b.id));
    const råMall = arObjekt(rå.mall) ? rå.mall : {};
    const råMal = arObjekt(rå.mal) ? rå.mal : {};
    /* Ett inköp mot en kategori som inte längre finns tappar sin
       kategori, men INTE sig självt. Pengarna gick åt oavsett vad raden
       hette, och att låta en omdöpt budget radera historiken vore att
       låta bokföringen bero på hur man ordnat sina fack. */
    const inkop = lista(rå.inkop, (p, i) => {
        const datum = text(p.datum);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datum))
            return null;
        const kategoriId = text(p.kategoriId);
        return {
            id: text(p.id) || `i${i}`,
            datum,
            namn: text(p.namn),
            belopp: tolkaKrona(p.belopp),
            kategoriId: kanda.has(kategoriId) ? kategoriId : "",
        };
    }).sort((a, b) => b.datum.localeCompare(a.datum));
    const abonnemang = lista(rå.abonnemang, (a, i) => ({
        id: text(a.id) || `a${i}`,
        namn: text(a.namn),
        belopp: tolkaKrona(a.belopp),
        period: (a.period === "ar" ? "ar" : "manad"),
        dragManad: klamManad(a.dragManad),
        // Frånvarande fält betyder aktiv. Gammal data utan fältet skall
        // inte tolkas som att allt är pausat.
        aktiv: a.aktiv !== false,
    }));
    return {
        kategorier,
        manader,
        inkop,
        abonnemang,
        mall: {
            inkomst: tolkaKrona(råMall.inkomst),
            poster: lista(råMall.poster, (p) => {
                const kategoriId = text(p.kategoriId);
                if (!kanda.has(kategoriId))
                    return null;
                return { kategoriId, plan: tolkaKrona(p.plan) };
            }),
        },
        mal: {
            namn: text(råMal.namn),
            belopp: tolkaKrona(råMal.belopp),
            start: tolkaKrona(råMal.start),
        },
    };
}
/* ==================================================================
   MÅNADENS MATEMATIK
   ================================================================== */
const summa = (tal) => tal.reduce((s, n) => s + (n ?? 0), 0);
function summaPlan(m) {
    return summa(m.poster.map((p) => p.plan));
}
function summaUtfall(m) {
    return summa(m.poster.map((p) => p.utfall));
}
/** Sant om månaden har minst ett ifyllt utfall. */
function harUtfall(m) {
    return m.poster.some((p) => p.utfall !== null);
}
/**
 * Kronor kvar att fördela.
 *
 * Sidans viktigaste tal. Positivt betyder att något ännu inte fått en
 * plats; negativt att man lovat bort mer än som kommer in. Null när
 * inkomsten inte är ifylld — då är talet inte noll utan okänt, och en
 * nolla där hade sett ut som ett svar.
 */
function kvarAttFordela(m) {
    return m.inkomst === null ? null : m.inkomst - summaPlan(m);
}
function andelAvInkomst(belopp, m) {
    if (belopp === null || m.inkomst === null || m.inkomst === 0)
        return null;
    return belopp / m.inkomst;
}
/** Utfall minus plan. Positivt betyder att det gick åt mer än tänkt. */
function avvikelse(p) {
    return p.plan === null || p.utfall === null ? null : p.utfall - p.plan;
}
function postFor(m, kategoriId) {
    return m.poster.find((p) => p.kategoriId === kategoriId) ?? null;
}
function manadMed(data, id) {
    return data.manader.find((m) => m.id === id) ?? null;
}
/** Skillnaden i plan mot månaden innan. Null om den inte finns. */
function motForegaende(data, manadId, kategoriId) {
    const denna = manadMed(data, manadId);
    const forra = manadMed(data, foregaendeManad(manadId));
    if (!denna || !forra)
        return null;
    const a = postFor(denna, kategoriId)?.plan ?? null;
    const b = postFor(forra, kategoriId)?.plan ?? null;
    if (a === null || b === null)
        return null;
    return a - b;
}
/* ==================================================================
   INKÖPEN

   Loggen över enskilda utgifter. Den räknar aldrig om månadens utfall
   åt någon — den lägger fram ett tal som man med ett tryck kan göra
   till sitt. Skillnaden är hela poängen: ett föreslaget tal måste
   godkännas, och därmed läses.
   ================================================================== */
function summaInkop(inkop) {
    return summa(inkop.map((i) => i.belopp));
}
/** Inköpen i en månad, senast först. */
function inkopIManad(data, manadId) {
    return data.inkop
        .filter((i) => manadAvDatum(i.datum) === manadId)
        .sort((a, b) => b.datum.localeCompare(a.datum));
}
/**
 * Summan av månadens inköp per kategori.
 *
 * Inköp utan kategori hamnar under "" och kommer därmed med i månadens
 * totalsumma utan att föreslå något utfall — det finns ju ingen rad att
 * föreslå det för.
 */
function inkopPerKategori(data, manadId) {
    const ut = new Map();
    for (const i of inkopIManad(data, manadId)) {
        ut.set(i.kategoriId, (ut.get(i.kategoriId) ?? 0) + (i.belopp ?? 0));
    }
    return ut;
}
/**
 * Vad inköpen säger om en kategori i en månad.
 *
 * NULL när inga inköp bokförts, och inte noll. Noll skulle betyda "du
 * handlade ingenting", vilket är ett påstående sidan inte kan göra — det
 * som faktiskt gäller är att den inte vet.
 */
function inkopFor(data, manadId, kategoriId) {
    const har = data.inkop.some((i) => i.kategoriId === kategoriId && manadAvDatum(i.datum) === manadId);
    if (!har)
        return null;
    return inkopPerKategori(data, manadId).get(kategoriId) ?? 0;
}
/* ==================================================================
   ABONNEMANGEN

   Hela avgiften i den månad den dras. Det utslagna genomsnittet vore
   ett jämnare tal men ett tal som aldrig står på något kontoutdrag, och
   en sida vars siffror inte går att stämma av mot banken är en sida man
   slutar tro på.
   ================================================================== */
/** Sant om avgiften dras i den här månaden. */
function dras(a, manadId) {
    if (!a.aktiv)
        return false;
    if (a.period === "manad")
        return true;
    const m = manadId.match(/^\d{4}-(\d{2})$/);
    return m ? Number(m[1]) === a.dragManad : false;
}
function abonnemangIManad(data, manadId) {
    return data.abonnemang.filter((a) => dras(a, manadId));
}
/** Vad abonnemangen drar i en bestämd månad. */
function abonnemangsKostnad(data, manadId) {
    return summa(abonnemangIManad(data, manadId).map((a) => a.belopp));
}
/** Vad abonnemangen kostar på ett år. Månadsavgifter gånger tolv. */
function abonnemangPerAr(data) {
    return data.abonnemang
        .filter((a) => a.aktiv)
        .reduce((s, a) => s + (a.belopp ?? 0) * (a.period === "manad" ? 12 : 1), 0);
}
/**
 * Månaden avgiften nästa gång dras, räknat från och med `fran`.
 *
 * Null för pausade: ett datum för något som inte dras vore ett löfte om
 * en händelse som aldrig kommer.
 */
function nastaDragning(a, fran = manadsNyckel(new Date())) {
    if (!a.aktiv)
        return null;
    const m = fran.match(/^(\d{4})-(\d{2})$/);
    if (!m)
        return null;
    if (a.period === "manad")
        return fran;
    const ar = Number(m[1]);
    const nu = Number(m[2]);
    const drag = klamManad(a.dragManad);
    const arDa = drag >= nu ? ar : ar + 1;
    return `${arDa}-${String(drag).padStart(2, "0")}`;
}
/* ==================================================================
   SPARANDET
   ================================================================== */
function arSparande(data, kategoriId) {
    return data.kategorier.some((k) => k.id === kategoriId && k.sparande);
}
/** Planerat sparande i en månad. */
function sparandePlan(data, m) {
    return summa(m.poster.filter((p) => arSparande(data, p.kategoriId)).map((p) => p.plan));
}
/** Faktiskt sparande i en månad. */
function sparandeUtfall(data, m) {
    return summa(m.poster.filter((p) => arSparande(data, p.kategoriId)).map((p) => p.utfall));
}
/** Andelen av inkomsten som läggs undan. */
function sparkvot(data, m) {
    return andelAvInkomst(sparandePlan(data, m), m);
}
/**
 * Framstegen mot sparmålet.
 *
 * Räknas på UTFALL och inte på plan. Ett mål som kryper närmare för att
 * man planerat att spara är inget mål, det är en önskelista — och den
 * som ser sig vara framme utan att vara det har blivit lurad av sitt
 * eget verktyg.
 */
function framsteg(data) {
    const undanlagt = (data.mal.start ?? 0) +
        data.manader.reduce((s, m) => s + sparandeUtfall(data, m), 0);
    const mal = data.mal.belopp;
    return {
        undanlagt,
        mal,
        andel: mal === null || mal <= 0 ? null : undanlagt / mal,
        kvar: mal === null ? null : Math.max(0, mal - undanlagt),
    };
}
/**
 * Genomsnittligt sparande per månad.
 *
 * Räknas på de månader som har ett ifyllt utfall. Har ingen månad
 * summerats ännu används den senaste månadens PLAN i stället — en
 * prognos byggd på avsikt är svagare än en byggd på utfall, men bättre
 * än ingen prognos alls den första månaden.
 */
function genomsnittligtSparande(data) {
    const med = data.manader.filter(harUtfall);
    if (med.length > 0) {
        const s = med.reduce((t, m) => t + sparandeUtfall(data, m), 0);
        return s / med.length;
    }
    const senaste = data.manader[data.manader.length - 1];
    if (!senaste)
        return null;
    const plan = sparandePlan(data, senaste);
    return plan > 0 ? plan : null;
}
/**
 * När målet nås med nuvarande takt.
 *
 * Null när takten är noll eller negativ — då nås målet aldrig, och ett
 * datum långt fram i tiden vore en lögn med tre decimalers precision.
 */
function prognos(data, fran = manadsNyckel(new Date())) {
    const f = framsteg(data);
    if (f.kvar === null)
        return null;
    if (f.kvar === 0)
        return { manader: 0, manadsId: fran, takt: 0 };
    const takt = genomsnittligtSparande(data);
    if (takt === null || takt <= 0)
        return null;
    const manader = Math.ceil(f.kvar / takt);
    // Ett tak, så att en försumbar takt inte ger ett årtal på fem siffror.
    if (manader > 1200)
        return null;
    let id = fran;
    for (let i = 0; i < manader; i++)
        id = nastaManad(id);
    return { manader, manadsId: id, takt };
}
/* ==================================================================
   MÅNADER OCH MALL
   ================================================================== */
/**
 * En ny månad, ifylld ur mallen.
 *
 * Kategorier som saknas i mallen kommer med som tomma poster i stället
 * för att utelämnas. En kategori som inte syns är en kategori man glömmer
 * att fördela till, och hela sidan finns för att ingenting skall glömmas
 * bort just den kvarten före löning.
 */
function manadUrMall(data, id) {
    const iMallen = new Map(data.mall.poster.map((p) => [p.kategoriId, p.plan]));
    return {
        id,
        inkomst: data.mall.inkomst,
        poster: data.kategorier.map((k) => ({
            kategoriId: k.id,
            plan: iMallen.get(k.id) ?? null,
            utfall: null,
        })),
        anteckning: "",
    };
}
/** Nästa månad att lägga upp: efter den sista, annars innevarande. */
function nastaLedigaManad(data, idag = new Date()) {
    const sista = data.manader[data.manader.length - 1];
    const nu = manadsNyckel(idag);
    if (!sista)
        return nu;
    const efter = nastaManad(sista.id);
    // Ligger historiken redan i framtiden är nästa lediga den efter den —
    // inte innevarande månad, som ju redan finns.
    return efter > nu ? efter : nu > sista.id ? nu : efter;
}
