import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Result,
} from "~/modules/_shared";

export type SupplierField = "name" | "phone" | "email" | "notes";

export interface SupplierDraft {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly notes: string;
}

export interface SupplierFields {
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Key for the case-insensitive uniqueness of active supplier names. Computed
 * in code, not by the database, because PostgreSQL lower() does not fold
 * non-ASCII capitals under a C locale. Accents are kept: "Lucia" and "Lucía" differ.
 */
export function supplierNameKey(name: string): string {
  return name.trim().normalize("NFC").toLocaleLowerCase("es");
}

export function validateSupplierDraft(
  draft: SupplierDraft,
): Result<SupplierFields, Invalid<SupplierField>> {
  const issues: FieldIssue<SupplierField>[] = [];
  const name = draft.name.trim();
  const phone = draft.phone.trim();
  const email = draft.email.trim();
  const notes = draft.notes.trim();

  if (name === "") issues.push({ field: "name", code: "required" });
  else if (name.length > 120) issues.push({ field: "name", code: "too-long" });
  if (phone.length > 30) issues.push({ field: "phone", code: "too-long" });
  else if (phone !== "" && !/\d/.test(phone))
    issues.push({ field: "phone", code: "invalid-format" });
  if (email !== "" && !EMAIL.test(email))
    issues.push({ field: "email", code: "invalid-format" });
  if (notes.length > 1000) issues.push({ field: "notes", code: "too-long" });

  if (issues.length > 0) return err({ kind: "invalid", issues });
  return ok({
    name,
    phone: phone === "" ? null : phone,
    email: email === "" ? null : email,
    notes: notes === "" ? null : notes,
  });
}
