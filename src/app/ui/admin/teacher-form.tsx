import { Button } from "../atoms/button";
import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import {
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-fields";
import { adminMicrocopy } from "./microcopy";

type TeacherFormField = "name" | "bioLine" | "phone" | "email" | "modality";

const copy = adminMicrocopy.teachers;

const MODALITY_OPTIONS = [
  { value: "", label: copy.form.modalityPlaceholder },
  { value: "own", label: copy.modality.own },
  { value: "third_party", label: copy.modality.third_party },
] as const;

/**
 * Create and edit fields. A native `<form method="post">`, never a router
 * `Form` or fetcher: the Worker gate denies `/admin/**.data`, so the submit
 * must be a document request. `noValidate` leaves validation to the service,
 * whose messages are the ones the admin sees.
 */
export function TeacherForm({
  values,
  errors,
  formError,
  submitLabel,
  cancelHref,
}: {
  values: Readonly<Record<TeacherFormField, string>>;
  errors: Readonly<Partial<Record<TeacherFormField, string>>>;
  formError?: string | undefined;
  submitLabel: string;
  cancelHref: string;
}) {
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
      <TextAreaField
        label={copy.form.bioLine}
        hint={copy.form.bioLineHint}
        name="bioLine"
        rows={2}
        defaultValue={values.bioLine}
        error={errors.bioLine}
      />
      <TextField
        label={copy.form.phone}
        name="phone"
        type="tel"
        defaultValue={values.phone}
        error={errors.phone}
      />
      <TextField
        label={copy.form.email}
        name="email"
        type="email"
        defaultValue={values.email}
        error={errors.email}
      />
      <SelectField
        label={copy.form.modality}
        name="modality"
        options={MODALITY_OPTIONS}
        defaultValue={values.modality}
        error={errors.modality}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{submitLabel}</Button>
        <AdminButtonLink href={cancelHref} variant="outline">
          {copy.form.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}

/**
 * Archive or reactivate, as its own post form. For an archived teacher it
 * names the activities that still keep her, because archiving never removes
 * existing assignments or period snapshots.
 */
export function TeacherStatePanel({
  active,
  assignedTo,
  error,
}: {
  active: boolean;
  assignedTo: readonly string[];
  error: string | undefined;
}) {
  const state = copy.state;
  return (
    <section className="flex max-w-prose flex-col gap-3">
      {!active && (
        <>
          <Text>{state.archivedNotice}</Text>
          <Text tone="muted">{state.archivedHint}</Text>
          {assignedTo.length > 0 && (
            <p
              role="status"
              className="rounded-md bg-sand-200 p-3 font-semibold text-ink-900"
            >
              {state.assignedWarning(assignedTo.join(", "))}
            </p>
          )}
        </>
      )}
      <FormError message={error} />
      <form method="post">
        <input
          type="hidden"
          name="intent"
          value={active ? "archive" : "reactivate"}
        />
        <Button type="submit" variant="outline">
          {active ? state.archive : state.reactivate}
        </Button>
      </form>
    </section>
  );
}
