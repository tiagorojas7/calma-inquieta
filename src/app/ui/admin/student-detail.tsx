import type { ReactNode } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading, Text } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
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
    readonly attendance?:
      | {
          readonly present: string;
          readonly absent: string;
          readonly makeUpsPending: string;
          readonly makeUpsDone: string;
        }
      | null
      | undefined;
  };
  readonly feedback?:
    keyof typeof adminMicrocopy.students.detail.feedback | null | undefined;
  readonly form?: {
    readonly error?: string | undefined;
    readonly value?: string | undefined;
  };
}

const copy = adminMicrocopy.students.detail;
const attendanceCopy = adminMicrocopy.attendance.summary;

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

/** One student: data, activities, order and payment history, and the owner's notes. */
export function StudentDetail({
  student,
  form,
  feedback = null,
}: StudentDetailProps) {
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={student.name}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: adminMicrocopy.students.title, href: "/admin/alumnas" },
          { label: student.name },
        ]}
        back={{ href: "/admin/alumnas", label: copy.back }}
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback]} />
      ) : null}

      <dl aria-label={copy.personal} className="grid gap-4 md:grid-cols-3">
        <Fact label={copy.name}>{student.name}</Fact>
        <Fact label={copy.email}>{student.email}</Fact>
        <Fact label={copy.phone}>{student.phone}</Fact>
      </dl>

      <section
        aria-label={copy.activities.title}
        className="flex flex-col gap-3"
      >
        <Heading level={2}>{copy.activities.title}</Heading>
        <AdminCardList
          label={copy.activities.title}
          rows={student.activities}
          rowKey={(row) =>
            `${row.workshop}|${row.month}|${row.turno}|${row.status}`
          }
          card={(row) => (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink-900">
                  {row.workshop}
                </span>
                <OrderStatusBadge status={row.status} label={row.statusLabel} />
              </div>
              <Text tone="muted">{row.month}</Text>
              <Text tone="muted">{row.turno}</Text>
            </>
          )}
          empty={{
            title: copy.activities.empty,
            message: "",
            action: { href: "/admin/alumnas", label: copy.back },
          }}
        />
      </section>

      <section aria-label={copy.orders.title} className="flex flex-col gap-3">
        <Heading level={2}>{copy.orders.title}</Heading>
        <AdminCardList
          label={copy.orders.title}
          rows={student.orders}
          rowKey={(row) => row.id}
          card={(row) => (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`/admin/inscripciones/${row.id}`}
                  className={linkClasses}
                >
                  {row.number}
                </a>
                <OrderStatusBadge status={row.status} label={row.statusLabel} />
              </div>
              <Text tone="muted">
                {row.workshop} - {row.month}
              </Text>
              <p className="text-ink-900">{row.total}</p>
              <Text tone="muted">{row.paidOn ?? copy.orders.unpaid}</Text>
            </>
          )}
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

      {student.attendance ? (
        <section
          aria-label={attendanceCopy.title}
          className="flex flex-col gap-3"
        >
          <Heading level={2}>{attendanceCopy.title}</Heading>
          <dl className="grid gap-4 md:grid-cols-4">
            <Fact label={attendanceCopy.present}>
              {student.attendance.present}
            </Fact>
            <Fact label={attendanceCopy.absent}>
              {student.attendance.absent}
            </Fact>
            <Fact label={attendanceCopy.makeUpsPending}>
              {student.attendance.makeUpsPending}
            </Fact>
            <Fact label={attendanceCopy.makeUpsDone}>
              {student.attendance.makeUpsDone}
            </Fact>
          </dl>
        </section>
      ) : null}

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
