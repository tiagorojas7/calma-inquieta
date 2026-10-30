import { AdminButton as Button } from "./admin-button";
import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { ConfirmedSubmit } from "./confirmed-submit";
import {
  CheckboxField,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

export type WorkshopFormField =
  | "name"
  | "slug"
  | "summary"
  | "description"
  | "technique"
  | "defaultFee"
  | "teacherId"
  | "percentage";

export interface WorkshopTeacherOption {
  readonly id: string;
  readonly name: string;
  readonly modality: "own" | "third_party";
}

const copy = adminMicrocopy.workshops;

/**
 * Create and edit fields. A native `<form method="post">`, never a router
 * `Form` or fetcher: the Worker gate denies `/admin/**.data`, so the submit
 * must be a document request. `noValidate` leaves validation to the service,
 * whose messages are the ones the admin sees. The slug confirmation only
 * shows for a published workshop, whose public address depends on it.
 */
export function WorkshopForm({
  values,
  errors,
  formError,
  teachers,
  published,
  cancelHref,
}: {
  values: Readonly<Record<WorkshopFormField, string>>;
  errors: Readonly<Partial<Record<WorkshopFormField, string>>>;
  formError?: string | undefined;
  teachers: readonly WorkshopTeacherOption[];
  published: boolean;
  cancelHref: string;
}) {
  const teacherOptions = [
    { value: "", label: copy.form.teacherPlaceholder },
    ...teachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} (${adminMicrocopy.teachers.modality[teacher.modality]})`,
    })),
  ];
  return (
    <form method="post" noValidate className="flex max-w-prose flex-col gap-4">
      <input type="hidden" name="intent" value="save" />
      <FormError message={formError} />
      <TextField
        label={copy.form.name}
        name="name"
        defaultValue={values.name}
        error={errors.name}
        autoComplete="off"
      />
      <TextField
        label={copy.form.slug}
        hint={copy.form.slugHint}
        name="slug"
        defaultValue={values.slug}
        error={errors.slug}
        autoComplete="off"
      />
      {published && (
        <CheckboxField
          label={copy.form.confirmSlugChange}
          name="confirmSlugChange"
        />
      )}
      <TextField
        label={copy.form.summary}
        hint={copy.form.summaryHint}
        name="summary"
        defaultValue={values.summary}
        error={errors.summary}
      />
      <TextAreaField
        label={copy.form.description}
        name="description"
        rows={6}
        defaultValue={values.description}
        error={errors.description}
      />
      <TextField
        label={copy.form.technique}
        name="technique"
        defaultValue={values.technique}
        error={errors.technique}
      />
      <TextField
        label={copy.form.defaultFee}
        hint={copy.form.defaultFeeHint}
        name="defaultFee"
        inputMode="numeric"
        defaultValue={values.defaultFee}
        error={errors.defaultFee}
      />
      <SelectField
        label={copy.form.teacher}
        name="teacherId"
        options={teacherOptions}
        defaultValue={values.teacherId}
        error={errors.teacherId}
      />
      <TextField
        label={copy.form.percentage}
        hint={copy.form.percentageHint}
        name="percentage"
        inputMode="decimal"
        defaultValue={values.percentage}
        error={errors.percentage}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{copy.form.save}</Button>
        <AdminButtonLink href={cancelHref} variant="outline">
          {copy.form.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}

function PlainSubmit({ intent, label }: { intent: string; label: string }) {
  return (
    <form method="post">
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit" variant="outline">
        {label}
      </Button>
    </form>
  );
}

/**
 * Status, active turnos and the lifecycle actions allowed from the current
 * status. Each action is its own native post form; the ones that hide or
 * delete ask for confirmation first.
 */
export function WorkshopStatePanel({
  status,
  activeTurnos,
  error,
}: {
  status: AdminStatus;
  activeTurnos: number;
  error: string | undefined;
}) {
  const state = copy.state;
  return (
    <section className="flex max-w-prose flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-ink-900">{state.status}</span>
        <StatusBadge status={status} />
        <Text tone="muted">{state.turnos(activeTurnos)}</Text>
      </div>
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        {status === "draft" && (
          <PlainSubmit intent="publish" label={state.publish} />
        )}
        {status === "paused" && (
          <PlainSubmit intent="publish" label={state.resume} />
        )}
        {status === "archived" && (
          <PlainSubmit intent="restore" label={state.restore} />
        )}
        {status === "published" && (
          <ConfirmedSubmit
            intent="pause"
            label={state.pause}
            {...state.confirm.pause}
          />
        )}
        {status !== "archived" && (
          <ConfirmedSubmit
            intent="archive"
            label={state.archive}
            {...state.confirm.archive}
          />
        )}
        {status === "draft" && (
          <ConfirmedSubmit
            intent="delete"
            label={state.delete}
            tone="destructive"
            {...state.confirm.delete}
          />
        )}
      </div>
    </section>
  );
}
