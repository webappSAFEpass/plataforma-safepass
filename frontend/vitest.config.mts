import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./tests/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    css: { modules: { classNameStrategy: "non-scoped" } },
    coverage: {
      provider: "v8",
      include: ["src/features/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
      exclude: ["**/__tests__/**", "**/*.gen.ts", "**/index.ts", "src/mocks/**"],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});
