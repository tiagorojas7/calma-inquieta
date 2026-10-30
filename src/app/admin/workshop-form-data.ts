import type { Money } from "~/modules/_shared";
import type {
  MonthlyWorkshopDraft,
  Percentage,
  WorkshopStatus,
} from "~/modules/workshops";

import { parseGallery } from "./gallery-form-data";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * The workshop form's text parts as a draft; validation is the service's job.
 * The gallery comes from the `ImageField` slots; the service validates it.
 */
export function parseWorkshopDraft(form: FormData): MonthlyWorkshopDraft {
  return {
    name: text(form, "name"),
    slug: text(form, "slug"),
    summary: text(form, "summary"),
    description: text(form, "description"),
    technique: text(form, "technique"),
    defaultFee: text(form, "defaultFee"),
    teacherId: text(form, "teacherId"),
    percentage: text(form, "percentage"),
    images: parseGallery(form),
    confirmSlugChange: form.has("confirmSlugChange"),
  };
}

const INTENTS = [
  "save",
  "publish",
  "pause",
  "archive",
  "restore",
  "delete",
] as const;
export type WorkshopIntent = (typeof INTENTS)[number];

export function parseWorkshopIntent(form: FormData): WorkshopIntent | null {
  const intent = text(form, "intent");
  return INTENTS.find((known) => known === intent) ?? null;
}

const FILTERS = {
  vigentes: "live",
  borradores: "draft",
  publicados: "published",
  pausados: "paused",
  archivados: "archived",
} as const satisfies Record<string, WorkshopStatus | "live">;

export type WorkshopFilterKey = keyof typeof FILTERS;

/** The `?estado=` query value; `vigentes` (everything but archived) when unknown. */
export function parseWorkshopFilterKey(
  value: string | null,
): WorkshopFilterKey {
  return (
    Object.keys(FILTERS).find(
      (key): key is WorkshopFilterKey => key === value,
    ) ?? "vigentes"
  );
}

export function parseWorkshopFilter(
  value: string | null,
): WorkshopStatus | "live" {
  return FILTERS[parseWorkshopFilterKey(value)];
}

/** The stored fee as the whole-pesos text the form field accepts back. */
export function formatWholePesos(fee: Money): string {
  return String(fee.toCentavos() / 100);
}

/** Basis points as the percentage text the form accepts back, in integer math. */
export function formatPercentage(percentage: Percentage | null): string {
  if (percentage === null) return "";
  const whole = Math.floor(percentage.basisPoints / 100);
  const cents = percentage.basisPoints % 100;
  const fraction =
    cents === 0 ? "" : String(cents).padStart(2, "0").replace(/0$/, "");
  return fraction ? `${String(whole)},${fraction}` : String(whole);
}
