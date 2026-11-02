import { useLoaderData } from "react-router";
import { feedbackCode } from "~/app/admin/feedback-code";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { parseMaterialListQuery } from "~/app/admin/material-list-query";
import { MaterialsList } from "~/app/ui/admin/materials-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/materials";

const FEEDBACK = ["created", "saved"] as const;
const CATALOG_FEEDBACK = ["photo", "imported", "raised"] as const;

export function meta() {
  return [{ title: "Materiales | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const query = parseMaterialListQuery(new URL(request.url).searchParams);
  const services = context.get(servicesContext);
  const [listed, categories, suppliers] = await Promise.all([
    services.materials.list(actor, query.service),
    services.materials.categorySuggestions(actor),
    services.suppliers.list(actor, { active: true }),
  ]);
  if (!listed.ok) throw failureResponse(listed.error);
  if (!categories.ok) throw failureResponse(categories.error);
  if (!suppliers.ok) throw failureResponse(suppliers.error);
  return {
    filter: query.filter,
    feedback: feedbackCode(request, FEEDBACK),
    category: query.category,
    supplierId: query.supplierId,
    withoutImage: query.withoutImage,
    catalogFeedback: feedbackCode(request, CATALOG_FEEDBACK),
    categories: [...categories.value],
    suppliers: suppliers.value.map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
    })),
    rows: listed.value.map((material) => ({
      id: material.id,
      name: material.name,
      category: material.category,
      supplierName: material.supplierName,
      hasImage: material.hasImage,
      variantCount: material.variantCount,
      active: material.active,
      available: material.available,
    })),
  };
}

export default function AdminMaterials() {
  const data = useLoaderData<typeof loader>();
  return <MaterialsList {...data} />;
}
