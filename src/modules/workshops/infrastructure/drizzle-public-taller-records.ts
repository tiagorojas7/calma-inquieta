import { and, asc, eq, gte, inArray, type SQL } from "drizzle-orm";
import { Money } from "~/modules/_shared";
import {
  monthlyWorkshop,
  periodTurno,
  workshopImage,
  workshopPeriod,
  workshopTurno,
} from "~/platform/db/schema/workshops";
import type { DbSessionFactory } from "~/platform/db/session";
import type { Weekday } from "../application/contracts";
import type {
  PublicTallerRecord,
  PublicTallerRecords,
} from "../application/public-catalog";

type Db = Awaited<ReturnType<DbSessionFactory>>["db"];

// An explicit column list: a column added to the table later never travels (PC14).
const WORKSHOP_COLUMNS = {
  id: monthlyWorkshop.id,
  slug: monthlyWorkshop.slug,
  name: monthlyWorkshop.name,
  summary: monthlyWorkshop.summary,
  description: monthlyWorkshop.description,
  technique: monthlyWorkshop.technique,
  teacherId: monthlyWorkshop.teacherId,
  status: monthlyWorkshop.status,
};

const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

function toWeekday(value: number): Weekday {
  const weekday = WEEKDAYS.find((candidate) => candidate === value);
  if (weekday === undefined)
    throw new Error(`weekday ${String(value)} is out of range`);
  return weekday;
}

function toMoney(centavos: number): Money {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error(`invalid stored amount ${String(centavos)}`);
  return money.value;
}

/** Postgres returns `HH:MM:SS`; the read model speaks `HH:MM`. */
const toClock = (time: string): string => time.slice(0, 5);

function toVisibleStatus(value: string): "published" | "paused" {
  if (value === "published" || value === "paused") return value;
  throw new Error(`status "${value}" is not visible`);
}

const visible = (extra?: SQL): SQL | undefined =>
  and(inArray(monthlyWorkshop.status, ["published", "paused"]), extra);

function group<T, K>(rows: readonly T[], keyOf: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return groups;
}

/**
 * Reads the visible talleres in a fixed number of statements, whatever the
 * catalog size: workshops, active turnos, open periods from the month, and the
 * `period_turno` capacities (the last three only when there are rows to join).
 *
 * The taller gallery is read with them (`workshop_image`). Period project images
 * have no table yet (B6b), so those galleries stay empty.
 */
async function select(
  db: Db,
  where: SQL | undefined,
  fromPeriod: string,
): Promise<readonly PublicTallerRecord[]> {
  const workshops = await db
    .select(WORKSHOP_COLUMNS)
    .from(monthlyWorkshop)
    .where(where)
    .orderBy(asc(monthlyWorkshop.slug));
  if (workshops.length === 0) return [];
  const ids = workshops.map((row) => row.id);

  const [turnoRows, periodRows, imageRows] = await Promise.all([
    db
      .select({
        id: workshopTurno.id,
        workshopId: workshopTurno.workshopId,
        label: workshopTurno.label,
        weekday: workshopTurno.weekday,
        startsAt: workshopTurno.startsAt,
        endsAt: workshopTurno.endsAt,
      })
      .from(workshopTurno)
      .where(
        and(
          inArray(workshopTurno.workshopId, ids),
          eq(workshopTurno.active, true),
        ),
      )
      .orderBy(asc(workshopTurno.weekday), asc(workshopTurno.startsAt)),
    db
      .select({
        id: workshopPeriod.id,
        workshopId: workshopPeriod.workshopId,
        period: workshopPeriod.period,
        feeCentavos: workshopPeriod.feeCentavos,
        projectTitle: workshopPeriod.projectTitle,
        projectDescription: workshopPeriod.projectDescription,
      })
      .from(workshopPeriod)
      .where(
        and(
          inArray(workshopPeriod.workshopId, ids),
          eq(workshopPeriod.status, "open"),
          gte(workshopPeriod.period, fromPeriod),
        ),
      )
      .orderBy(asc(workshopPeriod.period)),
    db
      .select({
        workshopId: workshopImage.workshopId,
        assetId: workshopImage.mediaAssetId,
        alt: workshopImage.alt,
      })
      .from(workshopImage)
      .where(inArray(workshopImage.workshopId, ids))
      .orderBy(asc(workshopImage.workshopId), asc(workshopImage.position)),
  ]);

  const capacityRows =
    periodRows.length === 0
      ? []
      : await db
          .select({
            periodId: periodTurno.periodId,
            turnoId: periodTurno.turnoId,
            capacity: periodTurno.capacity,
          })
          .from(periodTurno)
          .where(
            inArray(
              periodTurno.periodId,
              periodRows.map((row) => row.id),
            ),
          );

  const turnosOf = group(turnoRows, (row) => row.workshopId);
  const periodsOf = group(periodRows, (row) => row.workshopId);
  const imagesOf = group(imageRows, (row) => row.workshopId);
  const capacitiesOf = group(capacityRows, (row) => row.periodId);

  return workshops.map((row) => ({
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    technique: row.technique,
    teacherId: row.teacherId,
    status: toVisibleStatus(row.status),
    images: (imagesOf.get(row.id) ?? []).map(({ assetId, alt }) => ({
      assetId,
      alt,
    })),
    activeTurnos: (turnosOf.get(row.id) ?? []).map((turno) => ({
      id: turno.id,
      label: turno.label,
      weekday: toWeekday(turno.weekday),
      startsAt: toClock(turno.startsAt),
      endsAt: toClock(turno.endsAt),
    })),
    openPeriods: (periodsOf.get(row.id) ?? []).map((period) => ({
      period: period.period,
      fee: toMoney(period.feeCentavos),
      capacities: (capacitiesOf.get(period.id) ?? []).map((capacity) => ({
        turnoId: capacity.turnoId,
        capacity: capacity.capacity,
      })),
      project: {
        title: period.projectTitle,
        description: period.projectDescription,
        images: [],
      },
    })),
  }));
}

/** One short-lived session per call; database errors propagate to the caller. */
export function createDrizzlePublicTallerRecords(
  openSession: DbSessionFactory,
): PublicTallerRecords {
  async function withSession<T>(run: (db: Db) => Promise<T>): Promise<T> {
    const session = await openSession();
    try {
      return await run(session.db);
    } finally {
      await session.close();
    }
  }

  return {
    listVisible: ({ fromPeriod }) =>
      withSession((db) => select(db, visible(), fromPeriod)),

    findVisibleBySlug: (slug, { fromPeriod }) =>
      withSession(async (db) => {
        const [record] = await select(
          db,
          visible(eq(monthlyWorkshop.slug, slug)),
          fromPeriod,
        );
        return record ?? null;
      }),

    listVisibleSlugs: () =>
      withSession(async (db) => {
        const rows = await db
          .select({ slug: monthlyWorkshop.slug })
          .from(monthlyWorkshop)
          .where(visible())
          .orderBy(asc(monthlyWorkshop.slug));
        return rows.map((row) => row.slug);
      }),
  };
}
