import { useState } from "react";
import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { DataTable, type DataTableColumn } from "./data-table";
import { SelectField, TextAreaField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

export interface ReminderRecipientRow {
  readonly key: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
  /** A `wa.me` link, or null when she has no valid phone. */
  readonly link: string | null;
}

export interface RemindersFormValues {
  readonly mensaje: string;
  readonly cuando: string;
  readonly actividad: string;
  readonly texto: string;
  readonly taller: string;
  readonly mes: string;
  readonly turno: string;
  readonly estado: string;
}

export interface RemindersScreenProps {
  readonly values: RemindersFormValues;
  readonly kinds: readonly { value: string; label: string }[];
  readonly workshops: readonly { id: string; name: string }[];
  readonly periods: readonly { value: string; label: string }[];
  readonly turnos: readonly string[];
  readonly statuses: readonly { value: string; label: string }[];
  readonly errors: {
    readonly cuando?: string | undefined;
    readonly actividad?: string | undefined;
    readonly texto?: string | undefined;
  };
  readonly result: {
    readonly preview: string;
    readonly recipients: readonly ReminderRecipientRow[];
  } | null;
}

const copy = adminMicrocopy.reminders;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * Prepared WhatsApp reminders. The form is a plain GET form and every link a
 * plain anchor: the Worker gate refuses the `.data` requests a client
 * navigation would make. Nothing is sent from here; the owner opens each link.
 */
export function RemindersScreen({
  values,
  kinds,
  workshops,
  periods,
  turnos,
  statuses,
  errors,
  result,
}: RemindersScreenProps) {
  const [copied, setCopied] = useState(false);
  const columns: readonly DataTableColumn<ReminderRecipientRow>[] = [
    { key: "student", header: copy.columns.student, cell: (row) => row.name },
    { key: "message", header: copy.columns.message, cell: (r) => r.message },
    {
      key: "actions",
      header: copy.columns.actions,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-3">
          {row.link === null ? (
            <span>{copy.noPhone}</span>
          ) : (
            <a
              href={row.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.send(row.name)}
              className={linkClasses}
            >
              {copy.sendLabel}
            </a>
          )}
          <Button
            type="button"
            variant="outline"
            aria-label={copy.copyFor(row.name)}
            onClick={() => {
              void navigator.clipboard.writeText(row.message).then(() => {
                setCopied(true);
              });
            }}
          >
            {copy.copy}
          </Button>
        </div>
      ),
    },
  ];
  const withoutPhone =
    result?.recipients.filter((r) => r.link === null).length ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.title}</Heading>
      <p className="text-ink-700">{copy.intro}</p>
      <form
        role="search"
        method="get"
        action="/admin/recordatorios"
        aria-label={copy.formLabel}
        className="grid gap-3 md:grid-cols-2"
      >
        <SelectField
          label={copy.fields.message}
          name="mensaje"
          defaultValue={values.mensaje}
          options={kinds}
        />
        <TextField
          label={copy.fields.when}
          hint={copy.fields.whenHint}
          name="cuando"
          defaultValue={values.cuando}
          error={errors.cuando}
        />
        <TextField
          label={copy.fields.activity}
          hint={copy.fields.activityHint}
          name="actividad"
          defaultValue={values.actividad}
          error={errors.actividad}
        />
        <TextAreaField
          label={copy.fields.text}
          hint={copy.fields.textHint}
          name="texto"
          defaultValue={values.texto}
          error={errors.texto}
        />
        <SelectField
          label={copy.audience.workshop}
          name="taller"
          defaultValue={values.taller}
          options={[
            { value: "", label: copy.audience.anyWorkshop },
            ...workshops.map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
        <SelectField
          label={copy.audience.period}
          name="mes"
          defaultValue={values.mes}
          options={[{ value: "", label: copy.audience.anyPeriod }, ...periods]}
        />
        <SelectField
          label={copy.audience.turno}
          name="turno"
          defaultValue={values.turno}
          options={[
            { value: "", label: copy.audience.anyTurno },
            ...turnos.map((turno) => ({ value: turno, label: turno })),
          ]}
        />
        <SelectField
          label={copy.audience.status}
          hint={copy.audience.statusHint}
          name="estado"
          defaultValue={values.estado}
          options={[{ value: "", label: copy.audience.anyStatus }, ...statuses]}
        />
        <div>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
          >
            {copy.submit}
          </button>
        </div>
      </form>
      {result === null ? null : (
        <>
          <div className="flex flex-col gap-1 rounded-md bg-surface p-4 shadow-card">
            <Heading level={2}>{copy.preview}</Heading>
            <p className="text-ink-700">{result.preview}</p>
          </div>
          <p>{copy.count(result.recipients.length, withoutPhone)}</p>
          <DataTable
            caption={copy.title}
            columns={columns}
            rows={result.recipients}
            rowKey={(row) => row.key}
            empty={{
              title: copy.empty.title,
              message: copy.empty.message,
              action: {
                href: "/admin/recordatorios",
                label: copy.empty.action,
              },
            }}
          />
          <p role="status" className="text-sm text-ink-600">
            {copied ? copy.copied : ""}
          </p>
        </>
      )}
    </section>
  );
}
