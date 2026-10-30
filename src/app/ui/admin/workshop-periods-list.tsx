import { Button } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { FormError, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

export interface WorkshopPeriodRow {
  readonly id: string;
  readonly period: string;
  readonly href: string;
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
  form,
  openableNames = "",
  submitMonth = "",
}: {
  workshopName: string;
  workshopHref: string;
  rows: readonly WorkshopPeriodRow[];
  /** Spanish names of the months that can be opened, comma separated. */
  openableNames?: string;
  /** Name of the month the submit button will open, when valid. */
  submitMonth?: string;
  form: {
    period: string;
    error?: string | undefined;
    formError?: string | undefined;
  };
}) {
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={copy.title(workshopName)}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: adminMicrocopy.workshops.title, href: "/admin/talleres" },
          { label: workshopName, href: workshopHref },
          { label: "Inscripciones" },
        ]}
        back={{ href: workshopHref, label: copy.back }}
      />
      <section className="flex max-w-prose flex-col gap-4">
        <Heading level={2}>{copy.form.title}</Heading>
        <Text tone="muted">{copy.form.intro}</Text>
        <form method="post" noValidate className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="open-month" />
          <FormError message={form.formError} />
          <TextField
            label={copy.form.period}
            hint={copy.form.hint(openableNames)}
            name="period"
            defaultValue={form.period}
            error={form.error}
            autoComplete="off"
            inputMode="numeric"
          />
          <Button type="submit">{copy.form.submit(submitMonth)}</Button>
        </form>
      </section>
      <AdminCardList
        label={copy.listLabel}
        rows={rows}
        rowKey={(row) => row.id}
        card={(row) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={row.href}
                className="inline-flex min-h-11 items-center text-lg font-semibold text-clay-800 underline underline-offset-4"
              >
                {row.period}
              </a>
              <span className="text-sm text-ink-700">
                {copy.statuses[row.status]}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm text-ink-700">
              <div>
                <dt className="font-semibold">{copy.columns.fee}</dt>
                <dd>{row.fee}</dd>
              </div>
              <div>
                <dt className="font-semibold">{copy.columns.capacity}</dt>
                <dd>{String(row.totalCapacity)}</dd>
              </div>
            </dl>
          </>
        )}
        empty={{
          ...copy.empty,
          action: { href: workshopHref, label: copy.back },
        }}
      />
    </section>
  );
}
