import { Button } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { SelectField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.attendance;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

export interface AttendanceTurnoRow {
  readonly key: string;
  readonly href: string;
  readonly workshop: string;
  readonly turno: string;
  readonly schedule: string;
  readonly sessions: number;
}

export interface AttendanceIndexProps {
  readonly filter: { readonly mes: string; readonly taller: string };
  readonly months: readonly { value: string; label: string }[];
  readonly workshops: readonly { value: string; label: string }[];
  readonly rows: readonly AttendanceTurnoRow[];
}

const turnoColumns: readonly DataTableColumn<AttendanceTurnoRow>[] = [
  {
    key: "workshop",
    header: copy.columns.workshop,
    cell: (row) => (
      <a href={row.href} className={linkClasses}>
        {row.workshop}
      </a>
    ),
  },
  { key: "turno", header: copy.columns.turno, cell: (row) => row.turno },
  {
    key: "schedule",
    header: copy.columns.schedule,
    cell: (row) => row.schedule,
  },
  {
    key: "sessions",
    header: copy.columns.sessions,
    cell: (row) => String(row.sessions),
  },
];

/**
 * Month, workshop and turno chooser. The filter is a plain GET form and every
 * link a plain anchor: the Worker gate refuses the `.data` requests a client
 * navigation would make.
 */
export function AttendanceIndex({
  filter,
  months,
  workshops,
  rows,
}: AttendanceIndexProps) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.title}</Heading>
      <div>
        <AdminButtonLink
          variant="outline"
          href="/admin/asistencia/recuperaciones"
        >
          {copy.makeUpsLink}
        </AdminButtonLink>
      </div>
      <form
        role="search"
        method="get"
        action="/admin/asistencia"
        aria-label={copy.filterLabel}
        className="grid gap-3 md:grid-cols-2"
      >
        <SelectField
          label={copy.filters.month}
          name="mes"
          defaultValue={filter.mes}
          options={months}
        />
        <SelectField
          label={copy.filters.workshop}
          name="taller"
          defaultValue={filter.taller}
          options={[
            { value: "", label: copy.filters.anyWorkshop },
            ...workshops,
          ]}
        />
        <div>
          <Button type="submit">{copy.filters.apply}</Button>
        </div>
      </form>
      <DataTable
        caption={copy.title}
        columns={turnoColumns}
        rows={rows}
        rowKey={(row) => row.key}
        empty={{
          title: copy.empty.title,
          message: copy.empty.message,
          action: { href: "/admin/asistencia", label: copy.empty.action },
        }}
      />
    </section>
  );
}

export interface AttendanceSessionRow {
  readonly key: string;
  readonly href: string;
  readonly date: string;
  readonly marked: string;
  readonly present: string;
  readonly absent: string;
}

export interface AttendanceSessionsProps {
  readonly heading: string;
  readonly subtitle: string;
  readonly rows: readonly AttendanceSessionRow[];
}

const sessionColumns: readonly DataTableColumn<AttendanceSessionRow>[] = [
  {
    key: "date",
    header: copy.sessions.columns.date,
    cell: (row) => (
      <a href={row.href} className={linkClasses}>
        {row.date}
      </a>
    ),
  },
  {
    key: "marked",
    header: copy.sessions.columns.marked,
    cell: (row) => row.marked,
  },
  {
    key: "present",
    header: copy.sessions.columns.present,
    cell: (row) => row.present,
  },
  {
    key: "absent",
    header: copy.sessions.columns.absent,
    cell: (row) => row.absent,
  },
];

/** The generated class dates of one turno and month. */
export function AttendanceSessions({
  heading,
  subtitle,
  rows,
}: AttendanceSessionsProps) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{heading}</Heading>
      <Text>{subtitle}</Text>
      <div>
        <AdminButtonLink variant="outline" href="/admin/asistencia">
          {copy.sessions.back}
        </AdminButtonLink>
      </div>
      <DataTable
        caption={copy.sessions.caption}
        columns={sessionColumns}
        rows={rows}
        rowKey={(row) => row.key}
        empty={{
          title: copy.sessions.empty.title,
          message: copy.sessions.empty.message,
          action: {
            href: "/admin/asistencia",
            label: copy.sessions.empty.action,
          },
        }}
      />
    </section>
  );
}
