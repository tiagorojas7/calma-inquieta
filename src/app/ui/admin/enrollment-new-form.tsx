import { useState } from "react";
import { Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { ADMIN_PANEL, ADMIN_SHEET, AdminFieldPair } from "./admin-sections";
import { adminCopy } from "./copy";
import {
  EnrollmentNewMaterials,
  type EnrollmentMaterialChoice,
  type EnrollmentMaterialLine,
} from "./enrollment-new-materials";
import {
  CheckboxField,
  FormError,
  SelectField,
  TextField,
} from "./form-fields";
import { MoreOptions } from "./more-options";

type EnrollmentNewFormValueField =
  "offer" | "fullName" | "email" | "phone" | "fee";
type EnrollmentNewFormField = EnrollmentNewFormValueField | "materials";

export interface EnrollmentNewOption {
  readonly value: string;
  readonly label: string;
  /** The month's configured fee in whole pesos, e.g. `58000`. */
  readonly fee: string;
}

const copy = adminCopy.alumnas.enroll;

/**
 * Hand-made monthly enrollment in one form: workshop, month and turno, the
 * fee, her data, optional materials behind the options, and "Ya pagó". A
 * native `<form method="post">`, never a router `Form` or fetcher: the Worker
 * gate denies `/admin/**.data`, so the submit must be a document request. Each
 * chosen material is posted as a `line:<material>:<variant>` quantity.
 */
export function EnrollmentNewForm({
  values,
  errors,
  formError,
  options,
  materials = [],
  lines = [],
  paid = false,
  cancelHref,
}: {
  values: Readonly<Record<EnrollmentNewFormValueField, string>>;
  errors: Readonly<Partial<Record<EnrollmentNewFormField, string>>>;
  formError?: string | undefined;
  options: readonly EnrollmentNewOption[];
  /** Orderable catalog variants; empty or absent shows no choice. */
  materials?: readonly EnrollmentMaterialChoice[];
  /** The lines of a refused submit, shown again. */
  lines?: readonly EnrollmentMaterialLine[];
  /** "Ya pagó" as it was when a submit was refused. */
  paid?: boolean;
  cancelHref: string;
}) {
  const feeOf = (offer: string) =>
    options.find((option) => option.value === offer)?.fee ?? "";
  const [fee, setFee] = useState(values.fee || feeOf(values.offer));
  // Until the owner types a fee, it follows the chosen month; after that it is theirs.
  const [typed, setTyped] = useState(values.fee !== "");
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
    <form method="post" noValidate className={ADMIN_PANEL}>
      <FormError message={formError} />
      <div data-columns className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-4">
          <SelectField
            label={copy.offer}
            name="offer"
            required
            options={[{ value: "", label: copy.offerPlaceholder }, ...options]}
            defaultValue={values.offer}
            onChange={(event) => {
              if (!typed) setFee(feeOf(event.target.value));
            }}
            error={errors.offer}
          />
          <TextField
            label={copy.fee}
            hint={copy.feeHint}
            name="fee"
            inputMode="numeric"
            required
            autoComplete="off"
            value={fee}
            onChange={(event) => {
              setTyped(true);
              setFee(event.target.value);
            }}
            error={errors.fee}
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
        </div>
        <div className="flex flex-col gap-4">
          <MoreOptions
            label={copy.materials}
            defaultOpen={lines.length > 0 || errors.materials !== undefined}
          >
            <EnrollmentNewMaterials
              choices={materials}
              initialLines={lines}
              fee={fee}
              error={errors.materials}
            />
          </MoreOptions>
          <CheckboxField
            label={copy.alreadyPaid}
            name="paid"
            defaultChecked={paid}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">{copy.submit}</Button>
            <AdminButtonLink href={cancelHref} variant="outline">
              {copy.cancel}
            </AdminButtonLink>
          </div>
        </div>
      </div>
    </form>
  );
}
