import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sunset: {
          cream: "#FFF7F0",
          surface: "#FFFFFF",
          coral: "#FF6B4A",
          golden: "#FFB703",
          rose: "#FFD9CC",
          text: "#2B2118",
          dark: {
            bg: "#1F1612",
            surface: "#2B1F19",
            text: "#FFF1E6",
          },
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(43, 33, 24, 0.06)",
        warm: "0 10px 25px -5px rgba(255, 107, 74, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
