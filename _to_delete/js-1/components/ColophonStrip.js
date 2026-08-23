"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ColophonStrip;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Kolofonremsa — heltäckande svart list, papperfärgad mikrotext.
 * Hämtad från Fornsvenska Studielabbet, men sidozonerna är valfria här:
 * en remsa som fylls med text för att den har tre fack blir dekoration,
 * och dekoration som ser ut som information är värre än tom plats.
 */
function ColophonStrip({ left, centre, right, }) {
    const sidor = Boolean(left || right);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "h-[26px] shrink-0 bg-ink text-paper flex items-center px-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico mx-auto md:hidden", children: centre }), sidor ? ((0, jsx_runtime_1.jsxs)("div", { className: "hidden md:grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4", children: [(0, jsx_runtime_1.jsx)("span", { className: "pico whitespace-nowrap", children: left }), (0, jsx_runtime_1.jsx)("span", { className: "pico text-center whitespace-nowrap", children: centre }), (0, jsx_runtime_1.jsx)("span", { className: "pico text-right whitespace-nowrap", children: right })] })) : ((0, jsx_runtime_1.jsx)("span", { className: "pico hidden md:block mx-auto whitespace-nowrap", children: centre }))] }));
}
