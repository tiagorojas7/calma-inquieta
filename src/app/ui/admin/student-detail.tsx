import type { ReactNode } from "react";
import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { TextAreaField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { OrderStatusBadge } from "./order-status-badge";

export interface StudentActivityRow {
  readonly workshop: string;
  readonly month: string;
  readonly turno: string;
  readonly status: string;
  readonly statusLabel: string;
}

export interface StudentOrderRow {
  readonly id: string;
  readonly number: string;
  readonly workshop: string;
  readonly month: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly total: string;
  readonly paidOn: string | null;
}

export interface StudentDetailProps {
  readonly student: {
    readonly name: string;
    readonly email: string;
    readonly phone: string;
    readonly activities: readonly StudentActivityRow[];
    readonly orders: readonly StudentOrderRow[];
    readonly note: { readonly text: string; readonly meta: string | null };
  };
  readonly form?: {
    readonly error?: string | undefined;
    readonly value?: string | undefined;
  };
}

const copy = adminMicrocopy.students.detail;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-semibold text-ink-900">{label}</dt>
      <dd className="text-ink-700">{children}</dd>
    </div>
  );
}

const activityColumns: readonly DataTableColumn<StudentActivityRow>[] = [
  {
    key: "workshop",
    header: copy.activities.columns.workshop,
    cell: (r) => r.workshop,
  },
  { key: "month", header: copy.activities.columns.month, cell: (r) => r.month },
  { key: "turno", header: copy.activities.columns.turno, cell: (r) => r.turno },
  {
    key: "status",
    header: copy.activities.columns.status,
    cell: (r) => <OrderStatusBadge status={r.status} label={r.statusLabel} />,
  },
];

const orderColumns: readonly DataTableColumn<StudentOrderRow>[] = [
  {
    key: "number",
    header: copy.orders.columns.number,
    cell: (row) => (
      <a href={`/admin/inscripciones/${row.id}`} className={linkClasses}>
        {row.number}
      </a>
    ),
  },
  {
    key: "workshop",
    header: copy.orders.columns.workshop,
    cell: (r) => r.workshop,
  },
  { key: "month", header: copy.orders.columns.month, cell: (r) => r.month },
  {
    key: "status",
    header: copy.orders.columns.status,
    cell: (r) => <OrderStatusBadge status={r.status} label={r.statusLabel} />,
  },
  { key: "total", header: copy.orders.columns.total, cell: (r) => r.total },
  {
    key: "paidOn",
    header: copy.orders.columns.paidOn,
    cell: (r) => r.paidOn ?? copy.orders.unpaid,
  },
];

/** One student: data, activities, order and payment history, and the owner's notes. */
export function StudentDetail({ student, form }: StudentDetailProps) {
  return (
    <section className="flex flex-col gap-6">
      <Heading level={1}>{student.name}</Heading>
      <div>
        <AdminButtonLink variant="outline" href="/admin/alumnas">
          {copy.back}
        </AdminButtonLink>
      </div>

      <dl aria-label={copy.personal} className="grid gap-4 md:grid-cols-3">
        <Fact label={copy.name}>{student.name}</Fact>
        <Fact label={copy.email}>{student.email}</Fact>
        <Fact label={copy.phone}>{student.phone}</Fact>
      </dl>

      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.activities.title}</Heading>
        {student.activities.length === 0 ? (
          <p>{copy.activities.empty}</p>
        ) : (
          <DataTable
            caption={copy.activities.title}
            columns={activityColumns}
            rows={student.activities}
            rowKey={(row) =>
              `${row.workshop}|${row.month}|${row.turno}|${row.status}`
            }
            empty={{
              title: copy.activities.empty,
              message: "",
              action: { href: "/admin/alumnas", label: copy.back },
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.orders.title}</Heading>
        <DataTable
          caption={copy.orders.title}
          columns={orderColumns}
          rows={student.orders}
          rowKey={(row) => row.id}
          empty={{
            title: copy.orders.title,
            message: "",
            action: {
              href: "/admin/inscripciones",
              label: copy.orders.emptyAction,
            },
          }}
        />
      </section>

      <form
        method="post"
        aria-label={copy.notes.title}
        className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
      >
        <Heading level={2} size="h3">
          {copy.notes.title}
        </Heading>
        <TextAreaField
          label={copy.notes.label}
          hint={copy.notes.hint}
          name="note"
          rows={6}
          maxLength={2000}
          defaultValue={form?.value ?? student.note.text}
          error={form?.error}
        />
        {student.note.meta ? (
          <p className="text-sm text-ink-600">{student.note.meta}</p>
        ) : null}
        <div>
          <Button type="submit">{copy.notes.save}</Button>
        </div>
      </form>
    </section>
  );
}
