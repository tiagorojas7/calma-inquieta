import boundaries from "eslint-plugin-boundaries";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// Dependency rule: docs/adr and AGENTS.md describe it; the element map and the
// allow matrix below are the single source of truth (design sections 5.1, 5.2).
const sameModule = "{{from.element.captured.module}}";

const element = (type: string, pattern: string, capture?: string[]) => ({
  type,
  pattern,
  mode: "full" as const,
  ...(capture ? { capture } : {}),
});

const to = (...types: string[]) => ({ element: { type: types } });
const toSameModule = (type: string) => ({
  element: { type, captured: { module: sameModule } },
});
// Application code reaches other modules only through their public API; its own
// module's index.ts is off limits because it re-exports application (cycle risk).
const toOtherModuleApi = {
  element: {
    type: "module-api",
    captured: { module: `!${sameModule}` },
  },
};
const pkg = (...sources: string[]) => ({
  module: { origin: "external", source: sources },
});

export default defineConfig(
  {
    ignores: [
      "build/",
      ".react-router/",
      "coverage/",
      "drizzle/meta/",
      "worker-configuration.d.ts",
    ],
  },
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "workers/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
      "boundaries/include": ["src/**/*", "workers/**/*"],
      "boundaries/ignore": ["**/*.test.{ts,tsx}"],
      // First match wins; order matters.
      "boundaries/elements": [
        element("shared", "src/modules/_shared/**/*"),
        element("module-api", "src/modules/*/index.ts", ["module"]),
        element("domain", "src/modules/*/domain/**/*", ["module"]),
        element("application", "src/modules/*/application/**/*", ["module"]),
        element("infrastructure", "src/modules/*/infrastructure/**/*", [
          "module",
        ]),
        element("platform", "src/platform/**/*"),
        element("composition", "src/composition/**/*"),
        element("delivery", "src/app/**/*"),
        element("worker", "workers/**/*"),
        element("testing", "src/testing/**/*"),
      ],
    },
    rules: {
      "boundaries/no-unknown-files": 2,
      "boundaries/dependencies": [
        2,
        {
          default: "disallow",
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: "shared" } },
              allow: { to: to("shared") },
            },
            {
              from: { element: { type: "domain" } },
              allow: [{ to: to("shared") }, { to: toSameModule("domain") }],
            },
            {
              from: { element: { type: "application" } },
              allow: [
                { to: to("shared") },
                { to: toOtherModuleApi },
                { to: toSameModule("domain") },
                { to: toSameModule("application") },
              ],
            },
            {
              from: { element: { type: "module-api" } },
              allow: [
                { to: to("shared") },
                { to: toSameModule("domain") },
                { to: toSameModule("application") },
              ],
            },
            {
              from: { element: { type: "infrastructure" } },
              allow: [
                { to: to("shared", "platform") },
                { to: toSameModule("domain") },
                { to: toSameModule("application") },
                { to: toSameModule("infrastructure") },
                { to: pkg("drizzle-orm", "pg") },
              ],
            },
            {
              from: { element: { type: "platform" } },
              allow: [
                { to: to("shared", "platform") },
                { to: pkg("zod", "pg", "drizzle-orm") },
                { to: { module: { origin: "core" } } },
              ],
            },
            {
              from: { element: { type: "composition" } },
              allow: {
                to: to(
                  "shared",
                  "module-api",
                  "infrastructure",
                  "platform",
                  "composition",
                ),
              },
            },
            {
              from: { element: { type: "delivery" } },
              allow: [
                { to: to("shared", "module-api", "composition", "delivery") },
                { to: pkg("react", "react-dom", "react-router") },
              ],
            },
            {
              from: { element: { type: "worker" } },
              allow: [
                { to: to("delivery", "composition", "platform") },
                {
                  to: pkg("react-router", "virtual:react-router/server-build"),
                },
              ],
            },
            {
              from: { element: { type: "testing" } },
              allow: {
                to: { module: { origin: ["local", "external", "core"] } },
              },
            },
          ],
        },
      ],
    },
  },
  {
    // Virtual architecture-test fixtures have no TS project to attach to.
    files: ["**/*.fixture.{ts,tsx}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
