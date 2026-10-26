import { data, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { formatTimeRange } from "~/app/catalog/format";
import { monthLabel, ORDER_STATUS_LABELS } from "~/app/enrollment/order-labels";
import { OrderPage } from "~/app/ui/templates/order-page";
import type { AppServices } from "~/composition/request-services";
import { buildOrderWhatsAppLink, formatPesos } from "~/modules/enrollments";

type RouteArgs = {
  params: { publicId?: string };
  context: { get(key: typeof servicesContext): AppServices };
};

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
    statusLabel: ORDER_STATUS_LABELS[order.status],
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
