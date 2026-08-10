import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        panel: "var(--panel)",
        ink: "var(--ink)",
        accent: "var(--accent)",
        azure: "var(--azure)",
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
