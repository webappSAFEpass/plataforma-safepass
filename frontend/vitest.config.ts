import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["src/features/**", "src/lib/**"],
      // TODO: exigir 70% (regra do squad) quando os testes de fluxo forem adicionados.
    },
  },
});
