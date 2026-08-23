"use client";

/**
 * Mina viner — samling och smakminne.
 *
 * Sidan svarar på två frågor samtidigt, och därför ligger registret till
 * vänster och diagrammen till höger: registret är vad man ARBETAR i,
 * diagrammen vad man ser NÄR man arbetar. Ett vin man öppnar i listan
 * framhävs samtidigt i båda punktdiagrammen — det är den kopplingen som
 * gör diagrammen till en del av sidan i stället för prydnader under
 * den.
 *
 * "Avancerat" byggs här av täthet och precision, inte av nya färger.
 * Vinets slag bär en bunden ton som är densamma i stapeln, i smakkartan
 * och i punktdiagrammet; hade färgerna valts per diagram vore de
 * dekoration.
 *
 * Ingenting hämtas från Vivino. Uppgifterna skrivs in för hand och
 * länken sparas, så att källan går att gå tillbaka till. Ett vin som
 * inte GÅR att slå upp får säga det rent ut i stället för att i
 * evighet se ut att vänta på en inmatning.
 *
 * Ett öppnat vin har två lägen, som bladen på språksidan. LÄSLÄGET är
 * förvalet och ritar ett färdigt uppslag — fakta, betyg, smakprofil,
 * noter och text. REDIGERINGSLÄGET ritar samma sak som fält. Ett fält
 * som ser ut som en färdig sida är ändå ett fält: markören hamnar i
 * det, texten går att råka ändra, och skärmläsaren säger "inmatning"
 * där det står ett värde.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nyId } from "@/lib/butik";
import { nyckel, startAvDag } from "@/lib/tid";
import type { SidData, Sida } from "@/lib/typer";
import {
  LAGEN,
  ORDNINGAR,
  SKALOR,
  TYPER,
  UPPDELNINGAR,
  andelDrucken,
  arTomt,
  betygMotPris,
  betygstext,
  filtreraViner,
  flaskor,
  fordelning,
  formateraKod,
  gruppTon,
  harProfil,
  kronor,
  lagesIndex,
  medelbetyg,
  nastaLage,
  nastaLedigaKod,
  ofullstandiga,
  oense,
  pristak,
  procenttext,
  rakna,
  skala,
  skrivLista,
  smakkarta,
  smaknotsFot,
  sorteraViner,
  tolkaTal,
  tolkaVinData,
  trygsamUrl,
  typNamn,
  typTon,
  vinFakta,
  vinTitel,
  vinUnderrad,
  TOM_PROFIL,
  type Lage,
  type Ordning,
  type SkalId,
  type Typ,
  type Uppdelning,
  type Vin,
  type VinData,
} from "@/lib/sidor/viner";
import Avsnitt from "./block/Avsnitt";
import Betygsmatare from "./block/Betygsmatare";
import Delstapel from "./block/Delstapel";
import Listfalt from "./block/Listfalt";
import Punktdiagram from "./block/Punktdiagram";
import Smakskala from "./block/Smakskala";
import Talfalt from "./block/Talfalt";
import Vinuppslag from "./block/Vinuppslag";

const VILA_MS = 600;

const samma = (a: VinData, b: VinData) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Belopp skrivs "1 299". Talfältet får därför egna regler. */
const skrivKrona = (n: number | null) => (n === null ? "" : kronor(n));
/** Övriga tal skrivs med svenskt komma. */
const skrivTal = (n: number | null) =>
  n === null ? "" : String(n).replace(".", ",");

export default function Viner({
  sida,
  spara,
}: {
  sida: Sida | null;
  spara(data: SidData): void;
}) {
  const utifran = useMemo(() => tolkaVinData(sida?.data), [sida]);
  const [form, setForm] = useState<VinData>(utifran);

  const rord = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  const andra = useCallback((f: (d: VinData) => VinData) => {
    rord.current = true;
    setForm(f);
  }, []);

  useEffect(() => {
    if (!rord.current) return;
    if (samma(form, utifran)) {
      rord.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      rord.current = false;
      spara(form as unknown as SidData);
    }, VILA_MS);
    return () => window.clearTimeout(id);
  }, [form, utifran, spara]);

  useEffect(() => {
    if (rord.current) return;
    if (!samma(utifran, formRef.current)) setForm(utifran);
  }, [utifran]);

  /* ---------------------------------------------------------------
     Registret
     --------------------------------------------------------------- */
  const [fraga, setFraga] = useState("");
  const [filter, setFilter] = useState<Lage | null>(null);
  const [typfilter, setTypfilter] = useState<Typ | null>(null);
  const [ordning, setOrdning] = useState<Ordning>("kod");
  const [oppet, setOppet] = useState<string | null>(null);

  /*
   * Läsläge eller redigeringsläge.
   *
   * Läget hör till SESSIONEN och inte till vinet, precis som på
   * språksidan. Sitter man en kväll och skriver in tio flaskor ur
   * Vivino skall inte varje byte av vin kasta tillbaka en till läsläget
   * och kräva ett tryck till. Vid omladdning börjar man däremot i
   * läsläge — det är så man oftast öppnar ett vin.
   */
  const [redigerar, setRedigerar] = useState(false);

  /* Escape lämnar redigeringsläget — men inte medan man skriver i ett
     fält, där tangenten ofta betyder något annat för webbläsaren. */
  useEffect(() => {
    if (!redigerar) return;
    const paTangent = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const mal = e.target as HTMLElement | null;
      if (
        mal &&
        (mal.tagName === "INPUT" ||
          mal.tagName === "TEXTAREA" ||
          mal.tagName === "SELECT")
      ) {
        return;
      }
      setRedigerar(false);
    };
    window.addEventListener("keydown", paTangent);
    return () => window.removeEventListener("keydown", paTangent);
  }, [redigerar]);

  const raknat = useMemo(() => rakna(form), [form]);
  const synliga = useMemo(
    () => sorteraViner(filtreraViner(form, fraga, filter, typfilter), ordning),
    [form, fraga, filter, typfilter, ordning]
  );

  const nyttVin = () => {
    const nummer = nastaLedigaKod(form);
    const id = nyId();
    andra((d) => ({
      nastaKod: nummer + 1,
      viner: [
        ...d.viner,
        {
          id,
          kod: formateraKod(nummer),
          namn: "",
          producent: "",
          argang: "",
          land: "",
          region: "",
          vinstil: "",
          typ: "rott" as Typ,
          druvor: [],
          alkohol: null,
          lage: "vill" as Lage,
          antal: null,
          druckenDatum: "",
          pris: null,
          inkopsstalle: "",
          artikelnummer: "",
          vivinoUrl: "",
          systembolagetUrl: "",
          bildUrl: "",
          vivinoBetyg: null,
          vivinoAntal: null,
          egetBetyg: null,
          profil: { ...TOM_PROFIL },
          smaknoter: [],
          passarTill: [],
          beskrivning: "",
          anteckning: "",
          uppgifterSaknas: false,
          skapad: nyckel(startAvDag(new Date())),
        },
      ],
    }));
    setFilter(null);
    setTypfilter(null);
    setFraga("");
    setOppet(id);
    // Ett tomt vin har ingenting att läsa.
    setRedigerar(true);
  };

  const andraVin = (id: string, delar: Partial<Vin>) =>
    andra((d) => ({
      ...d,
      viner: d.viner.map((v) => (v.id === id ? { ...v, ...delar } : v)),
    }));

  const taBortVin = (id: string) =>
    andra((d) => ({ ...d, viner: d.viner.filter((v) => v.id !== id) }));

  /* ---------------------------------------------------------------
     Diagrammen
     --------------------------------------------------------------- */
  const [uppdelning, setUppdelning] = useState<Uppdelning>("typ");
  const [xSkala, setXSkala] = useState<SkalId>("fyllighet");
  const [ySkala, setYSkala] = useState<SkalId>("stravhet");

  /* Diagrammen ritar det FILTRERADE registret och inte allt.
     Ett filter man satt i listan och ett diagram som struntar i det är
     två svar på samma fråga, och man tror på fel av dem. */
  const delar = useMemo(
    () => fordelning(synliga, uppdelning),
    [synliga, uppdelning]
  );
  const prispunkter = useMemo(
    () => betygMotPris(synliga, oppet),
    [synliga, oppet]
  );
  const smakpunkter = useMemo(
    () => smakkarta(synliga, xSkala, ySkala, oppet),
    [synliga, xSkala, ySkala, oppet]
  );

  const mittSnitt = useMemo(() => medelbetyg(form, "eget"), [form]);
  const vivinoSnitt = useMemo(() => medelbetyg(form, "vivino"), [form]);
  const kvarAttFylla = useMemo(() => ofullstandiga(form).length, [form]);

  return (
    <div className="h-full min-h-0 overflow-y-auto tunnskroll">
      {/* ---------------- Mätarpanelen ---------------- */}
      <div className="matarpanel">
        <div>
          <span className="matarnamn">Flaskor</span>
          <span className="matartal block">{raknat.flaskor}</span>
        </div>
        <div>
          <span className="matarnamn">Källarens värde</span>
          <span className="matartal block">
            {raknat.varde > 0 ? kronor(raknat.varde) : "—"}
          </span>
        </div>
        <div>
          <span className="matarnamn">Ditt snitt</span>
          <span className="matartal block">{betygstext(mittSnitt)}</span>
        </div>
        <div>
          <span className="matarnamn">Vivinos snitt</span>
          <span className="matartal block">{betygstext(vivinoSnitt)}</span>
        </div>
        {/* Sidans "återstår att göra": viner utan smakprofil som inte
            heller sagt ifrån om att den inte går att hämta. Accent bara
            så länge talet inte är noll — noll är målet. */}
        <div>
          <span className="matarnamn">Att fylla i</span>
          <span
            className="matartal block"
            data-atgard={kvarAttFylla > 0 ? "1" : "0"}
          >
            {kvarAttFylla}
          </span>
        </div>

        <div className="flex-1 min-w-[9rem]">
          <span className="matarnamn">
            Källaren — {raknat.totalt} {raknat.totalt === 1 ? "vin" : "viner"},{" "}
            {Math.round(andelDrucken(raknat) * 100)} % druckna
          </span>
          <span
            className="andelsstapel"
            role="img"
            aria-label={`${raknat.vill} vill prova, ${raknat.har} i källaren, ${raknat.drucken} druckna`}
          >
            {/* Ett tomt register skulle ge tre nollbreda segment och en
                stapel som ser trasig ut. Då ritas den hellre tom. */}
            {raknat.totalt > 0 &&
              LAGEN.map((l) => (
                <span
                  key={l.id}
                  data-lage={l.id}
                  style={{ flexGrow: raknat[l.id], flexBasis: 0 }}
                />
              ))}
          </span>
        </div>

        <button
          type="button"
          className="knapp micro shrink-0"
          data-ton="accent"
          onClick={nyttVin}
        >
          + Vin
        </button>
      </div>

      <div className="p-2.5 md:p-3 grid gap-2.5 md:gap-3 items-start grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] max-w-[1400px]">
        {/* ---------------- Registret ---------------- */}
        <div className="min-w-0">
          <Avsnitt
            rubrik="Vinerna"
            bihang="Vill prova, i källaren, druckna"
            atgard={
              <div className="knapp-rad shrink-0">
                {ORDNINGAR.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="knapp pico"
                    data-aktiv={ordning === o.id ? "1" : "0"}
                    onClick={() => setOrdning(o.id)}
                    title={`Sortera på ${o.namn.toLowerCase()}`}
                  >
                    {o.namn}
                  </button>
                ))}
              </div>
            }
          >
            <div className="border-b border-ink/15 px-2.5 py-2 flex flex-col gap-2">
              <input
                className="falt"
                placeholder="Sök namn, producent, land, druva, vinstil eller kod"
                value={fraga}
                onChange={(e) => setFraga(e.target.value)}
                aria-label="Sök i registret"
              />
              <div className="chiprad items-center">
                <button
                  type="button"
                  className="knapp pico"
                  data-aktiv={filter === null ? "1" : "0"}
                  onClick={() => setFilter(null)}
                >
                  Alla {raknat.totalt}
                </button>
                {LAGEN.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="knapp pico"
                    data-aktiv={filter === l.id ? "1" : "0"}
                    onClick={() => setFilter(filter === l.id ? null : l.id)}
                  >
                    {l.namn} {raknat[l.id]}
                  </button>
                ))}
              </div>
              {/* Typfiltret får en egen rad. Två uppsättningar chips på
                  samma rad läses som en enda lista där varje tryck
                  ersätter det förra, och de här två filtren gäller
                  samtidigt. */}
              <div className="chiprad items-center">
                <button
                  type="button"
                  className="knapp pico"
                  data-aktiv={typfilter === null ? "1" : "0"}
                  onClick={() => setTypfilter(null)}
                >
                  Alla slag
                </button>
                {TYPER.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="knapp pico flex items-center gap-1.5"
                    data-aktiv={typfilter === t.id ? "1" : "0"}
                    onClick={() =>
                      setTypfilter(typfilter === t.id ? null : t.id)
                    }
                  >
                    <span
                      className="inline-block w-2 h-2 border border-current shrink-0"
                      style={{ background: `var(--kal-${t.ton + 1})` }}
                      aria-hidden="true"
                    />
                    {t.namn}
                  </button>
                ))}
              </div>
            </div>

            {synliga.length === 0 ? (
              <p className="pico opacity-45 px-3 py-5 leading-relaxed">
                {form.viner.length === 0
                  ? "Registret är tomt. Tryck + Vin och skriv in det första — namnet räcker för att börja, resten kan fyllas i när flaskan står framför dig."
                  : "Inget i registret matchar. Pröva ett annat ord eller ta bort filtret."}
              </p>
            ) : (
              synliga.map((v) => (
                <Vinrad
                  key={v.id}
                  vin={v}
                  oppen={oppet === v.id}
                  redigerar={redigerar}
                  onRedigera={setRedigerar}
                  onOppna={() => setOppet(oppet === v.id ? null : v.id)}
                  onAndra={(delar) => andraVin(v.id, delar)}
                  onTaBort={() => {
                    setOppet(null);
                    taBortVin(v.id);
                  }}
                />
              ))
            )}
          </Avsnitt>
        </div>

        {/* ---------------- Diagrammen ---------------- */}
        <div className="flex flex-col gap-2.5 md:gap-3 min-w-0">
          <Avsnitt
            rubrik="Fördelning"
            bihang={
              synliga.length === form.viner.length
                ? "Hela samlingen"
                : `${synliga.length} av ${form.viner.length}`
            }
            atgard={
              <select
                className="falt !w-auto shrink-0"
                value={uppdelning}
                onChange={(e) => setUppdelning(e.target.value as Uppdelning)}
                aria-label="Vad fördelningen delas upp på"
              >
                {UPPDELNINGAR.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.namn}
                  </option>
                ))}
              </select>
            }
          >
            <Delstapel
              delar={delar}
              tomText="Inga viner att dela upp ännu. Lägg till ett vin, så ritas fördelningen här."
            />
          </Avsnitt>

          <Avsnitt rubrik="Betyg mot pris" bihang="Ditt betyg, annars Vivinos">
            <Punktdiagram
              punkter={prispunkter}
              xAxel={{
                lag: "Billigt",
                hog: `Dyrt — ${kronor(pristak(prispunkter))} kr`,
                min: 0,
                max: pristak(prispunkter),
              }}
              yAxel={{
                lag: "Lågt betyg",
                hog: "Högt betyg",
                min: 0,
                max: 5,
                // Fem steg: hela betyg på hjälplinjerna, inte 1,3 och 3,8.
                steg: 5,
                skrivTal: (v) => betygstext(v),
              }}
              tomText="Inget att rita ännu. Ett vin kommer med när det har både pris och betyg — ett saknat pris sätts inte till noll, eftersom vinet då hade sett ut som ett fynd."
            />
          </Avsnitt>

          <Avsnitt
            rubrik="Smakkarta"
            /* Ingen förklaring här: de två väljarna säger redan
               "Fyllig mot Sträv", och ett bihang bredvid dem blir
               avklippt på mitten — sämre än inget alls. */
            atgard={
              <div className="flex items-center gap-1 shrink-0">
                <select
                  className="falt !w-auto"
                  value={xSkala}
                  onChange={(e) => setXSkala(e.target.value as SkalId)}
                  aria-label="Vågrät skala"
                >
                  {SKALOR.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hoger}
                    </option>
                  ))}
                </select>
                <span className="pico opacity-40">mot</span>
                <select
                  className="falt !w-auto"
                  value={ySkala}
                  onChange={(e) => setYSkala(e.target.value as SkalId)}
                  aria-label="Lodrät skala"
                >
                  {SKALOR.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.hoger}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <Punktdiagram
              punkter={smakpunkter}
              xAxel={{
                lag: skala(xSkala).vanster,
                hog: skala(xSkala).hoger,
                min: 0,
                max: 100,
              }}
              yAxel={{
                lag: skala(ySkala).vanster,
                hog: skala(ySkala).hoger,
                min: 0,
                max: 100,
              }}
              tomText="Inget att rita ännu. Ett vin kommer med när båda de valda skalorna är ifyllda — öppna ett vin och dra reglagen efter Vivinos smaköversikt."
            />
          </Avsnitt>
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   EN RAD I REGISTRET

   Tät i stängt läge, formulär i öppet — samma mekanik som
   litteraturregistret på fornsvenskasidan. Att en post är en RAD och
   inte ett kort är vad som gör att femtio viner går att överblicka.
   ================================================================== */

function Vinrad({
  vin,
  oppen,
  redigerar,
  onRedigera,
  onOppna,
  onAndra,
  onTaBort,
}: {
  vin: Vin;
  oppen: boolean;
  redigerar: boolean;
  onRedigera(pa: boolean): void;
  onOppna(): void;
  onAndra(delar: Partial<Vin>): void;
  onTaBort(): void;
}) {
  const fylld = lagesIndex(vin.lage);
  const under = vinUnderrad(vin);
  const betyg = vin.egetBetyg ?? vin.vivinoBetyg;
  const antalFlaskor = flaskor(vin);
  const skillnad = oense(vin);

  return (
    <div className="verkrad" data-oppen={oppen ? "1" : "0"}>
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        {/* Lägesmätaren är också knappen som stegar läget. Att flytta ett
            vin från "vill prova" till "i källaren" är den vanligaste
            handlingen på sidan, och den skall inte kräva att man först
            fäller ut raden. */}
        <button
          type="button"
          className="lagesmatare shrink-0 mt-1"
          data-lage={vin.lage}
          onClick={() => onAndra({ lage: nastaLage(vin.lage) })}
          aria-label={`Läge: ${LAGEN[fylld].namn}. Tryck för nästa.`}
          title={`${LAGEN[fylld].namn} — tryck för nästa läge`}
        >
          {LAGEN.map((l, i) => (
            <span key={l.id} data-fylld={i <= fylld ? "1" : "0"} />
          ))}
        </button>

        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={onOppna}
        >
          <span className="flex items-baseline gap-2">
            <span className="kodmarke">{vin.kod}</span>
            <span
              className="vinprick shrink-0"
              style={{ background: `var(--kal-${typTon(vin.typ) + 1})` }}
              title={typNamn(vin.typ)}
              aria-hidden="true"
            />
            <span className="verktitel flex-1 min-w-0">{vinTitel(vin)}</span>
          </span>
          {under.length > 0 && (
            <span className="verkmeta pico opacity-50 block mt-0.5">
              {under.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </span>
          )}
        </button>

        {/* Flaskantalet står bara där det betyder något. En etta bredvid
            ett drucket vin hade sett ut som en flaska man har kvar.

            Antal och pris viker på telefonen. De står ändå i formuläret
            ett tryck bort, och utan dem får titeln den bredd den behöver
            för att inte radbryta till fem rader. Betyget stannar: det är
            det man faktiskt bläddrar efter. */}
        {vin.lage === "har" && (
          <span
            className="pico opacity-55 tabnum shrink-0 mt-1 hidden sm:inline"
            title={`${antalFlaskor} ${antalFlaskor === 1 ? "flaska" : "flaskor"} i källaren`}
          >
            {antalFlaskor}×
          </span>
        )}
        {vin.pris !== null && (
          <span className="pico opacity-45 tabnum shrink-0 mt-1 hidden sm:inline">
            {kronor(vin.pris)}
          </span>
        )}
        {betyg !== null && (
          <span className="shrink-0 mt-0.5">
            <Betygsmatare varde={betyg} etikett={vinTitel(vin)} />
          </span>
        )}

        {vin.vivinoUrl && (
          <a
            href={vin.vivinoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="blockknapp shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Öppna på Vivino"
            title={vin.vivinoUrl}
          >
            ↗
          </a>
        )}
      </div>

      {oppen && (
        <div className="px-2.5 pb-3 border-t border-ink/10 pt-2.5 flex flex-col gap-3">
          {/* Lägesraden. Länkarna hör till läsandet och står därför
              kvar i båda lägena; raderaknappen hör till redigerandet
              och står bara där, längst ned i formuläret. */}
          <div className="flex items-center gap-2 flex-wrap">
            {vin.vivinoUrl && (
              <a
                href={vin.vivinoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="knapp pico"
              >
                Vivino ↗
              </a>
            )}
            {vin.systembolagetUrl && (
              <a
                href={vin.systembolagetUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="knapp pico"
              >
                Systembolaget ↗
              </a>
            )}
            {vin.uppgifterSaknas && !redigerar && (
              <span className="dokmarke">Saknas online</span>
            )}
            <span className="flex-1" />
            <button
              type="button"
              className="knapp micro shrink-0"
              data-aktiv={redigerar ? "1" : "0"}
              onClick={() => onRedigera(!redigerar)}
              title={
                redigerar ? "Lämna redigeringsläget (Esc)" : "Redigera vinet"
              }
            >
              {redigerar ? "✓ Klar" : "✎ Redigera"}
            </button>
          </div>

          {redigerar ? (
            <VinFormular vin={vin} onAndra={onAndra} onTaBort={onTaBort} />
          ) : (
            <Vinuppslag vin={vin} />
          )}
        </div>
      )}

      {/* Ett skillnadsband under raden, bara när du och mängden är
          oense om mer än ett halvt steg. Under det är skillnaden
          brus — tusentals recensioner landar sällan exakt på ditt tal,
          och en påminnelse om det för varje vin vore ingen upplysning. */}
      {!oppen && skillnad !== null && Math.abs(skillnad) >= 0.5 && (
        <p className="pico opacity-45 px-2.5 pb-1.5 -mt-1">
          Du {skillnad > 0 ? "tyckte bättre" : "tyckte sämre"} än Vivino:{" "}
          <span className="tabnum">
            {betygstext(vin.egetBetyg)} mot {betygstext(vin.vivinoBetyg)}
          </span>
        </p>
      )}
    </div>
  );
}

/* ==================================================================
   FORMULÄRET

   Uppställt i samma ordning som visningsläget, så att man vet var man
   skall leta när något ser fel ut. Att fälten står i en annan ordning
   än värdena hade betytt en översättning vid varje rättelse.
   ================================================================== */

function VinFormular({
  vin,
  onAndra,
  onTaBort,
}: {
  vin: Vin;
  onAndra(delar: Partial<Vin>): void;
  onTaBort(): void;
}) {
  const [nyNot, setNyNot] = useState("");
  const [nyGrupp, setNyGrupp] = useState("");

  const laggNot = () => {
    const ord = nyNot.trim();
    if (!ord) return;
    onAndra({
      smaknoter: [
        ...vin.smaknoter,
        { id: nyId(), ord, grupp: nyGrupp.trim(), antal: null },
      ],
    });
    setNyNot("");
    setNyGrupp("");
  };

  const andraNot = (id: string, delar: Partial<(typeof vin.smaknoter)[0]>) =>
    onAndra({
      smaknoter: vin.smaknoter.map((n) =>
        n.id === id ? { ...n, ...delar } : n
      ),
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3">
        {/* ---- Etiketten ----
             Fast bredd också på telefonen. Full bredd hade gett en
             tom ruta lika hög som skärmen på varje vin utan bild, och
             formuläret hade börjat under den. */}
        <div className="vinspalt">
          <span className="vinbild">
            {vin.bildUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vin.bildUrl}
                alt={`Etikett för ${vinTitel(vin)}`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="pico opacity-35 text-center px-2 leading-relaxed">
                Ingen bild
              </span>
            )}
          </span>
          <input
            className="falt mt-2"
            placeholder="Bildadress"
            inputMode="url"
            value={vin.bildUrl}
            onChange={(e) => onAndra({ bildUrl: e.target.value })}
            onBlur={(e) => onAndra({ bildUrl: trygsamUrl(e.target.value) })}
            aria-label="Bildadress till etiketten"
          />
          {/* Bilden HÄMTAS från källan, den kopieras inte hit. Det är
              ett val med en känd kostnad — försvinner adressen är bilden
              borta — och en känd vinst: lagret bär inte megabyte av
              bilddata som skall synkas mellan enheter. */}
          <p className="pico opacity-35 mt-1 leading-relaxed">
            Hämtas från adressen, sparas inte här.
          </p>
        </div>

        {/* ---- Fakta om vinet ---- */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="falt flex-1"
              placeholder="Vinets namn"
              value={vin.namn}
              onChange={(e) => onAndra({ namn: e.target.value })}
              aria-label="Vinets namn"
              autoFocus
            />
            <input
              className="falt md:!w-[6rem]"
              placeholder="Årgång"
              value={vin.argang}
              onChange={(e) => onAndra({ argang: e.target.value })}
              aria-label="Årgång"
              title="Fri text — N.V. och 2018/19 är också årgångar"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="falt flex-1"
              placeholder="Producent"
              value={vin.producent}
              onChange={(e) => onAndra({ producent: e.target.value })}
              aria-label="Producent"
            />
            <select
              className="falt md:!w-auto"
              value={vin.typ}
              onChange={(e) => onAndra({ typ: e.target.value as Typ })}
              aria-label="Vinets slag"
            >
              {TYPER.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.namn}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              className="falt md:!w-[9rem]"
              placeholder="Land"
              value={vin.land}
              onChange={(e) => onAndra({ land: e.target.value })}
              aria-label="Land"
            />
            <input
              className="falt flex-1"
              placeholder="Region"
              value={vin.region}
              onChange={(e) => onAndra({ region: e.target.value })}
              aria-label="Region"
            />
            <input
              className="falt md:!w-[10rem]"
              placeholder="Vinstil"
              value={vin.vinstil}
              onChange={(e) => onAndra({ vinstil: e.target.value })}
              aria-label="Vinstil"
              title="Vivinos vinstil, t.ex. Spanien Röda"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            {/* Listfalt och inte ett vanligt fält: ett fält som tolkar
                vid varje tangenttryckning gör det omöjligt att skriva
                mellanslaget efter kommat. Snedstreck delar INTE —
                "Shiraz/Syrah" är druvans namn och inte två druvor. */}
            <Listfalt
              varden={vin.druvor}
              onVarden={(rader) => onAndra({ druvor: rader })}
              etikett="Druvor"
              platshallare="Druvor — Shiraz/Syrah, Tempranillo"
              className="falt flex-1"
            />
            <label className="flex items-center gap-2 shrink-0">
              <span className="pico opacity-45">Alkohol</span>
              <Talfalt
                varde={vin.alkohol}
                onVarde={(n) => onAndra({ alkohol: n })}
                etikett="Alkoholvolym i procent"
                platshallare="13,5"
                className="falt !w-[4.5rem] text-right tabnum"
                tolkTal={tolkaTal}
                skrivTal={skrivTal}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ---- Läge, lager och pris ---- */}
      <div className="faktarad">
        <div>
          <span className="faktaetikett">Läge</span>
          <div className="knapp-rad">
            {LAGEN.map((l) => (
              <button
                key={l.id}
                type="button"
                className="knapp pico"
                data-aktiv={vin.lage === l.id ? "1" : "0"}
                onClick={() => onAndra({ lage: l.id })}
              >
                {l.namn}
              </button>
            ))}
          </div>
        </div>

        {/* Antalet frågas bara när vinet står i källaren. Ett fält som
            saknar mening i två av tre lägen är ett fält man fyller i av
            misstag. */}
        {vin.lage === "har" && (
          <div>
            <span className="faktaetikett">Flaskor</span>
            <Talfalt
              varde={vin.antal}
              onVarde={(n) => onAndra({ antal: n })}
              etikett="Antal flaskor i källaren"
              platshallare="1"
              className="falt !w-[4.5rem] text-right tabnum"
              tolkTal={tolkaTal}
              skrivTal={skrivTal}
            />
          </div>
        )}

        {vin.lage === "drucken" && (
          <div>
            <span className="faktaetikett">Drucket</span>
            <input
              type="date"
              className="falt datumfalt"
              value={vin.druckenDatum}
              onChange={(e) => onAndra({ druckenDatum: e.target.value })}
              aria-label="Datum då vinet dracks"
            />
          </div>
        )}

        <div>
          <span className="faktaetikett">Pris per flaska</span>
          <Talfalt
            varde={vin.pris}
            onVarde={(n) => onAndra({ pris: n })}
            etikett="Pris per flaska i kronor"
            platshallare="0"
            className="falt !w-[6rem] text-right tabnum"
            tolkTal={tolkaTal}
            skrivTal={skrivKrona}
          />
        </div>

        <div>
          <span className="faktaetikett">Inköpsställe</span>
          <input
            className="falt"
            placeholder="Systembolaget, vingård, resa…"
            value={vin.inkopsstalle}
            onChange={(e) => onAndra({ inkopsstalle: e.target.value })}
            aria-label="Inköpsställe"
          />
        </div>

        <div>
          <span className="faktaetikett">Artikelnummer</span>
          <input
            className="falt tabnum"
            placeholder="Systembolaget"
            value={vin.artikelnummer}
            onChange={(e) => onAndra({ artikelnummer: e.target.value })}
            aria-label="Systembolagets artikelnummer"
          />
        </div>
      </div>

      {/* ---- Länkarna ---- */}
      <div className="flex flex-col md:flex-row gap-2">
        <label className="flex items-center gap-2 flex-1 min-w-0">
          <span className="pico opacity-45 shrink-0 w-[5.5rem]">Vivino</span>
          <input
            className="falt flex-1 min-w-0"
            placeholder="https://vivino.com/…"
            inputMode="url"
            value={vin.vivinoUrl}
            onChange={(e) => onAndra({ vivinoUrl: e.target.value })}
            onBlur={(e) => onAndra({ vivinoUrl: trygsamUrl(e.target.value) })}
            aria-label="Länk till Vivino"
          />
        </label>
        <label className="flex items-center gap-2 flex-1 min-w-0">
          <span className="pico opacity-45 shrink-0 w-[5.5rem]">
            Systembolaget
          </span>
          <input
            className="falt flex-1 min-w-0"
            placeholder="https://systembolaget.se/…"
            inputMode="url"
            value={vin.systembolagetUrl}
            onChange={(e) => onAndra({ systembolagetUrl: e.target.value })}
            onBlur={(e) =>
              onAndra({ systembolagetUrl: trygsamUrl(e.target.value) })
            }
            aria-label="Länk till Systembolaget"
          />
        </label>
      </div>

      {/* ---- Betygen ---- */}
      <div className="faktarad">
        <div>
          <span className="faktaetikett">Ditt betyg</span>
          <Betygsmatare
            varde={vin.egetBetyg}
            onVarde={(n) => onAndra({ egetBetyg: n })}
            etikett="ditt betyg"
            storlek="stor"
          />
        </div>
        <div>
          <span className="faktaetikett">Vivinos betyg</span>
          <div className="flex items-center gap-2">
            <Talfalt
              varde={vin.vivinoBetyg}
              onVarde={(n) => onAndra({ vivinoBetyg: n })}
              etikett="Vivinos betyg"
              platshallare="3,7"
              className="falt !w-[4.5rem] text-right tabnum"
              tolkTal={tolkaTal}
              skrivTal={skrivTal}
            />
            <Talfalt
              varde={vin.vivinoAntal}
              onVarde={(n) => onAndra({ vivinoAntal: n })}
              etikett="Antal recensioner på Vivino"
              platshallare="8 503"
              className="falt !w-[6rem] text-right tabnum"
              tolkTal={tolkaTal}
              skrivTal={skrivKrona}
            />
            <span className="pico opacity-40 shrink-0">rec.</span>
          </div>
        </div>
      </div>

      {/* ---- Smakprofilen ---- */}
      <div>
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="matarnamn !mb-0">Hur smakar detta vin?</span>
          <span className="flex-1" />
          {/* Att uppgifterna inte GÅR att hämta är ett svar, och sidan
              skall kunna ta emot det. Utan flaggan blir varje sådant
              vin en påminnelse om ett arbete som aldrig kan bli gjort. */}
          <button
            type="button"
            className="knapp pico shrink-0"
            data-aktiv={vin.uppgifterSaknas ? "1" : "0"}
            onClick={() => onAndra({ uppgifterSaknas: !vin.uppgifterSaknas })}
            title="Vinet går inte att slå upp — sluta räkna det som ofyllt"
          >
            Saknas online
          </button>
        </div>

        {vin.uppgifterSaknas && !harProfil(vin.profil) ? (
          <p className="pico opacity-45 px-1 py-2 leading-relaxed">
            Märkt som att det inte går att slå upp. Vinet räknas inte längre
            bland dem som återstår att fylla i, och kommer inte med i
            smakkartan.
          </p>
        ) : (
          <Smakskala
            profil={vin.profil}
            ton={typTon(vin.typ)}
            onVarde={(id, varde) =>
              onAndra({ profil: { ...vin.profil, [id]: varde } })
            }
          />
        )}
      </div>

      {/* ---- Smaknoterna ---- */}
      <div>
        <span className="matarnamn">Smaknoter</span>
        {vin.smaknoter.length > 0 && (
          <div className="smakkortrad">
            {vin.smaknoter.map((n) => (
              <div
                key={n.id}
                className="smakkort"
                style={{
                  borderColor: `var(--kal-${gruppTon(n.grupp) + 1}-stark, var(--ink))`,
                }}
              >
                <span
                  className="smakkorthuvud"
                  style={{
                    background: `var(--kal-${gruppTon(n.grupp) + 1})`,
                  }}
                >
                  <input
                    className="falt !bg-transparent !border-0 !px-0"
                    placeholder="Vanilj, ek, tobak"
                    value={n.ord}
                    onChange={(e) => andraNot(n.id, { ord: e.target.value })}
                    aria-label="Smakorden"
                  />
                </span>
                <span className="smakkortfot">
                  <Talfalt
                    varde={n.antal}
                    onVarde={(x) => andraNot(n.id, { antal: x })}
                    etikett="Antal kommentarer"
                    platshallare="—"
                    className="falt !w-[4.5rem] text-right tabnum"
                    tolkTal={tolkaTal}
                    skrivTal={skrivKrona}
                  />
                  <input
                    className="falt flex-1 min-w-0"
                    placeholder="grupp — fatad, röd frukt…"
                    value={n.grupp}
                    onChange={(e) => andraNot(n.id, { grupp: e.target.value })}
                    aria-label="Smakgrupp"
                  />
                  <button
                    type="button"
                    className="blockknapp shrink-0"
                    onClick={() =>
                      onAndra({
                        smaknoter: vin.smaknoter.filter((x) => x.id !== n.id),
                      })
                    }
                    aria-label="Ta bort smaknoten"
                  >
                    ✕
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-2 mt-2">
          <input
            className="falt flex-1"
            placeholder="Vanilj, ek, tobak"
            value={nyNot}
            onChange={(e) => setNyNot(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                laggNot();
              }
            }}
            aria-label="Nya smakord"
          />
          <input
            className="falt md:!w-[11rem]"
            placeholder="Grupp — fatad"
            value={nyGrupp}
            onChange={(e) => setNyGrupp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                laggNot();
              }
            }}
            aria-label="Smakgrupp"
          />
          <button
            type="button"
            className="knapp pico shrink-0"
            onClick={laggNot}
            disabled={nyNot.trim().length === 0}
          >
            + Not
          </button>
        </div>
      </div>

      {/* ---- Text ---- */}
      <Listfalt
        varden={vin.passarTill}
        onVarden={(rader) => onAndra({ passarTill: rader })}
        etikett="Passar till"
        platshallare="Passar till — nötkött, pasta, kalv, fjäderfä"
      />

      <textarea
        className="skrivyta !flex-none"
        rows={3}
        placeholder="Vinbeskrivning — klippt från Vivino eller Systembolaget"
        value={vin.beskrivning}
        onChange={(e) => onAndra({ beskrivning: e.target.value })}
        aria-label="Vinbeskrivning"
      />

      {/* Din egen anteckning står SIST och i egen ruta. Den är det enda
          på sidan som ingen annan kunde ha skrivit, och skall inte
          blandas ihop med det avskrivna. */}
      <textarea
        className="skrivyta !flex-none"
        rows={2}
        placeholder="Din anteckning — vad tyckte du, till vad, med vem?"
        value={vin.anteckning}
        onChange={(e) => onAndra({ anteckning: e.target.value })}
        aria-label="Din anteckning"
      />

      <div className="flex items-center gap-2">
        <span className="flex-1" />
        <button
          type="button"
          className="knapp pico"
          onClick={() => {
            if (
              window.confirm(
                `Ta bort ${vin.kod} — ${vinTitel(vin)}? Går att ångra med ⌘Z.`
              )
            ) {
              onTaBort();
            }
          }}
        >
          Radera
        </button>
      </div>
    </div>
  );
}
