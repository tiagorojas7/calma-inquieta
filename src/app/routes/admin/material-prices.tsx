import { data, redirect, useActionData, useLoaderData } from "react-router";
import { withFeedback } from "~/app/admin/feedback-code";
import { failureResponse } from "~/app/admin/failure-response";
import { parsePercent } from "~/app/admin/material-percent";
import { servicesContext } from "~/app/context";
import { materialCatalogCopy } from "~/app/ui/admin/material-catalog-copy";
import { MaterialPrices } from "~/app/ui/admin/material-prices";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/material-prices";

const copy = materialCatalogCopy.prices;
const LIST = "/admin/materiales";

export function meta() {
  return [{ title: "Subir precios | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const [suppliers, categories] = await Promise.all([
    services.suppliers.list(actor, { active: true }),
    services.materials.categorySuggestions(actor),
  ]);
  if (!suppliers.ok) throw failureResponse(suppliers.error);
  if (!categories.ok) throw failureResponse(categories.error);
  return {
    suppliers: suppliers.value.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
    })),
    categories: [...categories.value],
  };
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent !== "preview" && intent !== "apply")
    throw data(null, { status: 400 });

  const values = {
    supplierId: text(form, "supplierId"),
    category: text(form, "category"),
    percent: text(form, "percent"),
  };
  const percent = parsePercent(values.percent);
  if (percent === null)
    return data(
      { values, plan: null, percentError: copy.errors["invalid-percent"] },
      { status: 422 },
    );

  const scope = {
    ...(values.supplierId ? { supplierId: values.supplierId } : {}),
    ...(values.category ? { category: values.category } : {}),
  };
  const materials = context.get(servicesContext).materials;
  const result =
    intent === "preview"
      ? await materials.previewPriceRaise(actor, scope, percent)
      : await materials.raisePrices(actor, scope, percent);
  if (result.ok) {
    if (intent === "apply") return redirect(withFeedback(LIST, "raised"));
    return { values, plan: result.value };
  }
  if (result.error.kind === "invalid-percent")
    return data(
      { values, plan: null, percentError: copy.errors["invalid-percent"] },
      { status: 422 },
    );
  if (result.error.kind === "no-scope")
    return data(
      { values, plan: null, formError: copy.errors["no-scope"] },
      { status: 422 },
    );
  throw failureResponse(result.error);
}

export default function AdminMaterialPrices() {
  const { suppliers, categories } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <MaterialPrices
      suppliers={suppliers}
      categories={categories}
      values={result?.values ?? { supplierId: "", category: "", percent: "" }}
      plan={result?.plan ?? null}
      formError={result && "formError" in result ? result.formError : undefined}
      percentError={
        result && "percentError" in result ? result.percentError : undefined
      }
    />
  );
}
