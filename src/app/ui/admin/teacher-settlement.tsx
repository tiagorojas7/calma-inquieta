import { Heading, Text } from "../atoms/heading";
import { TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.teachers.settlement;

/** One teacher's block on her detail screen; `responsible: false` when idle. */
export type TeacherSettlementSummary =
  | {
      readonly period: string;
      readonly periodLabel: string;
      readonly responsible: false;
    }
  | {
      readonly period: string;
      readonly periodLabel: string;
      readonly responsible: true;
      readonly modality: string;
      readonly percentage: string;
      readonly activities: string;
      readonly students: string;
      readonly income: string;
      /** Null when she has no agreed percentage. */
      readonly estimate: string | null;
    };

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="font-sans text-sm text-ink-700">{label}</dt>
      <dd className="font-sans text-ink-900">{value}</dd>
    </div>
  );
}

/**
 * What the studio owes a teacher for a month, estimated from the percentage
 * her periods froze. The month filter is a GET form: the Worker refuses
 * `.data` requests under /admin.
 */
export function TeacherSettlementPanel({
  teacherId,
  settlement,
}: {
  teacherId: string;
  settlement: TeacherSettlementSummary;
}) {
  return (
    <section
      aria-labelledby="teacher-settlement"
      className="flex max-w-prose flex-col gap-3"
    >
      <Heading level={2} size="h3" id="teacher-settlement">
        {copy.title}
      </Heading>
      <Text tone="muted">{copy.intro(settlement.periodLabel)}</Text>
      <form
        role="search"
        method="get"
        action={`/admin/profesores/${teacherId}`}
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          label={copy.month}
          name="mes"
          type="month"
          defaultValue={settlement.period}
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
        >
          {copy.apply}
        </button>
      </form>
      {settlement.responsible ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Figure label={copy.modality} value={settlement.modality} />
            <Figure label={copy.percentage} value={settlement.percentage} />
            <Figure label={copy.activities} value={settlement.activities} />
            <Figure label={copy.students} value={settlement.students} />
            <Figure label={copy.income} value={settlement.income} />
            <Figure
              label={copy.estimate}
              value={settlement.estimate ?? copy.noPercentage}
            />
          </dl>
          {settlement.estimate === null && (
            <Text tone="muted">{copy.ownNote}</Text>
          )}
        </>
      ) : (
        <Text>{copy.none}</Text>
      )}
    </section>
  );
}
