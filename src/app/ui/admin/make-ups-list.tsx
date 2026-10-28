import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.attendance.makeUps;

export interface MakeUpRow {
  readonly id: string;
  readonly student: string;
  readonly email: string;
  readonly absence: string;
  readonly makeUp: string;
  /** Who completed it and when; `null` while it is pending. */
  readonly doneNote: string | null;
}

export interface MakeUpsListProps {
  readonly pending: readonly MakeUpRow[];
  readonly done: readonly MakeUpRow[];
}

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

const baseColumns: readonly DataTableColumn<MakeUpRow>[] = [
  {
    key: "student",
    header: copy.columns.student,
    cell: (row) => (
      <a
        href={`/admin/alumnas/${encodeURIComponent(row.email)}`}
        className={linkClasses}
      >
        {row.student}
      </a>
    ),
  },
  { key: "absence", header: copy.columns.absence, cell: (row) => row.absence },
  { key: "makeUp", header: copy.columns.makeUp, cell: (row) => row.makeUp },
];

const pendingColumns: readonly DataTableColumn<MakeUpRow>[] = [
  ...baseColumns,
  {
    key: "action",
    header: copy.columns.action,
    cell: (row) => (
      <form method="post" aria-label={copy.markDoneFor(row.student)}>
        <input type="hidden" name="intent" value="complete" />
        <input type="hidden" name="id" value={row.id} />
        <Button type="submit" variant="outline">
          {copy.markDone}
        </Button>
      </form>
    ),
  },
];

const doneColumns: readonly DataTableColumn<MakeUpRow>[] = [
  ...baseColumns,
  {
    key: "status",
    header: copy.columns.status,
    cell: (row) => row.doneNote ?? "",
  },
];

const empty = (title: string) => ({
  title,
  message: copy.empty.message,
  action: { href: "/admin/asistencia", label: copy.empty.action },
});

/** Pending and done make-up classes; completing one is a plain native post. */
export function MakeUpsList({ pending, done }: MakeUpsListProps) {
  return (
    <section className="flex flex-col gap-6">
      <Heading level={1}>{copy.title}</Heading>
      <div>
        <AdminButtonLink variant="outline" href="/admin/asistencia">
          {copy.back}
        </AdminButtonLink>
      </div>
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.pendingTitle}</Heading>
        <DataTable
          caption={copy.pendingTitle}
          columns={pendingColumns}
          rows={pending}
          rowKey={(row) => row.id}
          empty={empty(copy.emptyPending)}
        />
      </section>
      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.doneTitle}</Heading>
        <DataTable
          caption={copy.doneTitle}
          columns={doneColumns}
          rows={done}
          rowKey={(row) => row.id}
          empty={empty(copy.emptyDone)}
        />
      </section>
    </section>
  );
}
