import { useLoaderData } from "react-router";
import { feedbackCode } from "~/app/admin/feedback-code";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  parseSupplierFilter,
  parseSupplierFilterKey,
} from "~/app/admin/supplier-form-data";
import { SuppliersList } from "~/app/ui/admin/suppliers-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/suppliers";

const FEEDBACK = ["created", "saved"] as const;

export function meta() {
  return [{ title: "Proveedores | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const estado = new URL(request.url).searchParams.get("estado");
  const listed = await context
    .get(servicesContext)
    .suppliers.list(actor, parseSupplierFilter(estado));
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    filter: parseSupplierFilterKey(estado),
    feedback: feedbackCode(request, FEEDBACK),
    rows: listed.value.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      active: supplier.active,
    })),
  };
}

export default function AdminSuppliers() {
  const { filter, rows, feedback } = useLoaderData<typeof loader>();
  return <SuppliersList rows={rows} filter={filter} feedback={feedback} />;
}
