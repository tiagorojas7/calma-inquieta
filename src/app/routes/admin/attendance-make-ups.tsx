import { data, redirect, useLoaderData } from "react-router";
import { isUuid } from "~/app/admin/enrollment-ids";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { failureResponse } from "~/app/admin/failure-response";
import { makeUpsView } from "~/app/attendance/admin-view";
import { servicesContext } from "~/app/context";
import { MakeUpsList } from "~/app/ui/admin/make-ups-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/attendance-make-ups";

const PATH = "/admin/asistencia/recuperaciones";

export function meta() {
  return [{ title: "Recuperaciones | Asistencia | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const listed = await context
    .get(servicesContext)
    .attendance.listMakeUps(actor, "all");
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    ...makeUpsView(listed.value),
    feedback: feedbackCode(request, ["completed"]),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData().catch(() => null);
  if (form === null || form.get("intent") !== "complete")
    throw data(null, { status: 400 });
  const id = form.get("id");
  if (typeof id !== "string" || !isUuid(id)) throw data(null, { status: 404 });
  const done = await context
    .get(servicesContext)
    .attendance.completeMakeUp(actor, id);
  if (!done.ok) throw failureResponse(done.error);
  return redirect(withFeedback(PATH, "completed"));
}

export default function AdminAttendanceMakeUps() {
  const { feedback, ...lists } = useLoaderData<typeof loader>();
  return <MakeUpsList {...lists} completed={feedback === "completed"} />;
}
