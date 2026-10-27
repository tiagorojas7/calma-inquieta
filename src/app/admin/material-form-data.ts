import type { FieldIssue } from "~/modules/_shared";
import {
  DEFAULT_VARIANT_LABEL,
  type MaterialDraft,
  type MaterialField,
} from "~/modules/materials";
import { fieldErrors } from "./issue-messages";

export type MaterialVariantField = "label" | "price" | "swatch";
export type MaterialIssueField =
  MaterialField | `variants.${number}.${MaterialVariantField}`;

export type MaterialFormErrors = Partial<
  Record<Exclude<MaterialField, "variants">, string>
> & {
  readonly variants?: {
    readonly form?: string | undefined;
    readonly rows?: readonly Partial<Record<MaterialVariantField, string>>[];
  };
};

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function texts(form: FormData, key: string): readonly string[] {
  return form
    .getAll(key)
    .map((value) => (typeof value === "string" ? value : ""));
}

function indexedVariantField(
  field: MaterialIssueField,
): { readonly index: number; readonly field: MaterialVariantField } | null {
  const match = /^variants\.(\d+)\.(label|price|swatch)$/.exec(field);
  if (!match) return null;
  return {
    index: Number(match[1]),
    field: match[2] as MaterialVariantField,
  };
}

/** Maps service issues to scalar fields and the matching editable variant row. */
export function materialFormErrors(
  issues: readonly FieldIssue<MaterialIssueField>[],
): MaterialFormErrors {
  const scalar = fieldErrors(
    issues.filter(
      (issue): issue is FieldIssue<Exclude<MaterialField, "variants">> =>
        issue.field !== "variants" && !indexedVariantField(issue.field),
    ),
  );
  const variants: Partial<Record<MaterialVariantField, string>>[] = [];

  for (const issue of issues) {
    const indexed = indexedVariantField(issue.field);
    if (!indexed) continue;
    while (variants.length <= indexed.index) variants.push({});
    const message = fieldErrors<MaterialVariantField>([
      { field: indexed.field, code: issue.code },
    ])[indexed.field];
    if (!message || variants[indexed.index]?.[indexed.field]) continue;
    variants[indexed.index] = {
      ...variants[indexed.index],
      [indexed.field]: message,
    };
  }

  const form = fieldErrors(
    issues.filter(
      (issue): issue is FieldIssue<"variants"> => issue.field === "variants",
    ),
  ).variants;
  if (!form && variants.length === 0) return scalar;
  return {
    ...scalar,
    variants: {
      ...(form ? { form } : {}),
      ...(variants.length > 0 ? { rows: variants } : {}),
    },
  };
}

/**
 * The material form's scalar fields and ordered variant rows as a draft.
 * Service validation deliberately owns all validation and normalization.
 */
export function parseMaterialDraft(form: FormData): MaterialDraft {
  const ids = texts(form, "variantId");
  const labels = texts(form, "variantLabel");
  const prices = texts(form, "variantPrice");
  const swatches = texts(form, "variantSwatch");
  const availableVariants = new Set(texts(form, "variantAvailable"));
  const rowCount = Math.max(
    ids.length,
    labels.length,
    prices.length,
    swatches.length,
    1,
  );
  const imageAssetId = text(form, "imageAssetId");

  return {
    name: text(form, "name"),
    description: text(form, "description"),
    category: text(form, "category"),
    supplierId: text(form, "supplierId"),
    available: form.has("available"),
    image: imageAssetId
      ? { assetId: imageAssetId, alt: text(form, "imageAlt") }
      : null,
    variants: Array.from({ length: rowCount }, (_, index) => ({
      ...(ids[index] ? { id: ids[index] } : {}),
      label: labels[index] ?? (index === 0 ? DEFAULT_VARIANT_LABEL : ""),
      price: prices[index] ?? "",
      swatch: swatches[index] ?? "",
      available:
        labels.length === 0 && index === 0
          ? true
          : availableVariants.has(String(index)),
    })),
  };
}
