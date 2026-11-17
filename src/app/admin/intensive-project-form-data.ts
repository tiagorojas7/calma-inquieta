import type { FieldIssue } from "~/modules/_shared";
import type {
  IntensiveProject,
  IntensiveProjectDraft,
  IntensiveProjectField,
  IntensiveProjectRule,
} from "~/modules/workshops";
import { formatPesos } from "~/app/catalog/format";
import type {
  IntensiveProjectCard,
  ProjectFormValues,
  RejectedProject,
} from "~/app/ui/admin/intensive-projects";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { fieldErrors, type FieldMessages } from "./issue-messages";
import { formatWholePesos } from "./workshop-form-data";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/** Field wording that replaces the generic text where it would mislead. */
const PROJECT_FIELD_MESSAGES = {
  image: {
    required: "Describí la imagen en el texto alternativo.",
    "too-long": "El texto alternativo es demasiado largo. Acortalo.",
    "unknown-reference": "La imagen ya no existe. Volvé a subirla.",
  },
} as const satisfies FieldMessages<IntensiveProjectField>;

/**
 * One project form as submitted. An empty image slot submits nothing, and
 * "Quitar la imagen" drops the stored one; validation is the service's job.
 */
export function parseProjectDraft(form: FormData): IntensiveProjectDraft {
  const assetId = text(form, "imageAssetId");
  const image =
    assetId === "" || form.has("removeImage")
      ? null
      : { assetId, alt: text(form, "imageAlt") };
  return {
    name: text(form, "name"),
    price: text(form, "price"),
    deposit: text(form, "deposit"),
    image,
  };
}

export function parseProjectId(form: FormData): string {
  return text(form, "projectId");
}

export function parseProjectDirection(form: FormData): "up" | "down" | null {
  const direction = text(form, "direction");
  return direction === "up" || direction === "down" ? direction : null;
}

/** What the refused form shows again: the typed text, the image and a message per field. */
export function rejectedProject(
  target: string,
  draft: IntensiveProjectDraft,
  form: FormData,
  issues: readonly FieldIssue<IntensiveProjectField>[],
): RejectedProject {
  const values: ProjectFormValues = {
    name: draft.name,
    price: draft.price,
    deposit: draft.deposit,
    image: draft.image
      ? {
          assetId: draft.image.assetId,
          src: text(form, "imageSrc"),
          alt: draft.image.alt,
        }
      : null,
  };
  return {
    target,
    values,
    errors: fieldErrors(issues, PROJECT_FIELD_MESSAGES),
    formError: adminMicrocopy.intensives.projects.errors.invalid,
  };
}

/** The project list the detail screen shows: money formatted, forms prefilled. */
export function projectCards(
  projects: readonly IntensiveProject[],
): IntensiveProjectCard[] {
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    amounts: {
      price: formatPesos(project.price),
      deposit: formatPesos(project.deposit),
    },
    image: project.image?.asset
      ? { src: project.image.asset.src, alt: project.image.alt }
      : null,
    values: {
      name: project.name,
      price: formatWholePesos(project.price),
      deposit: formatWholePesos(project.deposit),
      image: project.image
        ? {
            assetId: project.image.assetId,
            ...(project.image.asset ? { src: project.image.asset.src } : {}),
            alt: project.image.alt,
          }
        : null,
    },
  }));
}

const PROJECT_RULE_MESSAGES = {
  "in-use": adminMicrocopy.intensives.projects.errors.inUse,
  "last-project": adminMicrocopy.intensives.projects.errors.lastProject,
} as const satisfies Record<IntensiveProjectRule, string>;

/** Why a project could not be deleted, in the owner's words. */
export function projectDeleteMessage(
  rules: readonly IntensiveProjectRule[],
): string {
  return rules.map((rule) => PROJECT_RULE_MESSAGES[rule]).join(" ");
}
