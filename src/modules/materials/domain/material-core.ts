import {
  Money,
  parseWholePesos,
  type FieldIssue,
  type Result,
} from "~/modules/_shared";

export type MaterialVariantField = "label" | "price" | "swatch";

/** `variants` alone means the list itself; indexed fields point at one row. */
export type MaterialField =
  | "name"
  | "description"
  | "category"
  | "supplierId"
  | "image"
  | "variants"
  | `variants.${number}.${MaterialVariantField}`;

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
    /** True when students must enquire; the typed price is then ignored. */
    readonly priceOnRequest?: boolean;
    readonly available: boolean;
    readonly swatch: string;
  }[];
}

export interface ValidMaterialVariantDraft {
  readonly id?: string;
  readonly label: string;
  /** Null means "consultar precio": shown to students, never orderable. */
  readonly price: Money | null;
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

type Swatch =
  { readonly ok: true; readonly value: string | null } | { readonly ok: false };

/** `#rrggbb` (a short `#rgb` is expanded) or `null` when empty. */
function normalizeSwatch(text: string): Swatch {
  const value = text.trim().toLocaleLowerCase("en");
  if (!value) return { ok: true, value: null };
  if (/^#[0-9a-f]{6}$/.test(value)) return { ok: true, value };
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  if (!short) return { ok: false };
  const expanded = short
    .slice(1)
    .map((digit) => digit + digit)
    .join("");
  return { ok: true, value: `#${expanded}` };
}

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
    const row = (field: MaterialVariantField): MaterialField =>
      `variants.${String(position)}.${field}` as MaterialField;
    if (!label) issues.push({ field: row("label"), code: "required" });
    else if (seenLabels.has(key))
      issues.push({ field: row("label"), code: "duplicate" });
    else seenLabels.add(key);

    const parsedPrice =
      variant.priceOnRequest === true
        ? ({ ok: true, value: null } as const)
        : parseWholePesos(variant.price);
    if (!parsedPrice.ok)
      issues.push({ field: row("price"), code: parsedPrice.error });
    else if (parsedPrice.value?.isZero())
      issues.push({ field: row("price"), code: "out-of-range" });

    const swatch = normalizeSwatch(variant.swatch);
    if (!swatch.ok)
      issues.push({ field: row("swatch"), code: "invalid-format" });

    if (label && parsedPrice.ok && !parsedPrice.value?.isZero()) {
      variants.push({
        ...(variant.id ? { id: variant.id } : {}),
        label,
        price: parsedPrice.value,
        available: variant.available,
        swatch: swatch.ok ? swatch.value : null,
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
