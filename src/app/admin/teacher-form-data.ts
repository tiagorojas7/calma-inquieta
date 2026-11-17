import type { TeacherDraft } from "~/modules/teachers";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/** The teacher form's text parts as a draft; validation is the service's job. */
export function parseTeacherDraft(form: FormData): TeacherDraft {
  return {
    name: text(form, "name"),
    bioLine: text(form, "bioLine"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    modality: text(form, "modality"),
  };
}

export type TeacherIntent = "save" | "archive" | "reactivate" | "percentage";

export function parseTeacherIntent(form: FormData): TeacherIntent | null {
  const intent = text(form, "intent");
  return intent === "save" ||
    intent === "archive" ||
    intent === "reactivate" ||
    intent === "percentage"
    ? intent
    : null;
}

/** One of her workshops and its new percentage; the service validates it. */
export function parseTeacherPercentage(form: FormData): {
  readonly workshopId: string;
  readonly percentage: string;
} {
  return {
    workshopId: text(form, "workshopId").trim(),
    percentage: text(form, "percentage").trim(),
  };
}

export type TeacherFilterKey = "activos" | "archivados" | "todos";

const FILTERS = {
  activos: "active",
  archivados: "archived",
  todos: "all",
} as const satisfies Record<TeacherFilterKey, string>;

/** The `?estado=` query value; `activos` when missing or unknown. */
export function parseTeacherFilterKey(value: string | null): TeacherFilterKey {
  return value === "archivados" || value === "todos" ? value : "activos";
}

/** The `?estado=` query value as the service filter; active when unknown. */
export function parseTeacherFilter(
  value: string | null,
): "active" | "archived" | "all" {
  return FILTERS[parseTeacherFilterKey(value)];
}
