import { useState } from "react";
import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { adminCopy } from "./copy";
import { ADMIN_SHEET } from "./admin-sections";
import {
  CheckboxField,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-fields";
import { ImageField, type ImageFieldUpload } from "./image-field";
import { MoreOptions } from "./more-options";

const copy = adminCopy.materiales.form;

export interface MaterialQuickExtra {
  readonly label: string;
  readonly price: string;
  readonly cost: string;
  readonly stock?: string;
}

export interface MaterialQuickValues {
  readonly name: string;
  readonly price: string;
  readonly stock: string;
  /** "Lo tenemos en el estudio": only then does the form ask how many there are. */
  readonly keptInStudio: boolean;
  readonly supplierId: string;
  readonly category: string;
  readonly description: string;
  readonly cost: string;
  readonly priceOnRequest: boolean;
  readonly available: boolean;
  readonly image: {
    readonly assetId: string;
    readonly src: string;
    readonly alt: string;
  } | null;
  readonly extras: readonly MaterialQuickExtra[];
}

export interface MaterialQuickErrors {
  readonly name?: string | undefined;
  readonly price?: string | undefined;
  readonly stock?: string | undefined;
  readonly supplierId?: string | undefined;
  readonly category?: string | undefined;
  readonly description?: string | undefined;
  readonly cost?: string | undefined;
  readonly image?: string | undefined;
  readonly extras?:
    | readonly {
        readonly label?: string | undefined;
        readonly price?: string | undefined;
        readonly cost?: string | undefined;
        readonly stock?: string | undefined;
      }[]
    | undefined;
}

export const EMPTY_QUICK_VALUES: MaterialQuickValues = {
  name: "",
  price: "",
  stock: "",
  keptInStudio: false,
  supplierId: "",
  category: "",
  description: "",
  cost: "",
  priceOnRequest: false,
  available: true,
  image: null,
  extras: [],
};

type Extra = MaterialQuickExtra & { readonly key: number };

/** What sits behind "Más opciones" and failed: it opens by itself, to be seen. */
function hasHiddenError(errors: MaterialQuickErrors): boolean {
  return (
    errors.supplierId !== undefined ||
    errors.category !== undefined ||
    errors.description !== undefined ||
    errors.cost !== undefined ||
    errors.image !== undefined ||
    (errors.extras ?? []).some((row) => Object.keys(row).length > 0)
  );
}

/**
 * The short new-material form: name, price and how many there are. Everything
 * else (supplier, cost, variants, photo, price on request, availability) is
 * behind "Más opciones". It posts the same fields as the full material form,
 * with the first variant's price at the top, so one parser reads both.
 */
export function MaterialQuickForm({
  values,
  errors,
  formError,
  suppliers,
  upload,
  cancelHref,
}: {
  values: MaterialQuickValues;
  errors: MaterialQuickErrors;
  formError?: string | undefined;
  suppliers: readonly { readonly id: string; readonly name: string }[];
  upload: ImageFieldUpload;
  cancelHref: string;
}) {
  const [extras, setExtras] = useState<readonly Extra[]>(() =>
    values.extras.map((extra, key) => ({ ...extra, key })),
  );
  const [nextKey, setNextKey] = useState(values.extras.length);
  const [kept, setKept] = useState(values.keptInStudio);
  const onlySupplier = suppliers.length === 1 ? suppliers[0] : undefined;
  const currentImage = values.image?.src ? values.image : undefined;

  function change(
    index: number,
    field: keyof MaterialQuickExtra,
    value: string,
  ) {
    setExtras((current) =>
      current.map((extra, rowIndex) =>
        rowIndex === index ? { ...extra, [field]: value } : extra,
      ),
    );
  }

  return (
    <form method="post" noValidate className={ADMIN_SHEET}>
      <FormError message={formError} />
      <TextField
        label={copy.name}
        name="name"
        defaultValue={values.name}
        error={errors.name}
        autoComplete="off"
      />
      <input type="hidden" name="variantLabel" value="Única" />
      <TextField
        label={copy.price}
        name="variantPrice"
        inputMode="numeric"
        defaultValue={values.price}
        error={errors.price}
      />
      <CheckboxField
        label={copy.keptInStudio}
        name="keptInStudio"
        checked={kept}
        onChange={(event) => {
          setKept(event.target.checked);
        }}
      />
      {kept ? (
        <TextField
          label={copy.stock}
          name="startingStock"
          inputMode="numeric"
          defaultValue={values.stock}
          error={errors.stock}
        />
      ) : null}
      <MoreOptions defaultOpen={hasHiddenError(errors)}>
        <SelectField
          label={copy.supplier}
          name="supplierId"
          options={[
            { value: "", label: copy.supplierPlaceholder },
            ...suppliers.map((supplier) => ({
              value: supplier.id,
              label: supplier.name,
            })),
          ]}
          defaultValue={values.supplierId || onlySupplier?.id || ""}
          error={errors.supplierId}
        />
        <TextField
          label={copy.category}
          name="category"
          defaultValue={values.category}
          error={errors.category}
        />
        <TextAreaField
          label={copy.description}
          name="description"
          defaultValue={values.description}
          error={errors.description}
          rows={2}
        />
        <TextField
          label={copy.cost}
          name="variantCost"
          inputMode="numeric"
          defaultValue={values.cost}
          error={errors.cost}
        />
        <input type="hidden" name="variantSwatch" value="" />
        <input type="hidden" name="variantAvailable" value="0" />
        <CheckboxField
          label={copy.priceOnRequest}
          name="variantPriceOnRequest"
          value="0"
          defaultChecked={values.priceOnRequest}
        />
        <CheckboxField
          label={copy.available}
          name="available"
          defaultChecked={values.available}
        />
        <ImageField
          name="image"
          label={copy.photo}
          upload={upload}
          current={currentImage}
        />
        {values.image && !currentImage ? (
          <>
            <input
              type="hidden"
              name="imageAssetId"
              value={values.image.assetId}
            />
            <input type="hidden" name="imageAlt" value={values.image.alt} />
          </>
        ) : null}
        {errors.image ? <p role="alert">{errors.image}</p> : null}
        {extras.length > 0 ? (
          <p className="font-semibold text-ink-900">{copy.variantsTitle}</p>
        ) : null}
        {extras.map((extra, index) => {
          const row = errors.extras?.[index];
          return (
            <div
              key={extra.key}
              className="flex flex-col gap-3 rounded-md border border-admin-line p-4"
            >
              <TextField
                label={copy.variantName}
                name="variantLabel"
                value={extra.label}
                error={row?.label}
                onChange={(event) => {
                  change(index, "label", event.target.value);
                }}
              />
              <TextField
                label={copy.variantPrice}
                name="variantPrice"
                inputMode="numeric"
                value={extra.price}
                error={row?.price}
                onChange={(event) => {
                  change(index, "price", event.target.value);
                }}
              />
              <TextField
                label={copy.variantCost}
                name="variantCost"
                inputMode="numeric"
                value={extra.cost}
                error={row?.cost}
                onChange={(event) => {
                  change(index, "cost", event.target.value);
                }}
              />
              {kept ? (
                <TextField
                  label="Unidades de la variante"
                  name="startingStock"
                  inputMode="numeric"
                  value={extra.stock ?? ""}
                  error={row?.stock}
                  onChange={(event) => {
                    change(index, "stock", event.target.value);
                  }}
                />
              ) : null}
              <input type="hidden" name="variantSwatch" value="" />
              <input
                type="hidden"
                name="variantAvailable"
                value={String(index + 1)}
              />
              <div>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setExtras((current) =>
                      current.filter((_, rowIndex) => rowIndex !== index),
                    );
                  }}
                >
                  {copy.removeVariant}
                </Button>
              </div>
            </div>
          );
        })}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setExtras((current) => [
                ...current,
                { key: nextKey, label: "", price: "", cost: "", stock: "" },
              ]);
              setNextKey((current) => current + 1);
            }}
          >
            {copy.addVariant}
          </Button>
        </div>
      </MoreOptions>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{copy.save}</Button>
        <AdminButtonLink href={cancelHref} variant="outline">
          {copy.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}
