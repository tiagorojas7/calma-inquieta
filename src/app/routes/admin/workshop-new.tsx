import { redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  invalidWorkshopResponse,
  loadTeacherOptions,
} from "~/app/admin/workshop-action-data";
import { parseWorkshopDraft } from "~/app/admin/workshop-form-data";
import { Heading } from "~/app/ui/atoms/heading";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { WorkshopForm } from "~/app/ui/admin/workshop-form";
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
  if (created.ok) return redirect(LIST);
  if (created.error.kind === "invalid")
    return invalidWorkshopResponse(draft, created.error.issues);
  throw failureResponse(created.error);
}

export default function AdminWorkshopNew() {
  const { teachers } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.newTitle}</Heading>
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
