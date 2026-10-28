import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { parseStudentFilter } from "~/app/admin/student-filter";
import { dateLabel, ORDER_STATUS_LABELS } from "~/app/enrollment/order-labels";
import { StudentsList } from "~/app/ui/admin/students-list";
import { ORDER_STATUSES } from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/students";

export function meta() {
  return [{ title: "Alumnas | Panel | Calma Inquieta" }];
}

const CORDOBA_OFFSET_MS = 10_800_000;

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const { query, values } = parseStudentFilter(
    new URL(request.url).searchParams,
  );
  const [listed, workshops] = await Promise.all([
    services.students.list(actor, query),
    services.monthlyWorkshops.list(actor, { status: "live" }),
  ]);
  if (!listed.ok) throw enrollmentFailureResponse(listed.error);
  return {
    filter: values,
    rows: listed.value.items.map((student) => ({
      email: student.email,
      name: student.fullName,
      phone: student.phoneDigits,
      workshops: student.workshops.map((w) => w.name).join(", "),
      orders: student.orders.length,
      lastRequest: dateLabel(
        new Date(student.lastRequestedAt.getTime() - CORDOBA_OFFSET_MS)
          .toISOString()
          .slice(0, 10),
      ),
    })),
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
