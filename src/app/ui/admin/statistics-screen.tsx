import type { ReactNode } from "react";
import { Heading, Text } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import {
  ADMIN_TONE_FILL,
  ADMIN_TONE_TEXT,
  type AdminTone,
} from "./admin-tones";
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

/** A big figure of the month's summary row. */
export interface StatisticsFigure {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  /** The figure the owners look for first. */
  readonly highlight?: boolean;
  readonly tone?: AdminTone;
}

export interface StatisticsScreenProps {
  readonly period: string;
  readonly periodLabel: string;
  readonly previousHref: string;
  readonly nextHref: string;
  readonly downloadHref: string;
  readonly figures: readonly StatisticsFigure[];
  /** The main table: one row per taller and intensivo, then the totals. */
  readonly activities: readonly StatisticsRow[];
  readonly teachers: readonly StatisticsRow[];
  readonly materials: readonly StatisticsRow[];
  /** The one line saying materials are charged at cost, when it applies. */
  readonly materialsNote: string | null;
  readonly students: readonly StatisticsRow[];
  /** One row per material ordered in the month, then the totals. */
  readonly materialsRecord: readonly StatisticsRow[];
  readonly materialsRecordHref: string;
}

const copy = adminMicrocopy.statistics;

const empty = {
  title: copy.empty.title,
  message: copy.empty.message,
  action: { href: "/admin/inscripciones", label: copy.empty.action },
};

/** What a money column holds; a profit column also reads heavier. */
type ColumnTone = "income" | "expense" | "profit";

/**
 * The colour of one amount. A zero or a dash moved no money, so it stays plain,
 * and a negative amount always reads as money out.
 */
function amountClasses(value: string, tone: ColumnTone | undefined): string {
  if (tone === undefined || !/[1-9]/.test(value)) return "";
  const out = tone === "expense" || value.includes("-");
  const colour = ADMIN_TONE_TEXT[out ? "expense" : "income"];
  return tone === "profit" ? `${colour} font-semibold` : colour;
}

function figureClasses(figure: StatisticsFigure): string {
  const surface =
    figure.highlight === true && figure.tone !== undefined
      ? ADMIN_TONE_FILL[figure.tone]
      : "bg-surface";
  const width = figure.tone === "people" ? "lg:col-span-2" : "";
  return `flex flex-col gap-1 rounded-md p-5 shadow-card ${surface} ${width}`;
}

/** Every column but the first holds a number, except the ones named here. */
function StatsTable({
  title,
  headers,
  rows,
  textColumns = [],
  tones = {},
}: {
  title: string;
  headers: readonly string[];
  rows: readonly StatisticsRow[];
  /** Indexes of the columns that hold words, so they stay left aligned. */
  textColumns?: readonly number[];
  /** The money columns, by index. */
  tones?: Readonly<Record<number, ColumnTone>>;
}) {
  const columns = headers.map((header, index) => ({
    key: header,
    header,
    ...(index === 0 || textColumns.includes(index)
      ? {}
      : { align: "right" as const }),
    cell: (row: StatisticsRow) => {
      const value = row.cells[index] ?? "";
      const classes =
        index === 0
          ? "font-semibold text-ink-900"
          : amountClasses(value, tones[index]);
      return row.total === true ? (
        <strong className={classes}>{value}</strong>
      ) : (
        <span className={classes}>{value}</span>
      );
    },
  }));
  return (
    <ResponsiveList
      label={title}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.key}
      rowClassName={(row) =>
        row.total === true ? "bg-sand-100 text-ink-900" : ""
      }
      card={(row) => (
        <>
          <p className="text-lg font-semibold text-ink-900">{row.cells[0]}</p>
          <dl
            className={`grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-ink-700 ${row.total === true ? "font-semibold" : ""}`}
          >
            {headers.slice(1).map((header, index) => {
              const value = row.cells[index + 1] ?? "";
              return value === "" ? null : (
                <div key={header}>
                  <dt className="font-semibold">{header}</dt>
                  <dd className={amountClasses(value, tones[index + 1])}>
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
      empty={empty}
    />
  );
}

/** A section's title with its subtitle, and its download on the same row. */
function SectionHead({
  title,
  intro,
  action,
}: {
  title: string;
  intro: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Heading level={2}>{title}</Heading>
        <Text tone="muted">{intro}</Text>
      </div>
      {action}
    </div>
  );
}

/** A smaller table, closed until the owner opens it. */
function Collapsible({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-md bg-surface p-4 shadow-card">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-display text-2xl font-semibold text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800">
        <Icon
          name="chevron-right"
          size={20}
          aria-hidden="true"
          className="text-clay-800 transition-transform duration-200 ease-calm group-open:rotate-90"
        />
        {title}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <Text tone="muted">{intro}</Text>
        {children}
      </div>
    </details>
  );
}

const arrowClasses =
  "inline-flex min-h-11 items-center rounded-md border-2 border-clay-800 bg-surface px-4 py-3 font-semibold text-clay-800 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * The statistics that replace the owners' spreadsheets: a month selector, the
 * summary figures, one main table per taller and intensivo, and smaller
 * closed tables. Cards below lg and tables from lg. The month filter is a GET
 * form and every link a plain anchor, because the Worker gate refuses `.data`
 * requests.
 */
export function StatisticsScreen(props: StatisticsScreenProps) {
  const { activities, teachers, materials, students, record } = copy;
  const hasRecord = props.materialsRecord.length > 0;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={copy.title}
        description={copy.subtitle(props.periodLabel)}
        back={{ href: "/admin", label: copy.backToPanel }}
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <a href={props.previousHref} className={arrowClasses}>
              <span aria-hidden="true">←&nbsp;</span>
              {copy.previous}
            </a>
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
                className="inline-flex min-h-11 items-center rounded-md bg-clay-800 px-6 py-3 font-sans font-semibold text-white hover:bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
              >
                {copy.apply}
              </button>
            </form>
            <a href={props.nextHref} className={arrowClasses}>
              {copy.next}
              <span aria-hidden="true">&nbsp;→</span>
            </a>
          </div>
        }
      />
      <ul
        aria-label={props.periodLabel}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {props.figures.map((figure) => (
          <li key={figure.key} className={figureClasses(figure)}>
            <p className="font-semibold text-ink-900">{figure.label}</p>
            <p
              className={`font-display text-h2 font-semibold lining-nums ${figure.tone === undefined ? "text-ink-900" : ADMIN_TONE_TEXT[figure.tone]}`}
            >
              {figure.value}
            </p>
            {figure.detail ? (
              <p className="text-sm text-ink-700">{figure.detail}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3">
        <SectionHead
          title={activities.title}
          intro={activities.intro}
          action={
            <AdminButtonLink href={props.downloadHref} variant="secondary">
              {copy.download}
            </AdminButtonLink>
          }
        />
        <StatsTable
          title={activities.title}
          headers={Object.values(activities.columns)}
          rows={props.activities}
          textColumns={[4]}
          tones={{ 3: "income", 5: "expense", 6: "expense", 7: "profit" }}
        />
      </section>
      <section id="registro-materiales" className="flex flex-col gap-3">
        <SectionHead
          title={record.title}
          intro={hasRecord ? record.intro : record.empty}
          action={
            hasRecord ? (
              <AdminButtonLink
                href={props.materialsRecordHref}
                variant="secondary"
              >
                {record.download}
              </AdminButtonLink>
            ) : null
          }
        />
        {hasRecord ? (
          <StatsTable
            title={record.title}
            headers={Object.values(record.columns)}
            rows={props.materialsRecord}
            textColumns={[1, 2, 4, 6]}
            tones={{ 5: "expense" }}
          />
        ) : null}
      </section>
      <div className="flex flex-col gap-3">
        <Collapsible title={teachers.title} intro={teachers.intro}>
          <StatsTable
            title={teachers.title}
            headers={Object.values(teachers.columns)}
            rows={props.teachers}
            textColumns={[1, 2]}
            tones={{ 3: "expense" }}
          />
        </Collapsible>
        <Collapsible title={materials.title} intro={materials.intro}>
          {props.materialsNote ? <Text>{props.materialsNote}</Text> : null}
          <StatsTable
            title={materials.title}
            headers={Object.values(materials.columns)}
            rows={props.materials}
            tones={{ 3: "income", 4: "expense" }}
          />
        </Collapsible>
        <Collapsible title={students.title} intro={students.intro}>
          <StatsTable
            title={students.title}
            headers={Object.values(students.columns)}
            rows={props.students}
          />
        </Collapsible>
      </div>
    </section>
  );
}
