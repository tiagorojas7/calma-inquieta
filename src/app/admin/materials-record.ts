import type { StatisticsRow } from "~/app/ui/admin/statistics-screen";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { Money } from "~/modules/_shared";
import { formatPesos, type DeliveryOrder } from "~/modules/enrollments";
import { csvDocument, pesos } from "./earnings-csv";

const copy = adminMicrocopy.statistics.record;

interface RecordLine {
  readonly key: string;
  readonly studentName: string;
  readonly activity: string;
  readonly material: string;
  readonly quantity: number;
  readonly supplierName: string;
  readonly amount: Money;
  readonly status: DeliveryOrder["status"];
}

/** Code-point order, so the rows never depend on the runtime's locale data. */
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** One line per material of each order, by supplier, then student and material. */
function recordLines(orders: readonly DeliveryOrder[]): RecordLine[] {
  return orders
    .flatMap((order) =>
      order.lines.map((line, index): RecordLine => ({
        key: `${order.id}-${String(index)}`,
        studentName: order.studentName,
        activity: `${order.workshopName} · ${order.turnoLabel}`,
        material: `${line.materialName} ${line.variantLabel}`,
        quantity: line.quantity,
        supplierName: line.supplierName,
        amount: line.unitPrice.multiply(line.quantity),
        status: order.status,
      })),
    )
    .sort(
      (a, b) =>
        byText(a.supplierName, b.supplierName) ||
        byText(a.studentName, b.studentName) ||
        byText(a.material, b.material),
    );
}

function totals(lines: readonly RecordLine[]) {
  return {
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    amount: lines.reduce((sum, line) => sum.add(line.amount), Money.zero()),
  };
}

/** The month's materials record as statistics rows, closed by a totals row. */
export function toMaterialsRecord(
  orders: readonly DeliveryOrder[],
): readonly StatisticsRow[] {
  const lines = recordLines(orders);
  if (lines.length === 0) return [];
  const sum = totals(lines);
  return [
    ...lines.map((line) => ({
      key: line.key,
      cells: [
        line.studentName,
        line.activity,
        line.material,
        String(line.quantity),
        line.supplierName,
        formatPesos(line.amount),
        copy.status[line.status],
      ],
    })),
    {
      key: "total",
      cells: [
        adminMicrocopy.statistics.total,
        "",
        "",
        String(sum.quantity),
        "",
        formatPesos(sum.amount),
        "",
      ],
      total: true,
    },
  ];
}

/** The same record as a CSV Excel opens, money in whole pesos. */
export function materialsRecordCsv(orders: readonly DeliveryOrder[]): string {
  const lines = recordLines(orders);
  const sum = totals(lines);
  return csvDocument([
    Object.values(copy.columns),
    ...lines.map((line) => [
      line.studentName,
      line.activity,
      line.material,
      String(line.quantity),
      line.supplierName,
      pesos(line.amount),
      copy.status[line.status],
    ]),
    [
      adminMicrocopy.statistics.total,
      "",
      "",
      String(sum.quantity),
      "",
      pesos(sum.amount),
      "",
    ],
  ]);
}
