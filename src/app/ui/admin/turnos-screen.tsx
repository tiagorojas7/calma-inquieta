import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { ConfirmedSubmit } from "./confirmed-submit";
import { DataTable, type DataTableColumn } from "./data-table";
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
      <Button type="submit" variant="outline" aria-label={name}>
        {label}
      </Button>
    </form>
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
}) {
  const columns: readonly DataTableColumn<TurnoRow>[] = [
    { key: "label", header: copy.columns.label, cell: (row) => row.label },
    { key: "day", header: copy.columns.day, cell: (row) => row.day },
    { key: "range", header: copy.columns.range, cell: (row) => row.range },
    {
      key: "capacity",
      header: copy.columns.capacity,
      cell: (row) => String(row.capacity),
    },
    {
      key: "state",
      header: copy.columns.state,
      cell: (row) => (row.active ? adminMicrocopy.status.active : copy.retired),
    },
    {
      key: "actions",
      header: copy.columns.actions,
      cell: (row) => (
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
      ),
    },
  ];
  const editing = form.turnoId !== "";
  const f = copy.form;
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>{copy.title(workshopName)}</Heading>
        <AdminButtonLink href={workshopHref} variant="outline">
          {copy.back}
        </AdminButtonLink>
      </div>
      <FormError message={listError} />
      <DataTable
        caption={copy.listLabel}
        columns={columns}
        rows={turnos}
        rowKey={(row) => row.id}
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
