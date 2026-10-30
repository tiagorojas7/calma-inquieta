import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentRefusalMessage } from "~/app/admin/enrollment-action-data";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { isUuid } from "~/app/admin/enrollment-ids";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { whatsappHref } from "~/app/admin/whatsapp-href";
import { monthLabel } from "~/app/enrollment/order-labels";
import {
  EnrollmentConsolidation,
  type DeliveryCardView,
  type MaterialsSection,
} from "~/app/ui/admin/enrollment-consolidation";
import { formatPesos, type DeliveryOrder } from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollment-consolidation";

const CORDOBA_OFFSET_MS = 10_800_000;
const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_ORDERS = 200;
const BASE_PATH = "/admin/inscripciones/materiales";
const FEEDBACK = ["requested", "received"] as const;

export function meta() {
  return [{ title: "Materiales | Panel | Calma Inquieta" }];
}

function periodOf(value: string | null): string {
  return value !== null && PERIOD_KEY.test(value)
    ? value
    : new Date(Date.now() - CORDOBA_OFFSET_MS).toISOString().slice(0, 7);
}

function sectionOf(value: string | null): MaterialsSection {
  return value === "entregar" ? "entregar" : "pedir";
}

function cardOf(order: DeliveryOrder): DeliveryCardView {
  return {
    id: order.id,
    studentName: order.studentName,
    detail: `${order.workshopName} · ${order.turnoLabel}`,
    lines: order.lines.map((line) => ({
      label: `${line.materialName} ${line.variantLabel}`,
      quantity: line.quantity,
    })),
    whatsappHref: whatsappHref(order.phoneDigits),
  };
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const params = new URL(request.url).searchParams;
  const period = periodOf(params.get("mes"));
  const count = Number(params.get("n"));
  const code = feedbackCode(request, FEEDBACK);
  const services = context.get(servicesContext);
  const [found, delivered] = await Promise.all([
    services.consolidation.consolidate(actor, period),
    services.consolidation.deliveries(actor, period),
  ]);
  for (const outcome of [found, delivered])
    if (!outcome.ok)
      throw outcome.error.kind === "invalid"
        ? data(null, { status: 400 })
        : enrollmentFailureResponse(outcome.error);
  if (!found.ok || !delivered.ok) throw data(null, { status: 503 });
  const consolidation = found.value;
  const toDeliver = delivered.value
    .filter((order) => order.status === "materials_requested")
    .map(cardOf);
  const requestable = new Set(
    consolidation.suppliers.flatMap(
      (supplier) => supplier.pendingRequestOrderIds,
    ),
  );
  return {
    period: consolidation.period,
    periodLabel: monthLabel(consolidation.period),
    section: sectionOf(params.get("seccion")),
    counts: { pedir: requestable.size, entregar: toDeliver.length },
    grandTotal: formatPesos(consolidation.grandTotal),
    pendingOrders: consolidation.pendingOrders,
    notice:
      code !== null &&
      Number.isInteger(count) &&
      count > 0 &&
      count <= MAX_ORDERS
        ? { kind: code, count }
        : null,
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
    toDeliver,
    delivered: delivered.value
      .filter((order) => order.status === "materials_received")
      .map(cardOf),
  };
}

const INTENTS = {
  "mark-requested": { code: "requested", method: "markMaterialsRequestedBulk" },
  "mark-received": { code: "received", method: "markMaterialsReceivedBulk" },
} as const;

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const intent = form.get("intent");
  if (intent !== "mark-requested" && intent !== "mark-received")
    throw data(null, { status: 400 });
  const { code, method } = INTENTS[intent];
  const period = periodOf(
    typeof form.get("mes") === "string" ? (form.get("mes") as string) : null,
  );
  const section = sectionOf(
    typeof form.get("seccion") === "string"
      ? (form.get("seccion") as string)
      : null,
  );
  const orderIds = [
    ...new Set(
      form
        .getAll("orderId")
        .filter((id): id is string => typeof id === "string" && isUuid(id)),
    ),
  ].slice(0, MAX_ORDERS);
  if (orderIds.length === 0)
    return data({ formError: "No hay pedidos para marcar." }, { status: 422 });

  const outcomes = await context
    .get(servicesContext)
    .enrollments[method](actor, orderIds);
  const failures = outcomes.flatMap((outcome) =>
    outcome.result.ok ? [] : [outcome.result.error],
  );
  const done = outcomes.length - failures.length;
  if (failures.length === 0)
    return redirect(
      `${withFeedback(`${BASE_PATH}?mes=${period}&seccion=${section}`, code)}&n=${String(done)}`,
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
  return (
    <EnrollmentConsolidation
      {...loaded}
      notice={loaded.notice ?? undefined}
      formError={result?.formError}
    />
  );
}
