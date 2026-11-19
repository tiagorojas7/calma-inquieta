import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { parseStudentFilter } from "~/app/admin/student-filter";
import { parseActivityFilter } from "~/app/students/activity-filter";
import { monthLabel, ORDER_STATUS_LABELS } from "~/app/enrollment/order-labels";
import { StudentsList } from "~/app/ui/admin/students-list";
import { Money } from "~/modules/_shared";
import { formatPesos, ORDER_STATUSES } from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/students";

export function meta() {
  return [{ title: "Alumnas | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const params = new URL(request.url).searchParams;
  const { query, values } = parseStudentFilter(params);
  const { activity, param } = parseActivityFilter(params);
  const [listed, workshops] = await Promise.all([
    services.students.list(actor, { ...query, activity }),
    services.monthlyWorkshops.list(actor, { status: "live" }),
  ]);
  if (!listed.ok) throw enrollmentFailureResponse(listed.error);
  return {
    filter: { ...values, mostrar: param },
    rows: listed.value.items.map((student) => {
      // What she owes: every pending payment, a material sale included.
      const owed = student.orders
        .filter((order) => order.status === "pending_confirmation")
        .reduce((sum, order) => sum.add(order.total), Money.zero());
      // Her newest monthly record that was not cancelled: a sale is not one.
      const [latest] = student.activities;
      return {
        email: student.email,
        name: student.fullName,
        active: student.active,
        current:
          latest === undefined
            ? null
            : `${latest.workshopName} · ${monthLabel(latest.period)}`,
        owes: owed.isZero() ? null : formatPesos(owed),
      };
    }),
    // A workshop list failure only drops the workshop filter.
    workshops: workshops.ok
      ? workshops.value.map(({ id, name }) => ({ id, name }))
      : [],
    statuses: ORDER_STATUSES.map((status) => ({
      value: status,
      label: ORDER_STATUS_LABELS[status],
    })),
    hasNext: listed.value.hasNext,
  };
}

export default function AdminStudents() {
  return <StudentsList {...useLoaderData<typeof loader>()} />;
}
