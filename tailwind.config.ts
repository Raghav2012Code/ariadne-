import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#060709",
          900: "#0A0C10",
          850: "#0E1117",
          800: "#141821",
        },
      },
    },
  },
  plugins: [],
};
export default config;
