import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const WORKFLOW = readFileSync(".github/workflows/ci.yml", "utf8");
const LINES = WORKFLOW.split("\n");

const SECRET_NAMES = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "HYPERDRIVE_ID",
  "MIGRATION_DATABASE_URL",
  "STATUS_URL",
] as const;
type SecretName = (typeof SECRET_NAMES)[number];

const GATE_CONDITION = "if: steps.deploy-gate.outputs.ready == 'true'";

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

/** The lines of the `deploy` job, from its key to the end of the file. */
function deployJobLines(): string[] {
  const start = LINES.findIndex((line) => line === "  deploy:");
  expect(start, "deploy job exists").toBeGreaterThan(-1);
  return LINES.slice(start);
}

/** Splits the deploy job into its steps (each starts with `      - `). */
function deploySteps(): string[] {
  const job = deployJobLines();
  const first = job.findIndex((line) => line.startsWith("      - "));
  const steps: string[][] = [];
  for (const line of job.slice(first)) {
    if (line.startsWith("      - ")) {
      steps.push([line]);
    } else {
      steps.at(-1)?.push(line);
    }
  }
  return steps.map((step) => step.join("\n"));
}

/** The shell script of the step with the given `id`, dedented. */
function stepScript(stepId: string): string {
  const id = LINES.findIndex((line) => line.trim() === `id: ${stepId}`);
  expect(id, `${stepId} step exists`).toBeGreaterThan(-1);
  const run = LINES.findIndex(
    (line, index) => index > id && line.trim() === "run: |",
  );
  const base = indentOf(LINES[run] ?? "");
  const body: string[] = [];
  for (const line of LINES.slice(run + 1)) {
    if (line.trim() !== "" && indentOf(line) <= base) break;
    body.push(line.slice(base + 2));
  }
  return body.join("\n");
}

function bashExecutable(): string {
  const gitBash = "C:\\Program Files\\Git\\usr\\bin\\bash.exe";
  return process.platform === "win32" && existsSync(gitBash) ? gitBash : "bash";
}

const scratch = mkdtempSync(join(tmpdir(), "deploy-gate-"));
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

let runCount = 0;
function runStep(stepId: string, provided: Readonly<Record<string, string>>) {
  const output = join(scratch, `github-output-${String(runCount++)}`);
  const result = spawnSync(bashExecutable(), ["-e", "-c", stepScript(stepId)], {
    // A clean environment: ambient variables must never reach the gate.
    env: {
      PATH: process.env["PATH"] ?? "",
      SYSTEMROOT: process.env["SYSTEMROOT"] ?? "",
      GITHUB_OUTPUT: output,
      ...provided,
    },
    encoding: "utf8",
  });
  const written = existsSync(output) ? readFileSync(output, "utf8") : "";
  return {
    status: result.status,
    log: `${result.stdout}${result.stderr}`,
    written,
  };
}

function runGate(provided: Partial<Record<SecretName, string>>) {
  return runStep("deploy-gate", provided);
}

const VALUE = (name: SecretName) => `distinctive-value-of-${name}`;

describe("deploy gate script", () => {
  it("skips with a notice listing every secret name when none is set", () => {
    const { status, log, written } = runGate({});

    expect(status).toBe(0);
    expect(log).toContain(
      "::notice::deploy skipped: secrets not provisioned: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, HYPERDRIVE_ID, MIGRATION_DATABASE_URL, STATUS_URL",
    );
    expect(written.trim()).toBe("ready=false");
  });

  it("treats empty values as not set", () => {
    const empty = Object.fromEntries(SECRET_NAMES.map((name) => [name, ""]));

    const { status, written } = runGate(empty);

    expect(status).toBe(0);
    expect(written.trim()).toBe("ready=false");
  });

  it("fails naming exactly the missing secrets when only some are set", () => {
    const { status, log, written } = runGate({
      CLOUDFLARE_API_TOKEN: VALUE("CLOUDFLARE_API_TOKEN"),
      CLOUDFLARE_ACCOUNT_ID: VALUE("CLOUDFLARE_ACCOUNT_ID"),
      MIGRATION_DATABASE_URL: VALUE("MIGRATION_DATABASE_URL"),
    });

    expect(status).not.toBe(0);
    expect(log).toContain(
      "::error::deploy misconfigured: missing HYPERDRIVE_ID, STATUS_URL",
    );
    expect(written).not.toContain("ready=true");
    for (const name of SECRET_NAMES) {
      expect(log).not.toContain(VALUE(name));
    }
  });

  it("fails when a single secret is set", () => {
    const { status, log } = runGate({ STATUS_URL: VALUE("STATUS_URL") });

    expect(status).not.toBe(0);
    expect(log).toContain(
      "::error::deploy misconfigured: missing CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, HYPERDRIVE_ID, MIGRATION_DATABASE_URL",
    );
    expect(log).not.toContain(VALUE("STATUS_URL"));
  });

  it("is ready, and prints no value, when all five are set", () => {
    const all = Object.fromEntries(
      SECRET_NAMES.map((name) => [name, VALUE(name)]),
    );

    const { status, log, written } = runGate(all);

    expect(status).toBe(0);
    expect(written.trim()).toBe("ready=true");
    for (const name of SECRET_NAMES) {
      expect(log).not.toContain(VALUE(name));
    }
  });
});

describe("status url shape guard", () => {
  it("passes when STATUS_URL ends in /status", () => {
    const { status, log } = runStep("status-url-shape", {
      STATUS_URL: "https://x.workers.dev/status",
    });

    expect(status).toBe(0);
    expect(log).not.toContain("x.workers.dev");
  });

  it.each(["https://x.workers.dev/", "https://x.workers.dev/status/"])(
    "fails by name, without the value, for %s",
    (value) => {
      const { status, log } = runStep("status-url-shape", {
        STATUS_URL: value,
      });

      expect(status).not.toBe(0);
      expect(log).toContain(
        "::error::deploy misconfigured: STATUS_URL must end in /status",
      );
      expect(log).not.toContain(value);
    },
  );

  it("comes right after the gate, before migrations, under the gate condition", () => {
    const steps = deploySteps();
    const guard = steps.findIndex((step) =>
      step.includes("id: status-url-shape"),
    );
    const migrate = steps.findIndex((step) => step.includes("pnpm db:migrate"));

    expect(guard).toBe(1);
    expect(migrate).toBeGreaterThan(guard);
    expect(steps[guard]).toContain(GATE_CONDITION);
  });

  it("gives the deploy step STATUS_URL and derives SITE_URL from it", () => {
    const deploy = deploySteps().find((step) =>
      step.includes("wrangler deploy"),
    );

    expect(deploy).toContain("STATUS_URL: ${{ secrets.STATUS_URL }}");
    expect(deploy).toContain('--var "SITE_URL:${STATUS_URL%/status}"');
    expect(deploy).toContain("--var BUILD_COMMIT:${{ github.sha }}");
  });
});

describe("deploy job structure", () => {
  it("runs only after verify, on pushes to main, one deploy at a time", () => {
    const job = deployJobLines().join("\n");

    expect(job).toContain("needs: verify");
    expect(job).toContain(
      "if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
    );
    expect(job).toContain("group: deploy-staging");
    expect(job).toContain("cancel-in-progress: false");
  });

  it("starts with the gate and gates every later step", () => {
    const [gate, ...rest] = deploySteps();

    expect(gate).toContain("id: deploy-gate");
    expect(rest.length).toBeGreaterThanOrEqual(8);
    for (const step of rest) {
      expect(step, step).toContain(GATE_CONDITION);
    }
  });

  it("references secrets only inside the deploy job", () => {
    const deployStart = LINES.findIndex((line) => line === "  deploy:");
    const outside = LINES.slice(0, deployStart).join("\n");

    expect(outside).not.toContain("secrets.");
    for (const name of SECRET_NAMES) {
      expect(deployJobLines().join("\n")).toContain(`secrets.${name}`);
    }
  });

  it("migrates, then deploys, then smoke-checks, never printing a value", () => {
    const job = deployJobLines().join("\n");
    const substitute = job.indexOf(
      'sed -i "s/00000000000000000000000000000000/',
    );
    const build = job.indexOf("run: pnpm build");
    const migrate = job.indexOf("pnpm db:migrate");
    const deploy = job.indexOf("wrangler deploy --var BUILD_COMMIT:");
    const smoke = job.indexOf('data-status="ok"');

    expect(substitute).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(substitute);
    expect(migrate).toBeGreaterThan(build);
    expect(deploy).toBeGreaterThan(migrate);
    expect(smoke).toBeGreaterThan(deploy);
    expect(job).toContain("grep -qF");
    expect(job).not.toMatch(/echo[^\n]*\$\{?(HYPERDRIVE_ID|STATUS_URL)/);
  });
});

describe("workflow safety", () => {
  it("never uses pull_request_target", () => {
    expect(WORKFLOW).not.toContain("pull_request_target");
  });

  it("pins every third-party action to a full commit SHA", () => {
    const uses = LINES.filter((line) => line.includes("uses:"));

    expect(uses.length).toBeGreaterThanOrEqual(6);
    for (const line of uses) {
      expect(line, line).toMatch(/uses: [\w./-]+@[0-9a-f]{40}( #.*)?$/);
    }
  });
});
