"use client";

/**
 * Ett block, läst och redigerat.
 *
 * Läsläget är förvalt och redigeringen sker på knapptryck, inte på
 * klick i texten. Det är ett medvetet val: ett stycke som blir ett
 * textfält när man klickar i det går inte att markera med musen, och
 * på en telefon blir varje rullning med fingret en risk att öppna
 * redigeringen av fel block. Ett nytt block öppnas däremot direkt —
 * där finns ingenting att läsa ännu.
 */

import { useState } from "react";
import { delaMarkering } from "@/lib/sidor/markering";
import { PERSONER, type Block } from "@/lib/sidor/sprak";

/* ==================================================================
   LÄSA
   ================================================================== */

/** Text med **fet**, *kursiv* och `kod`. */
export function Markerad({ text }: { text: string }) {
  const bitar = delaMarkering(text);
  return (
    <>
      {bitar.map((b, i) => {
        if (b.slag === "fet") return <strong key={i}>{b.text}</strong>;
        if (b.slag === "kursiv") return <em key={i}>{b.text}</em>;
        if (b.slag === "kod") return <code key={i}>{b.text}</code>;
        return <span key={i}>{b.text}</span>;
      })}
    </>
  );
}

/** Fliken bär ORDET. Färgen skiljer bara de tre slagen åt. */
const RUTORD: Record<string, string> = {
  info: "Not",
  varning: "Obs",
  tips: "Tips",
};

export function VisaBlock({ block }: { block: Block }) {
  const [flik, setFlik] = useState(0);

  switch (block.typ) {
    case "rubrik":
      return <h3 className="dokrubrik">{block.text || "Namnlös rubrik"}</h3>;

    case "text":
      return (
        <p className="brodtext">
          <Markerad text={block.text} />
        </p>
      );

    case "tabell":
      return (
        <div>
          {block.rubrik && (
            <span className="tabellbildtext">{block.rubrik}</span>
          )}
          <div className="tabellsvep">
            <table className="doktabell">
              {block.rubriker.some(Boolean) && (
                <thead>
                  <tr>
                    {block.rubriker.map((r, i) => (
                      <th key={i}>{r}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {block.rader.map((rad, i) => (
                  <tr
                    key={i}
                    data-framhavd={block.framhavda.includes(i) ? "1" : "0"}
                  >
                    {rad.map((cell, j) => (
                      <td key={j}>
                        <Markerad text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "belagg": {
      // Layouten följer innehållet: utan kommentar går citatet i full
      // bredd och stor grad, med kommentar blir det en vänsterspalt.
      const tvaspalt = block.kommentar.trim().length > 0;
      return (
        <div className="belagg" data-tvaspalt={tvaspalt ? "1" : "0"}>
          <div className="belaggcitat">
            <p className="belaggtext">
              <Markerad text={block.citat} />
            </p>
            {block.kalla && (
              <span className="belaggkalla">{block.kalla}</span>
            )}
          </div>
          {tvaspalt && (
            <p className="brodtext !text-[0.92rem]">
              <Markerad text={block.kommentar} />
            </p>
          )}
        </div>
      );
    }

    case "fakta":
      return (
        <div className="faktarad">
          {block.rader.map((r, i) => (
            <div key={i}>
              <span className="faktaetikett">{r.etikett}</span>
              <span className="faktavarde">
                <Markerad text={r.varde} />
              </span>
            </div>
          ))}
        </div>
      );

    case "bojning":
      return (
        <div>
          {block.rubrik && (
            <p className="micro mb-1.5 opacity-70">{block.rubrik}</p>
          )}
          <div className="tabellsvep">
            <table className="doktabell">
              <thead>
                <tr>
                  <th />
                  {block.kolumner.map((k, i) => (
                    <th key={i}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rader.map((rad, i) => (
                  <tr key={i}>
                    <td data-etikett="1">{rad.etikett}</td>
                    {block.kolumner.map((_, j) => (
                      <td key={j}>{rad.former[j] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case "ordpar":
      return (
        <div className="tvaspalt" data-stapla="0">
          {(block.vansterNamn || block.hogerNamn) && (
            <>
              <span className="spaltrubrik">{block.vansterNamn}</span>
              <span className="spaltrubrik">{block.hogerNamn}</span>
            </>
          )}
          {block.par.map((p) => (
            <span key={p.vanster + p.hoger} className="contents">
              <span className="text-[0.8rem]">
                <Markerad text={p.vanster} />
              </span>
              <span className="text-[0.8rem] opacity-75">
                <Markerad text={p.hoger} />
              </span>
            </span>
          ))}
        </div>
      );

    case "parallell":
      return (
        <div className="tvaspalt" data-stapla="0">
          {(block.vansterNamn || block.hogerNamn) && (
            <>
              <span className="spaltrubrik">{block.vansterNamn}</span>
              <span className="spaltrubrik">{block.hogerNamn}</span>
            </>
          )}
          <div className="brodtext !text-[0.78rem]">
            <Markerad text={block.vanster} />
          </div>
          <div className="brodtext !text-[0.78rem] opacity-80">
            <Markerad text={block.hoger} />
          </div>
        </div>
      );

    case "flikar": {
      const aktiv = block.flikar[Math.min(flik, block.flikar.length - 1)];
      return (
        <div>
          <div className="flikrad" role="tablist">
            {block.flikar.map((f, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                className="flik pico"
                data-aktiv={i === flik ? "1" : "0"}
                aria-selected={i === flik}
                onClick={() => setFlik(i)}
              >
                {f.namn || `Flik ${i + 1}`}
              </button>
            ))}
          </div>
          <p className="brodtext pt-2">
            <Markerad text={aktiv?.text ?? ""} />
          </p>
        </div>
      );
    }

    case "ruta":
      return (
        <div className="dokruta" data-slag={block.slag}>
          <span className="dokflik">
            {block.titel || RUTORD[block.slag] || RUTORD.info}
          </span>
          <div className="dokrutinnehall">
            <p className="brodtext !text-[0.92rem]">
              <Markerad text={block.text} />
            </p>
          </div>
        </div>
      );
  }
}

/* ==================================================================
   REDIGERA
   ================================================================== */

export function RedigeraBlock({
  block,
  onAndra,
}: {
  block: Block;
  onAndra(b: Block): void;
}) {
  /** Kortare väg till "samma block, men med de här fälten ändrade". */
  const satt = (delar: Partial<Block>) =>
    onAndra({ ...block, ...delar } as Block);

  switch (block.typ) {
    case "rubrik":
      return (
        <input
          className="falt display !text-[1rem]"
          placeholder="Rubrik"
          value={block.text}
          onChange={(e) => satt({ text: e.target.value })}
          aria-label="Rubrik"
          autoFocus
        />
      );

    case "text":
      return (
        <>
          <textarea
            className="skrivyta !flex-none"
            rows={5}
            placeholder="Skriv fritt. **fet**, *kursiv* och `kod` fungerar."
            value={block.text}
            onChange={(e) => satt({ text: e.target.value })}
            aria-label="Text"
            autoFocus
          />
          <p className="pico opacity-40 mt-1">
            **fet** · *kursiv* · `kod`
          </p>
        </>
      );

    case "ruta":
      return (
        <div className="flex flex-col gap-2">
          <div className="chiprad">
            {(["info", "varning", "tips"] as const).map((slag) => (
              <button
                key={slag}
                type="button"
                className="knapp pico"
                data-aktiv={block.slag === slag ? "1" : "0"}
                onClick={() => satt({ slag })}
              >
                {RUTORD[slag]}
              </button>
            ))}
          </div>
          <input
            className="falt"
            placeholder="Flikens ord — annars Not/Obs/Tips"
            value={block.titel}
            onChange={(e) => satt({ titel: e.target.value })}
            aria-label="Rutans rubrik"
          />
          <textarea
            className="skrivyta !flex-none"
            rows={3}
            placeholder="Text"
            value={block.text}
            onChange={(e) => satt({ text: e.target.value })}
            aria-label="Rutans text"
          />
        </div>
      );

    case "parallell":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="falt"
              placeholder="Vänster spalt, t.ex. Italienska"
              value={block.vansterNamn}
              onChange={(e) => satt({ vansterNamn: e.target.value })}
              aria-label="Vänster spalts namn"
            />
            <input
              className="falt"
              placeholder="Höger spalt, t.ex. Svenska"
              value={block.hogerNamn}
              onChange={(e) => satt({ hogerNamn: e.target.value })}
              aria-label="Höger spalts namn"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            <textarea
              className="skrivyta !flex-none"
              rows={6}
              placeholder="Texten"
              value={block.vanster}
              onChange={(e) => satt({ vanster: e.target.value })}
              aria-label="Vänster text"
            />
            <textarea
              className="skrivyta !flex-none"
              rows={6}
              placeholder="Översättningen"
              value={block.hoger}
              onChange={(e) => satt({ hoger: e.target.value })}
              aria-label="Höger text"
            />
          </div>
        </div>
      );

    case "ordpar":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="falt"
              placeholder="Vänster spalt"
              value={block.vansterNamn}
              onChange={(e) => satt({ vansterNamn: e.target.value })}
              aria-label="Vänster spalts namn"
            />
            <input
              className="falt"
              placeholder="Höger spalt"
              value={block.hogerNamn}
              onChange={(e) => satt({ hogerNamn: e.target.value })}
              aria-label="Höger spalts namn"
            />
          </div>
          {block.par.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="falt"
                placeholder="Ord"
                value={p.vanster}
                onChange={(e) =>
                  satt({
                    par: block.par.map((x, j) =>
                      j === i ? { ...x, vanster: e.target.value } : x
                    ),
                  })
                }
                aria-label={`Ord ${i + 1}`}
              />
              <input
                className="falt"
                placeholder="Betydelse"
                value={p.hoger}
                onChange={(e) =>
                  satt({
                    par: block.par.map((x, j) =>
                      j === i ? { ...x, hoger: e.target.value } : x
                    ),
                  })
                }
                aria-label={`Betydelse ${i + 1}`}
              />
              <button
                type="button"
                className="knapp pico shrink-0"
                onClick={() =>
                  satt({ par: block.par.filter((_, j) => j !== i) })
                }
                aria-label="Ta bort paret"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="knapp pico self-start"
            onClick={() =>
              satt({ par: [...block.par, { vanster: "", hoger: "" }] })
            }
          >
            + Par
          </button>
        </div>
      );

    case "flikar":
      return (
        <div className="flex flex-col gap-2">
          {block.flikar.map((f, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex gap-2 items-center">
                <input
                  className="falt"
                  placeholder={`Flik ${i + 1}`}
                  value={f.namn}
                  onChange={(e) =>
                    satt({
                      flikar: block.flikar.map((x, j) =>
                        j === i ? { ...x, namn: e.target.value } : x
                      ),
                    })
                  }
                  aria-label={`Flikens namn ${i + 1}`}
                />
                <button
                  type="button"
                  className="knapp pico shrink-0"
                  onClick={() =>
                    satt({ flikar: block.flikar.filter((_, j) => j !== i) })
                  }
                  aria-label="Ta bort fliken"
                >
                  ✕
                </button>
              </div>
              <textarea
                className="skrivyta !flex-none"
                rows={3}
                placeholder="Flikens innehåll"
                value={f.text}
                onChange={(e) =>
                  satt({
                    flikar: block.flikar.map((x, j) =>
                      j === i ? { ...x, text: e.target.value } : x
                    ),
                  })
                }
                aria-label={`Flikens text ${i + 1}`}
              />
            </div>
          ))}
          <button
            type="button"
            className="knapp pico self-start"
            onClick={() =>
              satt({ flikar: [...block.flikar, { namn: "", text: "" }] })
            }
          >
            + Flik
          </button>
        </div>
      );

    case "belagg":
      return (
        <div className="flex flex-col gap-2">
          <textarea
            className="skrivyta !flex-none display !text-[1.05rem]"
            rows={3}
            placeholder="Citatet"
            value={block.citat}
            onChange={(e) => satt({ citat: e.target.value })}
            aria-label="Citat"
            autoFocus
          />
          <input
            className="falt"
            placeholder="Källa, t.ex. Äldre Västgötalagen"
            value={block.kalla}
            onChange={(e) => satt({ kalla: e.target.value })}
            aria-label="Källa"
          />
          <textarea
            className="skrivyta !flex-none"
            rows={4}
            placeholder="Kommentar — lämnas den tom går citatet i full bredd"
            value={block.kommentar}
            onChange={(e) => satt({ kommentar: e.target.value })}
            aria-label="Kommentar"
          />
        </div>
      );

    case "fakta":
      return (
        <div className="flex flex-col gap-2">
          {block.rader.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="falt !w-[9rem]"
                placeholder="Etikett"
                value={r.etikett}
                onChange={(e) =>
                  satt({
                    rader: block.rader.map((x, j) =>
                      j === i ? { ...x, etikett: e.target.value } : x
                    ),
                  })
                }
                aria-label={`Etikett ${i + 1}`}
              />
              <input
                className="falt"
                placeholder="Värde"
                value={r.varde}
                onChange={(e) =>
                  satt({
                    rader: block.rader.map((x, j) =>
                      j === i ? { ...x, varde: e.target.value } : x
                    ),
                  })
                }
                aria-label={`Värde ${i + 1}`}
              />
              <button
                type="button"
                className="knapp pico shrink-0"
                onClick={() =>
                  satt({ rader: block.rader.filter((_, j) => j !== i) })
                }
                aria-label="Ta bort raden"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="knapp pico self-start"
            onClick={() =>
              satt({ rader: [...block.rader, { etikett: "", varde: "" }] })
            }
          >
            + Rad
          </button>
        </div>
      );

    case "tabell":
      return (
        <div className="flex flex-col gap-2">
          <input
            className="falt"
            placeholder="Bildtext över tabellen (frivillig)"
            value={block.rubrik}
            onChange={(e) => satt({ rubrik: e.target.value })}
            aria-label="Tabellens bildtext"
          />
          <Rutnatsredigering
            rubriker={block.rubriker}
            rader={block.rader}
            framhavda={block.framhavda}
            onFramhav={(i) =>
              satt({
                framhavda: block.framhavda.includes(i)
                  ? block.framhavda.filter((x) => x !== i)
                  : [...block.framhavda, i],
              })
            }
            onAndra={(rubriker, rader) =>
              satt({
                rubriker,
                rader,
                // Framhävda index som pekar utanför tabellen efter en
                // borttagen rad skulle framhäva fel rad, eller ingen.
                framhavda: block.framhavda.filter((i) => i < rader.length),
              })
            }
          />
        </div>
      );

    case "bojning":
      return (
        <div className="flex flex-col gap-2">
          <input
            className="falt"
            placeholder="Rubrik, t.ex. Presens indikativ"
            value={block.rubrik}
            onChange={(e) => satt({ rubrik: e.target.value })}
            aria-label="Böjningens rubrik"
          />
          <div className="chiprad items-center">
            <span className="pico opacity-45 shrink-0">Fyll i personer</span>
            {PERSONER.map((p) => (
              <button
                key={p.id}
                type="button"
                className="knapp pico"
                onClick={() =>
                  satt({
                    rader: p.rader.map((etikett, i) => ({
                      etikett,
                      // Behåll det som redan står skrivet på samma rad.
                      former:
                        block.rader[i]?.former ??
                        block.kolumner.map(() => ""),
                    })),
                  })
                }
              >
                {p.namn}
              </button>
            ))}
          </div>
          <Rutnatsredigering
            rubriker={block.kolumner}
            rader={block.rader.map((r) => r.former)}
            etiketter={block.rader.map((r) => r.etikett)}
            onEtikett={(i, v) =>
              satt({
                rader: block.rader.map((r, j) =>
                  j === i ? { ...r, etikett: v } : r
                ),
              })
            }
            onAndra={(kolumner, rader) =>
              satt({
                kolumner,
                rader: rader.map((former, i) => ({
                  etikett: block.rader[i]?.etikett ?? "",
                  former,
                })),
              })
            }
          />
        </div>
      );
  }
}

/**
 * Delad rutnätsredigering för tabell och böjning.
 *
 * `etiketter` gör skillnaden mellan de två: med dem får varje rad en
 * egen rubrikcell som inte räknas som data. Utan dem är det en vanlig
 * tabell. Att skriva den här två gånger vore två chanser att få
 * radinfogningen olika.
 */
function Rutnatsredigering({
  rubriker,
  rader,
  etiketter,
  framhavda,
  onEtikett,
  onFramhav,
  onAndra,
}: {
  rubriker: string[];
  rader: string[][];
  etiketter?: string[];
  framhavda?: number[];
  onEtikett?(i: number, v: string): void;
  onFramhav?(i: number): void;
  onAndra(rubriker: string[], rader: string[][]): void;
}) {
  const kolumner = Math.max(1, rubriker.length);
  const jamn = (rad: string[]) =>
    Array.from({ length: kolumner }, (_, i) => rad[i] ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="tabellsvep">
        <table className="doktabell">
          <thead>
            <tr>
              {onFramhav && <th className="w-[2.2rem]" />}
              {etiketter && <th className="w-[6rem]" />}
              {rubriker.map((r, i) => (
                <th key={i} className="!p-0">
                  <input
                    className="falt !border-0 !bg-transparent"
                    placeholder={`Kolumn ${i + 1}`}
                    value={r}
                    onChange={(e) =>
                      onAndra(
                        rubriker.map((x, j) => (j === i ? e.target.value : x)),
                        rader
                      )
                    }
                    aria-label={`Kolumnrubrik ${i + 1}`}
                  />
                </th>
              ))}
              <th className="!p-0 w-[2.2rem]">
                <button
                  type="button"
                  className="blockknapp w-full"
                  onClick={() =>
                    onAndra([...rubriker, ""], rader.map((r) => [...r, ""]))
                  }
                  aria-label="Lägg till kolumn"
                  title="Lägg till kolumn"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rader.map((rad, i) => (
              <tr key={i} data-framhavd={framhavda?.includes(i) ? "1" : "0"}>
                {onFramhav && (
                  <td className="!p-0 w-[2.2rem]">
                    <button
                      type="button"
                      className="blockknapp w-full"
                      onClick={() => onFramhav(i)}
                      aria-label={`Framhäv rad ${i + 1}`}
                      title="Framhäv raden"
                    >
                      {framhavda?.includes(i) ? "◼" : "◻"}
                    </button>
                  </td>
                )}
                {etiketter && (
                  <td data-etikett="1" className="!p-0">
                    <input
                      className="falt !border-0 !bg-transparent"
                      value={etiketter[i] ?? ""}
                      onChange={(e) => onEtikett?.(i, e.target.value)}
                      aria-label={`Radrubrik ${i + 1}`}
                    />
                  </td>
                )}
                {jamn(rad).map((cell, j) => (
                  <td key={j} className="!p-0">
                    <input
                      className="falt !border-0 !bg-transparent"
                      value={cell}
                      onChange={(e) =>
                        onAndra(
                          rubriker,
                          rader.map((r, k) =>
                            k === i
                              ? jamn(r).map((c, l) =>
                                  l === j ? e.target.value : c
                                )
                              : r
                          )
                        )
                      }
                      aria-label={`Rad ${i + 1}, kolumn ${j + 1}`}
                    />
                  </td>
                ))}
                <td className="!p-0">
                  <button
                    type="button"
                    className="blockknapp w-full"
                    onClick={() =>
                      onAndra(
                        rubriker,
                        rader.filter((_, k) => k !== i)
                      )
                    }
                    aria-label={`Ta bort rad ${i + 1}`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="knapp pico"
          onClick={() =>
            onAndra(rubriker, [...rader, Array(kolumner).fill("")])
          }
        >
          + Rad
        </button>
        {rubriker.length > 1 && (
          <button
            type="button"
            className="knapp pico"
            onClick={() =>
              onAndra(
                rubriker.slice(0, -1),
                rader.map((r) => r.slice(0, -1))
              )
            }
          >
            − Kolumn
          </button>
        )}
      </div>
    </div>
  );
}
