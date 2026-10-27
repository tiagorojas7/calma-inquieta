import type { WorkshopPeriod, WorkshopPeriodDraft } from "~/modules/workshops";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** The only native action this screen accepts. */
export function parseOpenMonthIntent(form: FormData): "open-month" | null {
  return text(form, "intent") === "open-month" ? "open-month" : null;
}

export function parsePeriodDetailIntent(
  form: FormData,
): "save" | "publish" | "close" | "delete" | null {
  const intent = text(form, "intent");
  return intent === "save" ||
    intent === "publish" ||
    intent === "close" ||
    intent === "delete"
    ? intent
    : null;
}

export function parsePeriodDraft(
  form: FormData,
  period: WorkshopPeriod,
): WorkshopPeriodDraft {
  return {
    fee: text(form, "fee"),
    materialsRequired: form.get("materialsRequired") === "on",
    projectTitle: text(form, "projectTitle"),
    projectDescription: text(form, "projectDescription"),
    projectImages: [],
    capacities: period.turnos.map((turno) => ({
      turnoId: turno.turnoId,
      capacity: text(form, `capacity-${turno.turnoId}`),
    })),
    snapshotPercentage: text(form, "snapshotPercentage"),
    materialIds: form
      .getAll("materialIds")
      .filter(
        (materialId): materialId is string => typeof materialId === "string",
      ),
  };
}

/** Keep the entered month intact; the service owns calendar and range validation. */
export function parsePeriodValue(form: FormData): string {
  return text(form, "period");
}

/** The route accepts only the canonical month-key layout before service access. */
export function isExactPeriodValue(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}
