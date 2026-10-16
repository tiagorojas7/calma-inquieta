import { and, eq, inArray } from "drizzle-orm";
import { err, Money, ok } from "~/modules/_shared";
import { monthlyWorkshop } from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import type { WorkshopStatus } from "../application/contracts";
import type {
  MonthlyWorkshopRepository,
  StoredMonthlyWorkshop,
} from "../application/monthly-workshop-repository";
type Row = typeof monthlyWorkshop.$inferSelect;
type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
const slugIndex = "monthly_workshop_slug_unique";
const statuses: readonly WorkshopStatus[] = [
  "draft",
  "published",
  "paused",
  "archived",
];
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function status(value: string): WorkshopStatus {
  const found = statuses.find((item) => item === value);
  if (!found) throw new Error(`unknown status ${value}`);
  return found;
}
function money(value: number): Money {
  const parsed = Money.fromCentavos(value);
  if (!parsed.ok) throw new Error(`invalid stored money ${String(value)}`);
  return parsed.value;
}
function stored(row: Row): StoredMonthlyWorkshop {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    technique: row.technique,
    defaultFee: money(row.defaultFeeCentavos),
    teacherId: row.teacherId,
    percentage:
      row.agreedPercentageBp === null
        ? null
        : { basisPoints: row.agreedPercentageBp },
    status: status(row.status),
    audit: { updatedBy: row.updatedBy, updatedAt: row.updatedAt },
  };
}
function values(value: StoredMonthlyWorkshop) {
  return {
    slug: value.slug,
    name: value.name,
    summary: value.summary,
    description: value.description,
    technique: value.technique,
    defaultFeeCentavos: value.defaultFee.toCentavos(),
    teacherId: value.teacherId,
    agreedPercentageBp: value.percentage?.basisPoints ?? null,
    status: value.status,
    updatedBy: value.audit.updatedBy,
    updatedAt: value.audit.updatedAt,
  };
}
function isSlugConflict(error: unknown): boolean {
  const seen = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null) {
    if (seen.has(current)) return false;
    seen.add(current);
    if (
      "code" in current &&
      current.code === "23505" &&
      "constraint" in current &&
      current.constraint === slugIndex
    )
      return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
export function createDrizzleMonthlyWorkshopRepository(
  openSession: DbSessionFactory,
): MonthlyWorkshopRepository {
  async function session<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const current = await openSession();
    try {
      return await run(current.db);
    } finally {
      await current.close();
    }
  }
  return {
    insert: (value) =>
      session(async (db) => {
        try {
          await db
            .insert(monthlyWorkshop)
            .values({ id: value.id, ...values(value) });
          return ok(undefined);
        } catch (error) {
          if (isSlugConflict(error)) return err({ kind: "slug-conflict" });
          throw error;
        }
      }),
    update: (value) =>
      session(async (db) => {
        try {
          const rows = await db
            .update(monthlyWorkshop)
            .set(values(value))
            .where(eq(monthlyWorkshop.id, value.id))
            .returning({ id: monthlyWorkshop.id });
          return rows.length ? ok(undefined) : err({ kind: "not-found" });
        } catch (error) {
          if (isSlugConflict(error)) return err({ kind: "slug-conflict" });
          throw error;
        }
      }),
    findById: (id) =>
      session(async (db) => {
        const rows = await db
          .select()
          .from(monthlyWorkshop)
          .where(eq(monthlyWorkshop.id, id));
        return rows[0] ? stored(rows[0]) : null;
      }),
    findBySlug: (slug) =>
      session(async (db) => {
        const rows = await db
          .select()
          .from(monthlyWorkshop)
          .where(eq(monthlyWorkshop.slug, slug));
        return rows[0] ? stored(rows[0]) : null;
      }),
    list: (selected) =>
      selected.length === 0
        ? Promise.resolve([])
        : session(async (db) =>
            (
              await db
                .select()
                .from(monthlyWorkshop)
                .where(inArray(monthlyWorkshop.status, [...selected]))
            )
              .map(stored)
              .sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id)),
          ),
    deleteDraft: (id) =>
      session(async (db) => {
        const deleted = await db
          .delete(monthlyWorkshop)
          .where(
            and(
              eq(monthlyWorkshop.id, id),
              eq(monthlyWorkshop.status, "draft"),
            ),
          )
          .returning({ id: monthlyWorkshop.id });
        if (deleted.length) return "deleted";
        const remaining = await db
          .select({ id: monthlyWorkshop.id })
          .from(monthlyWorkshop)
          .where(eq(monthlyWorkshop.id, id));
        return remaining.length ? "not-draft" : "not-found";
      }),
  };
}
