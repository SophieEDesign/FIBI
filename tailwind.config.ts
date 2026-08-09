import type { Config } from "tailwindcss";

/** Brand ramps from the FIBI design system (src/styles/tokens). */
const fibi = {
  "blue-deep": "#2E9EE8",
  "blue-mid": "#58B8F8",
  "blue-light": "#E4F4FE",
  gold: "#E0A800",
  sand: "#FBEAB0",
  coral: "#F6D477",
  lavender: "#EDD3F5",
  mauve: "#C888D8",
  plum: "#95509F",
  primary: "#2E9EE8",
  "accent-purple": "#C888D8",
  "accent-gold": "#E0A800",
  "bg-light": "#FAFAFA",
  "bg-dark": "#101028",
  "text-primary": "#171717",
  muted: "#525252",
} as const;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--bg-page)",
        foreground: "var(--text-primary)",
        charcoal: "var(--neutral-900)",
        secondary: "var(--text-secondary)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        sky: {
          50: "#F1F9FE",
          100: "#E4F4FE",
          200: "#C0E7FD",
          300: "#8FD5FB",
          400: "#58B8F8",
          500: "#2E9EE8",
          600: "#1B80C7",
          700: "#14639B",
        },
        orchid: {
          200: "#EDD3F5",
          400: "#C888D8",
          500: "#B36BC6",
          600: "#95509F",
        },
        gold: {
          200: "#FBEAB0",
          400: "#F0C23A",
          500: "#E0A800",
        },
        indigo: {
          700: "#26264C",
          800: "#1A1A38",
          900: "#101028",
          950: "#0A0A1C",
        },
        fibi,
      },
      backgroundImage: {
        "fibi-gradient": "var(--gradient-brand)",
        "fibi-gradient-hero": "var(--gradient-brand)",
        "fibi-gradient-cta": "var(--gradient-sky)",
        "fibi-aurora": "var(--wash-aurora)",
        "fibi-brand-soft": "var(--gradient-brand-soft)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "22px",
        "3xl": "28px",
      },
      boxShadow: {
        soft: "var(--shadow-sm)",
        "soft-md": "var(--shadow-md)",
        pin: "var(--shadow-pin)",
        glass: "var(--shadow-sm)",
      },
      transitionDuration: {
        fast: "130ms",
        base: "190ms",
        slow: "280ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.2,.6,.2,1)",
        out: "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
};
export default config;
