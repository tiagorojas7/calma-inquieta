import { redirect, useActionData, useLoaderData } from "react-router";
import { withFeedback } from "~/app/admin/feedback-code";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  invalidIntensiveResponse,
  parseIntensiveDraft,
} from "~/app/admin/intensive-form-data";
import { AdminPageHeader } from "~/app/ui/admin/admin-page";
import { IntensiveForm } from "~/app/ui/admin/intensive-form";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/intensive-new";

const LIST = "/admin/intensivos";
const EMPTY = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  teacherId: "",
  percentage: "",
  eventDate: "",
  startsAt: "",
  endsAt: "",
  price: "",
  deposit: "",
  capacity: "",
  minSeats: "",
  policyText: "",
  materialsIncluded: false,
  images: [],
};

export function meta() {
  return [{ title: "Nuevo intensivo | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const listed = await context
    .get(servicesContext)
    .teachers.list(actor, "active");
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    teachers: listed.value
      .filter((teacher) => teacher.active)
      .map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        modality: teacher.modality,
      })),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const draft = parseIntensiveDraft(await request.formData());
  const created = await context
    .get(servicesContext)
    .intensives.create(actor, draft);
  if (created.ok) return redirect(withFeedback(LIST, "created"));
  if (created.error.kind === "invalid")
    return invalidIntensiveResponse(draft, created.error.issues);
  throw failureResponse(created.error);
}

export default function AdminIntensiveNew() {
  const { teachers } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={adminMicrocopy.intensives.newTitle}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: adminMicrocopy.intensives.title, href: LIST },
          { label: adminMicrocopy.intensives.newTitle },
        ]}
        back={{ href: LIST, label: adminMicrocopy.intensives.back }}
      />
      <IntensiveForm
        values={rejected?.values ?? EMPTY}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        teachers={teachers}
        cancelHref={LIST}
      />
    </section>
  );
}
