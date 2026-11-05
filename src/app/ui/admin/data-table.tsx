import type { ReactNode } from "react";
import { AdminEmptyState } from "./empty-state";

export interface DataTableColumn<Row> {
  readonly key: string;
  readonly header: string;
  /** Numbers read better flush right, like a spreadsheet. */
  readonly align?: "right";
  readonly cell: (row: Row) => ReactNode;
}

/**
 * Admin list table. It scrolls inside its own labelled region so a wide table
 * never makes the page scroll sideways at 360 px; with no rows it shows the
 * empty state instead.
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  rowClassName,
  empty,
}: {
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** Sets one row apart, such as a totals row. */
  rowClassName?: ((row: Row) => string) | undefined;
  empty: {
    title: string;
    message: string;
    action: {
      href: string;
      label: string;
      variant?: "success" | "primary" | "secondary";
    };
  };
}) {
  if (rows.length === 0) return <AdminEmptyState {...empty} />;
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-md bg-surface shadow-card"
    >
      <table className="w-full text-left text-base text-ink-700">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sand-100 text-ink-900">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-4 py-3 font-semibold ${column.align === "right" ? "text-right" : ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={`border-t border-sand-200 ${rowClassName?.(row) ?? ""}`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 ${column.align === "right" ? "text-right tabular-nums" : ""}`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
