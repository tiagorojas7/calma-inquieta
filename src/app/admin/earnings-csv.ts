import type { Money } from "~/modules/_shared";
import type { EarningsView } from "~/modules/insights";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";

const copy = adminMicrocopy.statistics;
const BOM = "﻿";
const SEPARATOR = ";";
const NEWLINE = "\r\n";

/** Whole pesos as a plain number; a comma marks cents, as es-AR Excel reads. */
export function pesos(amount: Money): string {
  const centavos = amount.toCentavos();
  return centavos % 100 === 0
    ? String(centavos / 100)
    : (centavos / 100).toFixed(2).replace(".", ",");
}

/** Quotes what Excel would split, and defuses a leading formula character. */
function field(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function teacher(
  name: string | null,
  modality: "own" | "third_party" | null,
): string {
  if (name === null) return "";
  return modality === null
    ? name
    : `${name} (${copy.activities.modality[modality]})`;
}

/**
 * The main statistics table plus its totals row as a CSV Excel opens with
 * accents intact: UTF-8 with a byte order mark, `;` separated, CRLF lines and
 * numbers with no thousands separator. The profit column is the same figure
 * the screen shows; money is whole pesos.
 */
export function earningsCsv(view: EarningsView): string {
  const columns = copy.activities.columns;
  const header = [
    columns.name,
    columns.enrolled,
    columns.capacity,
    columns.collected,
    columns.teacher,
    columns.teacherPay,
    columns.materials,
    columns.profit,
  ];
  const { totals } = view;
  const rows = [
    header,
    ...view.activities.map((row) => [
      row.kind === "intensivo"
        ? `${row.name} (${copy.activities.intensive})`
        : row.name,
      String(row.enrolled),
      String(row.capacity),
      pesos(row.collected),
      teacher(row.teacherName, row.teacherModality),
      pesos(row.teacherPay),
      pesos(row.materialsCost),
      pesos(row.profit),
    ]),
    [
      copy.total,
      String(totals.enrolled),
      String(totals.capacity),
      pesos(totals.collected),
      "",
      pesos(totals.teacherPay),
      pesos(totals.materialsCost),
      pesos(totals.profit),
    ],
  ];
  return csvDocument(rows);
}

/** Rows as a CSV Excel opens with accents intact (see `earningsCsv`). */
export function csvDocument(rows: readonly (readonly string[])[]): string {
  return (
    BOM +
    rows.map((row) => row.map(field).join(SEPARATOR)).join(NEWLINE) +
    NEWLINE
  );
}
