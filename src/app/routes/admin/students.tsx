import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { parseStudentFilter } from "~/app/admin/student-filter";
import { parseActivityFilter } from "~/app/students/activity-filter";
import { monthLabel, ORDER_STATUS_LABELS } from "~/app/enrollment/order-labels";
import { StudentsList } from "~/app/ui/admin/students-list";
import { amountOwed, seatDebtsByEmail } from "~/app/admin/student-debt";
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
  const [listed, workshops, seatPayments] = await Promise.all([
    services.students.list(actor, { ...query, activity }),
    services.monthlyWorkshops.list(actor, { status: "live" }),
    services.intensiveRequests.owedPayments(actor),
  ]);
  if (!listed.ok) throw enrollmentFailureResponse(listed.error);
  // Never "Al día" on a guess: without the workshop payments the list fails.
  if (!seatPayments.ok) throw enrollmentFailureResponse(seatPayments.error);
  const seatDebts = seatDebtsByEmail(seatPayments.value);
  return {
    filter: { ...values, mostrar: param },
    rows: listed.value.items.map((student) => {
      // What she owes: the pending fee, the material sales and the workshop
      // deposit or balance.
      const owed = amountOwed(
        student.orders,
        seatDebts.get(student.email) ?? [],
      );
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
