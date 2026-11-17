import {
  err,
  ok,
  type FieldIssue,
  type Invalid,
  type IssueCode,
  type Result,
} from "~/modules/_shared";

/** Whole units per participant; the database enforces the same range. */
export const PROJECT_MATERIAL_QUANTITY = { min: 1, max: 20 } as const;

export type ProjectMaterialField = "variantId" | "quantity";

/** What the owner submits for one bill line; the quantity stays as typed. */
export interface ProjectMaterialDraft {
  readonly variantId: string;
  readonly quantity: string;
}

export interface ValidProjectMaterial {
  readonly variantId: string;
  readonly quantity: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A whole number of units from 1 to 20, typed as plain digits. */
export function validateProjectMaterialQuantity(
  text: string,
): Result<number, Invalid<"quantity">> {
  const typed = text.trim();
  const fail = (code: IssueCode) =>
    err({
      kind: "invalid" as const,
      issues: [{ field: "quantity" as const, code }],
    });
  if (typed === "") return fail("required");
  if (!/^[0-9]+$/.test(typed)) return fail("invalid-format");
  const quantity = Number(typed);
  if (
    quantity < PROJECT_MATERIAL_QUANTITY.min ||
    quantity > PROJECT_MATERIAL_QUANTITY.max
  )
    return fail("out-of-range");
  return ok(quantity);
}

/**
 * A bill line needs a catalog variant id and a quantity of 1 to 20. Whether
 * the variant still exists in the catalog is the delivery layer's check: the
 * workshops module never reads the materials schema.
 */
export function validateProjectMaterial(
  draft: ProjectMaterialDraft,
): Result<ValidProjectMaterial, Invalid<ProjectMaterialField>> {
  const issues: FieldIssue<ProjectMaterialField>[] = [];
  const variantId = draft.variantId.trim();
  if (variantId === "") issues.push({ field: "variantId", code: "required" });
  else if (!UUID.test(variantId))
    issues.push({ field: "variantId", code: "unknown-reference" });
  const quantity = validateProjectMaterialQuantity(draft.quantity);
  if (!quantity.ok) issues.push(...quantity.error.issues);
  if (issues.length > 0 || !quantity.ok)
    return err({ kind: "invalid", issues });
  return ok({ variantId, quantity: quantity.value });
}
