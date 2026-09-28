/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF3F9",
          100: "#D7E3F0",
          200: "#A8C0DA",
          300: "#6C93BC",
          400: "#3A6B9E",
          500: "#27507E",
          600: "#1D3D63",
          700: "#16304F",
          800: "#10233F",
          900: "#0A1930",
          950: "#060F1F",
        },
        cream: "rgb(var(--color-cream) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        slate: {
          50: "rgb(var(--color-slate-50) / <alpha-value>)",
        },
        accent: {
          violet: "rgb(var(--color-accent-violet) / <alpha-value>)",
          pink: "rgb(var(--color-accent-pink) / <alpha-value>)",
          yellow: "rgb(var(--color-accent-yellow) / <alpha-value>)",
          mint: "rgb(var(--color-accent-mint) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "#F8FAFC",
          raised: "#FFFFFF",
        },
        primary: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        heading: [
          "Outfit",
          "system-ui",
          "sans-serif",
        ],
      },
      backgroundColor: {
        white: "rgb(var(--color-surface) / <alpha-value>)",
      },
      borderColor: {
        white: "rgb(var(--color-surface) / <alpha-value>)",
      },
      boxShadow: {
        hard: "4px 4px 0px 0px rgb(var(--color-foreground))",
        "hard-hover": "6px 6px 0px 0px rgb(var(--color-foreground))",
        "hard-active": "2px 2px 0px 0px rgb(var(--color-foreground))",
        card: "8px 8px 0px 0px rgb(var(--color-foreground))",
      },
      transitionTimingFunction: {
        bounce: "cubic-bezier(0.34,1.56,0.64,1)",
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(3deg)" },
          "75%": { transform: "rotate(-3deg)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        wiggle: "wiggle 0.3s ease-in-out",
      },
    },
  },
  plugins: [],
};
