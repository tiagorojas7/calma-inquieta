import { AdminButton as Button } from "./admin-button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { ConfirmedSubmit } from "./confirmed-submit";
import { AdminCardList } from "./admin-sections";
import { FormError, SelectField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

export interface TurnoRow {
  readonly id: string;
  readonly label: string;
  readonly day: string;
  readonly range: string;
  readonly capacity: number;
  readonly active: boolean;
  readonly usedByPeriods: boolean;
}

export type TurnoFormField =
  "label" | "weekday" | "timeRange" | "defaultCapacity";

export interface TurnoFormValues {
  readonly label: string;
  readonly weekday: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly defaultCapacity: string;
}

const copy = adminMicrocopy.workshops.turnos;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function RowSubmit({
  intent,
  turnoId,
  label,
  name,
}: {
  intent: string;
  turnoId: string;
  label: string;
  name: string;
}) {
  return (
    <form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="turnoId" value={turnoId} />
      <Button type="submit" variant="success" aria-label={name}>
        {label}
      </Button>
    </form>
  );
}

function TurnoCard({ row, turnosHref }: { row: TurnoRow; turnosHref: string }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-semibold text-ink-900">{row.label}</p>
        <span className="text-sm text-ink-700">
          {row.active ? adminMicrocopy.status.active : copy.retired}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm text-ink-700">
        <div>
          <dt className="font-semibold">{copy.columns.day}</dt>
          <dd>{row.day}</dd>
        </div>
        <div>
          <dt className="font-semibold">{copy.columns.range}</dt>
          <dd>{row.range}</dd>
        </div>
        <div>
          <dt className="font-semibold">{copy.columns.capacity}</dt>
          <dd>{String(row.capacity)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`${turnosHref}?editar=${row.id}`}
          aria-label={copy.rowName(copy.edit, row.label)}
          className={linkClasses}
        >
          {copy.edit}
        </a>
        {row.active ? (
          <ConfirmedSubmit
            intent="retire"
            label={copy.retire}
            buttonName={copy.rowName(copy.retire, row.label)}
            fields={{ turnoId: row.id }}
            title="¿Retirar el turno?"
            message="Dejará de estar disponible para los meses nuevos."
          />
        ) : (
          <RowSubmit
            intent="reactivate"
            turnoId={row.id}
            label={copy.reactivate}
            name={copy.rowName(copy.reactivate, row.label)}
          />
        )}
        {!row.usedByPeriods && (
          <ConfirmedSubmit
            intent="delete"
            label={copy.delete}
            buttonName={copy.rowName(copy.delete, row.label)}
            tone="destructive"
            fields={{ turnoId: row.id }}
            {...copy.confirmDelete}
          />
        )}
      </div>
    </>
  );
}

/**
 * Turnos of one workshop: the list, with the actions that apply to each
 * row, and the add or edit form. Everything is a plain anchor or a native
 * `<form method="post">`: the Worker gate denies `/admin/**.data`, so a router
 * link, form or fetcher would be refused.
 */
export function TurnosScreen({
  workshopName,
  workshopHref,
  turnosHref,
  turnos,
  form,
  listError,
  feedback = null,
  nextMonth = "",
}: {
  workshopName: string;
  workshopHref: string;
  turnosHref: string;
  turnos: readonly TurnoRow[];
  form: {
    turnoId: string;
    values: TurnoFormValues;
    errors: Readonly<Partial<Record<TurnoFormField, string>>>;
    formError?: string | undefined;
    weekdays: readonly { value: string; label: string }[];
  };
  listError?: string | undefined;
  feedback?: keyof typeof copy.feedback | null;
  nextMonth?: string;
}) {
  const editing = form.turnoId !== "";
  const f = copy.form;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={copy.title(workshopName)}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: adminMicrocopy.workshops.title, href: "/admin/talleres" },
          { label: workshopName, href: workshopHref },
          { label: "Turnos" },
        ]}
        back={{ href: workshopHref, label: copy.back }}
      />
      {feedback ? (
        <AdminFeedback tone="success" title={copy.feedback[feedback]}>
          {feedback === "added" && nextMonth ? (
            <a
              className="inline-flex min-h-11 items-center underline underline-offset-4"
              href={`${workshopHref}/periodos`}
            >
              {copy.nextStep(nextMonth)}
            </a>
          ) : null}
        </AdminFeedback>
      ) : null}
      <FormError message={listError} />
      <AdminCardList
        label={copy.listLabel}
        rows={turnos}
        rowKey={(row) => row.id}
        card={(row) => <TurnoCard row={row} turnosHref={turnosHref} />}
        empty={{
          ...copy.empty,
          action: { href: workshopHref, label: copy.back },
        }}
      />
      <section className="flex max-w-prose flex-col gap-4">
        <Heading level={2}>{editing ? f.editTitle : f.addTitle}</Heading>
        <form method="post" noValidate className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="save" />
          {editing && (
            <input type="hidden" name="turnoId" value={form.turnoId} />
          )}
          <FormError message={form.formError} />
          <TextField
            label={f.label}
            hint={f.labelHint}
            name="label"
            defaultValue={form.values.label}
            error={form.errors.label}
            autoComplete="off"
          />
          <SelectField
            label={f.weekday}
            name="weekday"
            options={form.weekdays}
            defaultValue={form.values.weekday}
            error={form.errors.weekday}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={f.startsAt}
              name="startsAt"
              type="time"
              defaultValue={form.values.startsAt}
              error={form.errors.timeRange}
            />
            <TextField
              label={f.endsAt}
              name="endsAt"
              type="time"
              defaultValue={form.values.endsAt}
            />
          </div>
          <TextField
            label={f.defaultCapacity}
            hint={f.defaultCapacityHint}
            name="defaultCapacity"
            inputMode="numeric"
            defaultValue={form.values.defaultCapacity}
            error={form.errors.defaultCapacity}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">{f.save}</Button>
            {editing && (
              <AdminButtonLink href={turnosHref} variant="outline">
                {f.cancelEdit}
              </AdminButtonLink>
            )}
          </div>
        </form>
      </section>
    </section>
  );
}
