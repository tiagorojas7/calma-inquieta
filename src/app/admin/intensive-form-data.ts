import { data } from "react-router";
import type { FieldIssue } from "~/modules/_shared";
import type {
  IntensiveWorkshopDraft,
  IntensiveWorkshopField,
  IntensiveStatus,
} from "~/modules/workshops";
import { fieldErrors, INTENSIVE_FIELD_MESSAGES } from "./issue-messages";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

const INTENTS = [
  "save",
  "publish",
  "pause",
  "cancel",
  "archive",
  "restore",
  "delete",
  "reschedule",
] as const;
export type IntensiveIntent = (typeof INTENTS)[number];

export function parseIntensiveIntent(form: FormData): IntensiveIntent | null {
  const intent = text(form, "intent");
  return INTENTS.find((known) => known === intent) ?? null;
}

export function parseIntensiveSchedule(form: FormData) {
  return {
    eventDate: text(form, "eventDate"),
    startsAt: text(form, "startsAt"),
    endsAt: text(form, "endsAt"),
  };
}

export function parseIntensiveDraft(form: FormData): IntensiveWorkshopDraft {
  const assetIds = form.getAll("galleryAssetId");
  const sources = form.getAll("gallerySrc");
  const alts = form.getAll("galleryAlt");
  return {
    name: text(form, "name"),
    slug: text(form, "slug"),
    summary: text(form, "summary"),
    description: text(form, "description"),
    teacherId: text(form, "teacherId"),
    percentage: text(form, "percentage"),
    eventDate: text(form, "eventDate"),
    startsAt: text(form, "startsAt"),
    endsAt: text(form, "endsAt"),
    price: text(form, "price"),
    deposit: text(form, "deposit"),
    capacity: text(form, "capacity"),
    minSeats: text(form, "minSeats"),
    policyText: text(form, "policyText"),
    materialsIncluded: form.has("materialsIncluded"),
    images: assetIds.map((assetId, index) => {
      const src = sources[index];
      return {
        assetId: typeof assetId === "string" ? assetId : "",
        ...(typeof src === "string" ? { src } : {}),
        alt: typeof alts[index] === "string" ? alts[index] : "",
      };
    }),
  };
}

const FILTERS = {
  vigentes: "live",
  borradores: "draft",
  publicados: "published",
  pausados: "paused",
  cancelados: "cancelled",
  archivados: "archived",
} as const satisfies Record<string, IntensiveStatus | "live">;
export type IntensiveFilterKey = keyof typeof FILTERS;
export function parseIntensiveFilterKey(
  value: string | null,
): IntensiveFilterKey {
  return (
    Object.keys(FILTERS).find(
      (key): key is IntensiveFilterKey => key === value,
    ) ?? "vigentes"
  );
}
export function parseIntensiveFilter(
  value: string | null,
): IntensiveStatus | "live" {
  return FILTERS[parseIntensiveFilterKey(value)];
}

export function invalidIntensiveResponse(
  draft: IntensiveWorkshopDraft,
  issues: readonly FieldIssue<IntensiveWorkshopField>[],
) {
  return data(
    {
      values: draft,
      errors: fieldErrors(issues, INTENSIVE_FIELD_MESSAGES),
      formError: "Revisá los campos marcados e intentá de nuevo.",
    },
    { status: 422 },
  );
}
