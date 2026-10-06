import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const REPO = process.cwd();
const VITEST_BIN = join(REPO, "node_modules", "vitest", "vitest.mjs");

// A run whose database server cannot be used must fail loudly: Vitest 5 exits 0
// when a globalSetup throws, so setup provides `setupError` and the database
// tests fail with the instruction instead (see global-setup.ts).
describe("a test run without a usable database server", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "calma-setup-error-"));
  afterAll(() => {
    rmSync(sandbox, { recursive: true, force: true });
  });

  function runSandboxedSuite() {
    writeFileSync(
      join(sandbox, "vitest.config.mjs"),
      `export default {
  resolve: { alias: { "~": ${JSON.stringify(join(REPO, "src"))} } },
  test: {
    include: ["*.db.test.mjs"],
    globalSetup: [${JSON.stringify(pathToFileURL(join(REPO, "src/testing/db/global-setup.ts")).href)}],
  },
};
`,
    );
    writeFileSync(
      join(sandbox, "needs-database.db.test.mjs"),
      `import { expect, it } from "vitest";
import { createTestDatabase } from "~/testing/db/test-database";
it("creates a database", async () => {
  const database = await createTestDatabase();
  expect(database.name).toMatch(/^t_/);
});
`,
    );
    return spawnSync(
      process.execPath,
      [VITEST_BIN, "run", "--root", sandbox, "--config", "vitest.config.mjs"],
      {
        cwd: REPO,
        encoding: "utf8",
        timeout: 60_000,
        // Port 1 refuses connections at once, so no server is ever started.
        env: {
          ...process.env,
          TEST_DATABASE_URL: "postgres://postgres:pw@127.0.0.1:1/postgres",
        },
      },
    );
  }

  it("fails the run with the actionable instruction", () => {
    const run = runSandboxedSuite();
    const output = `${run.stdout}${run.stderr}`;

    expect(run.status).not.toBe(0);
    expect(output).toContain("The test database server is not usable");
    expect(output).toContain("TEST_DATABASE_URL");
    expect(output).toContain("embedded PostgreSQL server");
    expect(output).not.toContain("pw@127.0.0.1");
  }, 60_000);
});
