import { Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { ADMIN_SHEET, AdminFieldPair } from "./admin-sections";
import { FormError, SelectField, TextField } from "./form-fields";

type EnrollmentNewFormField = "offer" | "fullName" | "email" | "phone";

export const enrollmentNewCopy = {
  title: "Nueva inscripción",
  back: "Volver a inscripciones",
  offer: "Taller, mes y turno",
  offerPlaceholder: "Elegí una opción",
  offerHint: "Solo talleres con inscripciones abiertas.",
  fullName: "Nombre completo",
  email: "Email",
  phone: "Teléfono",
  submit: "Crear inscripción",
  cancel: "Cancelar",
  noOffers: "No hay talleres con inscripciones abiertas.",
  noOffersHint: "Abrí un mes en un taller para poder inscribir alumnas.",
  saveFailed: "Revisá los campos marcados e intentá de nuevo.",
} as const;

const copy = enrollmentNewCopy;

/**
 * Hand-made monthly enrollment. A native `<form method="post">`, never a router
 * `Form` or fetcher: the Worker gate denies `/admin/**.data`, so the submit
 * must be a document request. Materials are chosen in person, so none here.
 */
export function EnrollmentNewForm({
  values,
  errors,
  formError,
  options,
  cancelHref,
}: {
  values: Readonly<Record<EnrollmentNewFormField, string>>;
  errors: Readonly<Partial<Record<EnrollmentNewFormField, string>>>;
  formError?: string | undefined;
  options: readonly { value: string; label: string }[];
  cancelHref: string;
}) {
  if (options.length === 0) {
    return (
      <section className={ADMIN_SHEET}>
        <p
          role="status"
          className="rounded-md bg-sand-200 p-3 font-semibold text-ink-900"
        >
          {copy.noOffers}
        </p>
        <Text tone="muted">{copy.noOffersHint}</Text>
        <div>
          <AdminButtonLink href={cancelHref} variant="outline">
            {copy.back}
          </AdminButtonLink>
        </div>
      </section>
    );
  }
  return (
    <form method="post" noValidate className={ADMIN_SHEET}>
      <FormError message={formError} />
      <SelectField
        label={copy.offer}
        hint={copy.offerHint}
        name="offer"
        required
        options={[{ value: "", label: copy.offerPlaceholder }, ...options]}
        defaultValue={values.offer}
        error={errors.offer}
      />
      <TextField
        label={copy.fullName}
        name="fullName"
        required
        autoComplete="off"
        defaultValue={values.fullName}
        error={errors.fullName}
      />
      <AdminFieldPair>
        <TextField
          label={copy.email}
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="off"
          defaultValue={values.email}
          error={errors.email}
        />
        <TextField
          label={copy.phone}
          name="phone"
          type="tel"
          required
          autoComplete="off"
          defaultValue={values.phone}
          error={errors.phone}
        />
      </AdminFieldPair>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{copy.submit}</Button>
        <AdminButtonLink href={cancelHref} variant="outline">
          {copy.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}
