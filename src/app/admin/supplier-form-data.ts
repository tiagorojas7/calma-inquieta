import type { SupplierDraft } from "~/modules/materials";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/** The supplier form's text parts as a draft; validation is the service's job. */
export function parseSupplierDraft(form: FormData): SupplierDraft {
  return {
    name: text(form, "name"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    notes: text(form, "notes"),
  };
}

export type SupplierIntent = "save" | "archive" | "reactivate";

export function parseSupplierIntent(form: FormData): SupplierIntent | null {
  const intent = text(form, "intent");
  return intent === "save" || intent === "archive" || intent === "reactivate"
    ? intent
    : null;
}

export type SupplierFilterKey = "activos" | "archivados" | "todos";

/** The `?estado=` query value; `activos` when missing or unknown. */
export function parseSupplierFilterKey(
  value: string | null,
): SupplierFilterKey {
  return value === "archivados" || value === "todos" ? value : "activos";
}

/** The `?estado=` query value as the service filter; active when unknown. */
export function parseSupplierFilter(value: string | null): {
  readonly active?: boolean;
} {
  const key = parseSupplierFilterKey(value);
  if (key === "todos") return {};
  return { active: key === "activos" };
}
