import { sql } from "drizzle-orm";
import { migrationTagFor } from "~/platform/db/migration-catalog";
import type { DbSessionFactory } from "~/platform/db/session";
import type { DatabaseProbe, DatabaseProbeResult } from "../application/ports";

const UNDEFINED_TABLE = "42P01";
const UNREACHABLE: DatabaseProbeResult = { reachable: false };

// drizzle wraps driver errors; the SQLSTATE lives on the error or its cause.
function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "cause" in error ? sqlState(error.cause) : undefined;
}

/** Never throws: every failure maps to `{ reachable: false }` (port contract). */
export function createDrizzleDatabaseProbe(
  openSession: DbSessionFactory,
): DatabaseProbe {
  return {
    async probe() {
      let session;
      try {
        session = await openSession();
      } catch {
        return UNREACHABLE;
      }
      try {
        const { rows } = await session.db.execute<{ created_at: string }>(
          sql`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`,
        );
        const newest = rows[0];
        return {
          reachable: true,
          latestMigration: newest
            ? migrationTagFor(Number(newest.created_at))
            : null,
        };
      } catch (error) {
        return sqlState(error) === UNDEFINED_TABLE
          ? { reachable: true, latestMigration: null }
          : UNREACHABLE;
      } finally {
        await session.close();
      }
    },
  };
}
