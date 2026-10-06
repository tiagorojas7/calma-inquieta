import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}", "tooling/**/*.test.ts"],
          exclude: ["**/*.db.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/modules/_shared/**",
        "src/modules/*/{domain,application}/**",
      ],
      exclude: ["**/*.test.{ts,tsx}"],
      thresholds: {
        lines: 90,
        branches: 90,
      },
    },
  },
});
