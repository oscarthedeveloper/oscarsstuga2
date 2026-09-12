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
import type { Peka } from "./KalenderApp";

const STANDARD_BOK = "Allmänna anteckningar";
const BOKREGISTER_SIDA = "anteckningsbocker";
type Blocktyp = Anteckningsblock["typ"];

const OVERSTRYKNINGAR = [
  { id: "1", namn: "Röd", farg: "rgb(255, 215, 205)" },
  { id: "2", namn: "Orange", farg: "rgb(247, 221, 191)" },
  { id: "3", namn: "Gul", farg: "rgb(247, 235, 174)" },
  { id: "4", namn: "Grön", farg: "rgb(216, 234, 219)" },
  { id: "5", namn: "Turkos", farg: "rgb(213, 237, 247)" },
  { id: "6", namn: "Blå", farg: "rgb(219, 227, 242)" },
  { id: "7", namn: "Lila", farg: "rgb(230, 219, 239)" },
  { id: "8", namn: "Rosa", farg: "rgb(243, 221, 230)" },
] as const;

function nyttId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function nyttBlock(typ: Blocktyp): Anteckningsblock {
  const id = nyttId();
  if (typ === "rubrik") return { id, typ, text: "", niva: 2 };
  if (typ === "text" || typ === "citat") return { id, typ, text: "" };
  if (typ === "spalter") return { id, typ, vanster: "", hoger: "" };
  if (typ === "glosor") {
    return { id, typ, rader: [{ id: nyttId(), term: "", definition: "" }] };
  }
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
      if (b.typ === "glosor") {
        return b.rader.flatMap((rad) => [rad.term, rad.definition]);
      }
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
    (
      titel = "",
      bok = valdBok ?? bocker[0] ?? STANDARD_BOK,
      format: "dokument" | "glosor" = "dokument"
    ) => {
      if (!bocker.includes(bok)) {
        butik.sparaSida(BOKREGISTER_SIDA, { namn: [...bocker, bok] });
      }
      const a = butik.skapaAnteckning({
        titel,
        brodtext: "",
        bok,
        block: [nyttBlock(format === "glosor" ? "glosor" : "text")],
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

  if (oppen) {
    return (
      <Dokumentredigerare
        key={oppen.id}
        anteckning={oppen}
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
            <div className="anteckningsformat-val">
              <button
                type="button"
                className="knapp micro"
                data-ton="accent"
                onClick={() => skapaAnteckning("", valdBok, "dokument")}
              >
                + Dokument
              </button>
              <button
                type="button"
                className="knapp micro"
                onClick={() => skapaAnteckning("Glosor", valdBok, "glosor")}
              >
                + Gloslista
              </button>
            </div>
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
                    {a.block[0]?.typ === "glosor"
                      ? `Glosor · ${a.block[0].rader.filter((rad) => rad.term || rad.definition).length} kort`
                      : a.datum
                        ? kortDatum(tolka(a.datum))
                        : `${a.block.length} avsnitt`}
                  </span>
                  {a.nalad && <span aria-label="Nålad">▣</span>}
                </button>
              ))}
              {dokument.length === 0 && (
                <p className="pico opacity-50 p-3">Inget matchar sökningen.</p>
              )}
            </div>
          </aside>

          <div className="anteckningsdokument-yta anteckningsbibliotek-vinjett">
            <div className="antecknings-tavlor" aria-hidden="true">
              <span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/stamning/laokoon.jpg" alt="" />
              </span>
              <span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/stamning/havsgud.jpg" alt="" />
              </span>
            </div>
            <div className="antecknings-vinjetttext">
              <p className="pico opacity-50 uppercase tracking-[0.12em]">Två sätt att skriva</p>
              <p className="display text-[clamp(1.35rem,2.5vw,2.1rem)] leading-tight">
                Dokument för tankar.<br />Gloslistor för minnet.
              </p>
              <p className="pico opacity-55 max-w-[34rem] leading-relaxed">
                Dokument öppnas som ett A4. Gloslistor är byggda för att kopieras
                direkt till Quizlet eller Anki.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Dokumentredigerare({
  anteckning,
  onTillbaka,
  onFoljLank,
  onOppnaMal,
  onOppnaAnteckning,
}: {
  anteckning: Anteckning;
  onTillbaka(): void;
  onFoljLank(titel: string): void;
  onOppnaMal(mal: Mal): void;
  onOppnaAnteckning(id: string): void;
}) {
  const butik = useButik();
  const [form, setForm] = useState(anteckning);
  const titelRef = useRef<HTMLInputElement>(null);
  const aktivtFalt = useRef<HTMLElement | null>(null);
  const papperRef = useRef<HTMLDivElement>(null);
  const [aktivtBlockId, setAktivtBlockId] = useState<string | null>(null);
  const [utskriftsstatus, setUtskriftsstatus] = useState<string | null>(null);
  const arGloslista = form.block[0]?.typ === "glosor";

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

  const format = (
    kommando: "bold" | "italic" | "underline" | "strikeThrough"
  ) => {
    const falt = aktivtFalt.current;
    if (!falt) return;
    falt.focus();
    document.execCommand(kommando);
    falt.dispatchEvent(new InputEvent("input", { bubbles: true }));
  };

  const overstryk = (farg: string | null) => {
    const falt = aktivtFalt.current;
    if (!falt) return;
    falt.focus();
    document.execCommand("styleWithCSS", false, "true");
    const varde = farg ?? "transparent";
    const lyckades = document.execCommand("hiliteColor", false, varde);
    if (!lyckades) document.execCommand("backColor", false, varde);
    falt.dispatchEvent(new InputEvent("input", { bubbles: true }));
  };

  const oppnaUtskrift = () => {
    const papper = papperRef.current;
    if (!papper) return;
    const typografiKlass = document.documentElement.className;
    const utskrift = window.open("", "_blank", "popup,width=980,height=860");
    if (!utskrift) {
      setUtskriftsstatus("Tillåt popup-fönster och försök igen.");
      window.setTimeout(() => setUtskriftsstatus(null), 5000);
      return;
    }

    const stilar = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((nod) => nod.outerHTML)
      .join("\n");
    utskrift.document.open();
    utskrift.document.write(`<!doctype html>
      <html lang="sv" class="${typografiKlass}">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Utskrift – Oscars databas</title>
          ${stilar}
          <style>
            body.utskriftssida { height:auto; min-height:100%; overflow:auto; padding:24px; background:#d8d7d2; }
            .utskriftskontroll { position:sticky; z-index:20; top:0; display:flex; align-items:center; justify-content:center; gap:14px; width:min(210mm, 100%); margin:0 auto 18px; padding:10px 12px; border:1px solid #111; background:#f7f7f5; color:#111; font:12px/1.4 var(--font-pico), monospace; }
            .utskriftskontroll button { padding:7px 12px; border:1px solid #111; background:#ff5c39; cursor:pointer; }
            body.utskriftssida .anteckningspapper { width:min(210mm, 100%); margin:0 auto; }
            body.utskriftssida .anteckningsblock-meny,
            body.utskriftssida .anteckningsblock-kontroller,
            body.utskriftssida .anteckningsrubrik-wrap > button,
            body.utskriftssida .anteckningstabell-wrap > .flex,
            body.utskriftssida .anteckningskopplingar { display:none !important; }
            @media print { .utskriftskontroll { display:none !important; } body.utskriftssida { padding:0; background:#fff; } }
          </style>
        </head>
        <body class="utskriftssida">
          <div class="utskriftskontroll">
            <span>Välj skrivare eller <strong>Spara som PDF</strong> i dialogrutan.</span>
            <button type="button" data-skriv-ut>Skriv ut / PDF</button>
          </div>
          ${papper.outerHTML}
        </body>
      </html>`);
    utskrift.document.close();
    utskrift.document
      .querySelector<HTMLButtonElement>("[data-skriv-ut]")
      ?.addEventListener("click", () => utskrift.print());
    setUtskriftsstatus("Utskriftsvyn öppnades i ett nytt fönster.");
    window.setTimeout(() => setUtskriftsstatus(null), 4000);
    window.setTimeout(() => {
      utskrift.focus();
      utskrift.print();
    }, 650);
  };

  const aktivtBlock = form.block.find((block) => block.id === aktivtBlockId);
  const aktivStil =
    aktivtBlock?.typ === "rubrik"
      ? `h${aktivtBlock.niva}`
      : aktivtBlock?.typ === "text"
        ? "p"
        : "";
  const andraStil = (stil: "p" | "h1" | "h2" | "h3") => {
    if (!aktivtBlockId) return;
    setForm((f) => ({
      ...f,
      block: f.block.map((block) => {
        if (block.id !== aktivtBlockId) return block;
        if (block.typ !== "text" && block.typ !== "rubrik") return block;
        if (stil === "p") return { id: block.id, typ: "text", text: block.text };
        return {
          id: block.id,
          typ: "rubrik",
          text: block.text,
          niva: Number(stil.slice(1)) as 1 | 2 | 3,
        };
      }),
    }));
  };

  return (
    <article className="anteckningseditor h-full min-h-0 flex flex-col">
      <div className="anteckningseditor-verktyg">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            className="knapp micro"
            onClick={onTillbaka}
            aria-label="Tillbaka till biblioteket"
          >
            ‹ Biblioteket
          </button>
          <input
            ref={titelRef}
            className="falt !border-0 !px-0 display !text-[1.1rem]"
            value={form.titel}
            onChange={(e) => satt({ titel: e.target.value })}
            placeholder="Dokumentets titel"
            aria-label="Dokumentets titel"
          />
        </div>
        {!arGloslista && (
          <div className="anteckningsformat" role="toolbar" aria-label="Textformatering">
            <select
              value={aktivStil}
              onChange={(e) => andraStil(e.target.value as "p" | "h1" | "h2" | "h3")}
              disabled={!aktivStil}
              aria-label="Textstil för aktivt avsnitt"
              title={aktivStil ? "Textstil" : "Placera markören i ett textavsnitt"}
            >
              <option value="">Textstil</option>
              <option value="p">Stycke</option>
              <option value="h1">Rubrik 1</option>
              <option value="h2">Rubrik 2</option>
              <option value="h3">Rubrik 3</option>
            </select>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} aria-label="Fet text"><b>B</b></button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("italic")} aria-label="Kursiv text"><i>I</i></button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("underline")} aria-label="Understruken text"><u>U</u></button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => format("strikeThrough")} aria-label="Genomstruken text"><s>S</s></button>
            <span className="anteckningsmarkeringar" role="group" aria-label="Överstrykning">
              <span className="anteckningsmarkering-etikett">Överstryk</span>
              {OVERSTRYKNINGAR.map((markering) => (
                <button
                  key={markering.id}
                  type="button"
                  className="anteckningsmarkering"
                  style={{ background: markering.farg }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => overstryk(markering.farg)}
                  aria-label={`Överstryk med ${markering.namn.toLocaleLowerCase("sv")}`}
                  title={markering.namn}
                />
              ))}
              <button
                type="button"
                className="anteckningsmarkering-rensa"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => overstryk(null)}
                aria-label="Ta bort överstrykning"
                title="Ta bort överstrykning"
              >
                ×
              </button>
            </span>
          </div>
        )}
        {!arGloslista && (
          <button
            type="button"
            className="knapp pico antecknings-skrivut"
            onClick={oppnaUtskrift}
            title="Öppna en ren utskriftsvy; välj Spara som PDF för att ladda ned"
          >
            Skriv ut / PDF
          </button>
        )}
        {utskriftsstatus && !arGloslista && (
          <span className="pico antecknings-utskriftsstatus" role="status">
            {utskriftsstatus}
          </span>
        )}
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

      <div className={arGloslista ? "glosarbetsyta tunnskroll" : "anteckningsarbetsyta tunnskroll"}>
        {arGloslista && form.block[0]?.typ === "glosor" ? (
          <Glosredigerare
            titel={form.titel}
            block={form.block[0]}
            onChange={(nytt) => sattBlock(nytt.id, nytt)}
          />
        ) : (
          <div ref={papperRef} className="anteckningspapper">
            <header className="anteckningspapper-huvud">
              <p className="pico opacity-45 uppercase tracking-[0.13em]">{form.bok}</p>
              <h1>{form.titel || "Utan rubrik"}</h1>
            </header>
            <Blockmeny
              onValj={(typ) => satt({ block: [nyttBlock(typ), ...form.block] })}
              etikett="Lägg första avsnittet"
            />
            {form.block.map((block, index) => (
              <div
                key={block.id}
                className="anteckningsblock"
                onFocusCapture={() => setAktivtBlockId(block.id)}
              >
                <div className="anteckningsblock-kontroller">
                  <button type="button" onClick={() => flytta(index, -1)} aria-label="Flytta avsnittet uppåt">↑</button>
                  <button type="button" onClick={() => flytta(index, 1)} aria-label="Flytta avsnittet nedåt">↓</button>
                  <button
                    type="button"
                    onClick={() => satt({ block: form.block.filter((b) => b.id !== block.id) })}
                    aria-label="Radera avsnittet"
                  >
                    ×
                  </button>
                </div>
                <Block block={block} aktivtFalt={aktivtFalt} onChange={(nytt) => sattBlock(block.id, nytt)} />
                <Blockmeny onValj={(typ) => infogaEfter(index, typ)} etikett="Lägg till avsnitt" />
              </div>
            ))}
            {form.block.length === 0 && (
              <div className="anteckningar-tomt !min-h-[220px]">
                <p className="micro">Dokumentet är tomt</p>
                <p className="pico opacity-55">Välj ett avsnitt ovan: text, rubrik, tvåspalt, tabell eller citat.</p>
              </div>
            )}

            <div className="anteckningskopplingar">
              <Kopplingar
                id={anteckning.id}
                titel={form.titel}
                text={blockTillText(form.block)}
                onOppnaMal={(mal) => mal.slag === "anteckning" ? onOppnaAnteckning(mal.id) : onOppnaMal(mal)}
                onSkapa={onFoljLank}
              />
            </div>
          </div>
        )}
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

function Glosredigerare({
  titel,
  block,
  onChange,
}: {
  titel: string;
  block: Extract<Anteckningsblock, { typ: "glosor" }>;
  onChange(block: Extract<Anteckningsblock, { typ: "glosor" }>): void;
}) {
  const [kopierad, setKopierad] = useState(false);
  const rena = (text: string) => text.replace(/\t/g, " ").replace(/[\r\n]+/g, " ").trim();
  const importtext = block.rader
    .filter((rad) => rad.term.trim() || rad.definition.trim())
    .map((rad) => `${rena(rad.term)}\t${rena(rad.definition)}`)
    .join("\n");

  const sattRad = (id: string, delar: { term?: string; definition?: string }) => {
    const rader = block.rader.map((rad) =>
      rad.id === id ? { ...rad, ...delar } : rad
    );

    // Tabellen håller alltid exakt en tom rad sist. Så snart den fylls
    // växer listan utan att användaren behöver avbryta skrivandet för att
    // skapa nästa kort.
    while (
      rader.length > 1 &&
      !rader.at(-1)?.term.trim() &&
      !rader.at(-1)?.definition.trim() &&
      !rader.at(-2)?.term.trim() &&
      !rader.at(-2)?.definition.trim()
    ) {
      rader.pop();
    }
    const sista = rader.at(-1);
    if (sista && (sista.term.trim() || sista.definition.trim())) {
      rader.push({ id: nyttId(), term: "", definition: "" });
    }
    onChange({ ...block, rader });
  };

  const kopiera = async () => {
    if (!importtext) return;
    try {
      await navigator.clipboard.writeText(importtext);
    } catch {
      const falt = document.createElement("textarea");
      falt.value = importtext;
      falt.style.position = "fixed";
      falt.style.opacity = "0";
      document.body.appendChild(falt);
      falt.select();
      document.execCommand("copy");
      falt.remove();
    }
    setKopierad(true);
    window.setTimeout(() => setKopierad(false), 1800);
  };

  const laddaNed = () => {
    if (!importtext) return;
    const blob = new Blob([importtext], { type: "text/plain;charset=utf-8" });
    const lank = document.createElement("a");
    lank.href = URL.createObjectURL(blob);
    lank.download = `${titel.trim().replace(/[^a-z0-9åäö_-]+/gi, "-").replace(/^-|-$/g, "") || "glosor"}.txt`;
    lank.click();
    window.setTimeout(() => URL.revokeObjectURL(lank.href), 0);
  };

  return (
    <div className="glosdokument">
      <div className="glosverktyg">
        <p className="pico opacity-60">
          En tabellrad blir ett kort · tabulator mellan term och definition
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="knapp micro" data-ton="accent" onClick={() => void kopiera()} disabled={!importtext}>
            {kopierad ? "Kopierat" : "Kopiera till Quizlet"}
          </button>
          <button type="button" className="knapp micro" onClick={laddaNed} disabled={!importtext}>Ladda ned .txt</button>
        </div>
      </div>

      <div className="glostabell" role="table" aria-label="Glosor">
        <div className="glosrad glosrad-huvud" role="row">
          <span role="columnheader">Term</span>
          <span role="columnheader">Definition</span>
        </div>
        {block.rader.map((rad, index) => (
          <div className="glosrad" role="row" key={rad.id}>
            <textarea
              className="glosfalt"
              rows={2}
              value={rad.term}
              onChange={(e) => sattRad(rad.id, { term: e.target.value })}
              placeholder="Term, uttryck eller mening"
              aria-label={`Term ${index + 1}`}
              role="cell"
            />
            <textarea
              className="glosfalt"
              rows={2}
              value={rad.definition}
              onChange={(e) => sattRad(rad.id, { definition: e.target.value })}
              placeholder="Definition, översättning eller mening"
              aria-label={`Definition ${index + 1}`}
              role="cell"
            />
          </div>
        ))}
      </div>
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
    const tag = block.niva === 1 ? "h1" : block.niva === 2 ? "h2" : "h3";
    return (
      <div className="anteckningsrubrik-wrap">
        <RichText
          html={block.text}
          tag={tag}
          klass={`antecknings-h${block.niva}`}
          platshallare="Rubrik"
          aktivtFalt={aktivtFalt}
          onChange={(text) => onChange({ ...block, text })}
        />
        <button
          type="button"
          className="knapp pico"
          onClick={() =>
            onChange({
              ...block,
              niva: block.niva === 3 ? 1 : (block.niva + 1) as 1 | 2 | 3,
            })
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

  if (block.typ === "glosor") return null;

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
      /<(?!\/?(?:b|strong|i|em|u|s|strike|br)\b)[^>]*>/gi,
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
    "U",
    "S",
    "STRIKE",
    "BR",
    "DIV",
    "SPAN",
  ]);
  const gang = document.createTreeWalker(mall.content, NodeFilter.SHOW_ELEMENT);
  const element: Element[] = [];
  let nod: Node | null;
  while ((nod = gang.nextNode())) element.push(nod as Element);
  for (const el of element) {
    if (!tillatna.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    if (el.tagName === "SPAN") {
      const sparad = el.getAttribute("data-markering");
      const bakgrund = (el as HTMLElement).style.backgroundColor
        .toLocaleLowerCase()
        .replace(/\s+/g, "");
      const markering = OVERSTRYKNINGAR.find(
        (val) =>
          val.id === sparad ||
          val.farg.toLocaleLowerCase().replace(/\s+/g, "") === bakgrund
      );
      for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
      if (markering) {
        el.setAttribute("data-markering", markering.id);
      } else {
        el.replaceWith(...Array.from(el.childNodes));
      }
      continue;
    }

    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
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
  tag: "p" | "div" | "h1" | "h2" | "h3" | "blockquote";
  klass: string;
  platshallare: string;
  aktivtFalt: MutableRefObject<HTMLElement | null>;
  onChange(html: string): void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== html) {
      el.innerHTML = saneraHtml(html);
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
    />
  );
}
