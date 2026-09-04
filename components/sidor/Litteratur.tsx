"use client";

/**
 * Mitt bibliotek — skönlitteratur, läsminne och inköpslista.
 *
 * Hyllorna är hämtade från Fornsvenskas resursbibliotek, men kategorin
 * (vad boken är) och statusen (vad Oscar vill göra med den) hålls isär.
 * En klassiker kan därför både stå som "läser nu" och senare som "läst"
 * utan att behöva flyttas till en påhittad kategori.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nyId } from "@/lib/butik";
import { Bildfel, dataUrlByte, krympBild } from "@/lib/bild";
import { nyckel } from "@/lib/tid";
import type { SidData, Sida } from "@/lib/typer";
import {
  KATEGORIER,
  STATUSAR,
  filtreraBocker,
  framsteg,
  kategoriNamn,
  lasningPaDag,
  omslagston,
  sorteraLaspass,
  statusNamn,
  summeraLasning,
  tolkaLitteraturData,
  type Bok,
  type BokKategori,
  type BokStatus,
  type Laspass,
  type LitteraturData,
} from "@/lib/sidor/litteratur";
import Avsnitt from "./block/Avsnitt";

const VILA_MS = 600;
const samma = (a: LitteraturData, b: LitteraturData) =>
  JSON.stringify(a) === JSON.stringify(b);

const tal = (x: string): number | null => {
  if (!x.trim()) return null;
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
};

function Omslag({ bok, stort = false }: { bok: Bok; stort?: boolean }) {
  if (bok.omslag) {
    return (
      <span className="litt-omslag" data-stort={stort ? "1" : undefined}>
        {/* Data-URL:en är redan krympt och ligger i samma JSON som boken. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bok.omslag} alt="" />
      </span>
    );
  }

  return (
    <span
      className="litt-omslag litt-standardomslag"
      data-stort={stort ? "1" : undefined}
      data-ton={omslagston(bok)}
      aria-hidden="true"
    >
      <span className="pico">{kategoriNamn(bok.kategori)}</span>
      <span className="display litt-standardtitel">{bok.titel || "Utan titel"}</span>
      <span className="pico">{bok.forfattare || "—"}</span>
    </span>
  );
}

function BokKort({ bok, vald, onValj }: { bok: Bok; vald: boolean; onValj(): void }) {
  const andel = framsteg(bok);
  return (
    <button
      type="button"
      className="litt-bokkort"
      data-vald={vald ? "1" : undefined}
      onClick={onValj}
    >
      <Omslag bok={bok} />
      <span className="litt-boktitel">{bok.titel || "Utan titel"}</span>
      <span className="litt-bokfot">{bok.forfattare || statusNamn(bok.status)}</span>
      {andel !== null && bok.status === "laser" && (
        <span className="litt-framsteg" aria-label={`${Math.round(andel * 100)} procent läst`}>
          <span style={{ width: `${andel * 100}%` }} />
        </span>
      )}
    </button>
  );
}

function BokPanel({
  bok,
  redigerar,
  onRedigerar,
  onAndra,
  onTaBort,
}: {
  bok: Bok | null;
  redigerar: boolean;
  onRedigerar(varde: boolean): void;
  onAndra(delar: Partial<Bok>): void;
  onTaBort(): void;
}) {
  const bildfalt = useRef<HTMLInputElement | null>(null);
  const [bildfel, setBildfel] = useState<string | null>(null);
  const [laddarBild, setLaddarBild] = useState(false);

  if (!bok) {
    return (
      <aside className="litt-panel">
        <p className="micro">Biblioteket</p>
        <p className="text-[0.78rem] leading-relaxed">
          Välj ett omslag för att se boken, ändra dess status eller skriva en
          anteckning. Kategori och lässtatus är två olika saker.
        </p>
        <div className="litt-pastellblock" data-ton="lila">
          <p className="display text-[1.35rem] leading-tight">Böcker att leva med.</p>
          <p className="text-[0.7rem] leading-relaxed mt-2">
            Det du läser, har läst och vill hitta härnäst—samlat på samma hylla.
          </p>
        </div>
      </aside>
    );
  }

  const bytOmslag = async (fil: File) => {
    setBildfel(null);
    setLaddarBild(true);
    try {
      onAndra({ omslag: await krympBild(fil) });
    } catch (e) {
      setBildfel(e instanceof Bildfel ? e.message : "Bilden gick inte att läsa.");
    } finally {
      setLaddarBild(false);
      if (bildfalt.current) bildfalt.current.value = "";
    }
  };

  const andel = framsteg(bok);

  return (
    <aside className="litt-panel">
      <div className="flex gap-3 items-start">
        <span className="w-[92px] shrink-0">
          <Omslag bok={bok} stort />
        </span>
        <div className="min-w-0 flex-1">
          {redigerar ? (
            <>
              <input
                className="falt mb-1.5"
                value={bok.titel}
                placeholder="Titel"
                onChange={(e) => onAndra({ titel: e.target.value })}
                aria-label="Bokens titel"
              />
              <input
                className="falt"
                value={bok.forfattare}
                placeholder="Författare"
                onChange={(e) => onAndra({ forfattare: e.target.value })}
                aria-label="Bokens författare"
              />
            </>
          ) : (
            <>
              <h3 className="display text-[1.2rem] leading-tight break-words">
                {bok.titel || "Utan titel"}
              </h3>
              <p className="micro opacity-55 mt-1">{bok.forfattare || "Okänd författare"}</p>
            </>
          )}
        </div>
      </div>

      {redigerar ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="pico opacity-55">Kategori</span>
            <select
              className="falt"
              value={bok.kategori}
              onChange={(e) => onAndra({ kategori: e.target.value as BokKategori })}
            >
              {KATEGORIER.map((k) => <option key={k.id} value={k.id}>{k.namn}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="pico opacity-55">Status</span>
            <select
              className="falt"
              value={bok.status}
              onChange={(e) => {
                const status = e.target.value as BokStatus;
                onAndra({ status, avslutad: status === "last" ? bok.avslutad ?? nyckel(new Date()) : bok.avslutad });
              }}
            >
              {STATUSAR.map((s) => <option key={s.id} value={s.id}>{s.namn}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="pico opacity-55">Utgiven</span>
            <input className="falt" value={bok.utgiven} placeholder="År eller utgåva" onChange={(e) => onAndra({ utgiven: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="pico opacity-55">Betyg</span>
            <select className="falt" value={bok.betyg ?? ""} onChange={(e) => onAndra({ betyg: tal(e.target.value) })}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="pico opacity-55">Antal sidor</span>
            <input className="falt tabnum" inputMode="numeric" value={bok.totaltSidor ?? ""} onChange={(e) => onAndra({ totaltSidor: tal(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="pico opacity-55">På sida</span>
            <input className="falt tabnum" inputMode="numeric" value={bok.aktuellSida ?? ""} onChange={(e) => onAndra({ aktuellSida: tal(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="pico opacity-55">Läst klart</span>
            <input className="falt" type="date" value={bok.avslutad ?? ""} onChange={(e) => onAndra({ avslutad: e.target.value || null })} />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="pico opacity-55">Anteckning</span>
            <textarea className="falt min-h-[88px] resize-y" value={bok.anteckning} onChange={(e) => onAndra({ anteckning: e.target.value })} />
          </label>
        </div>
      ) : (
        <>
          <dl className="litt-fakta">
            <div><dt>Kategori</dt><dd>{kategoriNamn(bok.kategori)}</dd></div>
            <div><dt>Status</dt><dd>{statusNamn(bok.status)}</dd></div>
            {bok.utgiven && <div><dt>Utgiven</dt><dd>{bok.utgiven}</dd></div>}
            {bok.betyg !== null && <div><dt>Betyg</dt><dd>{"●".repeat(bok.betyg)}{"○".repeat(5 - bok.betyg)}</dd></div>}
            {bok.avslutad && <div><dt>Läst klart</dt><dd>{bok.avslutad}</dd></div>}
          </dl>
          {andel !== null && (
            <div>
              <div className="flex justify-between pico mb-1"><span>Framsteg</span><span>{bok.aktuellSida} / {bok.totaltSidor}</span></div>
              <span className="litt-framsteg stor"><span style={{ width: `${andel * 100}%` }} /></span>
            </div>
          )}
          {bok.anteckning && <p className="text-[0.75rem] leading-relaxed whitespace-pre-wrap">{bok.anteckning}</p>}
        </>
      )}

      {redigerar && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="knapp pico" onClick={() => bildfalt.current?.click()}>
              {laddarBild ? "Bearbetar…" : bok.omslag ? "Byt omslag" : "+ Omslag"}
            </button>
            {bok.omslag && (
              <button type="button" className="knapp pico" onClick={() => onAndra({ omslag: null })}>Ta bort omslag</button>
            )}
          </div>
          <input ref={bildfalt} type="file" accept="image/*" className="hidden" onChange={(e) => { const fil = e.target.files?.[0]; if (fil) void bytOmslag(fil); }} />
          {bok.omslag && <span className="pico opacity-45">Cirka {Math.max(1, Math.round(dataUrlByte(bok.omslag) / 1024))} kB i lagret</span>}
          {bildfel && <span className="pico text-accent">{bildfel}</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-ink/15">
        <button type="button" className="knapp micro" data-aktiv={redigerar ? "1" : "0"} onClick={() => onRedigerar(!redigerar)}>
          {redigerar ? "Klar" : "Redigera"}
        </button>
        {redigerar && <button type="button" className="knapp micro" data-ton="accent" onClick={onTaBort}>Radera boken</button>}
      </div>
    </aside>
  );
}

export default function Litteratur({ sida, spara }: { sida: Sida | null; spara(data: SidData): void }) {
  const utifran = useMemo(() => tolkaLitteraturData(sida?.data), [sida]);
  const [form, setForm] = useState<LitteraturData>(utifran);
  const [sok, setSok] = useState("");
  const [statusfilter, setStatusfilter] = useState<BokStatus | "alla">("alla");
  const [valdId, setValdId] = useState<string | null>(null);
  const [redigerar, setRedigerar] = useState(false);
  const [nyttPass, setNyttPass] = useState({ datum: nyckel(new Date()), bokId: "", sidor: "", minuter: "", anteckning: "" });
  const [passfel, setPassfel] = useState<string | null>(null);

  const rord = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;
  const andra = useCallback((f: (d: LitteraturData) => LitteraturData) => {
    rord.current = true;
    setForm(f);
  }, []);

  useEffect(() => {
    if (!rord.current) return;
    if (samma(form, utifran)) { rord.current = false; return; }
    const id = window.setTimeout(() => {
      rord.current = false;
      spara(form as unknown as SidData);
    }, VILA_MS);
    return () => window.clearTimeout(id);
  }, [form, utifran, spara]);

  useEffect(() => {
    if (!rord.current && !samma(utifran, formRef.current)) setForm(utifran);
  }, [utifran]);

  const vald = form.bocker.find((b) => b.id === valdId) ?? null;
  const synliga = useMemo(() => filtreraBocker(form.bocker, sok, statusfilter), [form.bocker, sok, statusfilter]);
  const idag = nyckel(new Date());
  const idagSumma = summeraLasning(lasningPaDag(form.laspass, idag));
  const senastePass = useMemo(() => sorteraLaspass(form.laspass).slice(0, 20), [form.laspass]);

  const nyBok = () => {
    const bok: Bok = {
      id: nyId(), titel: "", forfattare: "", kategori: "skonlitteratur",
      status: "vill-lasa", omslag: null, utgiven: "", totaltSidor: null,
      aktuellSida: null, avslutad: null, betyg: null, anteckning: "",
      skapad: new Date().toISOString(),
    };
    andra((d) => ({ ...d, bocker: [...d.bocker, bok] }));
    setValdId(bok.id);
    setRedigerar(true);
  };

  const andraBok = (id: string, delar: Partial<Bok>) =>
    andra((d) => ({ ...d, bocker: d.bocker.map((b) => b.id === id ? { ...b, ...delar } : b) }));

  const taBortBok = (id: string) => {
    if (!window.confirm("Radera boken och alla läspass som hör till den?")) return;
    andra((d) => ({ ...d, bocker: d.bocker.filter((b) => b.id !== id), laspass: d.laspass.filter((p) => p.bokId !== id) }));
    setValdId(null);
    setRedigerar(false);
  };

  const laggTillPass = () => {
    const bokId = nyttPass.bokId || valdId || form.bocker[0]?.id || "";
    const sidor = tal(nyttPass.sidor);
    const minuter = tal(nyttPass.minuter);
    if (!bokId) { setPassfel("Lägg till en bok först."); return; }
    if (!nyttPass.datum) { setPassfel("Välj ett datum."); return; }
    if (sidor === null && minuter === null && !nyttPass.anteckning.trim()) {
      setPassfel("Skriv hur många sidor eller minuter du läste.");
      return;
    }
    const pass: Laspass = { id: nyId(), datum: nyttPass.datum, bokId, sidor, minuter, anteckning: nyttPass.anteckning.trim(), skapad: new Date().toISOString() };
    andra((d) => ({ ...d, laspass: [...d.laspass, pass] }));
    setNyttPass((p) => ({ ...p, bokId, sidor: "", minuter: "", anteckning: "" }));
    setPassfel(null);
  };

  const andraPass = (id: string, delar: Partial<Laspass>) =>
    andra((d) => ({ ...d, laspass: d.laspass.map((p) => p.id === id ? { ...p, ...delar } : p) }));

  return (
    <div className="h-full min-h-0 overflow-y-auto tunnskroll litt-sida">
      <div className="matarpanel litt-matare">
        <div><span className="matarnamn">Böcker</span><span className="matartal block">{form.bocker.length}</span></div>
        <div><span className="matarnamn">Läser nu</span><span className="matartal block">{form.bocker.filter((b) => b.status === "laser").length}</span></div>
        <div><span className="matarnamn">Lästa</span><span className="matartal block">{form.bocker.filter((b) => b.status === "last").length}</span></div>
        <div><span className="matarnamn">Vill köpa</span><span className="matartal block">{form.bocker.filter((b) => b.status === "vill-kopa").length}</span></div>
        <div><span className="matarnamn">Idag</span><span className="matartal block">{idagSumma.sidor || idagSumma.minuter ? `${idagSumma.sidor} s · ${idagSumma.minuter} min` : "—"}</span></div>
        <span className="flex-1" />
        <button type="button" className="knapp micro" data-ton="accent" onClick={nyBok}>+ Bok</button>
      </div>

      <div className="litt-verktyg">
        <div>
          <p className="pico opacity-50 mb-1">Mitt litteraturbibliotek</p>
          <h2 className="display text-[clamp(1.45rem,3vw,2.15rem)] leading-none">Läst, läser, längtar efter.</h2>
        </div>
        <input className="falt litt-sok" type="search" value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Sök titel, författare eller anteckning" aria-label="Sök i litteraturbiblioteket" />
      </div>

      <div className="litt-filter" aria-label="Filtrera på status">
        <button type="button" className="litt-chip" data-vald={statusfilter === "alla" ? "1" : undefined} onClick={() => setStatusfilter("alla")}>Alla {form.bocker.length}</button>
        {STATUSAR.map((s) => <button key={s.id} type="button" className="litt-chip" data-vald={statusfilter === s.id ? "1" : undefined} onClick={() => setStatusfilter(s.id)}>{s.namn} {form.bocker.filter((b) => b.status === s.id).length}</button>)}
      </div>

      <div className="litt-layout">
        <div className="min-w-0 flex flex-col gap-5">
          {form.bocker.length === 0 ? (
            <div className="litt-tomt">
              <p className="display text-[1.35rem]">Din första hylla väntar.</p>
              <p className="text-[0.72rem] leading-relaxed">Lägg till en bok. Titel och kategori räcker; resten kan växa fram medan du läser.</p>
              <button type="button" className="knapp micro" data-ton="accent" onClick={nyBok}>+ Lägg till bok</button>
            </div>
          ) : synliga.length === 0 ? (
            <p className="pico opacity-50 py-8">Inga böcker passar filtret.</p>
          ) : (
            KATEGORIER.map((kategori) => {
              const bocker = synliga.filter((b) => b.kategori === kategori.id);
              if (bocker.length === 0) return null;
              return (
                <section key={kategori.id} className="litt-hylla">
                  <header><span className="pico opacity-45">{kategori.kort}</span><h3 className="display">{kategori.namn}</h3><span className="pico opacity-45">{bocker.length}</span></header>
                  <div className="litt-hyllplan"><div className="litt-hyllrad">{bocker.map((b) => <BokKort key={b.id} bok={b} vald={b.id === valdId} onValj={() => { setValdId(b.id); setRedigerar(false); }} />)}</div></div>
                </section>
              );
            })
          )}

          <Avsnitt rubrik="Läslogg" bihang="Vad du faktiskt läste, dag för dag">
            <div className="litt-loggny">
              <select className="falt" value={nyttPass.bokId || valdId || ""} onChange={(e) => setNyttPass((p) => ({ ...p, bokId: e.target.value }))} aria-label="Bok för nytt läspass">
                <option value="">Välj bok</option>
                {form.bocker.map((b) => <option key={b.id} value={b.id}>{b.titel || "Utan titel"}</option>)}
              </select>
              <input className="falt" type="date" value={nyttPass.datum} onChange={(e) => setNyttPass((p) => ({ ...p, datum: e.target.value }))} aria-label="Datum för nytt läspass" />
              <input className="falt tabnum" inputMode="numeric" value={nyttPass.sidor} onChange={(e) => setNyttPass((p) => ({ ...p, sidor: e.target.value }))} placeholder="Sidor" aria-label="Antal lästa sidor" />
              <input className="falt tabnum" inputMode="numeric" value={nyttPass.minuter} onChange={(e) => setNyttPass((p) => ({ ...p, minuter: e.target.value }))} placeholder="Minuter" aria-label="Antal lästa minuter" />
              <input className="falt" value={nyttPass.anteckning} onChange={(e) => setNyttPass((p) => ({ ...p, anteckning: e.target.value }))} placeholder="Kort notering" aria-label="Notering för nytt läspass" />
              <button type="button" className="knapp micro" onClick={laggTillPass}>+ Läspass</button>
            </div>
            {passfel && <p className="pico px-2.5 pb-2 text-accent">{passfel}</p>}
            {senastePass.length === 0 ? (
              <p className="pico opacity-45 px-2.5 py-5">Ingen läsning registrerad ännu.</p>
            ) : (
              <div className="litt-logglista">
                {senastePass.map((p) => {
                  const bok = form.bocker.find((b) => b.id === p.bokId);
                  return (
                    <div key={p.id} className="litt-loggrad">
                      <input className="falt" type="date" value={p.datum} onChange={(e) => andraPass(p.id, { datum: e.target.value })} aria-label="Läsdatum" />
                      <select className="falt" value={p.bokId} onChange={(e) => andraPass(p.id, { bokId: e.target.value })} aria-label="Läst bok">{form.bocker.map((b) => <option key={b.id} value={b.id}>{b.titel || "Utan titel"}</option>)}</select>
                      <label><span className="pico">Sidor</span><input className="falt tabnum" inputMode="numeric" value={p.sidor ?? ""} onChange={(e) => andraPass(p.id, { sidor: tal(e.target.value) })} /></label>
                      <label><span className="pico">Min</span><input className="falt tabnum" inputMode="numeric" value={p.minuter ?? ""} onChange={(e) => andraPass(p.id, { minuter: tal(e.target.value) })} /></label>
                      <input className="falt" value={p.anteckning} onChange={(e) => andraPass(p.id, { anteckning: e.target.value })} placeholder="Notering" aria-label="Läsanteckning" />
                      <button type="button" className="knapp pico" onClick={() => andra((d) => ({ ...d, laspass: d.laspass.filter((x) => x.id !== p.id) }))} aria-label={`Radera läspass för ${bok?.titel || "bok"}`}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </Avsnitt>
        </div>

        <div className="litt-panelhallare">
          <BokPanel bok={vald} redigerar={redigerar} onRedigerar={setRedigerar} onAndra={(delar) => vald && andraBok(vald.id, delar)} onTaBort={() => vald && taBortBok(vald.id)} />
        </div>
      </div>
    </div>
  );
}
