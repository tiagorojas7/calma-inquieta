import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));

const eslint = new ESLint({
  cwd: root,
  errorOnUnmatchedPattern: false,
  ruleFilter: ({ ruleId }) => ruleId.startsWith("boundaries/"),
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

describe("architecture: dependency rule", { timeout: 60_000 }, () => {
  it.each([
    ["domain imports a package", DOMAIN, "drizzle-orm"],
    ["domain imports application", DOMAIN, "../application/ports"],
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
  ])("reports a violation when %s", async (_name, file, source) => {
    const messages = await boundaryMessages(file, source);

    expect(messages.length).toBeGreaterThan(0);
  });

  it("accepts delivery importing a module through its public API", async () => {
    const messages = await boundaryMessages(ROUTE, "~/modules/system-status");

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
