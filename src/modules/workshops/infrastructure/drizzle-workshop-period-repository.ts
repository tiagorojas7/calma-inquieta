import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { err, Money, ok } from "~/modules/_shared";
import {
  periodTurno,
  teacher,
  workshopPeriod,
  workshopTurno,
} from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import type { PeriodStatus, WorkshopPeriod } from "../application/contracts";
import type {
  DeletePeriodOutcome,
  StoredWorkshopPeriod,
  WorkshopPeriodRepository,
} from "../application/workshop-period-repository";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];
type PeriodRow = typeof workshopPeriod.$inferSelect;
type TeacherRow = typeof teacher.$inferSelect;

const periodIndex = "workshop_period_workshop_period_unique";
const statuses: readonly PeriodStatus[] = ["draft", "open", "closed"];

function storedMoney(value: number): Money {
  const parsed = Money.fromCentavos(value);
  if (!parsed.ok) throw new Error(`invalid stored money ${String(value)}`);
  return parsed.value;
}

function status(value: string): PeriodStatus {
  const found = statuses.find((item) => item === value);
  if (!found) throw new Error(`unknown period status ${value}`);
  return found;
}

function values(value: StoredWorkshopPeriod) {
  return {
    workshopId: value.workshopId,
    period: value.period,
    feeCentavos: value.fee.toCentavos(),
    materialsRequired: value.materialsRequired,
    projectTitle: value.project.title || null,
    projectDescription: value.project.description || null,
    snapshotTeacherId: value.snapshot.teacher.id,
    snapshotTeacherModality: value.snapshot.modality,
    snapshotPercentageBp: value.snapshot.percentage?.basisPoints ?? null,
    status: value.status,
    openedBy: value.openedBy,
    openedAt: value.openedAt,
    updatedBy: value.audit.updatedBy,
    updatedAt: value.audit.updatedAt,
  };
}

function assertDeferredDataIsEmpty(value: WorkshopPeriod): void {
  if (value.project.images.length > 0)
    throw new Error(
      "workshop period project image persistence is deferred to B6b",
    );
}

function isPeriodConflict(error: unknown): boolean {
  const seen = new Set<object>();
  let current = error;
  while (typeof current === "object" && current !== null) {
    if (seen.has(current)) return false;
    seen.add(current);
    if (
      "code" in current &&
      current.code === "23505" &&
      "constraint" in current &&
      current.constraint === periodIndex
    )
      return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

async function insertTurnos(
  db: Db,
  value: StoredWorkshopPeriod,
): Promise<void> {
  if (!value.turnos.length) return;
  await db.insert(periodTurno).values(
    value.turnos.map((turno) => ({
      periodId: value.id,
      turnoId: turno.turnoId,
      workshopId: value.workshopId,
      capacity: turno.capacity,
    })),
  );
}

async function load(
  db: Db,
  root: PeriodRow,
  snapshotTeacher: TeacherRow,
): Promise<StoredWorkshopPeriod> {
  const turnos = await db
    .select({ period: periodTurno, turno: workshopTurno })
    .from(periodTurno)
    .innerJoin(workshopTurno, eq(periodTurno.turnoId, workshopTurno.id))
    .where(eq(periodTurno.periodId, root.id))
    .orderBy(
      asc(workshopTurno.weekday),
      asc(workshopTurno.startsAt),
      asc(workshopTurno.id),
    );

  return {
    id: root.id,
    workshopId: root.workshopId,
    period: root.period,
    fee: storedMoney(root.feeCentavos),
    materialsRequired: root.materialsRequired,
    status: status(root.status),
    project: {
      title: root.projectTitle ?? "",
      description: root.projectDescription ?? "",
      images: [],
    },
    turnos: turnos.map(({ period, turno }) => ({
      turnoId: turno.id,
      label: turno.label,
      weekday:
        turno.weekday as StoredWorkshopPeriod["turnos"][number]["weekday"],
      startsAt: turno.startsAt.slice(0, 5),
      endsAt: turno.endsAt.slice(0, 5),
      turnoActive: turno.active,
      capacity: period.capacity,
    })),
    materials: [],
    snapshot: {
      teacher: {
        id: snapshotTeacher.id,
        name: snapshotTeacher.name,
        active: snapshotTeacher.active,
      },
      modality:
        root.snapshotTeacherModality as StoredWorkshopPeriod["snapshot"]["modality"],
      percentage:
        root.snapshotPercentageBp === null
          ? null
          : { basisPoints: root.snapshotPercentageBp },
    },
    openedBy: root.openedBy,
    openedAt: root.openedAt,
    audit: { updatedBy: root.updatedBy, updatedAt: root.updatedAt },
  };
}

export function createDrizzleWorkshopPeriodRepository(
  openSession: DbSessionFactory,
): WorkshopPeriodRepository {
  async function session<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const current = await openSession();
    try {
      return await run(current.db);
    } finally {
      await current.close();
    }
  }

  async function find(
    db: Db,
    condition: SQL | undefined,
  ): Promise<StoredWorkshopPeriod | null> {
    const rows = await db
      .select({ root: workshopPeriod, snapshotTeacher: teacher })
      .from(workshopPeriod)
      .innerJoin(teacher, eq(workshopPeriod.snapshotTeacherId, teacher.id))
      .where(condition);
    const row = rows[0];
    return row ? load(db, row.root, row.snapshotTeacher) : null;
  }

  return {
    insert: (value) =>
      session(async (db) => {
        assertDeferredDataIsEmpty(value);
        try {
          return await db.transaction(async (tx) => {
            await tx
              .insert(workshopPeriod)
              .values({ id: value.id, ...values(value) });
            await insertTurnos(tx, value);
            return ok(undefined);
          });
        } catch (error) {
          if (!isPeriodConflict(error)) throw error;
          const existing = await find(
            db,
            and(
              eq(workshopPeriod.workshopId, value.workshopId),
              eq(workshopPeriod.period, value.period),
            ),
          );
          if (!existing) throw error;
          return err({ kind: "period-exists", periodId: existing.id });
        }
      }),
    update: (value) =>
      session(async (db) => {
        assertDeferredDataIsEmpty(value);
        return db.transaction(async (tx) => {
          const updated = await tx
            .update(workshopPeriod)
            .set(values(value))
            .where(eq(workshopPeriod.id, value.id))
            .returning({ id: workshopPeriod.id });
          if (!updated.length) return err({ kind: "not-found" });
          await tx
            .delete(periodTurno)
            .where(eq(periodTurno.periodId, value.id));
          await insertTurnos(tx, value);
          return ok(undefined);
        });
      }),
    findById: (id) => session((db) => find(db, eq(workshopPeriod.id, id))),
    findByWorkshopPeriod: (workshopId, period) =>
      session((db) =>
        find(
          db,
          and(
            eq(workshopPeriod.workshopId, workshopId),
            eq(workshopPeriod.period, period),
          ),
        ),
      ),
    listForWorkshop: (workshopId) =>
      session(async (db) => {
        const rows = await db
          .select({ root: workshopPeriod, snapshotTeacher: teacher })
          .from(workshopPeriod)
          .innerJoin(teacher, eq(workshopPeriod.snapshotTeacherId, teacher.id))
          .where(eq(workshopPeriod.workshopId, workshopId))
          .orderBy(desc(workshopPeriod.period), asc(workshopPeriod.id));
        return Promise.all(
          rows.map(({ root, snapshotTeacher }) =>
            load(db, root, snapshotTeacher),
          ),
        );
      }),
    latestBefore: (workshopId, period) =>
      session(async (db) => {
        const rows = await db
          .select({ root: workshopPeriod, snapshotTeacher: teacher })
          .from(workshopPeriod)
          .innerJoin(teacher, eq(workshopPeriod.snapshotTeacherId, teacher.id))
          .where(
            and(
              eq(workshopPeriod.workshopId, workshopId),
              sql`${workshopPeriod.period} < ${period}`,
            ),
          )
          .orderBy(desc(workshopPeriod.period), asc(workshopPeriod.id))
          .limit(1);
        const row = rows[0];
        return row ? load(db, row.root, row.snapshotTeacher) : null;
      }),
    isTurnoUsed: (turnoId) =>
      session(async (db) => {
        const rows = await db.execute<{ used: boolean }>(sql`
          SELECT EXISTS (
            SELECT 1 FROM period_turno WHERE turno_id = ${turnoId}
          ) AS used`);
        return rows.rows[0]?.used ?? false;
      }),
    deleteDraft: (id) =>
      session(async (db): Promise<DeletePeriodOutcome> => {
        const deleted = await db
          .delete(workshopPeriod)
          .where(
            and(eq(workshopPeriod.id, id), eq(workshopPeriod.status, "draft")),
          )
          .returning({ id: workshopPeriod.id });
        if (deleted.length) return "deleted";
        const remaining = await db
          .select({ id: workshopPeriod.id })
          .from(workshopPeriod)
          .where(eq(workshopPeriod.id, id));
        return remaining.length ? "not-draft" : "not-found";
      }),
  };
}
