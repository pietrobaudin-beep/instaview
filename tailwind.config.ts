import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand board colours, usable directly as bg-pink / text-ink / etc.
        pink: "hsl(var(--pink))",
        purple: "hsl(var(--purple))",
        yellow: "hsl(var(--yellow))",
        cream: "hsl(var(--cream))",
        ink: "hsl(var(--ink))",
        vinho: "hsl(var(--vinho))",
        // Premium — usada na área PRO.
        plum: "hsl(var(--plum))",
        magenta: "hsl(var(--magenta))",
        blush: "hsl(var(--blush))",
        mint: "hsl(var(--mint))",
        onyx: "hsl(var(--onyx))",
      },
      /*
       * Cantos: três degraus e nada mais.
       *
       *   rounded-3xl  24px  cartões e painéis
       *   rounded-2xl  16px  botões, campos, linhas e chips
       *   rounded-xl   12px  miudezas (ícones, marcadores)
       *   rounded-full       círculos e pílulas
       *
       * Havia aqui um `borderRadius` que redefinia lg/md/sm a partir de
       * `--radius` (1.25rem). O efeito era uma escala invertida no meio:
       * `rounded-lg` valia 20px e `rounded-xl`, 12px — o "grande" menor que o
       * "extra grande". A sobrescrita saiu; lg/md/sm voltam aos valores
       * padrão do Tailwind, e o projeto usa os três degraus acima.
       */
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
