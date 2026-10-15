import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type Result,
} from "~/modules/_shared";

export type TeacherModality = "own" | "third_party";
export type TeacherField = "name" | "bioLine" | "phone" | "email" | "modality";

export interface TeacherDraft {
  readonly name: string;
  readonly bioLine: string;
  readonly phone: string;
  readonly email: string;
  readonly modality: string;
}

/** A validated teacher record. There is deliberately no percentage (D2). */
export interface TeacherFields {
  readonly name: string;
  readonly bioLine: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly modality: TeacherModality;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Key for the case-insensitive uniqueness of active teacher names. Computed in
 * code, not by the database, because PostgreSQL lower() does not fold non-ASCII
 * capitals under a C locale. Accents are kept: "Lucia" and "Lucía" differ.
 */
export function teacherNameKey(name: string): string {
  return name.trim().normalize("NFC").toLocaleLowerCase("es");
}

/**
 * The one list order: Spanish collation on the name key, then id by code unit.
 * Owned by the code (adapters sort with it) so fake and database agree on
 * non-ASCII names whatever the database collation is.
 */
export function compareTeachersByName(
  a: { readonly name: string; readonly id: string },
  b: { readonly name: string; readonly id: string },
): number {
  const byName = teacherNameKey(a.name).localeCompare(
    teacherNameKey(b.name),
    "es",
  );
  if (byName !== 0) return byName;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function isModality(value: string): value is TeacherModality {
  return value === "own" || value === "third_party";
}

export function validateTeacherDraft(
  draft: TeacherDraft,
): Result<TeacherFields, Invalid<TeacherField>> {
  const issues: FieldIssue<TeacherField>[] = [];
  const name = draft.name.trim();
  const bioLine = draft.bioLine.trim();
  const phone = draft.phone.trim();
  const email = draft.email.trim();
  const modality = draft.modality.trim();
  if (name === "") issues.push({ field: "name", code: "required" });
  if (bioLine === "") issues.push({ field: "bioLine", code: "required" });
  if (phone !== "" && !/\d/.test(phone))
    issues.push({ field: "phone", code: "invalid-format" });
  if (email !== "" && !EMAIL.test(email))
    issues.push({ field: "email", code: "invalid-format" });
  if (modality === "") issues.push({ field: "modality", code: "required" });
  else if (!isModality(modality))
    issues.push({ field: "modality", code: "invalid-format" });
  if (issues.length > 0 || !isModality(modality))
    return err({ kind: "invalid", issues });
  return ok({
    name,
    bioLine,
    phone: phone === "" ? null : phone,
    email: email === "" ? null : email,
    modality,
  });
}
