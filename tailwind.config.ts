import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#060709",
          900: "#0A0C10",
          850: "#0E1117",
          800: "#141821",
        },
      },
      boxShadow: {
        glow: "0 0 24px rgba(99,102,241,.35)",
        "glow-amber": "0 0 18px rgba(251,191,36,.45)",
        panel: "0 8px 32px rgba(0,0,0,.45)",
      },
      keyframes: {
        visitedRipple: {
          "0%": { transform: "scale(0.42)", borderRadius: "50%" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", borderRadius: "4px" },
        },
        pathNeon: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.05)", boxShadow: "0 0 0 1px #fff, 0 0 18px rgba(251,191,36,0.7)" },
        },
        fadeSlideIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        visitedRipple: "visitedRipple 0.45s ease forwards",
        pathNeon: "pathNeon 0.8s ease infinite alternate",
        fadeSlideIn: "fadeSlideIn .35s ease both",
      },
    },
  },
  plugins: [],
};
export default config;
