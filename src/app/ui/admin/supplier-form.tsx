import { AdminButton as Button } from "./admin-button";
import { Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { AdminDangerZone } from "./admin-sections";
import { ConfirmedSubmit } from "./confirmed-submit";
import { FormError, TextAreaField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

type SupplierFormField = "name" | "phone" | "email" | "notes";

const copy = adminMicrocopy.suppliers;

/**
 * Create and edit fields. A native `<form method="post">`, never a router
 * `Form` or fetcher: the Worker gate denies `/admin/**.data`, so the submit
 * must be a document request. `noValidate` leaves validation to the service,
 * whose messages are the ones the admin sees.
 */
export function SupplierForm({
  values,
  errors,
  formError,
  submitLabel,
  cancelHref,
}: {
  values: Readonly<Record<SupplierFormField, string>>;
  errors: Readonly<Partial<Record<SupplierFormField, string>>>;
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
      <TextAreaField
        label={copy.form.notes}
        hint={copy.form.notesHint}
        name="notes"
        rows={4}
        defaultValue={values.notes}
        error={errors.notes}
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
 * Archived suppliers: why it is unavailable and the one way back. Archiving
 * never removes the supplier from materials that already point to it, so
 * active suppliers are archived from `SupplierArchiveZone`.
 */
export function SupplierStatePanel({ error }: { error: string | undefined }) {
  const state = copy.state;
  return (
    <section className="flex max-w-prose flex-col gap-3">
      <Text>{state.archivedNotice}</Text>
      <Text tone="muted">{state.archivedHint}</Text>
      <FormError message={error} />
      <form method="post">
        <input type="hidden" name="intent" value="reactivate" />
        <Button type="submit" variant="success">
          {state.reactivate}
        </Button>
      </form>
    </section>
  );
}

/** Archiving asks first and lives apart from the save button. */
export function SupplierArchiveZone({ error }: { error: string | undefined }) {
  const state = copy.state;
  return (
    <AdminDangerZone title={state.dangerTitle}>
      <FormError message={error} />
      <ConfirmedSubmit
        intent="archive"
        variant="danger"
        label={state.archive}
        title={state.archiveTitle}
        message={state.archiveMessage}
        tone="destructive"
      />
    </AdminDangerZone>
  );
}
