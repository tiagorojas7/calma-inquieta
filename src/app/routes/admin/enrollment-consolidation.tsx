import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentRefusalMessage } from "~/app/admin/enrollment-action-data";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { monthLabel } from "~/app/enrollment/order-labels";
import { EnrollmentConsolidation } from "~/app/ui/admin/enrollment-consolidation";
import { formatPesos } from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-consolidation";

const CORDOBA_OFFSET_MS = 10_800_000;
const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_ORDERS = 200;

export function meta() {
  return [{ title: "Materiales a pedir | Panel | Calma Inquieta" }];
}

function periodOf(value: string | null): string {
  return value !== null && PERIOD_KEY.test(value)
    ? value
    : new Date(Date.now() - CORDOBA_OFFSET_MS).toISOString().slice(0, 7);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const params = new URL(request.url).searchParams;
  const requested = Number(params.get("solicitados"));
  const found = await context
    .get(servicesContext)
    .consolidation.consolidate(actor, periodOf(params.get("mes")));
  if (!found.ok)
    throw found.error.kind === "invalid"
      ? data(null, { status: 400 })
      : enrollmentFailureResponse(found.error);
  const consolidation = found.value;
  return {
    period: consolidation.period,
    periodLabel: monthLabel(consolidation.period),
    grandTotal: formatPesos(consolidation.grandTotal),
    pendingOrders: consolidation.pendingOrders,
    requestedCount:
      Number.isInteger(requested) && requested > 0 ? requested : 0,
    suppliers: consolidation.suppliers.map((supplier) => ({
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      materials: supplier.materials.map((item) => ({
        label: `${item.materialName} ${item.variantLabel}`,
        quantity: item.quantity,
        total: formatPesos(item.total),
      })),
      total: formatPesos(supplier.total),
      summary: supplier.summary,
      orderIds: supplier.pendingRequestOrderIds,
    })),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  if (form.get("intent") !== "mark-requested")
    throw data(null, { status: 400 });
  const period = periodOf(
    typeof form.get("mes") === "string" ? (form.get("mes") as string) : null,
  );
  const orderIds = [
    ...new Set(
      form
        .getAll("orderId")
        .filter((id): id is string => typeof id === "string" && id !== ""),
    ),
  ].slice(0, MAX_ORDERS);
  if (orderIds.length === 0)
    return data({ formError: "No hay pedidos para marcar." }, { status: 422 });

  const outcomes = await context
    .get(servicesContext)
    .enrollments.markMaterialsRequestedBulk(actor, orderIds);
  const failures = outcomes.flatMap((outcome) =>
    outcome.result.ok ? [] : [outcome.result.error],
  );
  const done = outcomes.length - failures.length;
  if (failures.length === 0)
    return redirect(
      `/admin/inscripciones/materiales?mes=${period}&solicitados=${String(done)}`,
    );

  const denied = failures.find((failure) => failure.kind === "denied");
  if (denied) throw enrollmentFailureResponse(denied);
  const reasons = [
    ...new Set(
      failures.map(
        (failure) =>
          enrollmentRefusalMessage(failure) ??
          "No pudimos completar la acción. Probá de nuevo.",
      ),
    ),
  ];
  return data(
    {
      formError: `Se marcaron ${String(done)} de ${String(outcomes.length)} pedidos. ${reasons.join(" ")}`,
    },
    { status: 409 },
  );
}

export default function AdminEnrollmentConsolidation() {
  const loaded = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <EnrollmentConsolidation {...loaded} formError={result?.formError} />;
}
