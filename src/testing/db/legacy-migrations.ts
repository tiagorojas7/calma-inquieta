import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

interface Journal {
  entries: { idx: number; tag: string }[];
}

/**
 * Applies the real migrations `0000` through `lastIdx` to an empty database
 * and nothing after, like a database that has not been migrated further. It
 * migrates from a temporary copy of `drizzle/` whose journal stops at
 * `lastIdx`, so the committed migration files are never touched. Run from the
 * repository root.
 */
export async function migrateDatabaseUpTo(
  connectionString: string,
  lastIdx: number,
): Promise<void> {
  const folder = await mkdtemp(join(tmpdir(), "calma-legacy-migrations-"));
  try {
    await cp("drizzle", folder, { recursive: true });
    const journalPath = join(folder, "meta", "_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as Journal;
    journal.entries = journal.entries.filter((entry) => entry.idx <= lastIdx);
    await writeFile(journalPath, JSON.stringify(journal));

    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      await migrate(drizzle(client), {
        migrationsFolder: folder,
        migrationsSchema: "drizzle",
        migrationsTable: "__drizzle_migrations",
      });
    } finally {
      await client.end();
    }
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
