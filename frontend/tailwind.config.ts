import type { Config } from "tailwindcss";

// Cores do manual da marca (Código de Cores.pdf). Não usar hex solto nos componentes.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#3f6886",
          "blue-soft": "#d6e8f6",
          red: "#e92423",
          "red-soft": "#eb9180",
          green: "#2f9e5c",
          "green-soft": "#d1f0e3",
          amber: "#f59f0c",
          "amber-soft": "#fff5b2",
        },
        ink: "#1a2e3b",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
