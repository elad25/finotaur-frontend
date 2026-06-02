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
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Cinzel"', '"Cormorant Garamond"', 'serif'],
        wordmark: ['"Outfit"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: {
          900: "#0A0A0A",
          800: "#141414",
          700: "#1A1A1A",
        },
        gold: {
          DEFAULT: "#C9A646",
          primary: ({ opacityValue }: { opacityValue?: string }) =>
            opacityValue !== undefined ? `rgba(201, 166, 70, ${opacityValue})` : '#C9A646',
          bright: ({ opacityValue }: { opacityValue?: string }) =>
            opacityValue !== undefined ? `rgba(232, 199, 102, ${opacityValue})` : '#E8C766',
          deep: ({ opacityValue }: { opacityValue?: string }) =>
            opacityValue !== undefined ? `rgba(168, 136, 56, ${opacityValue})` : '#A88838',
          hover: ({ opacityValue }: { opacityValue?: string }) =>
            opacityValue !== undefined ? `rgba(212, 178, 90, ${opacityValue})` : '#D4B25A',
          600: "#D4AF37",
          muted: "rgba(201, 166, 70, 0.5)",
          border: "rgba(201, 166, 70, 0.2)",
          glow: "rgba(201, 166, 70, 0.45)",
        },
        surface: {
          base: "#0a0a0a",
          1: "rgba(255, 255, 255, 0.02)",
          2: "rgba(255, 255, 255, 0.04)",
          glass: "rgba(20, 20, 20, 0.6)",
        },
        ink: {
          primary: "#ffffff",
          secondary: "rgba(255, 255, 255, 0.65)",
          tertiary: "rgba(255, 255, 255, 0.45)",
          muted: "rgba(255, 255, 255, 0.30)",
          "on-gold": "#0a0a0a",
        },
        "border-ds": {
          subtle: "rgba(255, 255, 255, 0.08)",
          default: "rgba(255, 255, 255, 0.12)",
          strong: "rgba(255, 255, 255, 0.20)",
        },
        num: {
          neutral: "#ffffff",
          positive: "#ffffff",
          negative: ({ opacityValue }: { opacityValue?: string }) =>
            opacityValue !== undefined ? `rgba(226, 75, 74, ${opacityValue})` : '#E24B4A',
        },
        status: {
          info: "#3b82f6",
          warning: "#eab308",
          error: "#E24B4A",
          success: "#10b981",
          offline: 'var(--status-offline)',
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
        bronze: {
          deep: '#5C4A1F',
          mid: '#7E6526',
          warm: '#A88838',
          dim: '#8B6F38',
        },
        'gold-eyebrow': 'var(--gold-eyebrow)',
        'gold-eyebrow-hairline': 'var(--gold-eyebrow-hairline)',
      },
      borderRadius: {
        '2xl': '1rem',
        xl: "16px",
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontSize: {
        // FINOTAUR DS text scale
        display: ['72px', { lineHeight: '1.1', fontWeight: '500' }],
        h1: ['48px', { lineHeight: '1.2', fontWeight: '500' }],
        h2: ['32px', { lineHeight: '1.25', fontWeight: '500' }],
        h3: ['24px', { lineHeight: '1.3', fontWeight: '500' }],
        h4: ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        eyebrow: ['11px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '1.5px' }],
        // Number scale (use with font-mono)
        'num-display': ['48px', { lineHeight: '1.1', fontWeight: '400', letterSpacing: '-0.5px' }],
        'num-large': ['28px', { lineHeight: '1.2', fontWeight: '400', letterSpacing: '-0.5px' }],
        'num-default': ['22px', { lineHeight: '1.2', fontWeight: '400', letterSpacing: '-0.5px' }],
        'num-small': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '400ms',
      },
      backdropBlur: {
        glass: '12px',
        'glass-nav': '16px',
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
        "fino-wiggle": {
          "0%, 78%, 100%": { transform: "rotate(0deg) scale(1)" },
          "82%": { transform: "rotate(-8deg) scale(1.08)" },
          "86%": { transform: "rotate(6deg) scale(1.06)" },
          "90%": { transform: "rotate(-4deg) scale(1.05)" },
          "94%": { transform: "rotate(2deg) scale(1.03)" }
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
        "fino-wiggle": "fino-wiggle 4s ease-in-out infinite",
      },
      backgroundColor: {
        // FINOTAUR — Section/Atmospheric (added 2026-05-03)
        'section-base': 'var(--bg-section-base)',
        'section-deep': 'var(--bg-section-deep)',
        'section-radial-mid': 'var(--bg-section-radial-mid)',
        'section-card-rest': 'var(--bg-section-card-rest)',
        'section-card-deep': 'var(--bg-section-card-deep)',
      },
      borderColor: {
        // FINOTAUR — Construction markers (added 2026-05-03)
        'construction': 'var(--construction-line)',
        'construction-strong': 'var(--construction-line-strong)',
        'construction-marker': 'var(--construction-marker)',
      },
      boxShadow: {
        'gold-halo': '0 0 60px 10px rgba(201, 166, 70, 0.25)',
        'gold-glow': '0 0 24px rgba(201, 166, 70, 0.4)',
        'gold-soft': '0 0 12px rgba(201, 166, 70, 0.2)',
        'gold-halo-soft': '0 0 40px 5px rgba(201, 166, 70, 0.12)',
        'bronze-glow': '0 0 24px rgba(168, 136, 56, 0.3)',
        // FINOTAUR DS — primary CTA glow (always-on signature, original outer-glow variant)
        'glow-gold-resting': '0 0 24px 4px rgba(201, 166, 70, 0.25)',
        'glow-gold-hover': '0 0 32px 6px rgba(201, 166, 70, 0.40)',
        'glow-gold-active': '0 0 16px 2px rgba(201, 166, 70, 0.30)',
        'glow-gold-strong': '0 0 60px 8px rgba(201, 166, 70, 0.35)',
        // FINOTAUR DS — Pricing-canonical CTA shadow (drop + inner highlight)
        'btn-gold': '0 4px 20px rgba(201,166,70,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
        'btn-gold-hover': '0 6px 28px rgba(201,166,70,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
        // FINOTAUR — Section/Atmospheric card shadows (added 2026-05-03)
        'card-rest': 'var(--shadow-card-rest)',
        'card-hover': 'var(--shadow-card-hover)',
        'card-featured': 'var(--shadow-card-featured)',
      },
      backgroundImage: {
        'gold-halo': 'radial-gradient(ellipse 800px 400px at 50% 0%, rgba(201, 166, 70, 0.25) 0%, transparent 70%)',
        'gold-halo-dim': 'radial-gradient(ellipse 800px 400px at 50% 0%, rgba(201, 166, 70, 0.12) 0%, transparent 70%)',
        'bronze-vertical': 'linear-gradient(180deg, #C9A646 0%, #7E6526 100%)',
        'bronze-deep-vertical': 'linear-gradient(180deg, #A88838 0%, #5C4A1F 100%)',
        // FINOTAUR DS — primary CTA gradient (Pricing-canonical: bright peak in center, dimensional)
        'gradient-gold': 'linear-gradient(135deg, #C9A646 0%, #F4D97B 50%, #C9A646 100%)',
        // Original spec gradient (kept available for non-CTA uses if needed)
        'gradient-gold-deep': 'linear-gradient(135deg, #E8C766 0%, #C9A646 50%, #A88838 100%)',
        // Vertical gold gradient — lit-from-above (hero wordmark, navbar wordmark)
        'gradient-gold-vertical': 'var(--gradient-gold-vertical)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("./tailwind-plugin-ds-spacing.cjs"),
  ],
} satisfies Config;