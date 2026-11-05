import { useState } from "react";
import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { ImageField, type ImageFieldUpload } from "./image-field";
import {
  CheckboxField,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-fields";
import { DEFAULT_SWATCH } from "./material-swatch";
import { materialCatalogCopy } from "./material-catalog-copy";
import { adminMicrocopy } from "./microcopy";
import { ADMIN_SHEET } from "./admin-sections";

export interface MaterialFormVariant {
  readonly id?: string | undefined;
  readonly label: string;
  readonly price: string;
  readonly priceOnRequest?: boolean | undefined;
  readonly swatch: string;
  readonly available: boolean;
}

export interface MaterialFormValues {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly supplierId: string;
  readonly available: boolean;
  readonly image: {
    readonly assetId: string;
    readonly src: string;
    readonly alt: string;
  } | null;
  readonly variants: readonly MaterialFormVariant[];
}

export type MaterialFormField =
  "name" | "description" | "category" | "supplierId" | "image";

export type MaterialFormErrors = Readonly<
  Partial<Record<MaterialFormField, string>> & {
    readonly variants?: {
      readonly form?: string | undefined;
      readonly rows?: readonly {
        readonly label?: string | undefined;
        readonly price?: string | undefined;
        readonly swatch?: string | undefined;
      }[];
    };
  }
>;

type EditableVariant = MaterialFormVariant & { readonly key: number };

const copy = adminMicrocopy.materialForm;
const defaultVariant: MaterialFormVariant = {
  label: "Única",
  price: "",
  swatch: "",
  available: true,
};

function toEditable(
  variants: readonly MaterialFormVariant[],
): readonly EditableVariant[] {
  const rows = variants.length > 0 ? variants : [defaultVariant];
  return rows.map((variant, key) => ({ ...variant, key }));
}

/**
 * Reusable create/edit material fields. It remains presentational: callers
 * supply values, supplier choices, upload behavior, and document destinations.
 */
export function MaterialForm({
  values,
  errors,
  formError,
  suppliers,
  upload,
  submitLabel,
  cancelHref,
}: {
  values: MaterialFormValues;
  errors: MaterialFormErrors;
  formError?: string | undefined;
  suppliers: readonly { readonly id: string; readonly name: string }[];
  upload: ImageFieldUpload;
  submitLabel: string;
  cancelHref: string;
}) {
  const [variants, setVariants] = useState(() => toEditable(values.variants));
  const [nextVariantKey, setNextVariantKey] = useState(variants.length);
  const supplierOptions = [
    { value: "", label: copy.supplierPlaceholder },
    ...suppliers.map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
    })),
  ];
  const currentImage = values.image?.src ? values.image : undefined;

  function updateVariant(
    index: number,
    field: keyof MaterialFormVariant,
    value: string | boolean,
  ) {
    setVariants((current) =>
      current.map((variant, rowIndex) =>
        rowIndex === index ? { ...variant, [field]: value } : variant,
      ),
    );
  }

  function moveVariant(index: number, direction: -1 | 1) {
    setVariants((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      const moved = next[index];
      const replaced = next[destination];
      if (!moved || !replaced) return current;
      next[index] = replaced;
      next[destination] = moved;
      return next;
    });
  }

  return (
    <form method="post" noValidate className={ADMIN_SHEET}>
      <input type="hidden" name="intent" value="save" />
      <FormError message={formError} />
      <fieldset className="flex flex-col gap-4 rounded-md border border-sand-300 p-4">
        <legend className="px-2 font-semibold text-ink-900">
          {copy.sectionBasics}
        </legend>
        <TextField
          label={copy.name}
          name="name"
          defaultValue={values.name}
          error={errors.name}
          autoComplete="off"
        />
        <TextAreaField
          label={copy.description}
          name="description"
          defaultValue={values.description}
          error={errors.description}
        />
        <TextField
          label={copy.category}
          name="category"
          defaultValue={values.category}
          error={errors.category}
        />
        <SelectField
          label={copy.supplier}
          name="supplierId"
          options={supplierOptions}
          defaultValue={values.supplierId}
          error={errors.supplierId}
        />
        <CheckboxField
          label={copy.available}
          name="available"
          defaultChecked={values.available}
        />
      </fieldset>
      <fieldset className="flex flex-col gap-4 rounded-md border border-sand-300 p-4">
        <legend className="px-2 font-semibold text-ink-900">
          {copy.sectionImage}
        </legend>
        <ImageField
          name="image"
          label={copy.image}
          upload={upload}
          current={currentImage}
        />
        {values.image && !currentImage && (
          <>
            <input
              type="hidden"
              name="imageAssetId"
              value={values.image.assetId}
            />
            <input type="hidden" name="imageAlt" value={values.image.alt} />
          </>
        )}
        {errors.image && <p role="alert">{errors.image}</p>}
      </fieldset>
      <fieldset className="flex flex-col gap-4 rounded-md border border-sand-300 p-4">
        <legend className="px-2 font-semibold text-ink-900">
          {copy.variants}
        </legend>
        <p className="text-sm text-ink-700">{copy.variantsHint}</p>
        {errors.variants?.form && <p role="alert">{errors.variants.form}</p>}
        {variants.map((variant, index) => {
          const rowErrors = errors.variants?.rows?.[index];
          return (
            <div
              key={variant.key}
              className="grid gap-4 rounded-sm border border-clay-600 p-3"
            >
              <input type="hidden" name="variantId" value={variant.id ?? ""} />
              <TextField
                label={copy.variant}
                name="variantLabel"
                value={variant.label}
                error={rowErrors?.label}
                onChange={(event) => {
                  updateVariant(index, "label", event.target.value);
                }}
              />
              {variant.priceOnRequest ? (
                <input type="hidden" name="variantPrice" value="" />
              ) : (
                <TextField
                  label={copy.price}
                  hint={copy.priceHint}
                  name="variantPrice"
                  inputMode="numeric"
                  value={variant.price}
                  error={rowErrors?.price}
                  onChange={(event) => {
                    updateVariant(index, "price", event.target.value);
                  }}
                />
              )}
              <CheckboxField
                label={materialCatalogCopy.priceOnRequest}
                hint={materialCatalogCopy.priceOnRequestHint}
                name="variantPriceOnRequest"
                value={String(index)}
                checked={variant.priceOnRequest === true}
                onChange={(event) => {
                  updateVariant(index, "priceOnRequest", event.target.checked);
                }}
              />
              <CheckboxField
                label={copy.useSwatch}
                checked={variant.swatch !== ""}
                error={variant.swatch === "" ? rowErrors?.swatch : undefined}
                onChange={(event) => {
                  updateVariant(
                    index,
                    "swatch",
                    event.target.checked ? DEFAULT_SWATCH : "",
                  );
                }}
              />
              {variant.swatch === "" ? (
                <input type="hidden" name="variantSwatch" value="" />
              ) : (
                <TextField
                  label={copy.color}
                  type="color"
                  name="variantSwatch"
                  value={variant.swatch}
                  error={rowErrors?.swatch}
                  onChange={(event) => {
                    updateVariant(index, "swatch", event.target.value);
                  }}
                />
              )}
              <CheckboxField
                label={copy.variantAvailable}
                name="variantAvailable"
                value={String(index)}
                checked={variant.available}
                onChange={(event) => {
                  updateVariant(index, "available", event.target.checked);
                }}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => {
                    moveVariant(index, -1);
                  }}
                >
                  {copy.moveVariantUp}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={index === variants.length - 1}
                  onClick={() => {
                    moveVariant(index, 1);
                  }}
                >
                  {copy.moveVariantDown}
                </Button>
                {variants.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setVariants((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index),
                      );
                    }}
                  >
                    {copy.removeVariant}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        <Button
          type="button"
          variant="success"
          onClick={() => {
            setVariants((current) => [
              ...current,
              { ...defaultVariant, key: nextVariantKey },
            ]);
            setNextVariantKey((current) => current + 1);
          }}
        >
          {copy.addVariant}
        </Button>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{submitLabel}</Button>
        <AdminButtonLink href={cancelHref} variant="outline">
          {copy.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}
