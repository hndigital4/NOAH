import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: ["node_modules/**", "dist/**", "**/*.test.ts", "**/*.bench.ts", "**/index.ts"],
    },
    testTimeout:  10_000,
    hookTimeout:  5_000,
  },
});
