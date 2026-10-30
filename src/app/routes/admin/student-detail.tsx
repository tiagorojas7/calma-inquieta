import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import {
  dateLabel,
  dateTimeLabel,
  monthLabel,
  ORDER_STATUS_LABELS,
} from "~/app/enrollment/order-labels";
import { StudentDetail } from "~/app/ui/admin/student-detail";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { formatPesos } from "~/modules/enrollments";
import { normalizeStudentEmail } from "~/modules/students";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/student-detail";

export function meta() {
  return [{ title: "Alumna | Panel | Calma Inquieta" }];
}

const CORDOBA_OFFSET_MS = 10_800_000;
const copy = adminMicrocopy.students.detail;
const FEEDBACK = ["note-saved"] as const;

/** The email in the path, or a 404 for anything that cannot be one. */
function emailParam(value: string | undefined): string {
  const email = normalizeStudentEmail(value ?? "");
  if (!email.includes("@")) throw data(null, { status: 404 });
  return email;
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const email = emailParam(params.email);
  const services = context.get(servicesContext);
  const [found, summary] = await Promise.all([
    services.students.detail(actor, email),
    services.attendance.studentSummary(actor, email),
  ]);
  if (!found.ok) throw enrollmentFailureResponse(found.error);
  const student = found.value;
  return {
    feedback: feedbackCode(request, FEEDBACK),
    name: student.fullName,
    email: student.email,
    phone: student.phoneDigits,
    activities: student.activities.map((activity) => ({
      workshop: activity.workshopName,
      month: monthLabel(activity.period),
      turno: activity.turnoLabel,
      status: activity.status,
      statusLabel: ORDER_STATUS_LABELS[activity.status],
    })),
    orders: student.orders.map((order) => ({
      id: order.id,
      number: order.number,
      workshop: order.workshopName,
      month: monthLabel(order.period),
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status],
      total: formatPesos(order.total),
      paidOn: order.paidAt
        ? dateLabel(
            new Date(order.paidAt.getTime() - CORDOBA_OFFSET_MS)
              .toISOString()
              .slice(0, 10),
          )
        : null,
    })),
    // Attendance is optional here: the student file still opens without it.
    attendance: summary.ok
      ? {
          present: String(summary.value.present),
          absent: String(summary.value.absent),
          makeUpsPending: String(summary.value.makeUpsPending),
          makeUpsDone: String(summary.value.makeUpsDone),
        }
      : null,
    note: {
      text: student.note?.text ?? "",
      meta: student.note
        ? copy.notes.updated(
            student.note.updatedBy,
            dateTimeLabel(student.note.updatedAt),
          )
        : null,
    },
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const email = emailParam(params.email);
  const form = await request.formData().catch(() => null);
  const note = form?.get("note");
  if (typeof note !== "string") throw data(null, { status: 400 });
  const saved = await context
    .get(servicesContext)
    .students.saveNote(actor, email, note);
  if (saved.ok)
    return redirect(
      withFeedback(`/admin/alumnas/${encodeURIComponent(email)}`, "note-saved"),
    );
  if (saved.error.kind === "invalid")
    return data({ error: copy.notes.tooLong, value: note }, { status: 422 });
  throw enrollmentFailureResponse(saved.error);
}

export default function AdminStudentDetail() {
  const { feedback, ...student } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <StudentDetail
      student={student}
      feedback={feedback}
      {...(result ? { form: result } : {})}
    />
  );
}
