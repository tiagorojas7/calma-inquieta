import { data, redirect, useActionData, useLoaderData } from "react-router";
import { withFeedback } from "~/app/admin/feedback-code";
import { failureResponse } from "~/app/admin/failure-response";
import { servicesContext } from "~/app/context";
import { materialCatalogCopy } from "~/app/ui/admin/material-catalog-copy";
import { MaterialImport } from "~/app/ui/admin/material-import";
import { CATALOG_MAX_BYTES } from "~/modules/materials";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/material-import";

const copy = materialCatalogCopy.import;
const LIST = "/admin/materiales";

export function meta() {
  return [{ title: "Importar catálogo | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const listed = await context
    .get(servicesContext)
    .suppliers.list(actor, { active: true });
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    suppliers: listed.value.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
    })),
  };
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

interface Problem {
  readonly formError?: string;
  readonly supplierError?: string;
  readonly csvError?: string;
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent !== "preview" && intent !== "apply")
    throw data(null, { status: 400 });

  const supplierId = text(form, "supplierId");
  let csv = text(form, "csv");
  const rejected = (problem: Problem) =>
    data(
      { values: { supplierId, csv }, plan: null, ...problem },
      { status: 422 },
    );

  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > CATALOG_MAX_BYTES) {
      csv = "";
      return rejected({ csvError: copy.fileErrors["too-large"] });
    }
    csv = await file.text();
  }
  if (!supplierId) return rejected({ supplierError: copy.noSupplier });
  if (csv.trim() === "") return rejected({ csvError: copy.noFile });

  const materials = context.get(servicesContext).materials;
  const result =
    intent === "preview"
      ? await materials.previewCatalogImport(actor, supplierId, csv)
      : await materials.importCatalog(actor, supplierId, csv);
  if (result.ok) {
    if (intent === "apply") return redirect(withFeedback(LIST, "imported"));
    return { values: { supplierId, csv }, plan: result.value };
  }
  switch (result.error.kind) {
    case "file":
      return rejected({ csvError: copy.fileErrors[result.error.reason] });
    case "has-errors":
      return rejected({ formError: copy.hasErrors });
    case "invalid":
      return rejected({ supplierError: copy.archivedSupplier });
    case "not-found":
      return rejected({ supplierError: copy.noSupplier });
    default:
      throw failureResponse(result.error);
  }
}

export default function AdminMaterialImport() {
  const { suppliers } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <MaterialImport
      suppliers={suppliers}
      values={result?.values ?? { supplierId: "", csv: "" }}
      plan={result?.plan ?? null}
      formError={result && "formError" in result ? result.formError : undefined}
      supplierError={
        result && "supplierError" in result ? result.supplierError : undefined
      }
      csvError={result && "csvError" in result ? result.csvError : undefined}
    />
  );
}
