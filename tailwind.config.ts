import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        visitedRipple: {
          "0%": { transform: "scale(0.42)", borderRadius: "50%" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", borderRadius: "1px" }
        },
        pathNeon: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.04)", boxShadow: "0 0 0 1px #fff, 0 0 16px rgba(251,191,36,0.65)" }
        }
      },
      animation: {
        visitedRipple: "visitedRipple 0.45s ease forwards",
        pathNeon: "pathNeon 0.75s ease infinite alternate"
      }
    }
  },
  plugins: []
};
export default config;
