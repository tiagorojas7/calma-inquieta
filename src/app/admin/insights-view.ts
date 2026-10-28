import { monthLabel, ORDER_STATUS_LABELS } from "~/app/enrollment/order-labels";
import type { AdminPanelSummary } from "~/app/ui/admin/admin-landing";
import type {
  StatisticsRow,
  StatisticsScreenProps,
} from "~/app/ui/admin/statistics-screen";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { formatPesos } from "~/modules/enrollments";
import type { PanelView, StatisticsView } from "~/modules/insights";

const TOTAL = adminMicrocopy.statistics.total;
const percent = (value: number) => `${String(value)} %`;
const text = (value: number) => String(value);

/** The panel figures as the landing shows them: month names and pesos. */
export function toPanelSummary(view: PanelView): AdminPanelSummary {
  return {
    period: view.period,
    monthLabel: monthLabel(view.period),
    nextMonthLabel: monthLabel(view.nextPeriod),
    occupancy: view.occupancy,
    pending: view.pending,
    confirmedThisMonth: view.confirmedThisMonth,
    income: {
      total: formatPesos(view.income.total),
      fee: formatPesos(view.income.fee),
      materials: formatPesos(view.income.materials),
    },
    materialsToOrder: view.materialsToOrder,
    alerts: { withoutOpenPeriod: view.alerts.withoutOpenPeriod },
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

/** Every statistics table formatted as text, ready for the screen. */
export function toStatisticsScreen(
  view: StatisticsView,
): StatisticsScreenProps {
  const occupancy = view.occupancy.totals;
  const conversion = view.conversion.totals;
  const income = view.income.totals;
  return {
    period: view.period,
    periodLabel: monthLabel(view.period),
    occupancy: withTotal(
      view.occupancy.rows.map((row) => ({
        key: `${row.workshopId}-${row.turnoId}`,
        cells: [
          row.workshopName,
          row.turnoLabel,
          text(row.capacity),
          text(row.confirmed),
          text(row.free),
          percent(row.percent),
        ],
      })),
      [
        TOTAL,
        "",
        text(occupancy.capacity),
        text(occupancy.confirmed),
        text(occupancy.free),
        percent(occupancy.percent),
      ],
    ),
    conversion: withTotal(
      view.conversion.rows.map((row) => ({
        key: row.workshopId,
        cells: [
          row.workshopName,
          text(row.received),
          text(row.pending),
          text(row.confirmed),
          text(row.cancelled),
          percent(row.percent),
        ],
      })),
      [
        TOTAL,
        text(conversion.received),
        text(conversion.pending),
        text(conversion.confirmed),
        text(conversion.cancelled),
        percent(conversion.percent),
      ],
    ),
    income: withTotal(
      view.income.rows.map((row) => ({
        key: row.workshopId,
        cells: [
          row.workshopName,
          text(row.orders),
          formatPesos(row.fee),
          formatPesos(row.materials),
          formatPesos(row.total),
        ],
      })),
      [
        TOTAL,
        text(income.orders),
        formatPesos(income.fee),
        formatPesos(income.materials),
        formatPesos(income.total),
      ],
    ),
    students: [
      text(view.students.students),
      text(view.students.recurring),
      percent(view.students.percent),
    ],
    materials: view.materials.map((row, index) => ({
      key: `${String(index)}-${row.status}-${row.workshopId}-${row.materialName}`,
      cells: [
        ORDER_STATUS_LABELS[row.status],
        row.workshopName,
        row.materialName,
        row.supplierName,
        text(row.orders),
        text(row.units),
        formatPesos(row.amount),
      ],
    })),
  };
}
