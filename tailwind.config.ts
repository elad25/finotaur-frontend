import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: {
          900: "#0A0A0A",
          800: "#141414",
          700: "#1A1A1A",
        },
        gold: {
          DEFAULT: "#C9A646",
          600: "#D4AF37",
          muted: "rgba(201, 166, 70, 0.5)",
        },
        emerald: {
          DEFAULT: "#4AD295",
          500: "#10b981",
          600: "#059669",
        },
        blue: {
          400: "#60a5fa",
          500: "#3b82f6",
        },
        red: {
          500: "#ef4444",
          600: "#dc2626",
        },
        yellow: {
          200: "#fef08a",
          400: "#C9A646",
          500: "#C9A646",
          600: "#C9A646",
        },
        amber: {
          400: "#C9A646",
          500: "#C9A646",
          600: "#C9A646",
        },
        slate: {
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        zinc: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        border: "rgba(255, 215, 0, 0.08)",
        input: "rgba(255, 215, 0, 0.08)",
        ring: "#C9A646",
        background: "#0A0A0A",
        foreground: "#F4F4F4",
        primary: {
          DEFAULT: "#C9A646",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#1A1A1A",
          foreground: "#F4F4F4",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#F4F4F4",
        },
        muted: {
          DEFAULT: "#A0A0A0",
          foreground: "#A0A0A0",
        },
        accent: {
          DEFAULT: "#1A1A1A",
          foreground: "#F4F4F4",
        },
        popover: {
          DEFAULT: "#0A0A0A",
          foreground: "#F4F4F4",
        },
        card: {
          DEFAULT: "#141414",
          foreground: "#F4F4F4",
        },
        sidebar: {
          DEFAULT: "#0A0A0A",
          foreground: "#F4F4F4",
          primary: "#C9A646",
          "primary-foreground": "#000000",
          accent: "#1A1A1A",
          "accent-foreground": "#F4F4F4",
          border: "rgba(255, 215, 0, 0.08)",
          ring: "#C9A646",
        },
      },
      borderRadius: {
        '2xl': '1rem',
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5", boxShadow: "0 0 20px rgba(201, 166, 70, 0.2)" },
          "50%": { opacity: "1", boxShadow: "0 0 40px rgba(201, 166, 70, 0.4)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" }
        },
        "goldPulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(201, 166, 70, 0.06)" },
          "50%": { boxShadow: "0 0 40px 20px rgba(201, 166, 70, 0.035)" },
          "100%": { boxShadow: "0 0 0 0 rgba(201, 166, 70, 0.06)" }
        },
        "gradient-x": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" }
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.8" }
        },
        "subtle-glow": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
        "gold-pulse": "goldPulse 6s ease-in-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "subtle-glow": "subtle-glow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;