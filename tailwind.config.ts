import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /*
       * Färgerna byggs ur kanalvariablerna i globals.css, inte ur de
       * färdiga `var(--ink)`. Skälet är `<alpha-value>`: bara så kan
       * Tailwind sätta ihop `border-ink/15` och `!border-paper/40`.
       * Med en färdig färg genereras klassen inte alls, och ramen ritas
       * tyst i textfärgen med full täckning i stället.
       */
      colors: {
        paper: "rgb(var(--paper-kanal) / <alpha-value>)",
        panel: "rgb(var(--panel-kanal) / <alpha-value>)",
        ink: "rgb(var(--ink-kanal) / <alpha-value>)",
        accent: "rgb(var(--accent-kanal) / <alpha-value>)",
        azure: "rgb(var(--azure-kanal) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
