import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  embeddedPostgresVersion,
  ensureDataDirTemplate,
  templateKey,
} from "./data-dir-template";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "calma-template-test-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function build(directory: string): Promise<void> {
  // initdb creates the directory itself; the stub does the same.
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "PG_VERSION"), "17\n");
}

describe("templateKey", () => {
  it("includes the embedded-postgres version", () => {
    expect(templateKey("17.10.0", ["--locale=C"])).toContain("17.10.0");
    expect(templateKey("17.10.0", ["--locale=C"])).not.toBe(
      templateKey("17.11.0", ["--locale=C"]),
    );
  });

  it("changes when the initdb flags change", () => {
    expect(templateKey("17.10.0", ["--locale=C"])).not.toBe(
      templateKey("17.10.0", ["--locale=C", "--encoding=UTF8"]),
    );
  });

  it("is a single filename-safe segment", () => {
    expect(templateKey("17.10.0-beta.17", ["--locale=C"])).toMatch(/^[\w.-]+$/);
  });
});

describe("embeddedPostgresVersion", () => {
  it("reads the installed version", async () => {
    await expect(embeddedPostgresVersion()).resolves.toMatch(/^\d+\.\d+/);
  });
});

describe("ensureDataDirTemplate", () => {
  it("builds the template once and reuses it afterwards", async () => {
    let builds = 0;
    const counting = async (directory: string) => {
      builds += 1;
      await build(directory);
    };

    const first = await ensureDataDirTemplate({
      root,
      key: "k1",
      build: counting,
    });
    const second = await ensureDataDirTemplate({
      root,
      key: "k1",
      build: counting,
    });

    expect(builds).toBe(1);
    expect(second).toBe(first);
    await expect(readFile(join(first, "PG_VERSION"), "utf8")).resolves.toBe(
      "17\n",
    );
  });

  it("keeps different keys apart", async () => {
    const a = await ensureDataDirTemplate({ root, key: "a", build });
    const b = await ensureDataDirTemplate({ root, key: "b", build });

    expect(a).not.toBe(b);
  });

  it("publishes atomically when first runs are concurrent", async () => {
    let builds = 0;
    const slow = async (directory: string) => {
      builds += 1;
      await build(directory);
      await new Promise((resolve) => setTimeout(resolve, 50));
    };

    const results = await Promise.all([
      ensureDataDirTemplate({ root, key: "race", build: slow }),
      ensureDataDirTemplate({ root, key: "race", build: slow }),
      ensureDataDirTemplate({ root, key: "race", build: slow }),
    ]);

    expect(new Set(results).size).toBe(1);
    expect(builds).toBeGreaterThanOrEqual(1);
    await expect(
      readFile(join(results[0], "PG_VERSION"), "utf8"),
    ).resolves.toBe("17\n");
    // Losers remove their private build directory; only the template remains.
    await expect(readdir(root)).resolves.toEqual(["race"]);
  });

  it("leaves no template behind when the build fails", async () => {
    const failing = async (directory: string) => {
      await build(directory);
      throw new Error("initdb failed");
    };

    await expect(
      ensureDataDirTemplate({ root, key: "broken", build: failing }),
    ).rejects.toThrow("initdb failed");

    expect(existsSync(join(root, "broken"))).toBe(false);
    await expect(readdir(root)).resolves.toEqual([]);
  });
});
