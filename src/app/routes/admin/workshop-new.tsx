import { redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  invalidWorkshopResponse,
  loadTeacherOptions,
} from "~/app/admin/workshop-action-data";
import { parseWorkshopDraft } from "~/app/admin/workshop-form-data";
import { AdminPageHeader } from "~/app/ui/admin/admin-page";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { WorkshopForm } from "~/app/ui/admin/workshop-form";
import { withFeedback } from "~/app/admin/feedback-code";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshop-new";

const copy = adminMicrocopy.workshops;
const LIST = "/admin/talleres";

const EMPTY = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  technique: "",
  defaultFee: "",
  teacherId: "",
  percentage: "",
};

export function meta() {
  return [{ title: "Nuevo taller | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const teachers = await loadTeacherOptions(
    context.get(servicesContext).teachers,
    actor,
    null,
  );
  if (!teachers.ok) throw failureResponse(teachers.error);
  return { teachers: teachers.value };
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const draft = parseWorkshopDraft(await request.formData());
  const created = await context
    .get(servicesContext)
    .monthlyWorkshops.create(actor, draft);
  if (created.ok)
    return redirect(withFeedback(`${LIST}/${created.value.id}`, "created"));
  if (created.error.kind === "invalid")
    return invalidWorkshopResponse(draft, created.error.issues);
  throw failureResponse(created.error);
}

export default function AdminWorkshopNew() {
  const { teachers } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.newTitle}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title, href: LIST },
          { label: copy.newTitle },
        ]}
        back={{ href: LIST, label: copy.backToList }}
      />
      <WorkshopForm
        values={rejected?.values ?? EMPTY}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        teachers={teachers}
        published={false}
        cancelHref={LIST}
      />
    </section>
  );
}
