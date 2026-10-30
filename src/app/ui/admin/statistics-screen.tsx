import type { ReactNode } from "react";
import { Heading, Text } from "../atoms/heading";
import { AdminPageHeader } from "./admin-page";
import { TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { ResponsiveList } from "./responsive-list";

/** One table row already formatted as text, in the order of its columns. */
export interface StatisticsRow {
  readonly key: string;
  readonly cells: readonly string[];
  /** The totals row, shown in bold. */
  readonly total?: boolean;
}

export interface StatisticsScreenProps {
  readonly period: string;
  readonly periodLabel: string;
  readonly occupancy: readonly StatisticsRow[];
  readonly conversion: readonly StatisticsRow[];
  readonly income: readonly StatisticsRow[];
  readonly students: readonly string[];
  readonly teachers: readonly StatisticsRow[];
  readonly materials: readonly StatisticsRow[];
}

const copy = adminMicrocopy.statistics;

function Block({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <Heading level={2} size="h3">
        {title}
      </Heading>
      <Text tone="muted">{intro}</Text>
      {children}
    </section>
  );
}

function StatsTable({
  title,
  headers,
  rows,
  titled = true,
}: {
  title: string;
  headers: readonly string[];
  rows: readonly StatisticsRow[];
  /** Whether the first cell names the card (a workshop, a teacher...). */
  titled?: boolean;
}) {
  const first = titled ? 1 : 0;
  const columns = headers.map((header, index) => ({
    key: header,
    header,
    cell: (row: StatisticsRow) => {
      const value = row.cells[index] ?? "";
      return row.total === true ? <strong>{value}</strong> : value;
    },
  }));
  return (
    <ResponsiveList
      label={title}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.key}
      card={(row) => (
        <>
          {titled ? (
            <p className="text-lg font-semibold text-ink-900">{row.cells[0]}</p>
          ) : null}
          <dl
            className={`grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-ink-700 ${row.total === true ? "font-semibold" : ""}`}
          >
            {headers.slice(first).map((header, index) => {
              const value = row.cells[index + first] ?? "";
              return value === "" ? null : (
                <div key={header}>
                  <dt className="font-semibold">{header}</dt>
                  <dd>{value}</dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
      empty={{
        title: copy.empty.title,
        message: copy.empty.message,
        action: { href: "/admin/inscripciones", label: copy.empty.action },
      }}
    />
  );
}

/**
 * Per-month statistics as cards below lg and tables from lg: occupancy, conversion, income,
 * students and materials. The month filter is a GET form and every link a
 * plain anchor, because the Worker gate refuses `.data` requests.
 */
export function StatisticsScreen(props: StatisticsScreenProps) {
  const { occupancy, conversion, income, students, teachers, materials } = copy;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={copy.title}
        description={copy.subtitle(props.periodLabel)}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
        back={{ href: "/admin", label: copy.backToPanel }}
      />
      <form
        role="search"
        method="get"
        action="/admin/estadisticas"
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          label={copy.month}
          name="mes"
          type="month"
          defaultValue={props.period}
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
        >
          {copy.apply}
        </button>
      </form>
      <Block title={occupancy.title} intro={occupancy.intro}>
        <StatsTable
          title={occupancy.title}
          headers={Object.values(occupancy.columns)}
          rows={props.occupancy}
        />
      </Block>
      <Block title={conversion.title} intro={conversion.intro}>
        <StatsTable
          title={conversion.title}
          headers={Object.values(conversion.columns)}
          rows={props.conversion}
        />
      </Block>
      <Block title={income.title} intro={income.intro}>
        <StatsTable
          title={income.title}
          headers={Object.values(income.columns)}
          rows={props.income}
        />
      </Block>
      <Block title={students.title} intro={students.intro}>
        <StatsTable
          title={students.title}
          headers={Object.values(students.columns)}
          rows={[{ key: "students", cells: props.students }]}
          titled={false}
        />
        <Text tone="muted">{students.note}</Text>
      </Block>
      <Block title={teachers.title} intro={teachers.intro}>
        <StatsTable
          title={teachers.title}
          headers={Object.values(teachers.columns)}
          rows={props.teachers}
        />
        <Text tone="muted">{teachers.note}</Text>
      </Block>
      <Block title={materials.title} intro={materials.intro}>
        <StatsTable
          title={materials.title}
          headers={Object.values(materials.columns)}
          rows={props.materials}
        />
      </Block>
    </section>
  );
}
