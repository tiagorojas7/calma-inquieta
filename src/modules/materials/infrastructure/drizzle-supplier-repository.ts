import { and, asc, eq } from "drizzle-orm";
import { supplier } from "~/platform/db/schema/materials";
import type { DbSessionFactory } from "~/platform/db/session";
import type { Supplier } from "../application/contracts";
import {
  SupplierNameConflictError,
  type SupplierFilter,
  type SupplierRepository,
} from "../application/supplier-repository";
import { supplierNameKey } from "../domain/supplier-core";

type Row = typeof supplier.$inferSelect;

function toSupplier(row: Row): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    active: row.active,
    audit: { updatedBy: row.updatedBy, updatedAt: row.updatedAt },
  };
}

function toValues(value: Supplier) {
  return {
    name: value.name,
    nameKey: supplierNameKey(value.name),
    phone: value.phone,
    email: value.email,
    notes: value.notes,
    active: value.active,
    updatedBy: value.audit.updatedBy,
    updatedAt: value.audit.updatedAt,
  };
}

function isSupplierActiveNameConflict(error: unknown): boolean {
  const visited = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null) {
    if (visited.has(current)) return false;
    visited.add(current);
    try {
      const candidate = current as {
        code?: unknown;
        constraint?: unknown;
        cause?: unknown;
      };
      if (
        candidate.code === "23505" &&
        candidate.constraint === "supplier_active_name_unique"
      )
        return true;
      current = candidate.cause;
    } catch {
      return false;
    }
  }
  return false;
}

function mapSupplierNameConflict(error: unknown): never {
  if (isSupplierActiveNameConflict(error))
    throw new SupplierNameConflictError();
  throw error;
}

/** One short-lived session per call; maps the supplier-name constraint only. */
export function createDrizzleSupplierRepository(
  openSession: DbSessionFactory,
): SupplierRepository {
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
    insert: (value) =>
      withSession(async (db) => {
        try {
          await db
            .insert(supplier)
            .values({ id: value.id, ...toValues(value) });
        } catch (error) {
          mapSupplierNameConflict(error);
        }
      }),

    update: (value) =>
      withSession(async (db) => {
        try {
          const rows = await db
            .update(supplier)
            .set(toValues(value))
            .where(eq(supplier.id, value.id))
            .returning({ id: supplier.id });
          return rows.length > 0;
        } catch (error) {
          return mapSupplierNameConflict(error);
        }
      }),

    findById: (id) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(supplier)
          .where(eq(supplier.id, id));
        const row = rows[0];
        return row ? toSupplier(row) : null;
      }),

    findActiveByName: (name) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(supplier)
          .where(
            and(
              eq(supplier.active, true),
              eq(supplier.nameKey, supplierNameKey(name)),
            ),
          );
        const row = rows[0];
        return row ? toSupplier(row) : null;
      }),

    list: (filter: SupplierFilter) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(supplier)
          .where(
            filter === "all"
              ? undefined
              : eq(supplier.active, filter === "active"),
          )
          .orderBy(asc(supplier.nameKey), asc(supplier.id));
        return rows.map(toSupplier);
      }),
  };
}
