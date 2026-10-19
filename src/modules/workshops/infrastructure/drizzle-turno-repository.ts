import { eq } from "drizzle-orm";
import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import { monthlyWorkshop, workshopTurno } from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import { compareTurnos, turnoLabelKey } from "../domain/turno-core";
import type {
  StoredTurno,
  TurnoLabelConflict,
  TurnoMutation,
  TurnoRepository,
} from "../application/turno-repository";
import type { StoredMonthlyWorkshop } from "../application/monthly-workshop-repository";

type Row = typeof workshopTurno.$inferSelect;
type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

const labelIndex = "workshop_turno_workshop_label_key_unique";

class WorkshopAuditNotFound extends Error {}

function stored(row: Row): StoredTurno {
  return {
    id: row.id,
    workshopId: row.workshopId,
    label: row.label,
    labelKey: row.labelKey,
    weekday: row.weekday as StoredTurno["weekday"],
    startsAt: row.startsAt.slice(0, 5),
    endsAt: row.endsAt.slice(0, 5),
    defaultCapacity: row.defaultCapacity,
    active: row.active,
  };
}

function values(value: StoredTurno) {
  return {
    workshopId: value.workshopId,
    label: value.label,
    labelKey: turnoLabelKey(value.label),
    weekday: value.weekday,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    defaultCapacity: value.defaultCapacity,
    active: value.active,
  };
}

function workshopAudit(workshop: StoredMonthlyWorkshop) {
  return {
    updatedBy: workshop.audit.updatedBy,
    updatedAt: workshop.audit.updatedAt,
  };
}

function isLabelConflict(error: unknown): boolean {
  const seen = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null) {
    if (seen.has(current)) return false;
    seen.add(current);
    if (
      "code" in current &&
      current.code === "23505" &&
      "constraint" in current &&
      current.constraint === labelIndex
    )
      return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

export function createDrizzleTurnoRepository(
  openSession: DbSessionFactory,
): TurnoRepository {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  async function write<T>(run: (db: Db) => Promise<T>): Promise<T> {
    try {
      return await withSession(run);
    } catch (error) {
      if (isLabelConflict(error)) return err({ kind: "label-conflict" }) as T;
      throw error;
    }
  }

  async function apply(
    db: Db,
    mutation: TurnoMutation,
  ): Promise<Result<void, TurnoLabelConflict | NotFound>> {
    if (mutation.kind === "insert") {
      await db
        .insert(workshopTurno)
        .values({ id: mutation.value.id, ...values(mutation.value) });
      return ok(undefined);
    }
    const rows =
      mutation.kind === "update"
        ? await db
            .update(workshopTurno)
            .set(values(mutation.value))
            .where(eq(workshopTurno.id, mutation.value.id))
            .returning({ id: workshopTurno.id })
        : await db
            .delete(workshopTurno)
            .where(eq(workshopTurno.id, mutation.id))
            .returning({ id: workshopTurno.id });
    return rows.length ? ok(undefined) : err({ kind: "not-found" });
  }

  return {
    insert: (value) =>
      write(async (db) => {
        await db
          .insert(workshopTurno)
          .values({ id: value.id, ...values(value) });
        return ok(undefined);
      }),
    update: (value) =>
      write(async (db) => {
        const rows = await db
          .update(workshopTurno)
          .set(values(value))
          .where(eq(workshopTurno.id, value.id))
          .returning({ id: workshopTurno.id });
        return rows.length ? ok(undefined) : err({ kind: "not-found" });
      }),
    findById: (id) =>
      withSession(async (db) => {
        const rows = await db
          .select()
          .from(workshopTurno)
          .where(eq(workshopTurno.id, id));
        return rows[0] ? stored(rows[0]) : null;
      }),
    listForWorkshop: (workshopId) =>
      withSession(async (db) =>
        (
          await db
            .select()
            .from(workshopTurno)
            .where(eq(workshopTurno.workshopId, workshopId))
        )
          .map(stored)
          .sort(compareTurnos),
      ),
    countActiveForWorkshop: (workshopId) =>
      withSession(async (db) => {
        const rows = await db
          .select({ active: workshopTurno.active })
          .from(workshopTurno)
          .where(eq(workshopTurno.workshopId, workshopId));
        return rows.filter((row) => row.active).length;
      }),
    delete: (id) =>
      withSession(async (db) => {
        const rows = await db
          .delete(workshopTurno)
          .where(eq(workshopTurno.id, id))
          .returning({ id: workshopTurno.id });
        return rows.length ? ok(undefined) : err({ kind: "not-found" });
      }),
    mutate: (workshop, mutation) =>
      withSession(async (db) => {
        try {
          return await db.transaction(async (tx) => {
            const changed = await apply(tx, mutation);
            if (!changed.ok) return changed;
            const audit = await tx
              .update(monthlyWorkshop)
              .set(workshopAudit(workshop))
              .where(eq(monthlyWorkshop.id, workshop.id))
              .returning({ id: monthlyWorkshop.id });
            if (audit.length === 0) throw new WorkshopAuditNotFound();
            return changed;
          });
        } catch (error) {
          if (error instanceof WorkshopAuditNotFound)
            return err({ kind: "not-found" });
          if (isLabelConflict(error)) return err({ kind: "label-conflict" });
          throw error;
        }
      }),
  };
}
