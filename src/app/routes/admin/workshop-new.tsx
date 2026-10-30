import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { loadTeacherOptions } from "~/app/admin/workshop-action-data";
import { withFailure } from "~/app/admin/failure-code";
import { fieldErrors } from "~/app/admin/issue-messages";
import { WORKSHOP_FIELD_MESSAGES } from "~/app/admin/issue-messages";
import {
  parseQuickWorkshop,
  QUICK_TURNO_ROWS,
  type QuickValues,
} from "~/app/admin/workshop-quick-form";
import { publishQuickWorkshop } from "~/app/admin/workshop-quick-publish";
import { withFeedback } from "~/app/admin/feedback-code";
import { AdminPageHeader } from "~/app/ui/admin/admin-page";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import {
  QuickWorkshopForm,
  type QuickWorkshopFormField,
} from "~/app/ui/admin/workshop-quick-form";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshop-new";

const copy = adminMicrocopy.workshops;
const LIST = "/admin/talleres";

const EMPTY: QuickValues = {
  name: "",
  description: "",
  teacherId: "",
  defaultFee: "",
  percentage: "",
  rows: Array.from({ length: QUICK_TURNO_ROWS }, () => ({
    weekday: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
  })),
  materialIds: [],
};

const FORM_FIELDS = [
  "name",
  "description",
  "defaultFee",
  "teacherId",
  "percentage",
] as const satisfies readonly QuickWorkshopFormField[];

export function meta() {
  return [{ title: "Nuevo taller | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const teachers = await loadTeacherOptions(services.teachers, actor, null);
  if (!teachers.ok) throw failureResponse(teachers.error);
  const materials = await services.materials.listSelectable(actor);
  if (!materials.ok) throw failureResponse(materials.error);
  return {
    teachers: teachers.value,
    materials: materials.value.map(({ id, name }) => ({ id, name })),
  };
}

function rejection(
  values: QuickValues,
  parts: {
    errors?: Partial<Record<QuickWorkshopFormField, string>>;
    turnoErrors?: Record<number, string>;
    turnosError?: string;
  },
) {
  return data(
    {
      values,
      errors: parts.errors ?? {},
      turnoErrors: parts.turnoErrors ?? {},
      turnosError: parts.turnosError,
      formError: copy.form.saveFailed,
    },
    { status: 422 },
  );
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const input = parseQuickWorkshop(await request.formData());
  if (Object.keys(input.turnoErrors).length > 0)
    return rejection(input.values, { turnoErrors: input.turnoErrors });
  const outcome = await publishQuickWorkshop(
    context.get(servicesContext),
    actor,
    input,
  );
  switch (outcome.kind) {
    case "invalid": {
      const all = fieldErrors(outcome.issues, WORKSHOP_FIELD_MESSAGES);
      const errors: Partial<Record<QuickWorkshopFormField, string>> = {};
      for (const field of FORM_FIELDS) {
        const message = all[field];
        if (message) errors[field] = message;
      }
      return rejection(input.values, { errors });
    }
    case "no-turnos":
      return rejection(input.values, {
        turnosError: copy.quick.turnosRequired,
      });
    case "saved":
      return redirect(withFeedback(`${LIST}/${outcome.id}`, "created"));
    case "published":
      return redirect(withFeedback(`${LIST}/${outcome.id}`, "published-open"));
    case "partial":
      return redirect(withFailure(`${LIST}/${outcome.id}`, outcome.step));
    case "failed":
      throw failureResponse(outcome.failure);
  }
}

export default function AdminWorkshopNew() {
  const { teachers, materials } = useLoaderData<typeof loader>();
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
      <QuickWorkshopForm
        values={rejected?.values ?? EMPTY}
        errors={rejected?.errors ?? {}}
        turnoErrors={rejected?.turnoErrors ?? {}}
        turnosError={rejected?.turnosError}
        formError={rejected?.formError}
        teachers={teachers}
        materials={materials}
        cancelHref={LIST}
      />
    </section>
  );
}
