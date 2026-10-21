import { redirect, useActionData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { invalidTeacherResponse } from "~/app/admin/teacher-action-data";
import { parseTeacherDraft } from "~/app/admin/teacher-form-data";
import { Heading } from "~/app/ui/atoms/heading";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { TeacherForm } from "~/app/ui/admin/teacher-form";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/teacher-new";

const copy = adminMicrocopy.teachers;

const EMPTY = { name: "", bioLine: "", phone: "", email: "", modality: "" };

export function meta() {
  return [{ title: "Nuevo profesor | Panel | Calma Inquieta" }];
}

export function loader({ request, context }: Route.LoaderArgs) {
  requireAdmin(request, context);
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const draft = parseTeacherDraft(await request.formData());
  const created = await context
    .get(servicesContext)
    .teachers.create(actor, draft);
  if (created.ok) return redirect("/admin/profesores");
  if (created.error.kind === "invalid")
    return invalidTeacherResponse(draft, created.error.issues);
  throw failureResponse(created.error);
}

export default function AdminTeacherNew() {
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.newTitle}</Heading>
      <TeacherForm
        values={rejected?.values ?? EMPTY}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        submitLabel={copy.form.save}
        cancelHref="/admin/profesores"
      />
    </section>
  );
}
