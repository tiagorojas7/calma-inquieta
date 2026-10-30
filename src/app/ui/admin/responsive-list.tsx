import type { ReactNode } from "react";
import { AdminCardList } from "./admin-sections";
import { DataTable, type DataTableColumn } from "./data-table";
import { AdminEmptyState } from "./empty-state";

/**
 * Long admin lists: cards below the `lg` breakpoint, a real table from `lg`.
 * Each copy sits in a wrapper that is display-none outside its own breakpoint,
 * so only the visible one is in the accessibility tree. With no rows the empty
 * state renders once.
 */
export function ResponsiveList<Row>({
  label,
  columns,
  rows,
  rowKey,
  card,
  empty,
}: {
  label: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  card: (row: Row) => ReactNode;
  empty: {
    title: string;
    message: string;
    action: { href: string; label: string };
  };
}) {
  if (rows.length === 0) return <AdminEmptyState {...empty} />;
  return (
    <>
      <div className="lg:hidden">
        <AdminCardList
          label={label}
          rows={rows}
          rowKey={rowKey}
          card={card}
          empty={empty}
        />
      </div>
      <div className="hidden lg:block">
        <DataTable
          caption={label}
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          empty={empty}
        />
      </div>
    </>
  );
}
