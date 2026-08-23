"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Markerad = Markerad;
exports.VisaBlock = VisaBlock;
exports.RedigeraBlock = RedigeraBlock;
const jsx_runtime_1 = require("react/jsx-runtime");
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
const react_1 = require("react");
const markering_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/markering");
const markeringstangenter_1 = require("./markeringstangenter");
const sprak_1 = require("/sessions/rcw-01f8e9cwpsppjky27myncvez/mnt/oscarsstuga2/_to_delete/js/lib/sidor/sprak");
/* ==================================================================
   LÄSA
   ================================================================== */
/** Text med **fet**, *kursiv* och `kod`. */
function Markerad({ text }) {
    const bitar = (0, markering_1.delaMarkering)(text);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: bitar.map((b, i) => {
            if (b.slag === "fet")
                return (0, jsx_runtime_1.jsx)("strong", { children: b.text }, i);
            if (b.slag === "kursiv")
                return (0, jsx_runtime_1.jsx)("em", { children: b.text }, i);
            if (b.slag === "kod")
                return (0, jsx_runtime_1.jsx)("code", { children: b.text }, i);
            return (0, jsx_runtime_1.jsx)("span", { children: b.text }, i);
        }) }));
}
/** Fliken bär ORDET. Färgen skiljer bara de tre slagen åt. */
const RUTORD = {
    info: "Not",
    varning: "Obs",
    tips: "Tips",
};
function VisaBlock({ block }) {
    const [flik, setFlik] = (0, react_1.useState)(0);
    switch (block.typ) {
        case "rubrik":
            return (0, jsx_runtime_1.jsx)("h3", { className: "dokrubrik", children: block.text || "Namnlös rubrik" });
        case "text":
            return ((0, jsx_runtime_1.jsx)("p", { className: "brodtext", children: (0, jsx_runtime_1.jsx)(Markerad, { text: block.text }) }));
        case "tabell":
            return ((0, jsx_runtime_1.jsxs)("div", { children: [block.rubrik && ((0, jsx_runtime_1.jsx)("span", { className: "tabellbildtext", children: block.rubrik })), (0, jsx_runtime_1.jsx)("div", { className: "tabellsvep", children: (0, jsx_runtime_1.jsxs)("table", { className: "doktabell", children: [block.rubriker.some(Boolean) && ((0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsx)("tr", { children: block.rubriker.map((r, i) => ((0, jsx_runtime_1.jsx)("th", { children: r }, i))) }) })), (0, jsx_runtime_1.jsx)("tbody", { children: block.rader.map((rad, i) => ((0, jsx_runtime_1.jsx)("tr", { "data-framhavd": block.framhavda.includes(i) ? "1" : "0", children: rad.map((cell, j) => ((0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(Markerad, { text: cell }) }, j))) }, i))) })] }) })] }));
        case "belagg": {
            // Layouten följer innehållet: utan kommentar går citatet i full
            // bredd och stor grad, med kommentar blir det en vänsterspalt.
            const tvaspalt = block.kommentar.trim().length > 0;
            return ((0, jsx_runtime_1.jsxs)("div", { className: "belagg", "data-tvaspalt": tvaspalt ? "1" : "0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "belaggcitat", children: [(0, jsx_runtime_1.jsx)("p", { className: "belaggtext", children: (0, jsx_runtime_1.jsx)(Markerad, { text: block.citat }) }), block.kalla && ((0, jsx_runtime_1.jsx)("span", { className: "belaggkalla", children: block.kalla }))] }), tvaspalt && ((0, jsx_runtime_1.jsx)("p", { className: "brodtext !text-[0.92rem]", children: (0, jsx_runtime_1.jsx)(Markerad, { text: block.kommentar }) }))] }));
        }
        case "fakta":
            return ((0, jsx_runtime_1.jsx)("div", { className: "faktarad", children: block.rader.map((r, i) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "faktaetikett", children: r.etikett }), (0, jsx_runtime_1.jsx)("span", { className: "faktavarde", children: (0, jsx_runtime_1.jsx)(Markerad, { text: r.varde }) })] }, i))) }));
        case "bojning":
            return ((0, jsx_runtime_1.jsxs)("div", { children: [block.rubrik && ((0, jsx_runtime_1.jsx)("p", { className: "micro mb-1.5 opacity-70", children: block.rubrik })), (0, jsx_runtime_1.jsx)("div", { className: "tabellsvep", children: (0, jsx_runtime_1.jsxs)("table", { className: "doktabell", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", {}), block.kolumner.map((k, i) => ((0, jsx_runtime_1.jsx)("th", { children: k }, i)))] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: block.rader.map((rad, i) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { "data-etikett": "1", children: rad.etikett }), block.kolumner.map((_, j) => ((0, jsx_runtime_1.jsx)("td", { children: rad.former[j] ?? "" }, j)))] }, i))) })] }) })] }));
        case "ordpar":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "tvaspalt", "data-stapla": "0", children: [(block.vansterNamn || block.hogerNamn) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "spaltrubrik", children: block.vansterNamn }), (0, jsx_runtime_1.jsx)("span", { className: "spaltrubrik", children: block.hogerNamn })] })), block.par.map((p) => ((0, jsx_runtime_1.jsxs)("span", { className: "contents", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[0.8rem]", children: (0, jsx_runtime_1.jsx)(Markerad, { text: p.vanster }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[0.8rem] opacity-75", children: (0, jsx_runtime_1.jsx)(Markerad, { text: p.hoger }) })] }, p.vanster + p.hoger)))] }));
        case "parallell":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "tvaspalt", "data-stapla": "0", children: [(block.vansterNamn || block.hogerNamn) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "spaltrubrik", children: block.vansterNamn }), (0, jsx_runtime_1.jsx)("span", { className: "spaltrubrik", children: block.hogerNamn })] })), (0, jsx_runtime_1.jsx)("div", { className: "brodtext !text-[0.78rem]", children: (0, jsx_runtime_1.jsx)(Markerad, { text: block.vanster }) }), (0, jsx_runtime_1.jsx)("div", { className: "brodtext !text-[0.78rem] opacity-80", children: (0, jsx_runtime_1.jsx)(Markerad, { text: block.hoger }) })] }));
        case "flikar": {
            const aktiv = block.flikar[Math.min(flik, block.flikar.length - 1)];
            return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "flikrad", role: "tablist", children: block.flikar.map((f, i) => ((0, jsx_runtime_1.jsx)("button", { type: "button", role: "tab", className: "flik pico", "data-aktiv": i === flik ? "1" : "0", "aria-selected": i === flik, onClick: () => setFlik(i), children: f.namn || `Flik ${i + 1}` }, i))) }), (0, jsx_runtime_1.jsx)("p", { className: "brodtext pt-2", children: (0, jsx_runtime_1.jsx)(Markerad, { text: aktiv?.text ?? "" }) })] }));
        }
        case "ruta":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "dokruta", "data-slag": block.slag, children: [(0, jsx_runtime_1.jsx)("span", { className: "dokflik", children: block.titel || RUTORD[block.slag] || RUTORD.info }), (0, jsx_runtime_1.jsx)("div", { className: "dokrutinnehall", children: (0, jsx_runtime_1.jsx)("p", { className: "brodtext !text-[0.92rem]", children: (0, jsx_runtime_1.jsx)(Markerad, { text: block.text }) }) })] }));
    }
}
/* ==================================================================
   REDIGERA
   ================================================================== */
function RedigeraBlock({ block, onAndra, }) {
    /** Kortare väg till "samma block, men med de här fälten ändrade". */
    const satt = (delar) => onAndra({ ...block, ...delar });
    switch (block.typ) {
        case "rubrik":
            return ((0, jsx_runtime_1.jsx)("input", { className: "falt display !text-[1rem]", placeholder: "Rubrik", value: block.text, onChange: (e) => satt({ text: e.target.value }), "aria-label": "Rubrik", autoFocus: true }));
        case "text":
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 5, placeholder: "Skriv fritt. **fet**, *kursiv* och `kod` fungerar.", value: block.text, onChange: (e) => satt({ text: e.target.value }), onKeyDown: (0, markeringstangenter_1.markeringstangenter)((text) => satt({ text })), "aria-label": "Text", autoFocus: true }), (0, jsx_runtime_1.jsx)("p", { className: "pico opacity-40 mt-1", children: "\u2318B fet \u00B7 \u2318I kursiv \u00B7 \u2318E kod" })] }));
        case "ruta":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "chiprad", children: ["info", "varning", "tips"].map((slag) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", "data-aktiv": block.slag === slag ? "1" : "0", onClick: () => satt({ slag }), children: RUTORD[slag] }, slag))) }), (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Flikens ord \u2014 annars Not/Obs/Tips", value: block.titel, onChange: (e) => satt({ titel: e.target.value }), "aria-label": "Rutans rubrik" }), (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 3, placeholder: "Text", value: block.text, onChange: (e) => satt({ text: e.target.value }), onKeyDown: (0, markeringstangenter_1.markeringstangenter)((text) => satt({ text })), "aria-label": "Rutans text" })] }));
        case "parallell":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "V\u00E4nster spalt, t.ex. Italienska", value: block.vansterNamn, onChange: (e) => satt({ vansterNamn: e.target.value }), "aria-label": "V\u00E4nster spalts namn" }), (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "H\u00F6ger spalt, t.ex. Svenska", value: block.hogerNamn, onChange: (e) => satt({ hogerNamn: e.target.value }), "aria-label": "H\u00F6ger spalts namn" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid md:grid-cols-2 gap-2", children: [(0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 6, placeholder: "Texten", value: block.vanster, onChange: (e) => satt({ vanster: e.target.value }), onKeyDown: (0, markeringstangenter_1.markeringstangenter)((vanster) => satt({ vanster })), "aria-label": "V\u00E4nster text" }), (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 6, placeholder: "\u00D6vers\u00E4ttningen", value: block.hoger, onChange: (e) => satt({ hoger: e.target.value }), onKeyDown: (0, markeringstangenter_1.markeringstangenter)((hoger) => satt({ hoger })), "aria-label": "H\u00F6ger text" })] })] }));
        case "ordpar":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "V\u00E4nster spalt", value: block.vansterNamn, onChange: (e) => satt({ vansterNamn: e.target.value }), "aria-label": "V\u00E4nster spalts namn" }), (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "H\u00F6ger spalt", value: block.hogerNamn, onChange: (e) => satt({ hogerNamn: e.target.value }), "aria-label": "H\u00F6ger spalts namn" })] }), block.par.map((p, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 items-center", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Ord", value: p.vanster, onChange: (e) => satt({
                                    par: block.par.map((x, j) => j === i ? { ...x, vanster: e.target.value } : x),
                                }), "aria-label": `Ord ${i + 1}` }), (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Betydelse", value: p.hoger, onChange: (e) => satt({
                                    par: block.par.map((x, j) => j === i ? { ...x, hoger: e.target.value } : x),
                                }), "aria-label": `Betydelse ${i + 1}` }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => satt({ par: block.par.filter((_, j) => j !== i) }), "aria-label": "Ta bort paret", children: "\u2715" })] }, i))), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico self-start", onClick: () => satt({ par: [...block.par, { vanster: "", hoger: "" }] }), children: "+ Par" })] }));
        case "flikar":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [block.flikar.map((f, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 items-center", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: `Flik ${i + 1}`, value: f.namn, onChange: (e) => satt({
                                            flikar: block.flikar.map((x, j) => j === i ? { ...x, namn: e.target.value } : x),
                                        }), "aria-label": `Flikens namn ${i + 1}` }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => satt({ flikar: block.flikar.filter((_, j) => j !== i) }), "aria-label": "Ta bort fliken", children: "\u2715" })] }), (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 3, placeholder: "Flikens inneh\u00E5ll", value: f.text, onChange: (e) => satt({
                                    flikar: block.flikar.map((x, j) => j === i ? { ...x, text: e.target.value } : x),
                                }), onKeyDown: (0, markeringstangenter_1.markeringstangenter)((text) => satt({
                                    flikar: block.flikar.map((x, j) => j === i ? { ...x, text } : x),
                                })), "aria-label": `Flikens text ${i + 1}` })] }, i))), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico self-start", onClick: () => satt({ flikar: [...block.flikar, { namn: "", text: "" }] }), children: "+ Flik" })] }));
        case "belagg":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none display !text-[1.05rem]", rows: 3, placeholder: "Citatet", value: block.citat, onChange: (e) => satt({ citat: e.target.value }), onKeyDown: (0, markeringstangenter_1.markeringstangenter)((citat) => satt({ citat })), "aria-label": "Citat", autoFocus: true }), (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "K\u00E4lla, t.ex. \u00C4ldre V\u00E4stg\u00F6talagen", value: block.kalla, onChange: (e) => satt({ kalla: e.target.value }), "aria-label": "K\u00E4lla" }), (0, jsx_runtime_1.jsx)("textarea", { className: "skrivyta !flex-none", rows: 4, placeholder: "Kommentar \u2014 l\u00E4mnas den tom g\u00E5r citatet i full bredd", value: block.kommentar, onChange: (e) => satt({ kommentar: e.target.value }), onKeyDown: (0, markeringstangenter_1.markeringstangenter)((kommentar) => satt({ kommentar })), "aria-label": "Kommentar" })] }));
        case "fakta":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [block.rader.map((r, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 items-center", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt !w-[9rem]", placeholder: "Etikett", value: r.etikett, onChange: (e) => satt({
                                    rader: block.rader.map((x, j) => j === i ? { ...x, etikett: e.target.value } : x),
                                }), "aria-label": `Etikett ${i + 1}` }), (0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "V\u00E4rde", value: r.varde, onChange: (e) => satt({
                                    rader: block.rader.map((x, j) => j === i ? { ...x, varde: e.target.value } : x),
                                }), "aria-label": `Värde ${i + 1}` }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico shrink-0", onClick: () => satt({ rader: block.rader.filter((_, j) => j !== i) }), "aria-label": "Ta bort raden", children: "\u2715" })] }, i))), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico self-start", onClick: () => satt({ rader: [...block.rader, { etikett: "", varde: "" }] }), children: "+ Rad" })] }));
        case "tabell":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Bildtext \u00F6ver tabellen (frivillig)", value: block.rubrik, onChange: (e) => satt({ rubrik: e.target.value }), "aria-label": "Tabellens bildtext" }), (0, jsx_runtime_1.jsx)(Rutnatsredigering, { rubriker: block.rubriker, rader: block.rader, framhavda: block.framhavda, onFramhav: (i) => satt({
                            framhavda: block.framhavda.includes(i)
                                ? block.framhavda.filter((x) => x !== i)
                                : [...block.framhavda, i],
                        }), onAndra: (rubriker, rader) => satt({
                            rubriker,
                            rader,
                            // Framhävda index som pekar utanför tabellen efter en
                            // borttagen rad skulle framhäva fel rad, eller ingen.
                            framhavda: block.framhavda.filter((i) => i < rader.length),
                        }) })] }));
        case "bojning":
            return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsx)("input", { className: "falt", placeholder: "Rubrik, t.ex. Presens indikativ", value: block.rubrik, onChange: (e) => satt({ rubrik: e.target.value }), "aria-label": "B\u00F6jningens rubrik" }), (0, jsx_runtime_1.jsxs)("div", { className: "chiprad items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico opacity-45 shrink-0", children: "Fyll i personer" }), sprak_1.PERSONER.map((p) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => satt({
                                    rader: p.rader.map((etikett, i) => ({
                                        etikett,
                                        // Behåll det som redan står skrivet på samma rad.
                                        former: block.rader[i]?.former ??
                                            block.kolumner.map(() => ""),
                                    })),
                                }), children: p.namn }, p.id)))] }), (0, jsx_runtime_1.jsx)(Rutnatsredigering, { rubriker: block.kolumner, rader: block.rader.map((r) => r.former), etiketter: block.rader.map((r) => r.etikett), onEtikett: (i, v) => satt({
                            rader: block.rader.map((r, j) => j === i ? { ...r, etikett: v } : r),
                        }), onAndra: (kolumner, rader) => satt({
                            kolumner,
                            rader: rader.map((former, i) => ({
                                etikett: block.rader[i]?.etikett ?? "",
                                former,
                            })),
                        }) })] }));
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
function Rutnatsredigering({ rubriker, rader, etiketter, framhavda, onEtikett, onFramhav, onAndra, }) {
    const kolumner = Math.max(1, rubriker.length);
    const jamn = (rad) => Array.from({ length: kolumner }, (_, i) => rad[i] ?? "");
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "tabellsvep", children: (0, jsx_runtime_1.jsxs)("table", { className: "doktabell", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [onFramhav && (0, jsx_runtime_1.jsx)("th", { className: "w-[2.2rem]" }), etiketter && (0, jsx_runtime_1.jsx)("th", { className: "w-[6rem]" }), rubriker.map((r, i) => ((0, jsx_runtime_1.jsx)("th", { className: "!p-0", children: (0, jsx_runtime_1.jsx)("input", { className: "falt !border-0 !bg-transparent", placeholder: `Kolumn ${i + 1}`, value: r, onChange: (e) => onAndra(rubriker.map((x, j) => (j === i ? e.target.value : x)), rader), "aria-label": `Kolumnrubrik ${i + 1}` }) }, i))), (0, jsx_runtime_1.jsx)("th", { className: "!p-0 w-[2.2rem]", children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp w-full", onClick: () => onAndra([...rubriker, ""], rader.map((r) => [...r, ""])), "aria-label": "L\u00E4gg till kolumn", title: "L\u00E4gg till kolumn", children: "+" }) })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: rader.map((rad, i) => ((0, jsx_runtime_1.jsxs)("tr", { "data-framhavd": framhavda?.includes(i) ? "1" : "0", children: [onFramhav && ((0, jsx_runtime_1.jsx)("td", { className: "!p-0 w-[2.2rem]", children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp w-full", onClick: () => onFramhav(i), "aria-label": `Framhäv rad ${i + 1}`, title: "Framh\u00E4v raden", children: framhavda?.includes(i) ? "◼" : "◻" }) })), etiketter && ((0, jsx_runtime_1.jsx)("td", { "data-etikett": "1", className: "!p-0", children: (0, jsx_runtime_1.jsx)("input", { className: "falt !border-0 !bg-transparent", value: etiketter[i] ?? "", onChange: (e) => onEtikett?.(i, e.target.value), "aria-label": `Radrubrik ${i + 1}` }) })), jamn(rad).map((cell, j) => ((0, jsx_runtime_1.jsx)("td", { className: "!p-0", children: (0, jsx_runtime_1.jsx)("input", { className: "falt !border-0 !bg-transparent", value: cell, onChange: (e) => onAndra(rubriker, rader.map((r, k) => k === i
                                                ? jamn(r).map((c, l) => l === j ? e.target.value : c)
                                                : r)), "aria-label": `Rad ${i + 1}, kolumn ${j + 1}` }) }, j))), (0, jsx_runtime_1.jsx)("td", { className: "!p-0", children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "blockknapp w-full", onClick: () => onAndra(rubriker, rader.filter((_, k) => k !== i)), "aria-label": `Ta bort rad ${i + 1}`, children: "\u2715" }) })] }, i))) })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => onAndra(rubriker, [...rader, Array(kolumner).fill("")]), children: "+ Rad" }), rubriker.length > 1 && ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "knapp pico", onClick: () => onAndra(rubriker.slice(0, -1), rader.map((r) => r.slice(0, -1))), children: "\u2212 Kolumn" }))] })] }));
}
