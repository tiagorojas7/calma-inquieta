import {
  Money,
  parseWholePesos,
  type FieldIssue,
  type Result,
} from "~/modules/_shared";

export type MaterialField =
  "name" | "description" | "category" | "supplierId" | "image" | "variants";

export interface MaterialDraft {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly supplierId: string;
  readonly available: boolean;
  readonly image: { readonly assetId: string; readonly alt: string } | null;
  readonly variants: readonly {
    readonly id?: string;
    readonly label: string;
    readonly price: string;
    readonly available: boolean;
    readonly swatch: string;
  }[];
}

export interface ValidMaterialVariantDraft {
  readonly id?: string;
  readonly label: string;
  readonly price: Money;
  readonly available: boolean;
  readonly swatch: string | null;
  readonly position: number;
}

export interface ValidMaterialDraft {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly supplierId: string;
  readonly available: boolean;
  readonly image: { readonly assetId: string; readonly alt: string } | null;
  readonly variants: readonly ValidMaterialVariantDraft[];
}

const normalize = (value: string): string => value.trim().normalize("NFC");

export const materialNameKey = (value: string): string =>
  normalize(value).toLocaleLowerCase("es");

export const variantLabelKey = (value: string): string =>
  normalize(value).toLocaleLowerCase("es");

export function validateMaterialDraft(
  draft: MaterialDraft,
): Result<ValidMaterialDraft, readonly FieldIssue<MaterialField>[]> {
  const issues: FieldIssue<MaterialField>[] = [];
  const name = normalize(draft.name);
  const description = normalize(draft.description);
  const category = normalize(draft.category);
  const supplierId = draft.supplierId.trim();

  if (!name) issues.push({ field: "name", code: "required" });
  if (!description) issues.push({ field: "description", code: "required" });
  if (!category) issues.push({ field: "category", code: "required" });
  if (!supplierId) issues.push({ field: "supplierId", code: "required" });
  if (draft.variants.length === 0)
    issues.push({ field: "variants", code: "required" });

  const seenLabels = new Set<string>();
  const variants: ValidMaterialVariantDraft[] = [];
  for (const [position, variant] of draft.variants.entries()) {
    const label = normalize(variant.label);
    const key = variantLabelKey(label);
    if (!label) issues.push({ field: "variants", code: "required" });
    else if (seenLabels.has(key))
      issues.push({ field: "variants", code: "duplicate" });
    else seenLabels.add(key);

    const parsedPrice = parseWholePesos(variant.price);
    if (!parsedPrice.ok)
      issues.push({ field: "variants", code: parsedPrice.error });
    else if (parsedPrice.value.isZero())
      issues.push({ field: "variants", code: "out-of-range" });

    const swatchText = variant.swatch.trim();
    const swatch = swatchText ? swatchText.toLocaleLowerCase("en") : null;
    if (swatch !== null && !/^#[0-9a-f]{6}$/.test(swatch))
      issues.push({ field: "variants", code: "invalid-format" });

    if (label && parsedPrice.ok && !parsedPrice.value.isZero()) {
      variants.push({
        ...(variant.id ? { id: variant.id } : {}),
        label,
        price: parsedPrice.value,
        available: variant.available,
        swatch,
        position,
      });
    }
  }

  let image: { readonly assetId: string; readonly alt: string } | null = null;
  if (draft.image) {
    const alt = normalize(draft.image.alt);
    if (!alt) issues.push({ field: "image", code: "required" });
    image = { assetId: draft.image.assetId, alt };
  }

  if (issues.length > 0) return { ok: false, error: issues };
  return {
    ok: true,
    value: {
      name,
      description,
      category,
      supplierId,
      available: draft.available,
      image,
      variants,
    },
  };
}
