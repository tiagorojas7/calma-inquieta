import { Heading, Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminPageHeader } from "./admin-page";
import { FormError, SelectField, TextField } from "./form-fields";
import { materialCatalogCopy } from "./material-catalog-copy";

const copy = materialCatalogCopy.prices;
const LIST = "/admin/materiales";
const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export interface PriceRaisePlanView {
  readonly materialCount: number;
  readonly variantCount: number;
  readonly skippedWithoutPrice: number;
  readonly beforeTotal: number;
  readonly afterTotal: number;
  readonly changes: readonly {
    readonly materialId: string;
    readonly name: string;
    readonly variants: readonly {
      readonly label: string;
      readonly from: number;
      readonly to: number;
    }[];
  }[];
}

export interface MaterialPricesValues {
  readonly supplierId: string;
  readonly category: string;
  readonly percent: string;
}

/** Percentage raise by supplier or category, with a before/after preview. */
export function MaterialPrices({
  suppliers,
  categories,
  values,
  plan,
  formError,
  percentError,
}: {
  suppliers: readonly { readonly id: string; readonly name: string }[];
  categories: readonly string[];
  values: MaterialPricesValues;
  plan: PriceRaisePlanView | null;
  formError?: string | undefined;
  percentError?: string | undefined;
}) {
  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <AdminPageHeader
        title={copy.title}
        description={copy.intro}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: "Materiales", href: LIST },
          { label: copy.title },
        ]}
        back={{ href: LIST, label: copy.back }}
      />
      <form method="post" noValidate className="flex flex-col gap-4">
        <input type="hidden" name="intent" value="preview" />
        <FormError message={formError} />
        <SelectField
          label={copy.supplier}
          name="supplierId"
          defaultValue={values.supplierId}
          options={[
            { value: "", label: copy.anySupplier },
            ...suppliers.map((supplier) => ({
              value: supplier.id,
              label: supplier.name,
            })),
          ]}
        />
        <SelectField
          label={copy.category}
          name="category"
          defaultValue={values.category}
          options={[
            { value: "", label: copy.anyCategory },
            ...categories.map((name) => ({ value: name, label: name })),
          ]}
        />
        <TextField
          label={copy.percent}
          hint={copy.percentHint}
          name="percent"
          inputMode="decimal"
          defaultValue={values.percent}
          error={percentError}
        />
        <div>
          <Button type="submit">{copy.preview}</Button>
        </div>
      </form>
      {plan ? (
        <section
          aria-labelledby="raise-preview"
          className="flex flex-col gap-4"
        >
          <Heading level={2} id="raise-preview">
            {copy.previewTitle}
          </Heading>
          <ul className="grid gap-1">
            <li>{copy.summary(plan.materialCount, plan.variantCount)}</li>
            <li>{copy.before(pesos.format(plan.beforeTotal))}</li>
            <li>{copy.after(pesos.format(plan.afterTotal))}</li>
            <li>{copy.skipped(plan.skippedWithoutPrice)}</li>
          </ul>
          {plan.changes.length === 0 ? (
            <Text tone="muted">{copy.nothing}</Text>
          ) : (
            <>
              <ul className="grid gap-2">
                {plan.changes.map((change) => (
                  <li key={change.materialId}>
                    <strong>{change.name}</strong>
                    <ul>
                      {change.variants.map((variant) => (
                        <li key={variant.label}>
                          {`${variant.label}: ${copy.change(pesos.format(variant.from), pesos.format(variant.to))}`}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <form method="post">
                <input type="hidden" name="intent" value="apply" />
                <input
                  type="hidden"
                  name="supplierId"
                  value={values.supplierId}
                />
                <input type="hidden" name="category" value={values.category} />
                <input type="hidden" name="percent" value={values.percent} />
                <Button type="submit">{copy.apply}</Button>
              </form>
            </>
          )}
        </section>
      ) : null}
    </section>
  );
}
