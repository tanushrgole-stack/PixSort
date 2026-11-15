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
          cream:   "#FFF7F0",
          surface: "#FFFFFF",
          coral:   "#FF6B4A",
          golden:  "#FFB703",
          rose:    "#FFD9CC",
          blush:   "#FFEBE0",
          text:    "#2B2118",
          muted:   "#7A6457",
          border:  "#F0D9CC",
          dark: {
            bg:      "#1F1612",
            surface: "#2B1F19",
            elevated:"#352820",
            text:    "#FFF1E6",
            muted:   "#C4A99A",
            border:  "#4A3028",
          },
        },
        // Per-event accent palette aliases (applied via CSS var --accent-* )
        event: {
          wedding:   "#B76E79",
          trip:      "#FF6B4A",
          party:     "#FF3CAC",
          birthday:  "#FFB703",
          family:    "#7FB77E",
          college:   "#6C63FF",
          corporate: "#2B4C6F",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans:  ["var(--font-inter)",    "sans-serif"],
      },
      boxShadow: {
        soft:  "0 4px 24px rgba(43,33,24,0.07)",
        card:  "0 8px 32px rgba(43,33,24,0.09)",
        warm:  "0 10px 32px -4px rgba(255,107,74,0.28)",
        glow:  "0 0 0 3px rgba(255,107,74,0.25)",
        "inner-warm": "inset 0 1px 0 rgba(255,255,255,0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backgroundImage: {
        "sunset-gradient":
          "linear-gradient(135deg, #FF6B4A 0%, #FFB703 100%)",
        "hero-gradient":
          "linear-gradient(160deg, #FFF7F0 0%, #FFE8D6 50%, #FFD9CC 100%)",
        "hero-gradient-dark":
          "linear-gradient(160deg, #1F1612 0%, #2B1F19 60%, #352820 100%)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)",
      },
      animation: {
        "float-slow":   "float 6s ease-in-out infinite",
        "float-medium": "float 4.5s ease-in-out infinite 0.75s",
        "float-fast":   "float 3.5s ease-in-out infinite 1.5s",
        "shimmer":      "shimmer 1.6s infinite linear",
        "spin-slow":    "spin 8s linear infinite",
        "pulse-soft":   "pulse-soft 2.4s ease-in-out infinite",
        "drift":        "drift 20s ease-in-out infinite alternate",
        "slide-up":     "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0px) rotate(-1deg)" },
          "50%":     { transform: "translateY(-14px) rotate(1deg)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%":     { opacity: "0.7", transform: "scale(1.04)" },
        },
        drift: {
          "0%":   { transform: "translate(0px, 0px) rotate(-2deg)" },
          "33%":  { transform: "translate(8px, -12px) rotate(1deg)" },
          "66%":  { transform: "translate(-6px, -6px) rotate(-1deg)" },
          "100%": { transform: "translate(4px, -18px) rotate(2deg)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
