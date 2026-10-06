import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));

// Only the boundaries rules run, and they read import paths, not types. Turning
// the project service off skips building a TypeScript program per file, which
// is what makes a full lint slow.
const eslint = new ESLint({
  cwd: root,
  errorOnUnmatchedPattern: false,
  ruleFilter: ({ ruleId }) => ruleId.startsWith("boundaries/"),
  overrideConfig: {
    languageOptions: { parserOptions: { projectService: false } },
  },
});

async function boundaryMessages(filePath: string, importSource: string) {
  const code = `import * as dependency from "${importSource}";\nexport { dependency };\n`;
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) =>
    m.ruleId?.startsWith("boundaries/"),
  );
}

const DOMAIN = "src/modules/system-status/domain/x.fixture.ts";
const APPLICATION = "src/modules/system-status/application/x.fixture.ts";
const ROUTE = "src/app/routes/x.fixture.tsx";

describe("architecture: dependency rule", { timeout: 120_000 }, () => {
  it.each([
    ["domain imports a package", DOMAIN, "drizzle-orm"],
    ["domain imports application", DOMAIN, "../application/ports"],
    [
      "domain imports infrastructure",
      DOMAIN,
      "../infrastructure/drizzle-database-probe",
    ],
    [
      "delivery deep-imports a module",
      ROUTE,
      "~/modules/system-status/application/get-system-status",
    ],
    ["delivery imports a database driver", ROUTE, "pg"],
    [
      "another module reaches into domain internals",
      "src/modules/demo/application/x.fixture.ts",
      "~/modules/system-status/domain/system-status",
    ],
    [
      "production code imports testing helpers",
      APPLICATION,
      "~/testing/fakes/fixed-clock",
    ],
    [
      "application imports its own module public API (cycle risk)",
      APPLICATION,
      "~/modules/system-status",
    ],
  ])("reports a violation when %s", async (_name, file, source) => {
    const messages = await boundaryMessages(file, source);

    expect(messages.length).toBeGreaterThan(0);
  });

  it("accepts delivery importing a module through its public API", async () => {
    const messages = await boundaryMessages(ROUTE, "~/modules/system-status");

    expect(messages).toEqual([]);
  });

  it("accepts application importing another module's public API", async () => {
    const messages = await boundaryMessages(
      "src/modules/demo/application/x.fixture.ts",
      "~/modules/system-status",
    );

    expect(messages).toEqual([]);
  });

  it("finds no violations in the real source tree", async () => {
    const results = await eslint.lintFiles(["src", "workers"]);
    const messages = results.flatMap((r) =>
      r.messages.map((m) => `${r.filePath}: ${String(m.ruleId)}: ${m.message}`),
    );

    expect(results.length).toBeGreaterThan(10);
    expect(messages).toEqual([]);
  });
});
