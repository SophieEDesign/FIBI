import type { Config } from "tailwindcss";

/** FiBi brand palette – primary gradient (Blue → Gold → Coral → Lavender) + supporting + neutrals */
const fibi = {
  // Primary gradient – Ocean Blue → Sky Blue
  "blue-deep": "#2E9BD6",
  "blue-mid": "#5EC3F2",
  "blue-light": "#BEE9FF",
  // Sunset Gold → Soft Coral
  gold: "#F2B705",
  sand: "#F2C879",
  coral: "#E8A57C",
  // Lavender → Plum
  lavender: "#C8A6E8",
  mauve: "#B985C9",
  plum: "#8C5FAF",
  // Supporting (UI)
  primary: "#2E9BD6", // Primary Action Blue – buttons, links
  "accent-purple": "#B985C9", // Soft Accent Purple – highlights
  "accent-gold": "#F2B705", // Warm Accent – CTA moments
  // Neutrals
  "bg-light": "#F7F8FA",
  "bg-dark": "#0F1230",
  "text-primary": "#111827",
  muted: "#6B7280",
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
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-dm-sans)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        charcoal: "var(--charcoal)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        fibi,
      },
      backgroundImage: {
        "fibi-gradient":
          "linear-gradient(135deg, #2E9BD6 0%, #5EC3F2 25%, #F2B705 50%, #E8A57C 75%, #B985C9 100%)",
        "fibi-gradient-hero":
          "linear-gradient(135deg, #2E9BD6 0%, #5EC3F2 35%, #F2B705 65%, #B985C9 100%)",
        "fibi-gradient-cta":
          "linear-gradient(135deg, #2E9BD6 0%, #5EC3F2 50%, #F2B705 100%)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "soft-md": "0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;

