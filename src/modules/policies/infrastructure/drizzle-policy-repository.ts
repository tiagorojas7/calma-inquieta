import { desc, and, eq } from "drizzle-orm";
import { err, ok, type Result } from "~/modules/_shared";
import { policyVersion } from "~/platform/db/schema/policies";
import type { DbSessionFactory } from "~/platform/db/session";
import type {
  PolicyRepository,
  VersionTaken,
} from "../application/policy-repository";
import {
  isPolicyKind,
  type PolicyKind,
  type PolicyVersion,
} from "../domain/policy-core";

type Row = typeof policyVersion.$inferSelect;

const KIND_VERSION_INDEX = "policy_version_kind_version_unique";

function toVersion(row: Row): PolicyVersion {
  if (!isPolicyKind(row.kind))
    throw new Error("persisted policy kind is invalid");
  return {
    id: row.id,
    kind: row.kind,
    version: row.version,
    body: row.body,
    publishedAt: row.publishedAt,
    publishedBy: row.publishedBy,
  };
}

/** True for a unique violation (23505) on the (kind, version) index, cause chain included. */
function isVersionTaken(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if (
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === KIND_VERSION_INDEX
  )
    return true;
  return "cause" in error && isVersionTaken(error.cause);
}

/** One short-lived session per call; database errors propagate to the caller. */
export function createDrizzlePolicyRepository(
  openSession: DbSessionFactory,
): PolicyRepository {
  async function withSession<T>(
    run: (db: Awaited<ReturnType<DbSessionFactory>>["db"]) => Promise<T>,
  ): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }
  return {
    latest: (kind: PolicyKind) =>
      withSession(async (db) => {
        const [row] = await db
          .select()
          .from(policyVersion)
          .where(eq(policyVersion.kind, kind))
          .orderBy(desc(policyVersion.version))
          .limit(1);
        return row ? toVersion(row) : null;
      }),
    list: (kind: PolicyKind) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(policyVersion)
          .where(eq(policyVersion.kind, kind))
          .orderBy(desc(policyVersion.version));
        return rows.map(toVersion);
      }),
    exists: (kind: PolicyKind, version: number) =>
      withSession(async (db) => {
        const rows = await db
          .select({ id: policyVersion.id })
          .from(policyVersion)
          .where(
            and(
              eq(policyVersion.kind, kind),
              eq(policyVersion.version, version),
            ),
          )
          .limit(1);
        return rows.length > 0;
      }),
    insert: (
      version: PolicyVersion,
    ): Promise<Result<PolicyVersion, VersionTaken>> =>
      withSession(async (db) => {
        try {
          await db.insert(policyVersion).values(version);
          return ok(version);
        } catch (error) {
          if (isVersionTaken(error)) return err({ kind: "version-taken" });
          throw error;
        }
      }),
  };
}
