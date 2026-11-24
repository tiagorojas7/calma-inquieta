import { data } from "react-router";
import type { FieldIssue, IssueCode } from "~/modules/_shared";
import type {
  IntensiveWorkshopDraft,
  IntensiveWorkshopField,
  IntensiveStatus,
  NewProjectDraft,
  NewProjectField,
} from "~/modules/workshops";
import type { NewProjectBlockValues } from "~/app/ui/admin/intensive-new-projects";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { parseGallery } from "./gallery-form-data";
import { PROJECT_FIELD_MESSAGES } from "./intensive-project-form-data";
import {
  INTENSIVE_FIELD_MESSAGES,
  issueMessage,
  type FieldMessages,
} from "./issue-messages";

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
  "project-add",
  "project-save",
  "project-move",
  "project-delete",
  "project-material-add",
  "project-material-set",
  "project-material-remove",
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
    capacity: text(form, "capacity"),
    minSeats: text(form, "minSeats"),
    policyText: text(form, "policyText"),
    materialsIncluded: form.has("materialsIncluded"),
    images: parseGallery(form),
  };
}

const BLOCK_FIELD = /^project(\d+)[A-Z]/;

/** The numbers found after `prefix` in the posted names, ascending. */
function numbersAfter(form: FormData, prefix: string): number[] {
  const found = new Set<number>();
  for (const key of form.keys())
    if (key.startsWith(prefix)) {
      const rest = key.slice(prefix.length);
      if (/^\d+$/.test(rest)) found.add(Number(rest));
    }
  return [...found].sort((x, y) => x - y);
}

/**
 * One project block as the new-workshop form posts it: fields named
 * `project<i>Name`, `project<i>Price`, ... , the image slot
 * `project<i>Image{AssetId,Src,Alt}` and the bill lines
 * `project<i>MaterialVariant<j>` / `project<i>MaterialQuantity<j>`.
 */
function parseNewProjectBlock(
  form: FormData,
  block: number,
): NewProjectBlockValues {
  const prefix = `project${String(block)}`;
  const assetId = text(form, `${prefix}ImageAssetId`);
  const src = text(form, `${prefix}ImageSrc`);
  return {
    name: text(form, `${prefix}Name`),
    price: text(form, `${prefix}Price`),
    deposit: text(form, `${prefix}Deposit`),
    description: text(form, `${prefix}Description`),
    image:
      assetId === ""
        ? null
        : {
            assetId,
            ...(src === "" ? {} : { src }),
            alt: text(form, `${prefix}ImageAlt`),
          },
    materials: numbersAfter(form, `${prefix}MaterialVariant`).map((line) => ({
      variantId: text(form, `${prefix}MaterialVariant${String(line)}`),
      quantity: text(form, `${prefix}MaterialQuantity${String(line)}`),
    })),
  };
}

/**
 * The project blocks of a new workshop in the order of their numbers, exactly
 * as typed (and with the preview address of their image, to show them again).
 * A post with no block yields none; the service then asks for the first.
 */
export function parseNewProjectBlocks(form: FormData): NewProjectBlockValues[] {
  const blocks = new Set<number>();
  for (const key of form.keys()) {
    const found = BLOCK_FIELD.exec(key)?.[1];
    if (found !== undefined) blocks.add(Number(found));
  }
  return [...blocks]
    .sort((x, y) => x - y)
    .map((block) => parseNewProjectBlock(form, block));
}

/** What the service receives for the blocks: the same, without the preview address. */
export function newProjectDrafts(
  blocks: readonly NewProjectBlockValues[],
): NewProjectDraft[] {
  return blocks.map((block) => ({
    name: block.name,
    price: block.price,
    deposit: block.deposit,
    description: block.description,
    image: block.image
      ? { assetId: block.image.assetId, alt: block.image.alt }
      : null,
    materials: block.materials,
  }));
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

const BILL_MESSAGES = adminMicrocopy.intensives.projects.errors;

/** The message of an issue of a project block: its own wording, else the generic one. */
function projectMessage(kind: string | undefined, code: IssueCode): string {
  const own = (messages: FieldMessages<string>[string]) => messages?.[code];
  switch (kind) {
    case "Image":
      return own(PROJECT_FIELD_MESSAGES.image) ?? issueMessage(code);
    case "Description":
      return own(PROJECT_FIELD_MESSAGES.description) ?? issueMessage(code);
    case "MaterialVariant":
      return code === "duplicate"
        ? BILL_MESSAGES.materialDuplicate
        : BILL_MESSAGES.materialUnavailable;
    case "MaterialQuantity":
      return BILL_MESSAGES.materialQuantity;
    default:
      return issueMessage(code);
  }
}

/** One message per field, the first issue of a field winning; block fields by their own names. */
function newWorkshopErrors(
  issues: readonly FieldIssue<IntensiveWorkshopField | NewProjectField>[],
): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  for (const issue of issues) {
    const kind = /^project\d+([A-Za-z]+)/.exec(issue.field)?.[1];
    const overrides: FieldMessages<string> = INTENSIVE_FIELD_MESSAGES;
    errors[issue.field] ??=
      kind === undefined
        ? (overrides[issue.field]?.[issue.code] ?? issueMessage(issue.code))
        : projectMessage(kind, issue.code);
  }
  return errors;
}

/**
 * A refused form as the screen shows it again: what was typed (the project
 * blocks too, when the form has them) and one message per field.
 */
export function invalidIntensiveResponse(
  draft: IntensiveWorkshopDraft,
  issues: readonly FieldIssue<IntensiveWorkshopField | NewProjectField>[],
  projects?: readonly NewProjectBlockValues[],
) {
  return data(
    {
      values: draft,
      ...(projects ? { projects } : {}),
      errors: newWorkshopErrors(issues),
      formError: "Revisá los campos marcados e intentá de nuevo.",
    },
    { status: 422 },
  );
}
