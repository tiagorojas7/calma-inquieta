import { monthLabel } from "~/app/enrollment/order-labels";
import type {
  AdminPanelSummary,
  TodayTask,
} from "~/app/ui/admin/admin-landing";
import type { TeacherSettlementSummary } from "~/app/ui/admin/teacher-settlement";
import type {
  StatisticsRow,
  StatisticsScreenProps,
} from "~/app/ui/admin/statistics-screen";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { Money } from "~/modules/_shared";
import { formatPesos } from "~/modules/enrollments";
import {
  nextPeriod,
  previousPeriod,
  type EarningsView,
  type PanelView,
  type SettlementsView,
  type TeacherSettlementRow,
} from "~/modules/insights";

const NO_PERCENTAGE = adminMicrocopy.statistics.teachers.noPercentage;
const MODALITY = adminMicrocopy.teachers.modality;
const stats = adminMicrocopy.statistics;
const today = adminMicrocopy.landing.tasks;
const text = (value: number) => String(value);
const percent = (value: number) => `${String(value)} %`;

/** Basis points as an es-AR percentage: 3050 is "30,5 %". */
function percentageOf(percentagesBp: readonly number[]): string {
  return percentagesBp.length === 0
    ? NO_PERCENTAGE
    : percentagesBp
        .map((bp) => `${String(bp / 100).replace(".", ",")} %`)
        .join(", ");
}

/** "A", "A y B" or "A, B y C": the suppliers a task names. */
function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1] ?? ""}`;
}

/** The sum of some amounts, formatted as pesos. */
function pesosOf(amounts: readonly Money[]): string {
  const sum = Money.fromCentavos(
    amounts.reduce((total, amount) => total + amount.toCentavos(), 0),
  );
  return sum.ok ? formatPesos(sum.value) : "";
}

export interface TodayExtras {
  /** Private-event enquiries nobody answered yet. */
  readonly privateEventsUnanswered: number;
  /** Open months nobody can book because they hold no active turno. */
  readonly emptyMonths?: readonly {
    readonly periodId: string;
    readonly workshopId: string;
    readonly workshopName: string;
    readonly month: string;
  }[];
}

/**
 * The home: what is due today as ordered actions, each with one button, and
 * the month's four figures. A task only exists while it has something to do.
 */
export function toPanelSummary(
  view: PanelView,
  extras: TodayExtras = { privateEventsUnanswered: 0 },
): AdminPanelSummary {
  const tasks: TodayTask[] = [];
  if (view.pending.total > 0)
    tasks.push({
      key: "charge",
      text: today.charge.text(view.pending.total),
      action: today.charge.action,
      hint: today.charge.hint,
      href: "/admin/inscripciones?estado=pending_confirmation",
    });
  if (view.today.suppliersToOrder.length > 0)
    tasks.push({
      key: "order",
      text: today.orderMaterials.text(listOf(view.today.suppliersToOrder)),
      action: today.orderMaterials.action,
      hint: today.orderMaterials.hint,
      href: "/admin/inscripciones/materiales",
    });
  if (view.today.ordersToDeliver > 0)
    tasks.push({
      key: "deliver",
      text: today.deliver.text(view.today.ordersToDeliver),
      action: today.deliver.action,
      hint: today.deliver.hint,
      href: "/admin/inscripciones/materiales?seccion=entregar",
    });
  const next = monthLabel(view.nextPeriod);
  for (const workshop of view.alerts.withoutOpenPeriod)
    tasks.push({
      key: `open-${workshop.workshopId}`,
      text: today.openMonth.text(next, workshop.name),
      action: today.openMonth.action(next),
      hint: today.openMonth.hint(workshop.name),
      href: "/admin/talleres",
    });
  for (const empty of extras.emptyMonths ?? [])
    tasks.push({
      key: `empty-${empty.periodId}`,
      text: today.emptyMonth.text(empty.month, empty.workshopName),
      action: today.emptyMonth.action,
      hint: today.emptyMonth.hint(empty.workshopName),
      href: `/admin/talleres/${empty.workshopId}`,
    });
  if (view.today.pendingIntensiveRequests > 0)
    tasks.push({
      key: "intensive",
      text: today.intensiveDeposit.text(view.today.pendingIntensiveRequests),
      action: today.intensiveDeposit.action,
      hint: today.intensiveDeposit.hint,
      href: "/admin/intensivos",
    });
  if (extras.privateEventsUnanswered > 0)
    tasks.push({
      key: "event",
      text: today.privateEvent.text(extras.privateEventsUnanswered),
      action: today.privateEvent.action,
      hint: today.privateEvent.hint,
      href: "/admin/eventos",
    });
  return {
    period: view.period,
    monthLabel: monthLabel(view.period),
    tasks,
    figures: {
      collected: formatPesos(view.month.collected),
      profit: formatPesos(view.month.profit),
      teachers: formatPesos(view.month.teacherPay),
      occupancy: percent(view.month.occupancyPercent),
      occupancyDetail: adminMicrocopy.landing.figures.occupancyDetail(
        view.month.enrolled,
        view.month.capacity,
      ),
    },
  };
}

/** Rows plus a closing totals row; an empty table stays empty. */
function withTotal(
  rows: readonly StatisticsRow[],
  total: readonly string[],
): readonly StatisticsRow[] {
  return rows.length === 0
    ? rows
    : [...rows, { key: "total", cells: total, total: true }];
}

/** "Ana · de terceros", or nothing for an activity without a teacher. */
function teacherCell(
  name: string | null,
  modality: "own" | "third_party" | null,
): string {
  if (name === null) return "";
  return modality === null
    ? name
    : `${name} · ${stats.activities.modality[modality]}`;
}

/** The statistics screen: the month's figures and every table as text. */
export function toStatisticsScreen(
  view: EarningsView,
): Omit<StatisticsScreenProps, "materialsRecord" | "materialsRecordHref"> {
  const { totals } = view;
  const base = "/admin/estadisticas";
  const figures = stats.figures;
  return {
    period: view.period,
    periodLabel: monthLabel(view.period),
    previousHref: `${base}?mes=${previousPeriod(view.period)}`,
    nextHref: `${base}?mes=${nextPeriod(view.period)}`,
    downloadHref: `${base}/planilla?mes=${view.period}`,
    figures: [
      {
        key: "collected",
        label: figures.collected,
        value: formatPesos(totals.collected),
        detail: figures.collectedDetail,
      },
      {
        key: "teachers",
        label: figures.teachers,
        value: formatPesos(totals.teacherPay),
      },
      {
        key: "materials",
        label: figures.materials,
        value: formatPesos(totals.materialsCost),
      },
      {
        key: "profit",
        label: figures.profit,
        value: formatPesos(totals.profit),
        detail: figures.profitDetail,
        highlight: true,
      },
      {
        key: "students",
        label: figures.students,
        value: text(view.students.students),
      },
      {
        key: "occupancy",
        label: figures.occupancy,
        value: percent(totals.occupancyPercent),
        detail: figures.occupancyDetail(totals.enrolled, totals.capacity),
      },
    ],
    activities: withTotal(
      view.activities.map((row) => ({
        key: `${row.kind}-${row.id}`,
        cells: [
          row.kind === "intensivo"
            ? `${row.name} (${stats.activities.intensive})`
            : row.name,
          text(row.enrolled),
          text(row.capacity),
          formatPesos(row.collected),
          teacherCell(row.teacherName, row.teacherModality),
          row.teacherModality === "third_party"
            ? formatPesos(row.teacherPay)
            : stats.notSettled,
          formatPesos(row.materialsCost),
          formatPesos(row.profit),
        ],
      })),
      [
        stats.total,
        text(totals.enrolled),
        text(totals.capacity),
        formatPesos(totals.collected),
        "",
        formatPesos(totals.teacherPay),
        formatPesos(totals.materialsCost),
        formatPesos(totals.profit),
      ],
    ),
    teachers: view.teachers.map((row) => ({
      key: row.teacherId,
      cells: [
        row.teacherName,
        stats.activities.modality[row.modality],
        row.activities.join(", "),
        row.toSettle === null ? stats.notSettled : formatPesos(row.toSettle),
      ],
    })),
    materials: withTotal(
      view.suppliers.map((row) => ({
        key: row.supplierId,
        cells: [
          row.supplierName,
          text(row.orders),
          text(row.units),
          formatPesos(row.charged),
          formatPesos(row.cost),
        ],
      })),
      [
        stats.total,
        text(view.suppliers.reduce((sum, row) => sum + row.orders, 0)),
        text(view.suppliers.reduce((sum, row) => sum + row.units, 0)),
        pesosOf(view.suppliers.map((row) => row.charged)),
        pesosOf(view.suppliers.map((row) => row.cost)),
      ],
    ),
    materialsNote: view.materialsAtCost ? stats.materials.atCost : null,
    students: [
      {
        key: "new",
        cells: [
          stats.students.newOnes,
          text(view.students.students - view.students.recurring),
        ],
      },
      {
        key: "returning",
        cells: [stats.students.returning, text(view.students.recurring)],
      },
    ],
  };
}

export function toTeacherSettlement(
  view: SettlementsView,
  teacherId: string,
): TeacherSettlementSummary {
  const base = { period: view.period, periodLabel: monthLabel(view.period) };
  const row: TeacherSettlementRow | undefined = view.rows.find(
    (candidate) => candidate.teacherId === teacherId,
  );
  if (row === undefined) return { ...base, responsible: false };
  return {
    ...base,
    responsible: true,
    modality: MODALITY[row.modality],
    percentage: percentageOf(row.percentagesBp),
    activities: row.activities.join(", "),
    students: text(row.students),
    income: formatPesos(row.fee),
    estimate: row.estimate === null ? null : formatPesos(row.estimate),
  };
}
