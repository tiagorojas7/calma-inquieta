import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { adminMicrocopy } from "./microcopy";

export interface WorkshopPeriodRow {
  readonly id: string;
  readonly period: string;
  readonly status: keyof typeof copy.statuses;
  readonly fee: string;
  readonly totalCapacity: number;
}

const copy = adminMicrocopy.workshops.periods;

/** Presentational period list with structural data props. */
export function WorkshopPeriodsList({
  workshopName,
  workshopHref,
  rows,
}: {
  workshopName: string;
  workshopHref: string;
  rows: readonly WorkshopPeriodRow[];
}) {
  const columns: readonly DataTableColumn<WorkshopPeriodRow>[] = [
    { key: "period", header: copy.columns.month, cell: (row) => row.period },
    {
      key: "status",
      header: copy.columns.status,
      cell: (row) => copy.statuses[row.status],
    },
    { key: "fee", header: copy.columns.fee, cell: (row) => row.fee },
    {
      key: "capacity",
      header: copy.columns.capacity,
      cell: (row) => String(row.totalCapacity),
    },
  ];
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title(workshopName)}</Heading>
        <AdminButtonLink href={workshopHref} variant="outline">
          {copy.back}
        </AdminButtonLink>
      </div>
      <DataTable
        caption={copy.listLabel}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={{
          ...copy.empty,
          action: { href: workshopHref, label: copy.back },
        }}
      />
    </section>
  );
}
