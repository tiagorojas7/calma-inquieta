import { redirect, useActionData, useLoaderData } from "react-router";
import { withFeedback } from "~/app/admin/feedback-code";
import { withIntensiveMissing } from "~/app/admin/intensive-failure";
import {
  parseQuickIntensive,
  publishQuickIntensive,
} from "~/app/admin/intensive-quick";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { invalidIntensiveResponse } from "~/app/admin/intensive-form-data";
import { stockedMaterialChoices } from "~/app/admin/intensive-project-form-data";
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
  capacity: "",
  minSeats: "",
  policyText: "",
  materialsIncluded: false,
  images: [],
};
const EMPTY_PROJECT = {
  name: "",
  price: "",
  deposit: "",
  description: "",
  image: null,
  materials: [],
};

export function meta() {
  return [{ title: "Nuevo workshop | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const listed = await services.teachers.list(actor, "active");
  if (!listed.ok) throw failureResponse(listed.error);
  const variants = await services.materials.listSaleVariants(actor);
  if (!variants.ok) throw failureResponse(variants.error);
  // Stock is shown for information only: a read that fails must not close the
  // screen, so it then shows no stock instead of a misleading zero.
  const onHand = await services.variantStock
    .onHand(variants.value.map((variant) => variant.variantId))
    .catch(() => null);
  return {
    materialChoices: stockedMaterialChoices(variants.value, onHand),
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
  const services = context.get(servicesContext);
  const input = parseQuickIntensive(await request.formData());
  // The workshops module never reads the catalog, so the variants of the bills
  // are checked here against the same list the picker offers.
  const variants = await services.materials.listSaleVariants(actor);
  if (!variants.ok) throw failureResponse(variants.error);
  const outcome = await publishQuickIntensive(
    services.intensives,
    actor,
    input,
    new Set(variants.value.map((variant) => variant.variantId)),
  );
  switch (outcome.kind) {
    case "invalid":
      return invalidIntensiveResponse(
        input.values,
        outcome.issues,
        input.projects,
      );
    case "saved":
      return redirect(withFeedback(`${LIST}/${outcome.id}`, "created"));
    case "published":
      return redirect(withFeedback(`${LIST}/${outcome.id}`, "published"));
    case "partial":
      return redirect(
        withIntensiveMissing(`${LIST}/${outcome.id}`, outcome.rules),
      );
    case "failed":
      throw failureResponse(outcome.failure);
  }
}

export default function AdminIntensiveNew() {
  const { teachers, materialChoices: choices } = useLoaderData<typeof loader>();
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
        projects={rejected?.projects ?? [EMPTY_PROJECT]}
        materialChoices={choices}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
        teachers={teachers}
        cancelHref={LIST}
        mode="new"
      />
    </section>
  );
}
