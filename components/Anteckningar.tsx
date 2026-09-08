"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { Anteckning, Anteckningsblock } from "@/lib/typer";
import { useButik } from "./Butik";
import { sorteraAnteckningar } from "@/lib/butik";
import { byggRegister, slaUpp, type Mal } from "@/lib/kopplingar";
import Kopplingar from "./Kopplingar";
import { kortDatum, nyckel, startAvDag, tolka } from "@/lib/tid";
import { useMobil } from "@/lib/anvandMedia";
import type { Peka } from "./KalenderApp";

const STANDARD_BOK = "Allmänna anteckningar";
const BOKREGISTER_SIDA = "anteckningsbocker";
type Blocktyp = Anteckningsblock["typ"];

function nyttId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function nyttBlock(typ: Blocktyp): Anteckningsblock {
  const id = nyttId();
  if (typ === "rubrik") return { id, typ, text: "", niva: 2 };
  if (typ === "text" || typ === "citat") return { id, typ, text: "" };
  if (typ === "spalter") return { id, typ, vanster: "", hoger: "" };
  return { id, typ: "tabell", celler: [["Rubrik", "Rubrik"], ["", ""]] };
}

function taBortTaggar(text: string) {
  if (typeof document === "undefined") {
    return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const yta = document.createElement("div");
  yta.innerHTML = text;
  return (yta.textContent ?? "").replace(/\s+/g, " ").trim();
}

function blockTillText(block: Anteckningsblock[]) {
  return block
    .flatMap((b) => {
      if (b.typ === "spalter") return [b.vanster, b.hoger];
      if (b.typ === "tabell") return b.celler.flat();
      return [b.text];
    })
    .map(taBortTaggar)
    .filter(Boolean)
    .join("\n\n");
}

function bokton(namn: string) {
  return [...namn].reduce((summa, tecken) => summa + tecken.charCodeAt(0), 0) % 6;
}

export default function Anteckningar({
  fokusera = 0,
  oppna = null,
  onOppnaMal,
}: {
  fokusera?: number;
  oppna?: Peka | null;
  onOppnaMal(mal: Mal): void;
}) {
  const butik = useButik();
  const mobil = useMobil();
  const [valdBok, setValdBok] = useState<string | null>(null);
  const [vald, setVald] = useState<string | null>(null);
  const [fraga, setFraga] = useState("");
  const [nyBok, setNyBok] = useState("");
  const nyBokRef = useRef<HTMLInputElement>(null);

  const registreradeBocker = useMemo(() => {
    const namn = butik.sidaMed(BOKREGISTER_SIDA)?.data.namn;
    if (!Array.isArray(namn)) return [];
    return namn.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
  }, [butik]);

  const bocker = useMemo(
    () =>
      [
        ...new Set([
          ...registreradeBocker,
          ...butik.anteckningar.map((a) => a.bok || STANDARD_BOK),
        ]),
      ].sort((a, b) => a.localeCompare(b, "sv")),
    [butik.anteckningar, registreradeBocker]
  );

  const sparaBocker = (namn: string[]) =>
    butik.sparaSida(BOKREGISTER_SIDA, { namn: [...new Set(namn)] });

  const skapaAnteckning = useCallback(
    (titel = "", bok = valdBok ?? bocker[0] ?? STANDARD_BOK) => {
      if (!bocker.includes(bok)) {
        butik.sparaSida(BOKREGISTER_SIDA, { namn: [...bocker, bok] });
      }
      const a = butik.skapaAnteckning({
        titel,
        brodtext: "",
        bok,
        block: [nyttBlock("text")],
        kalenderId: butik.kalendrar[0]?.id ?? "arbete",
      });
      setValdBok(bok);
      setVald(a.id);
      return a;
    },
    [butik, valdBok, bocker]
  );

  useEffect(() => {
    if (fokusera > 0) skapaAnteckning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fokusera]);

  useEffect(() => {
    if (!oppna) return;
    const a = butik.anteckningar.find((v) => v.id === oppna.id);
    if (a) {
      setValdBok(a.bok);
      setVald(a.id);
    }
  }, [oppna, butik.anteckningar]);

  const oppen = butik.anteckningar.find((a) => a.id === vald) ?? null;
  const dokument = useMemo(() => {
    const q = fraga.trim().toLocaleLowerCase("sv");
    return sorteraAnteckningar(
      butik.anteckningar.filter((a) => {
        if (valdBok && a.bok !== valdBok) return false;
        if (!q) return true;
        return (
          a.titel.toLocaleLowerCase("sv").includes(q) ||
          a.brodtext.toLocaleLowerCase("sv").includes(q)
        );
      })
    );
  }, [butik.anteckningar, valdBok, fraga]);

  const register = useMemo(
    () =>
      byggRegister({
        handelser: butik.handelser,
        uppgifter: butik.uppgifter,
        anteckningar: butik.anteckningar,
      }),
    [butik.handelser, butik.uppgifter, butik.anteckningar]
  );

  const foljLank = useCallback(
    (titel: string) => {
      const mal = slaUpp(register, titel);
      if (!mal) {
        skapaAnteckning(titel);
      } else if (mal.slag === "anteckning") {
        const a = butik.anteckningar.find((v) => v.id === mal.id);
        if (a) setValdBok(a.bok);
        setVald(mal.id);
      } else {
        onOppnaMal(mal);
      }
    },
    [register, skapaAnteckning, butik.anteckningar, onOppnaMal]
  );

  const laggTillBok = () => {
    const namn = nyBok.trim();
    if (!namn) {
      nyBokRef.current?.focus();
      return;
    }
    const befintlig = bocker.find(
      (bok) => bok.toLocaleLowerCase("sv") === namn.toLocaleLowerCase("sv")
    );
    if (befintlig) {
      setValdBok(befintlig);
      setNyBok("");
      return;
    }
    sparaBocker([...bocker, namn]);
    setValdBok(namn);
    setVald(null);
    setNyBok("");
  };

  const bytBoknamn = () => {
    if (!valdBok) return;
    const namn = window.prompt("Nytt namn på boken", valdBok)?.trim();
    if (!namn || namn === valdBok) return;
    sparaBocker(bocker.map((bok) => (bok === valdBok ? namn : bok)));
    for (const a of butik.anteckningar.filter((v) => v.bok === valdBok)) {
      butik.sparaAnteckning({ ...a, bok: namn });
    }
    setValdBok(namn);
  };

  const taBortBok = () => {
    if (!valdBok) return;
    const poster = butik.anteckningar.filter((a) => a.bok === valdBok);
    if (
      !window.confirm(
        `Radera boken ”${valdBok}” och dess ${poster.length} dokument? Går att ångra med ⌘Z.`
      )
    ) {
      return;
    }
    sparaBocker(bocker.filter((bok) => bok !== valdBok));
    for (const a of poster) butik.taBortAnteckning(a.id);
    setVald(null);
    setValdBok(null);
  };

  if (mobil && oppen) {
    return (
      <Dokumentredigerare
        key={oppen.id}
        anteckning={oppen}
        mobil
        onTillbaka={() => setVald(null)}
        onFoljLank={foljLank}
        onOppnaMal={onOppnaMal}
        onOppnaAnteckning={(id) => {
          const a = butik.anteckningar.find((v) => v.id === id);
          if (a) setValdBok(a.bok);
          setVald(id);
        }}
      />
    );
  }

  return (
    <div className="anteckningsbibliotek h-full min-h-0 overflow-y-auto tunnskroll">
      <header className="anteckningsbibliotek-topp">
        <div>
          <p className="pico opacity-50 uppercase tracking-[0.12em]">Bibliotek</p>
          <h2 className="display text-[clamp(1.4rem,2.8vw,2.15rem)]">Anteckningar</h2>
          <p className="pico opacity-55 mt-1">
            Böckerna är mappar. Inuti dem ligger dokument byggda av redigerbara avsnitt.
          </p>
        </div>
        <label className="anteckningssok">
          <span className="sr-only">Sök i anteckningar</span>
          <input
            className="falt"
            type="search"
            value={fraga}
            onChange={(e) => setFraga(e.target.value)}
            placeholder="Sök i biblioteket"
          />
        </label>
      </header>

      <section className="anteckningshylla" aria-label="Anteckningsböcker">
        <div className="anteckningshylla-rad">
          {bocker.map((bok) => {
            const antal = butik.anteckningar.filter((a) => a.bok === bok).length;
            return (
              <button
                key={bok}
                type="button"
                className="anteckningsbok"
                data-vald={valdBok === bok ? "1" : undefined}
                onClick={() => {
                  setValdBok(bok);
                  setVald(null);
                }}
              >
                <span className="anteckningsbok-omslag" data-ton={bokton(bok)}>
                  <span className="pico opacity-55">Anteckningsbok</span>
                  <strong className="display">{bok}</strong>
                  <span className="pico opacity-55 tabnum">{antal} dokument</span>
                </span>
                <span className="anteckningsbok-namn">{bok}</span>
              </button>
            );
          })}
          <div className="ny-anteckningsbok">
            <span className="ny-anteckningsbok-omslag" aria-hidden="true">+</span>
            <input
              ref={nyBokRef}
              className="falt"
              value={nyBok}
              onChange={(e) => setNyBok(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") laggTillBok();
              }}
              placeholder="Ny bok"
              aria-label="Namn på ny bok"
            />
            <button type="button" className="knapp pico" onClick={laggTillBok}>
              Lägg till
            </button>
          </div>
        </div>
      </section>

      {!valdBok ? (
        <div className="anteckningar-tomt">
          <p className="micro">{bocker.length === 0 ? "Biblioteket är tomt" : "Välj en bok"}</p>
          <p className="pico opacity-55">
            {bocker.length === 0
              ? "Skriv ett boknamn ovan, till exempel Italienska, Svenska eller Arbete."
              : "Öppna en bok för att se och redigera dokumenten i den."}
          </p>
        </div>
      ) : (
        <section className="anteckningsbok-oppen">
          <aside className="anteckningsdokument-lista">
            <div className="anteckningsbok-rubrik">
              <div className="min-w-0">
                <p className="pico opacity-50">Öppen bok</p>
                <h3 className="display truncate">{valdBok}</h3>
              </div>
              <div className="flex gap-1">
                <button type="button" className="knapp pico" onClick={bytBoknamn}>
                  Byt namn
                </button>
                <button type="button" className="knapp pico" onClick={taBortBok}>
                  Radera bok
                </button>
              </div>
            </div>
            <button
              type="button"
              className="knapp micro w-full"
              data-ton="accent"
              onClick={() => skapaAnteckning("", valdBok)}
            >
              + Nytt dokument
            </button>
            <div className="anteckningsdokument-rader">
              {dokument.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="anteckningsdokument-rad"
                  data-vald={a.id === vald ? "1" : undefined}
                  onClick={() => setVald(a.id)}
                >
                  <span className="anteckning-titel">{a.titel || "Utan rubrik"}</span>
                  <span className="pico opacity-50">
                    {a.datum ? kortDatum(tolka(a.datum)) : `${a.block.length} avsnitt`}
                  </span>
                  {a.nalad && <span aria-label="Nålad">▣</span>}
                </button>
              ))}
              {dokument.length === 0 && (
                <p className="pico opacity-50 p-3">Inget matchar sökningen.</p>
              )}
            </div>
          </aside>

          <div className="anteckningsdokument-yta">
            {oppen ? (
              <Dokumentredigerare
                key={oppen.id}
                anteckning={oppen}
                mobil={false}
                onTillbaka={() => setVald(null)}
                onFoljLank={foljLank}
                onOppnaMal={onOppnaMal}
                onOppnaAnteckning={setVald}
              />
            ) : (
              <div className="anteckningar-tomt h-full">
                <p className="micro">Inget dokument öppet</p>
                <p className="pico opacity-55">
                  Välj ett dokument till vänster eller skapa ett nytt.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Dokumentredigerare({
  anteckning,
  mobil,
  onTillbaka,
  onFoljLank,
  onOppnaMal,
  onOppnaAnteckning,
}: {
  anteckning: Anteckning;
  mobil: boolean;
  onTillbaka(): void;
  onFoljLank(titel: string): void;
  onOppnaMal(mal: Mal): void;
  onOppnaAnteckning(id: string): void;
}) {
  const butik = useButik();
  const [form, setForm] = useState(anteckning);
  const titelRef = useRef<HTMLInputElement>(null);
  const aktivtFalt = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!anteckning.titel && !anteckning.brodtext) titelRef.current?.focus();
  }, [anteckning]);

  useEffect(() => {
    const lika =
      form.titel === anteckning.titel &&
      form.bok === anteckning.bok &&
      form.kalenderId === anteckning.kalenderId &&
      form.datum === anteckning.datum &&
      JSON.stringify(form.block) === JSON.stringify(anteckning.block);
    if (lika) return;
    const id = window.setTimeout(
      () => butik.sparaAnteckning({ ...form, brodtext: blockTillText(form.block) }),
      500
    );
    return () => window.clearTimeout(id);
  }, [form, anteckning, butik]);

  const satt = (delar: Partial<Anteckning>) =>
    setForm((f) => ({ ...f, ...delar }));
  const sattBlock = (id: string, nytt: Anteckningsblock) =>
    satt({ block: form.block.map((b) => (b.id === id ? nytt : b)) });
  const infogaEfter = (index: number, typ: Blocktyp) =>
    satt({
      block: [
        ...form.block.slice(0, index + 1),
        nyttBlock(typ),
        ...form.block.slice(index + 1),
      ],
    });
  const flytta = (index: number, steg: -1 | 1) => {
    const mal = index + steg;
    if (mal < 0 || mal >= form.block.length) return;
    const kopia = [...form.block];
    [kopia[index], kopia[mal]] = [kopia[mal], kopia[index]];
    satt({ block: kopia });
  };

  const format = (kommando: "bold" | "italic" | "strikeThrough") => {
    const falt = aktivtFalt.current;
    if (!falt) return;
    falt.focus();
    document.execCommand(kommando);
    falt.dispatchEvent(new InputEvent("input", { bubbles: true }));
  };

  return (
    <article className="anteckningseditor h-full min-h-0 flex flex-col">
      <div className="anteckningseditor-verktyg">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {mobil && (
            <button
              type="button"
              className="knapp micro"
              onClick={onTillbaka}
              aria-label="Tillbaka till biblioteket"
            >
              ‹
            </button>
          )}
          <input
            ref={titelRef}
            className="falt !border-0 !px-0 display !text-[1.1rem]"
            value={form.titel}
            onChange={(e) => satt({ titel: e.target.value })}
            placeholder="Dokumentets titel"
            aria-label="Dokumentets titel"
          />
        </div>
        <div className="anteckningsformat" role="toolbar" aria-label="Textformatering">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format("bold")}
            aria-label="Fet text"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format("italic")}
            aria-label="Kursiv text"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format("strikeThrough")}
            aria-label="Överstruken text"
          >
            <s>S</s>
          </button>
        </div>
        <button
          type="button"
          className="nal"
          data-pa={anteckning.nalad ? "1" : "0"}
          onClick={() => butik.vaxlaNalad(anteckning.id)}
          aria-label={anteckning.nalad ? "Ta bort nålen" : "Nåla överst"}
        >
          ▣
        </button>
      </div>

      <div className="anteckningseditor-meta">
        <select
          className="falt !w-auto"
          value={form.kalenderId}
          onChange={(e) => satt({ kalenderId: e.target.value })}
          aria-label="Kalender"
        >
          {butik.kalendrar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.namn}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="falt !w-auto tabnum"
          value={form.datum ?? ""}
          onChange={(e) => satt({ datum: e.target.value || null })}
          aria-label="Hör till dagen"
        />
        {!form.datum && (
          <button
            type="button"
            className="knapp pico"
            onClick={() => satt({ datum: nyckel(startAvDag(new Date())) })}
          >
            Idag
          </button>
        )}
        {form.datum && (
          <button type="button" className="knapp pico" onClick={() => satt({ datum: null })}>
            Utan dag
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          className="knapp pico"
          onClick={() => {
            if (
              window.confirm(
                `Radera ”${anteckning.titel || "Utan rubrik"}”? Går att ångra med ⌘Z.`
              )
            ) {
              onTillbaka();
              butik.taBortAnteckning(anteckning.id);
            }
          }}
        >
          Radera dokument
        </button>
      </div>

      <div className="anteckningsark tunnskroll">
        <Blockmeny
          onValj={(typ) => satt({ block: [nyttBlock(typ), ...form.block] })}
          etikett="Lägg första avsnittet"
        />
        {form.block.map((block, index) => (
          <div key={block.id} className="anteckningsblock">
            <div className="anteckningsblock-kontroller">
              <button
                type="button"
                onClick={() => flytta(index, -1)}
                aria-label="Flytta avsnittet uppåt"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => flytta(index, 1)}
                aria-label="Flytta avsnittet nedåt"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  satt({ block: form.block.filter((b) => b.id !== block.id) })
                }
                aria-label="Radera avsnittet"
              >
                ×
              </button>
            </div>
            <Block
              block={block}
              aktivtFalt={aktivtFalt}
              onChange={(nytt) => sattBlock(block.id, nytt)}
            />
            <Blockmeny
              onValj={(typ) => infogaEfter(index, typ)}
              etikett="Lägg till avsnitt"
            />
          </div>
        ))}
        {form.block.length === 0 && (
          <div className="anteckningar-tomt !min-h-[220px]">
            <p className="micro">Dokumentet är tomt</p>
            <p className="pico opacity-55">
              Välj ett avsnitt ovan: text, rubrik, tvåspalt, tabell eller citat.
            </p>
          </div>
        )}

        <div className="anteckningskopplingar">
          <Kopplingar
            id={anteckning.id}
            titel={form.titel}
            text={blockTillText(form.block)}
            onOppnaMal={(mal) =>
              mal.slag === "anteckning" ? onOppnaAnteckning(mal.id) : onOppnaMal(mal)
            }
            onSkapa={onFoljLank}
          />
        </div>
      </div>
    </article>
  );
}

function Blockmeny({
  onValj,
  etikett,
}: {
  onValj(typ: Blocktyp): void;
  etikett: string;
}) {
  return (
    <div className="anteckningsblock-meny" aria-label={etikett}>
      <span>+</span>
      {(
        [
          ["text", "Text"],
          ["rubrik", "Rubrik"],
          ["spalter", "Tvåspalt"],
          ["tabell", "Tabell"],
          ["citat", "Citat"],
        ] as const
      ).map(([typ, namn]) => (
        <button key={typ} type="button" onClick={() => onValj(typ)}>
          {namn}
        </button>
      ))}
    </div>
  );
}

function Block({
  block,
  aktivtFalt,
  onChange,
}: {
  block: Anteckningsblock;
  aktivtFalt: MutableRefObject<HTMLElement | null>;
  onChange(block: Anteckningsblock): void;
}) {
  if (block.typ === "rubrik") {
    return (
      <div className="anteckningsrubrik-wrap">
        <RichText
          html={block.text}
          tag={block.niva === 2 ? "h2" : "h3"}
          klass={block.niva === 2 ? "antecknings-h2" : "antecknings-h3"}
          platshallare="Rubrik"
          aktivtFalt={aktivtFalt}
          onChange={(text) => onChange({ ...block, text })}
        />
        <button
          type="button"
          className="knapp pico"
          onClick={() =>
            onChange({ ...block, niva: block.niva === 2 ? 3 : 2 })
          }
        >
          H{block.niva}
        </button>
      </div>
    );
  }
  if (block.typ === "text") {
    return (
      <RichText
        html={block.text}
        tag="p"
        klass="antecknings-text"
        platshallare="Skriv här …"
        aktivtFalt={aktivtFalt}
        onChange={(text) => onChange({ ...block, text })}
      />
    );
  }
  if (block.typ === "citat") {
    return (
      <RichText
        html={block.text}
        tag="blockquote"
        klass="antecknings-citat"
        platshallare="Citat eller utdrag …"
        aktivtFalt={aktivtFalt}
        onChange={(text) => onChange({ ...block, text })}
      />
    );
  }
  if (block.typ === "spalter") {
    return (
      <div className="anteckningsspalter">
        <RichText
          html={block.vanster}
          tag="div"
          klass="anteckningsspalt"
          platshallare="Vänster spalt …"
          aktivtFalt={aktivtFalt}
          onChange={(vanster) => onChange({ ...block, vanster })}
        />
        <RichText
          html={block.hoger}
          tag="div"
          klass="anteckningsspalt"
          platshallare="Höger spalt …"
          aktivtFalt={aktivtFalt}
          onChange={(hoger) => onChange({ ...block, hoger })}
        />
      </div>
    );
  }

  const sattCell = (rad: number, kolumn: number, text: string) =>
    onChange({
      ...block,
      celler: block.celler.map((r, ri) =>
        ri === rad ? r.map((c, ci) => (ci === kolumn ? text : c)) : r
      ),
    });
  const kolumner = Math.max(1, ...block.celler.map((rad) => rad.length));
  return (
    <figure className="anteckningstabell-wrap">
      <div className="overflow-x-auto">
        <table className="anteckningstabell">
          <tbody>
            {block.celler.map((rad, ri) => (
              <tr key={ri}>
                {Array.from({ length: kolumner }, (_, ci) => (
                  <td key={ci} data-rubrik={ri === 0 ? "1" : undefined}>
                    <RichText
                      html={rad[ci] ?? ""}
                      tag="div"
                      klass="anteckningstabell-cell"
                      platshallare="—"
                      aktivtFalt={aktivtFalt}
                      onChange={(text) => sattCell(ri, ci, text)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        <button
          type="button"
          className="knapp pico"
          onClick={() =>
            onChange({
              ...block,
              celler: [
                ...block.celler,
                Array.from({ length: kolumner }, () => ""),
              ],
            })
          }
        >
          + rad
        </button>
        <button
          type="button"
          className="knapp pico"
          onClick={() =>
            block.celler.length > 1 &&
            onChange({ ...block, celler: block.celler.slice(0, -1) })
          }
        >
          − rad
        </button>
        <button
          type="button"
          className="knapp pico"
          onClick={() =>
            onChange({
              ...block,
              celler: block.celler.map((rad) => [...rad, ""]),
            })
          }
        >
          + kolumn
        </button>
        <button
          type="button"
          className="knapp pico"
          onClick={() =>
            kolumner > 1 &&
            onChange({
              ...block,
              celler: block.celler.map((rad) => rad.slice(0, -1)),
            })
          }
        >
          − kolumn
        </button>
      </div>
    </figure>
  );
}

function saneraHtml(html: string) {
  if (typeof document === "undefined") {
    return html.replace(
      /<(?!\/?(?:b|strong|i|em|s|strike|br)\b)[^>]*>/gi,
      ""
    );
  }
  const mall = document.createElement("template");
  mall.innerHTML = html;
  const tillatna = new Set([
    "B",
    "STRONG",
    "I",
    "EM",
    "S",
    "STRIKE",
    "BR",
    "DIV",
  ]);
  const gang = document.createTreeWalker(mall.content, NodeFilter.SHOW_ELEMENT);
  const element: Element[] = [];
  let nod: Node | null;
  while ((nod = gang.nextNode())) element.push(nod as Element);
  for (const el of element) {
    if (!tillatna.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
    } else {
      for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    }
  }
  return mall.innerHTML;
}

function RichText({
  html,
  tag,
  klass,
  platshallare,
  aktivtFalt,
  onChange,
}: {
  html: string;
  tag: "p" | "div" | "h2" | "h3" | "blockquote";
  klass: string;
  platshallare: string;
  aktivtFalt: MutableRefObject<HTMLElement | null>;
  onChange(html: string): void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, [html]);
  const Tag = tag;
  return (
    <Tag
      ref={ref as never}
      className={`antecknings-rich ${klass}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      data-platshallare={platshallare}
      onFocus={(e) => {
        aktivtFalt.current = e.currentTarget;
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand(
          "insertText",
          false,
          e.clipboardData.getData("text/plain")
        );
      }}
      onInput={(e) => onChange(saneraHtml(e.currentTarget.innerHTML))}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      dangerouslySetInnerHTML={{ __html: saneraHtml(html) }}
    />
  );
}
