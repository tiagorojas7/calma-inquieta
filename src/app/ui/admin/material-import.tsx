import { Heading, Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { FormError, SelectField, TextAreaField } from "./form-fields";
import { materialCatalogCopy } from "./material-catalog-copy";

const copy = materialCatalogCopy.import;
const LIST = "/admin/materiales";

export interface CatalogIssueView {
  readonly line: number;
  readonly code: keyof typeof copy.codes;
}

export interface CatalogPlanView {
  readonly supplierName: string;
  readonly rowCount: number;
  readonly newMaterials: number;
  readonly newVariants: number;
  readonly priceChanges: number;
  readonly unchanged: number;
  readonly errors: readonly CatalogIssueView[];
  readonly items: readonly {
    readonly line: number;
    readonly product: string;
    readonly measure: string;
    readonly kind: keyof typeof copy.kinds;
    readonly from: number | null;
    readonly to: number | null;
  }[];
}

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const money = (value: number | null): string =>
  value === null ? copy.consult : pesos.format(value);

function issueText(issue: CatalogIssueView): string {
  return copy.errorLine(issue.line, copy.codes[issue.code]);
}

export interface MaterialImportValues {
  readonly supplierId: string;
  readonly csv: string;
}

/** Import screen: choose a supplier and a CSV, review the summary, confirm. */
export function MaterialImport({
  suppliers,
  values,
  plan,
  formError,
  supplierError,
  csvError,
}: {
  suppliers: readonly { readonly id: string; readonly name: string }[];
  values: MaterialImportValues;
  plan: CatalogPlanView | null;
  formError?: string | undefined;
  supplierError?: string | undefined;
  csvError?: string | undefined;
}) {
  const canApply =
    plan !== null &&
    plan.errors.length === 0 &&
    plan.newMaterials + plan.newVariants + plan.priceChanges > 0;
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
      <form
        method="post"
        encType="multipart/form-data"
        noValidate
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="preview" />
        <FormError message={formError} />
        <SelectField
          label={copy.supplier}
          name="supplierId"
          defaultValue={values.supplierId}
          error={supplierError}
          options={[
            { value: "", label: copy.supplierPlaceholder },
            ...suppliers.map((supplier) => ({
              value: supplier.id,
              label: supplier.name,
            })),
          ]}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="catalog-file" className="font-semibold text-ink-900">
            {copy.file}
          </label>
          <input
            id="catalog-file"
            type="file"
            name="file"
            accept=".csv,text/csv,text/plain"
            aria-describedby="catalog-file-hint"
            className="min-h-11 text-base text-ink-900"
          />
          <p id="catalog-file-hint" className="text-sm text-ink-600">
            {copy.fileHint}
          </p>
        </div>
        <TextAreaField
          label={copy.text}
          hint={copy.textHint}
          name="csv"
          rows={6}
          defaultValue={values.csv}
          error={csvError}
        />
        <div>
          <Button type="submit">{copy.preview}</Button>
        </div>
      </form>
      {plan ? (
        <section
          aria-labelledby="import-preview"
          className="flex flex-col gap-4"
        >
          <Heading level={2} id="import-preview">
            {copy.previewTitle}
          </Heading>
          <Text>{copy.previewFor(plan.supplierName)}</Text>
          <ul className="grid gap-1">
            <li>{copy.rows(plan.rowCount)}</li>
            <li>{copy.newMaterials(plan.newMaterials)}</li>
            <li>{copy.newVariants(plan.newVariants)}</li>
            <li>{copy.priceChanges(plan.priceChanges)}</li>
            <li>{copy.unchanged(plan.unchanged)}</li>
          </ul>
          {plan.errors.length > 0 ? (
            <div role="alert" className="flex flex-col gap-2">
              <AdminFeedback
                tone="error"
                title={copy.errorsTitle}
                message={copy.errorsIntro}
              />
              <ul className="grid gap-1">
                {plan.errors.map((issue) => (
                  <li key={`${String(issue.line)}-${issue.code}`}>
                    {issueText(issue)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {plan.items.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Heading level={3}>{copy.itemsTitle}</Heading>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th scope="col">{copy.columns.line}</th>
                      <th scope="col">{copy.columns.product}</th>
                      <th scope="col">{copy.columns.measure}</th>
                      <th scope="col">{copy.columns.change}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.items.map((item) => (
                      <tr key={item.line}>
                        <td>{item.line}</td>
                        <td>{item.product}</td>
                        <td>{item.measure}</td>
                        <td>
                          {copy.kinds[item.kind]}
                          {item.kind === "price-change"
                            ? `: ${money(item.from)} → ${money(item.to)}`
                            : `: ${money(item.to)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {plan.errors.length === 0 && !canApply ? (
            <Text tone="muted">{copy.nothingToDo}</Text>
          ) : null}
          {canApply ? (
            <form method="post">
              <input type="hidden" name="intent" value="apply" />
              <input
                type="hidden"
                name="supplierId"
                value={values.supplierId}
              />
              <input type="hidden" name="csv" value={values.csv} />
              <Button type="submit">{copy.apply}</Button>
            </form>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
