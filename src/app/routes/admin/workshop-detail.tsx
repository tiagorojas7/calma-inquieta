import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  invalidWorkshopResponse,
  loadTeacherOptions,
  stateFailureMessage,
  stateRefusedResponse,
  workshopFormValues,
} from "~/app/admin/workshop-action-data";
import {
  parseWorkshopDraft,
  parseWorkshopIntent,
} from "~/app/admin/workshop-form-data";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { workshopReadiness } from "~/app/admin/workshop-readiness";
import { cordobaMonthOf } from "~/modules/workshops";
import { AdminButtonLink } from "~/app/ui/admin/admin-button-link";
import { AdminFeedback, AdminPageHeader } from "~/app/ui/admin/admin-page";
import { ReadinessChecklist } from "~/app/ui/admin/workshop-readiness";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { WorkshopForm, WorkshopStatePanel } from "~/app/ui/admin/workshop-form";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshop-detail";

const copy = adminMicrocopy.workshops;
const LIST = "/admin/talleres";
const FEEDBACK = [
  "created",
  "saved",
  "published",
  "paused",
  "archived",
  "restored",
] as const;
const CHANGED_CODE = {
  publish: "published",
  pause: "paused",
  archive: "archived",
  restore: "restored",
} as const;

export function meta() {
  return [{ title: "Editar taller | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const found = await services.monthlyWorkshops.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  const workshop = found.value;
  const teachers = await loadTeacherOptions(services.teachers, actor, workshop);
  if (!teachers.ok) throw failureResponse(teachers.error);
  const month = cordobaMonthOf(new Date());
  const period = await services.workshopPeriods.get(actor, workshop.id, month);
  if (!period.ok && period.error.kind !== "not-found")
    throw failureResponse(period.error);
  const readiness = workshopReadiness({
    workshopId: workshop.id,
    status: workshop.status,
    activeTurnos: workshop.turnos.filter((turno) => turno.active).length,
    month,
    period: period.ok
      ? {
          status: period.value.status,
          totalCapacity: period.value.turnos.reduce(
            (sum, turno) => sum + turno.capacity,
            0,
          ),
          materialsRequired: period.value.materialsRequired,
          materialsCount: period.value.materials.length,
        }
      : null,
  });
  return {
    feedback: feedbackCode(request, FEEDBACK),
    readiness: {
      monthName: readiness.monthName,
      summary: readiness.summary,
      complete: readiness.complete,
      steps: readiness.steps.map(({ key, label, done, href }) => ({
        key,
        label,
        done,
        href,
      })),
      next: readiness.next
        ? { cta: readiness.next.cta, href: readiness.next.href }
        : null,
    },
    id: workshop.id,
    name: workshop.name,
    status: workshop.status,
    published: workshop.status === "published",
    values: workshopFormValues(workshop),
    teachers: teachers.value,
    activeTurnos: workshop.turnos.filter((turno) => turno.active).length,
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const workshops = context.get(servicesContext).monthlyWorkshops;
  const form = await request.formData();
  const intent = parseWorkshopIntent(form);
  if (intent === null) throw data(null, { status: 400 });

  if (intent === "save") {
    const draft = parseWorkshopDraft(form);
    const saved = await workshops.update(actor, params.id, draft);
    if (saved.ok)
      return redirect(withFeedback(`${LIST}/${params.id}`, "saved"));
    if (saved.error.kind === "invalid")
      return invalidWorkshopResponse(draft, saved.error.issues);
    throw failureResponse(saved.error);
  }

  if (intent === "delete") {
    const deleted = await workshops.delete(actor, params.id);
    if (deleted.ok) return redirect(withFeedback(LIST, "deleted"));
    if (deleted.error.kind === "rules-unmet")
      return stateRefusedResponse(stateFailureMessage(deleted.error));
    throw failureResponse(deleted.error);
  }

  const changed =
    intent === "publish"
      ? await workshops.publish(actor, params.id)
      : intent === "pause"
        ? await workshops.pause(actor, params.id)
        : intent === "archive"
          ? await workshops.archive(actor, params.id)
          : await workshops.restore(actor, params.id);
  if (changed.ok)
    return redirect(
      withFeedback(`${LIST}/${params.id}#estado`, CHANGED_CODE[intent]),
    );
  if (
    changed.error.kind === "transition-refused" ||
    changed.error.kind === "rules-unmet"
  )
    return stateRefusedResponse(stateFailureMessage(changed.error));
  throw failureResponse(changed.error);
}

export default function AdminWorkshopDetail() {
  const workshop = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const formRejected = rejected && "values" in rejected ? rejected : null;
  const stateError =
    rejected && "stateError" in rejected ? rejected.stateError : undefined;
  const saved = workshop.feedback ? copy.feedback[workshop.feedback] : null;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={workshop.name}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title, href: LIST },
          { label: workshop.name },
        ]}
        back={{ href: LIST, label: copy.backToList }}
        actions={
          <div className="flex flex-wrap gap-3">
            <AdminButtonLink
              href={`${LIST}/${workshop.id}/turnos`}
              variant="outline"
            >
              {copy.turnos.manage}
            </AdminButtonLink>
            <AdminButtonLink
              href={`${LIST}/${workshop.id}/periodos`}
              variant="outline"
            >
              {copy.periods.manage}
            </AdminButtonLink>
          </div>
        }
      />
      {saved ? (
        <AdminFeedback
          tone="success"
          title={saved.title}
          message={"message" in saved ? saved.message : undefined}
        />
      ) : null}
      <ReadinessChecklist {...workshop.readiness} />
      <div id="estado">
        <WorkshopStatePanel
          status={workshop.status}
          activeTurnos={workshop.activeTurnos}
          error={stateError}
        />
      </div>
      <WorkshopForm
        key={workshop.id}
        values={formRejected?.values ?? workshop.values}
        errors={formRejected?.errors ?? {}}
        formError={formRejected?.formError}
        teachers={workshop.teachers}
        published={workshop.published}
        cancelHref={LIST}
      />
    </section>
  );
}
