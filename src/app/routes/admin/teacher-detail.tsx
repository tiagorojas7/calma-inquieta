import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { issueMessage } from "~/app/admin/issue-messages";
import { invalidTeacherResponse } from "~/app/admin/teacher-action-data";
import {
  parseTeacherDraft,
  parseTeacherIntent,
} from "~/app/admin/teacher-form-data";
import { toTeacherSettlement } from "~/app/admin/insights-view";
import { Heading } from "~/app/ui/atoms/heading";
import { TeacherSettlementPanel } from "~/app/ui/admin/teacher-settlement";
import { isPeriod } from "~/modules/insights";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { TeacherForm, TeacherStatePanel } from "~/app/ui/admin/teacher-form";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/teacher-detail";

const copy = adminMicrocopy.teachers;
const LIST = "/admin/profesores";

export function meta() {
  return [{ title: "Editar profesor | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const found = await services.teachers.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  const teacher = found.value;
  // Archiving never removes assignments, so an archived teacher names the
  // activities that still keep her. A read failure only hides the warning.
  const assignments = teacher.active
    ? null
    : await services.monthlyWorkshops.listAssignmentsOfTeacher(
        actor,
        teacher.id,
      );
  // The month falls back to the current one; a failed read only hides the block.
  const month = new URL(request.url).searchParams.get("mes") ?? "";
  const settled = await services.insights.settlements(
    actor,
    isPeriod(month) ? { period: month } : {},
  );
  return {
    id: teacher.id,
    active: teacher.active,
    settlement: settled.ok
      ? toTeacherSettlement(settled.value, teacher.id)
      : null,
    values: {
      name: teacher.name,
      bioLine: teacher.bioLine,
      phone: teacher.phone ?? "",
      email: teacher.email ?? "",
      modality: teacher.modality,
    },
    assignedTo: assignments?.ok
      ? [...assignments.value.monthly, ...assignments.value.intensives].map(
          (activity) => activity.name,
        )
      : [],
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const teachers = context.get(servicesContext).teachers;
  const form = await request.formData();
  const intent = parseTeacherIntent(form);
  if (intent === null) throw data(null, { status: 400 });

  if (intent === "save") {
    const draft = parseTeacherDraft(form);
    const saved = await teachers.update(actor, params.id, draft);
    if (saved.ok) return redirect(LIST);
    if (saved.error.kind === "invalid")
      return invalidTeacherResponse(draft, saved.error.issues);
    throw failureResponse(saved.error);
  }

  const toggled =
    intent === "archive"
      ? await teachers.archive(actor, params.id)
      : await teachers.reactivate(actor, params.id);
  if (toggled.ok) return redirect(`${LIST}/${params.id}`);
  if (toggled.error.kind === "invalid") {
    const [first] = toggled.error.issues;
    return data(
      { stateError: first ? issueMessage(first.code) : copy.form.saveFailed },
      { status: 422 },
    );
  }
  throw failureResponse(toggled.error);
}

export default function AdminTeacherDetail() {
  const teacher = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const formRejected = rejected && "values" in rejected ? rejected : null;
  const stateError =
    rejected && "stateError" in rejected ? rejected.stateError : undefined;
  return (
    <section className="flex flex-col gap-6">
      <Heading level={1}>{copy.editTitle}</Heading>
      <TeacherStatePanel
        active={teacher.active}
        assignedTo={teacher.assignedTo}
        error={stateError}
      />
      {teacher.settlement && (
        <TeacherSettlementPanel
          teacherId={teacher.id}
          settlement={teacher.settlement}
        />
      )}
      <TeacherForm
        key={teacher.id}
        values={formRejected?.values ?? teacher.values}
        errors={formRejected?.errors ?? {}}
        formError={formRejected?.formError}
        submitLabel={copy.form.save}
        cancelHref={LIST}
      />
    </section>
  );
}
