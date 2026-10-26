import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { parseEnrollmentFilter } from "~/app/admin/enrollment-filter";
import {
  dateLabel,
  monthLabel,
  ORDER_STATUS_LABELS,
} from "~/app/enrollment/order-labels";
import { EnrollmentsList } from "~/app/ui/admin/enrollments-list";
import { formatPesos } from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollments";

const PAGE_SIZE = 50;

export function meta() {
  return [{ title: "Inscripciones | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const { query, values } = parseEnrollmentFilter(
    new URL(request.url).searchParams,
  );
  const [listed, workshops] = await Promise.all([
    services.enrollments.list(actor, query),
    services.monthlyWorkshops.list(actor, { status: "live" }),
  ]);
  if (!listed.ok) throw enrollmentFailureResponse(listed.error);
  return {
    filter: values,
    rows: listed.value.items.map((order) => ({
      id: order.id,
      number: order.number,
      studentName: order.studentName,
      workshopName: order.workshopName,
      month: monthLabel(order.period),
      turno: order.turnoLabel,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status],
      total: formatPesos(order.total),
      requestedOn: dateLabel(order.requestedOn),
    })),
    // A workshop list failure only drops the workshop filter.
    workshops: workshops.ok
      ? workshops.value.map(({ id, name }) => ({ id, name }))
      : [],
    hasNext: listed.value.items.length === PAGE_SIZE,
  };
}

export default function AdminEnrollments() {
  return <EnrollmentsList {...useLoaderData<typeof loader>()} />;
}
