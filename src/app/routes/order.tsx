import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { CATALOG_FORMAT_TEXT, formatTimeRange } from "~/app/catalog/format";
import { OrderPage } from "~/app/ui/templates/order-page";
import type { AppServices } from "~/composition/request-services";
import {
  buildOrderWhatsAppLink,
  formatPesos,
  type OrderStatus,
} from "~/modules/enrollments";

type RouteArgs = {
  params: { publicId?: string };
  context: { get(key: typeof servicesContext): AppServices };
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_confirmation: "Pendiente de confirmación",
  paid: "Cobrado",
  materials_requested: "Solicitado al proveedor",
  materials_received: "Recibido",
  cancelled: "Cancelado",
};

const PERIOD_KEY = /^(\d{4})-(\d{2})$/;

function monthLabel(period: string): string {
  const match = PERIOD_KEY.exec(period);
  const month = CATALOG_FORMAT_TEXT.monthNames[Number(match?.[2]) - 1];
  return match === null || month === undefined
    ? period
    : `${month} ${match[1] ?? ""}`;
}

export async function loader({ context, params }: RouteArgs) {
  const services = context.get(servicesContext);
  const found = await services.publicEnrollments.getOrderByPublicId(
    params.publicId ?? "",
  );
  if (!found.ok) {
    throw data(null, {
      status: found.error.kind === "not-found" ? 404 : 503,
    });
  }
  const order = found.value;
  const profile = await services.siteContent.getBusinessProfile();
  // Project field by field: only these values may leave the server.
  return {
    number: order.number,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    workshopName: order.workshopName,
    month: monthLabel(order.period),
    turno: `${order.turnoLabel} · ${formatTimeRange(order.startsAt, order.endsAt)}`,
    lines: order.lines.map((line) => ({
      label: `${line.materialName} ${line.variantLabel}`,
      quantity: line.quantity,
      lineTotal: formatPesos(line.lineTotal),
    })),
    fee: formatPesos(order.fee),
    materialsTotal: formatPesos(order.materialsTotal),
    total: formatPesos(order.total),
    whatsappHref:
      order.status === "pending_confirmation"
        ? buildOrderWhatsAppLink(order, profile.whatsapp.display)
        : null,
  };
}

export function headers() {
  return {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export function meta() {
  return [
    { title: "Tu pedido" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function OrderRoute() {
  const order = useLoaderData<typeof loader>();
  return <OrderPage {...order} />;
}
