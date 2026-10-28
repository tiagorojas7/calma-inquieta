import { err, ok, type Clock } from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  ORDER_STATUSES,
  type EnrollmentInsightsReader,
  type IncomeRow,
  type OrderStatus,
  type PeriodRegistrationRow,
} from "~/modules/enrollments";
import {
  cordobaDateOf,
  type PeriodTeacherRow,
  type WorkshopInsightsReader,
} from "~/modules/workshops";
import {
  PENDING_ALERT_HOURS,
  isPeriod,
  nextPeriod,
  percentOf,
  periodBounds,
  pesos,
  settlementCentavos,
} from "../domain/insights-core";
import type {
  ConversionRow,
  ConversionTotals,
  IncomeStatRow,
  IncomeTotals,
  InsightsService,
  MaterialsToOrder,
  OccupancyRow,
  OccupancyTotals,
  PanelView,
  SettlementsView,
  StatisticsView,
  TeacherSettlementRow,
} from "./insights";

type MaybeActor = AdminActor | null | undefined;

/** The service contract, accepting an absent actor so it can be denied. */
export type InsightsUseCases = {
  [K in keyof InsightsService]: InsightsService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface InsightsServiceDeps {
  readonly orders: EnrollmentInsightsReader;
  readonly workshops: WorkshopInsightsReader;
  readonly clock: Clock;
}

const HOUR_MS = 3_600_000;
const CONFIRMED: readonly OrderStatus[] = [
  "paid",
  "materials_requested",
  "materials_received",
];
const STATUS_ORDER = new Map(ORDER_STATUSES.map((s, index) => [s, index]));

const byName = <T extends { readonly workshopName: string }>(a: T, b: T) =>
  a.workshopName.localeCompare(b.workshopName, "es");

function occupancyTotals(rows: readonly OccupancyTotals[]): OccupancyTotals {
  const capacity = rows.reduce((sum, row) => sum + row.capacity, 0);
  const confirmed = rows.reduce((sum, row) => sum + row.confirmed, 0);
  return {
    capacity,
    confirmed,
    free: Math.max(capacity - confirmed, 0),
    percent: percentOf(confirmed, capacity),
  };
}

function incomeTotals(rows: readonly IncomeRow[]): IncomeTotals {
  const fee = rows.reduce((sum, row) => sum + row.feeCentavos, 0);
  const materials = rows.reduce((sum, row) => sum + row.materialsCentavos, 0);
  return {
    orders: rows.reduce((sum, row) => sum + row.orders, 0),
    fee: pesos(fee),
    materials: pesos(materials),
    total: pesos(fee + materials),
  };
}

function conversionOf(
  counts: Readonly<Partial<Record<OrderStatus, number>>>,
): ConversionTotals {
  const of = (status: OrderStatus) => counts[status] ?? 0;
  const received = ORDER_STATUSES.reduce((sum, s) => sum + of(s), 0);
  const confirmed = CONFIRMED.reduce((sum, s) => sum + of(s), 0);
  return {
    received,
    pending: of("pending_confirmation"),
    confirmed,
    cancelled: of("cancelled"),
    percent: percentOf(confirmed, received),
  };
}

function invalidPeriod() {
  return err({
    kind: "invalid" as const,
    issues: [{ field: "period" as const, code: "invalid-format" as const }],
  });
}

/** Folds the month's period snapshots and payments into one row per teacher. */
function settlementRows(
  snapshots: readonly PeriodTeacherRow[],
  registrations: readonly PeriodRegistrationRow[],
): TeacherSettlementRow[] {
  const byPeriod = new Map(registrations.map((row) => [row.periodId, row]));
  const byTeacher = new Map<
    string,
    {
      snapshot: PeriodTeacherRow;
      percentages: Set<number>;
      activities: Set<string>;
      emails: Set<string>;
      orders: number;
      fee: number;
      estimate: number | null;
    }
  >();
  for (const snapshot of snapshots) {
    const entry = byTeacher.get(snapshot.teacherId) ?? {
      snapshot,
      percentages: new Set<number>(),
      activities: new Set<string>(),
      emails: new Set<string>(),
      orders: 0,
      fee: 0,
      estimate: null,
    };
    const paid = byPeriod.get(snapshot.periodId);
    const fee = paid?.feeCentavos ?? 0;
    entry.activities.add(snapshot.workshopName);
    entry.orders += paid?.orders ?? 0;
    entry.fee += fee;
    for (const email of paid?.studentEmails ?? []) entry.emails.add(email);
    if (snapshot.percentageBp !== null) {
      entry.percentages.add(snapshot.percentageBp);
      // Each period rounds on its own: its share is what gets settled.
      entry.estimate =
        (entry.estimate ?? 0) + settlementCentavos(fee, snapshot.percentageBp);
    }
    byTeacher.set(snapshot.teacherId, entry);
  }
  return [...byTeacher.entries()]
    .map(([teacherId, entry]): TeacherSettlementRow => ({
      teacherId,
      teacherName: entry.snapshot.teacherName,
      modality: entry.snapshot.modality,
      percentagesBp: [...entry.percentages].sort((a, b) => a - b),
      activities: [...entry.activities].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
      orders: entry.orders,
      students: entry.emails.size,
      fee: pesos(entry.fee),
      estimate: entry.estimate === null ? null : pesos(entry.estimate),
    }))
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName, "es"));
}

/**
 * The admin panel and statistics. Nothing is stored: every figure is an
 * aggregation read through the owning modules' read ports, combined here.
 */
export function createInsightsService(
  deps: InsightsServiceDeps,
): InsightsUseCases {
  const { orders, workshops, clock } = deps;

  const currentPeriod = () => cordobaDateOf(clock.now()).slice(0, 7);

  async function occupancyOf(period: string) {
    const capacity = await workshops.capacity(period);
    const seats = await orders.confirmedSeats([
      ...new Set(capacity.map((row) => row.periodId)),
    ]);
    const confirmedOf = (periodId: string, turnoId: string) =>
      seats.find((s) => s.periodId === periodId && s.turnoId === turnoId)
        ?.confirmedSeats ?? 0;
    return capacity.map((row): OccupancyRow => {
      const confirmed = confirmedOf(row.periodId, row.turnoId);
      return {
        workshopId: row.workshopId,
        workshopName: row.workshopName,
        turnoId: row.turnoId,
        turnoLabel: row.turnoLabel,
        capacity: row.capacity,
        confirmed,
        free: Math.max(row.capacity - confirmed, 0),
        percent: percentOf(confirmed, row.capacity),
      };
    });
  }

  function toBeOrdered(
    materials: Awaited<ReturnType<EnrollmentInsightsReader["materials"]>>,
  ): MaterialsToOrder {
    const paid = materials.filter((row) => row.status === "paid");
    return {
      orders: paid.reduce((sum, row) => sum + row.orders, 0),
      units: paid.reduce((sum, row) => sum + row.units, 0),
    };
  }

  return {
    async panel(actor) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const now = clock.now();
      const period = currentPeriod();
      const next = nextPeriod(period);
      const { from, to } = periodBounds(period);
      const [occupancy, pending, registered, materials, published] =
        await Promise.all([
          occupancyOf(period),
          orders.pendingSummary(
            new Date(now.getTime() - PENDING_ALERT_HOURS * HOUR_MS),
          ),
          orders.income({ paidFrom: from, paidTo: to }),
          orders.materials({}),
          workshops.publishedWorkshops(next),
        ]);
      const notRequested = toBeOrdered(materials);
      const income = incomeTotals(registered);
      const view: PanelView = {
        period,
        nextPeriod: next,
        occupancy: occupancyTotals(occupancy),
        pending: { total: pending.total, older: pending.older },
        confirmedThisMonth: income.orders,
        income,
        materialsToOrder: notRequested,
        alerts: {
          pendingOverdue: pending.older,
          withoutOpenPeriod: published
            .filter((row) => row.periodStatus !== "open")
            .map(({ workshopId, name }) => ({ workshopId, name })),
          materialsNotRequested: notRequested,
        },
      };
      return ok(view);
    },

    async statistics(actor, query) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const period = query.period ?? currentPeriod();
      if (!isPeriod(period)) return invalidPeriod();
      const [occupancy, counts, registered, participation, materials] =
        await Promise.all([
          occupancyOf(period),
          orders.ordersByStatus({ period }),
          orders.income({ period }),
          orders.participation(period),
          orders.materials({ period }),
        ]);

      const countsByWorkshop = new Map<
        string,
        { name: string; counts: Partial<Record<OrderStatus, number>> }
      >();
      for (const row of counts) {
        const entry = countsByWorkshop.get(row.workshopId) ?? {
          name: row.workshopName,
          counts: {},
        };
        entry.counts[row.status] = (entry.counts[row.status] ?? 0) + row.orders;
        countsByWorkshop.set(row.workshopId, entry);
      }
      const conversionRows = [...countsByWorkshop.entries()]
        .map(([workshopId, entry]): ConversionRow => ({
          workshopId,
          workshopName: entry.name,
          ...conversionOf(entry.counts),
        }))
        .sort(byName);
      const overall: Partial<Record<OrderStatus, number>> = {};
      for (const row of counts)
        overall[row.status] = (overall[row.status] ?? 0) + row.orders;

      const incomeRows = registered
        .map((row): IncomeStatRow => ({
          workshopId: row.workshopId,
          workshopName: row.workshopName,
          ...incomeTotals([row]),
        }))
        .sort(byName);

      const view: StatisticsView = {
        period,
        occupancy: { rows: occupancy, totals: occupancyTotals(occupancy) },
        conversion: { rows: conversionRows, totals: conversionOf(overall) },
        income: { rows: incomeRows, totals: incomeTotals(registered) },
        students: {
          ...participation,
          percent: percentOf(participation.recurring, participation.students),
        },
        materials: materials
          .map((row) => ({
            status: row.status,
            workshopId: row.workshopId,
            workshopName: row.workshopName,
            materialName: row.materialName,
            supplierName: row.supplierName,
            orders: row.orders,
            units: row.units,
            amount: pesos(row.amountCentavos),
          }))
          .sort(
            (a, b) =>
              (STATUS_ORDER.get(a.status) ?? 0) -
                (STATUS_ORDER.get(b.status) ?? 0) ||
              byName(a, b) ||
              a.materialName.localeCompare(b.materialName, "es"),
          ),
      };
      return ok(view);
    },

    async settlements(actor, query) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const period = query.period ?? currentPeriod();
      if (!isPeriod(period)) return invalidPeriod();
      const [snapshots, registrations] = await Promise.all([
        workshops.periodTeachers(period),
        orders.periodRegistrations(period),
      ]);
      const rows = settlementRows(snapshots, registrations);
      const view: SettlementsView = {
        period,
        rows,
        totals: {
          fee: pesos(rows.reduce((sum, row) => sum + row.fee.toCentavos(), 0)),
          estimate: pesos(
            rows.reduce(
              (sum, row) => sum + (row.estimate?.toCentavos() ?? 0),
              0,
            ),
          ),
        },
      };
      return ok(view);
    },
  };
}

/** Every call fails closed as unavailable once the actor is authorized. */
export function createUnavailableInsightsService(): InsightsUseCases {
  const fail = (actor: MaybeActor) => {
    const authorized = requireAdminActor(actor);
    return Promise.resolve(
      authorized.ok ? err({ kind: "unavailable" as const }) : authorized,
    );
  };
  return { panel: fail, statistics: fail, settlements: fail };
}
