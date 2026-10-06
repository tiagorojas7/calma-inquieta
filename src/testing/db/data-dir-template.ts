import { randomBytes } from "node:crypto";
import { access, mkdir, readFile, rename, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Cache of a pre-initialized PostgreSQL data directory. `initdb` takes tens of
 * seconds on a loaded Windows machine; copying a finished directory takes a
 * fraction of a second. The cache lives in the OS temp folder and is safe to
 * delete: the next run rebuilds it.
 */

/** Reads the installed embedded-postgres version, the cache's main key part. */
export async function embeddedPostgresVersion(): Promise<string> {
  const entry = createRequire(import.meta.url).resolve("embedded-postgres");
  const manifest = join(dirname(entry), "..", "package.json");
  const { version } = JSON.parse(await readFile(manifest, "utf8")) as {
    version: string;
  };
  return version;
}

/** One filename-safe segment: changing the version or initdb flags rebuilds. */
export function templateKey(
  version: string,
  initdbFlags: readonly string[],
): string {
  const flags = initdbFlags.join(" ").replaceAll(/[^\w.-]+/g, "_");
  return `pg-${version}-${process.platform}-${process.arch}-${flags}`;
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

const REMOVE_OPTIONS = {
  recursive: true,
  force: true,
  maxRetries: 10,
  retryDelay: 200,
};

/**
 * Returns the template directory for `key`, building it on first use. The
 * build runs in a private directory that is renamed into place only when
 * complete, so a concurrent first run (another Vitest process) can never see or
 * copy a half-written template. A loser of that race discards its own build.
 */
export async function ensureDataDirTemplate(options: {
  root: string;
  key: string;
  /** Must create a complete data directory at the path it receives. */
  build: (directory: string) => Promise<void>;
}): Promise<string> {
  const { root, key, build } = options;
  const finalDir = join(root, key);
  if (await exists(finalDir)) {
    return finalDir;
  }

  await mkdir(root, { recursive: true });
  const privateDir = join(
    root,
    `${key}.building-${randomBytes(4).toString("hex")}`,
  );
  try {
    await build(privateDir);
    try {
      await rename(privateDir, finalDir);
    } catch (error) {
      if (!(await exists(finalDir))) {
        throw error;
      }
    }
  } finally {
    // After a successful rename the private path is gone, so this is a no-op;
    // after a lost race or a failed build it removes the leftovers.
    await rm(privateDir, REMOVE_OPTIONS).catch(() => undefined);
  }
  return finalDir;
}
