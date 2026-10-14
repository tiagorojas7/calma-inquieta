import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const SCHEMA_REFERENCE = /platform\/db\/schema/;
const IMPORT_SOURCE = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

/**
 * A module's infrastructure may import only its own schema file
 * (`~/platform/db/schema/<module>`); the entry point and other modules' schema
 * files are violations (design AC1).
 */
function schemaOwnershipViolations(root: string): string[] {
  const modulesDir = join(root, "src", "modules");
  const violations: string[] = [];
  for (const module of readdirSync(modulesDir, { withFileTypes: true })) {
    if (!module.isDirectory()) continue;
    const infrastructure = join(modulesDir, module.name, "infrastructure");
    let files: string[];
    try {
      files = sourceFiles(infrastructure);
    } catch {
      continue;
    }
    for (const file of files) {
      const code = readFileSync(file, "utf8");
      for (const [, source = ""] of code.matchAll(IMPORT_SOURCE)) {
        if (
          SCHEMA_REFERENCE.test(source) &&
          source !== `~/platform/db/schema/${module.name}`
        ) {
          violations.push(`${relative(root, file)} imports ${source}`);
        }
      }
    }
  }
  return violations.map((line) => line.replaceAll("\\", "/"));
}

const scratch: string[] = [];
afterAll(() => {
  for (const directory of scratch)
    rmSync(directory, { recursive: true, force: true });
});

function plant(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "schema-ownership-"));
  scratch.push(root);
  for (const [path, code] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, code);
  }
  return root;
}

describe("schema ownership", () => {
  it("lets each module's infrastructure import only its own schema file", () => {
    expect(schemaOwnershipViolations(repoRoot)).toEqual([]);
  });

  it("accepts an adapter importing its own schema file", () => {
    const root = plant({
      "src/modules/teachers/infrastructure/a.ts": `import { teacher } from "~/platform/db/schema/teachers";\n`,
    });

    expect(schemaOwnershipViolations(root)).toEqual([]);
  });

  it.each([
    ["another module's schema file", "~/platform/db/schema/media"],
    ["the schema entry point", "~/platform/db/schema"],
    ["a relative path to a schema file", "../../../platform/db/schema/media"],
  ])("reports an adapter importing %s", (_name, source) => {
    const root = plant({
      "src/modules/teachers/infrastructure/leak.ts": `import { x } from "${source}";\n`,
    });

    expect(schemaOwnershipViolations(root)).toEqual([
      `src/modules/teachers/infrastructure/leak.ts imports ${source}`,
    ]);
  });

  it("also checks dynamic imports and tests inside infrastructure", () => {
    const root = plant({
      "src/modules/teachers/infrastructure/lazy.db.test.ts": `const m = await import("~/platform/db/schema/media");\n`,
    });

    expect(schemaOwnershipViolations(root)).toHaveLength(1);
  });

  it("ignores schema imports outside infrastructure", () => {
    const root = plant({
      "src/modules/teachers/application/x.ts": `import { x } from "~/platform/db/schema/media";\n`,
    });

    expect(schemaOwnershipViolations(root)).toEqual([]);
  });
});
