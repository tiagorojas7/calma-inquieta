import { useState } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading, Text } from "../atoms/heading";
import { AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
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
  /** Whether the automatic emails are configured (read-only here). */
  readonly emailEnabled: boolean;
  readonly result: {
    readonly preview: string;
    readonly recipients: readonly ReminderRecipientRow[];
  } | null;
}

const copy = adminMicrocopy.reminders;

const sendClasses =
  "inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/** Which free-text fields each message kind needs. */
const needsWhen = (kind: string) => kind === "class" || kind === "intensive";
const needsActivity = (kind: string) => kind === "intensive";
const needsText = (kind: string) => kind === "notice";

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
  emailEnabled,
}: RemindersScreenProps) {
  const [copied, setCopied] = useState(false);
  const [kind, setKind] = useState(values.mensaje);
  const withoutPhone =
    result?.recipients.filter((r) => r.link === null).length ?? 0;
  const audienceChosen = Boolean(
    values.taller || values.mes || values.turno || values.estado,
  );

  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title}
        description={copy.intro}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title },
        ]}
      />
      <p className="text-ink-700">
        {emailEnabled ? copy.emailStatus.on : copy.emailStatus.off}
      </p>
      <form
        role="search"
        method="get"
        action="/admin/recordatorios"
        aria-label={copy.formLabel}
        className="flex flex-col gap-4"
      >
        <fieldset className="grid gap-3 md:grid-cols-2">
          <legend className="mb-2 font-semibold text-ink-900">
            {copy.steps.message}
          </legend>
          <SelectField
            label={copy.fields.message}
            name="mensaje"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value);
            }}
            options={kinds}
          />
          {needsWhen(kind) ? (
            <TextField
              label={copy.fields.when}
              hint={copy.fields.whenHint}
              name="cuando"
              defaultValue={values.cuando}
              error={errors.cuando}
            />
          ) : null}
          {needsActivity(kind) ? (
            <TextField
              label={copy.fields.activity}
              hint={copy.fields.activityHint}
              name="actividad"
              defaultValue={values.actividad}
              error={errors.actividad}
            />
          ) : null}
          {needsText(kind) ? (
            <TextAreaField
              label={copy.fields.text}
              hint={copy.fields.textHint}
              name="texto"
              defaultValue={values.texto}
              error={errors.texto}
            />
          ) : null}
        </fieldset>
        <details
          open={audienceChosen}
          className="rounded-md bg-surface p-4 shadow-card"
        >
          <summary className="min-h-11 cursor-pointer font-semibold text-ink-900">
            {copy.steps.audience}
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
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
              options={[
                { value: "", label: copy.audience.anyPeriod },
                ...periods,
              ]}
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
              options={[
                { value: "", label: copy.audience.anyStatus },
                ...statuses,
              ]}
            />
          </div>
        </details>
        <div>
          <button type="submit" className={sendClasses}>
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
          <AdminCardList
            label={copy.title}
            rows={result.recipients}
            rowKey={(row) => row.key}
            card={(row) => (
              <>
                <p className="font-semibold text-ink-900">{row.name}</p>
                <Text tone="muted">{row.message}</Text>
                <div className="flex flex-wrap items-center gap-3">
                  {row.link === null ? (
                    <span>{copy.noPhone}</span>
                  ) : (
                    <a
                      href={row.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={copy.send(row.name)}
                      className={sendClasses}
                    >
                      {copy.sendLabel}
                    </a>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={copy.copyFor(row.name)}
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(row.message)
                        .then(() => {
                          setCopied(true);
                        });
                    }}
                  >
                    {copy.copy}
                  </Button>
                </div>
              </>
            )}
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
