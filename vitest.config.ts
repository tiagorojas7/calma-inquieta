import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Embedded PostgreSQL, ESLint and subprocess-spawning files are heavy. On a
    // 4-core machine with little free RAM, more than two parallel workers
    // thrash memory and I/O, hit timeouts and run slower overall.
    maxWorkers: 2,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}", "tooling/**/*.test.ts"],
          // `*.ui.test.tsx` needs a DOM and runs in the `ui` project.
          exclude: ["**/*.db.test.ts", "**/*.ui.test.tsx"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.ui.test.tsx"],
          setupFiles: ["src/testing/ui/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          globalSetup: ["src/testing/db/global-setup.ts"],
          hookTimeout: 60_000,
          testTimeout: 60_000,
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
