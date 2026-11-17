import { data, redirect, useActionData, useLoaderData } from "react-router";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { intensiveMissing } from "~/app/admin/intensive-failure";
import {
  fieldErrors,
  intensiveDeleteRuleMessage,
  intensiveMissingMessage,
  INTENSIVE_FIELD_MESSAGES,
  intensivePublishRulesMessage,
  transitionRefusedMessage,
} from "~/app/admin/issue-messages";
import {
  invalidIntensiveResponse,
  parseIntensiveDraft,
  parseIntensiveIntent,
  parseIntensiveSchedule,
} from "~/app/admin/intensive-form-data";
import {
  materialChoices,
  materialIssueMessage,
  materialRuleMessage,
  parseMaterialDraft,
  parseProjectDirection,
  parseProjectDraft,
  parseProjectId,
  parseQuantity,
  parseVariantId,
  projectCards,
  projectDeleteMessage,
  rejectedProject,
} from "~/app/admin/intensive-project-form-data";
import {
  formatPercentage,
  formatWholePesos,
} from "~/app/admin/workshop-form-data";
import type { FieldIssue } from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import type { IntensivesService, IntensiveWorkshop } from "~/modules/workshops";
import type { AppServices } from "~/composition/request-services";
import { Heading } from "~/app/ui/atoms/heading";
import { AdminFeedback, AdminPageHeader } from "~/app/ui/admin/admin-page";
import { AdminButtonLink } from "~/app/ui/admin/admin-button-link";
import { IntensiveForm } from "~/app/ui/admin/intensive-form";
import { IntensiveProjects } from "~/app/ui/admin/intensive-projects";
import {
  intensiveHasPrimaryAction,
  IntensiveOtherActions,
  IntensiveStatePanel,
} from "~/app/ui/admin/intensive-state-panel";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/intensive-detail";

const LIST = "/admin/intensivos";
const copy = adminMicrocopy.intensives;
const FEEDBACK_COPY = { ...copy.feedback, ...copy.projects.feedback };

function rescheduleErrors(
  issues: readonly FieldIssue<"eventDate" | "timeRange">[],
): Partial<Record<"eventDate" | "timeRange", string>> {
  return fieldErrors(issues, INTENSIVE_FIELD_MESSAGES);
}

const FEEDBACK = [
  "created",
  "saved",
  "published",
  "paused",
  "cancelled",
  "archived",
  "restored",
  "rescheduled",
  "projectAdded",
  "projectSaved",
  "projectMoved",
  "projectDeleted",
  "materialAdded",
  "materialSaved",
  "materialRemoved",
] as const;

/** The projects section: where a project action returns the owner to. */
const PROJECTS_ANCHOR = "proyectos";
const projectsPath = (id: string) => `${LIST}/${id}#${PROJECTS_ANCHOR}`;

const INTENT_CODE = {
  publish: "published",
  pause: "paused",
  cancel: "cancelled",
  archive: "archived",
  restore: "restored",
} as const;

export function meta() {
  return [{ title: "Editar workshop | Panel | Calma Inquieta" }];
}

function formValues(intensive: IntensiveWorkshop) {
  return {
    name: intensive.name,
    slug: intensive.slug,
    summary: intensive.summary,
    description: intensive.description,
    teacherId: intensive.assignment?.teacher.id ?? "",
    percentage: formatPercentage(intensive.assignment?.percentage ?? null),
    eventDate: intensive.eventDate,
    startsAt: intensive.startsAt,
    endsAt: intensive.endsAt,
    price: formatWholePesos(intensive.price),
    deposit: formatWholePesos(intensive.deposit),
    capacity: String(intensive.capacity),
    minSeats: String(intensive.minSeats),
    policyText: intensive.policyText,
    materialsIncluded: intensive.materialsIncluded,
    images: intensive.images.map((image) => ({
      assetId: image.assetId,
      ...(image.asset ? { src: image.asset.src } : {}),
      alt: image.alt,
    })),
  };
}

function auditDate(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Cordoba",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const found = await services.intensives.get(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  const intensive = found.value;
  const listed = await services.teachers.list(actor, "all");
  if (!listed.ok) throw failureResponse(listed.error);
  const projects = await services.intensives.listProjects(actor, params.id);
  if (!projects.ok) throw failureResponse(projects.error);
  const bill = await services.intensives.listProjectMaterials(actor, params.id);
  if (!bill.ok) throw failureResponse(bill.error);
  const variants = await services.materials.listSaleVariants(actor);
  if (!variants.ok) throw failureResponse(variants.error);
  // Stock is shown for information only: a read that fails must not close the
  // screen, so it then shows no stock instead of a misleading zero.
  const onHand = await services.variantStock
    .onHand(variants.value.map((variant) => variant.variantId))
    .catch(() => null);
  const choices = materialChoices(variants.value, onHand);
  const assigned = intensive.assignment?.teacher.id;
  return {
    id: intensive.id,
    status: intensive.status,
    feedback: feedbackCode(request, FEEDBACK),
    missing: intensiveMissing(request),
    values: formValues(intensive),
    projects: projectCards(projects.value, bill.value, choices),
    materialChoices: choices,
    teachers: listed.value
      .filter((teacher) => teacher.active || teacher.id === assigned)
      .map((teacher) => ({
        id: teacher.id,
        name: teacher.active ? teacher.name : `${teacher.name} (archivado)`,
        modality: teacher.modality,
      })),
    audit: {
      updatedBy: intensive.audit.updatedBy,
      updatedAt: auditDate(intensive.audit.updatedAt),
    },
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const intent = parseIntensiveIntent(form);
  if (intent === null) throw data(null, { status: 400 });
  const services = context.get(servicesContext);
  const intensives = services.intensives;

  if (intent === "save") {
    const draft = parseIntensiveDraft(form);
    const saved = await intensives.update(actor, params.id, draft);
    if (saved.ok)
      return redirect(withFeedback(`${LIST}/${params.id}`, "saved"));
    if (saved.error.kind === "invalid")
      return invalidIntensiveResponse(draft, saved.error.issues);
    if (saved.error.kind === "rules-unmet")
      return data(
        {
          values: draft,
          errors: {},
          formError: intensivePublishRulesMessage(saved.error.rules),
        },
        { status: 422 },
      );
    throw failureResponse(saved.error);
  }
  if (
    intent === "project-add" ||
    intent === "project-save" ||
    intent === "project-move" ||
    intent === "project-delete"
  )
    return projectAction(intent, form, actor, intensives, params.id);
  if (
    intent === "project-material-add" ||
    intent === "project-material-set" ||
    intent === "project-material-remove"
  )
    return materialAction(intent, form, actor, services, params.id);
  if (intent === "reschedule") {
    const schedule = parseIntensiveSchedule(form);
    const changed = await intensives.reschedule(actor, params.id, schedule);
    if (changed.ok)
      return redirect(withFeedback(`${LIST}/${params.id}`, "rescheduled"));
    if (changed.error.kind === "invalid")
      return data(
        {
          reschedule: {
            values: schedule,
            errors: rescheduleErrors(changed.error.issues),
          },
        },
        { status: 422 },
      );
    throw failureResponse(changed.error);
  }
  if (intent === "delete") {
    const deleted = await intensives.delete(actor, params.id);
    if (deleted.ok) return redirect(withFeedback(LIST, "deleted"));
    if (deleted.error.kind === "rules-unmet")
      return data(
        { stateError: intensiveDeleteRuleMessage() },
        { status: 422 },
      );
    throw failureResponse(deleted.error);
  }
  const changed =
    intent === "publish"
      ? await intensives.publish(actor, params.id)
      : intent === "pause"
        ? await intensives.pause(actor, params.id)
        : intent === "cancel"
          ? await intensives.cancel(actor, params.id)
          : intent === "archive"
            ? await intensives.archive(actor, params.id)
            : await intensives.restore(actor, params.id);
  if (changed.ok)
    return redirect(withFeedback(`${LIST}/${params.id}`, INTENT_CODE[intent]));
  if (changed.error.kind === "transition-refused")
    return data(
      {
        stateError: transitionRefusedMessage(
          changed.error.from,
          changed.error.to,
        ),
      },
      { status: 422 },
    );
  if (changed.error.kind === "rules-unmet")
    return data(
      { stateError: intensivePublishRulesMessage(changed.error.rules) },
      { status: 422 },
    );
  throw failureResponse(changed.error);
}

type ProjectIntent =
  "project-add" | "project-save" | "project-move" | "project-delete";

async function projectAction(
  intent: ProjectIntent,
  form: FormData,
  actor: AdminActor,
  intensives: IntensivesService,
  id: string,
) {
  const projectId = parseProjectId(form);
  if (intent === "project-add" || intent === "project-save") {
    const draft = parseProjectDraft(form);
    const saved =
      intent === "project-add"
        ? await intensives.addProject(actor, id, draft)
        : await intensives.updateProject(actor, id, projectId, draft);
    if (saved.ok)
      return redirect(
        withFeedback(
          projectsPath(id),
          intent === "project-add" ? "projectAdded" : "projectSaved",
        ),
      );
    if (saved.error.kind === "invalid")
      return data(
        {
          projects: rejectedProject(
            intent === "project-add" ? "new" : projectId,
            draft,
            form,
            saved.error.issues,
          ),
        },
        { status: 422 },
      );
    throw failureResponse(saved.error);
  }
  if (intent === "project-move") {
    const direction = parseProjectDirection(form);
    if (direction === null) throw data(null, { status: 400 });
    const moved = await intensives.moveProject(actor, id, projectId, direction);
    if (moved.ok)
      return redirect(withFeedback(projectsPath(id), "projectMoved"));
    throw failureResponse(moved.error);
  }
  const deleted = await intensives.deleteProject(actor, id, projectId);
  if (deleted.ok)
    return redirect(withFeedback(projectsPath(id), "projectDeleted"));
  if (deleted.error.kind === "rules-unmet")
    return data(
      { projectError: projectDeleteMessage(deleted.error.rules) },
      { status: 422 },
    );
  throw failureResponse(deleted.error);
}

type MaterialIntent =
  "project-material-add" | "project-material-set" | "project-material-remove";

/** A refused bill line, shown on the project it belongs to. */
const refusedMaterial = (projectId: string, message: string) =>
  data({ projectMaterial: { projectId, message } }, { status: 422 });

async function materialAction(
  intent: MaterialIntent,
  form: FormData,
  actor: AdminActor,
  services: AppServices,
  id: string,
) {
  const intensives = services.intensives;
  const projectId = parseProjectId(form);
  const done = (code: "materialAdded" | "materialSaved" | "materialRemoved") =>
    redirect(withFeedback(projectsPath(id), code));
  if (intent === "project-material-add") {
    const draft = parseMaterialDraft(form);
    // The workshops module never reads the catalog, so the variant is
    // checked here against the same list the picker offers.
    const variants = await services.materials.listSaleVariants(actor);
    if (!variants.ok) throw failureResponse(variants.error);
    if (!variants.value.some((v) => v.variantId === draft.variantId))
      return refusedMaterial(
        projectId,
        adminMicrocopy.intensives.projects.errors.materialUnavailable,
      );
    const added = await intensives.addProjectMaterial(
      actor,
      id,
      projectId,
      draft,
    );
    if (added.ok) return done("materialAdded");
    if (added.error.kind === "invalid")
      return refusedMaterial(
        projectId,
        materialIssueMessage(added.error.issues),
      );
    if (added.error.kind === "rules-unmet")
      return refusedMaterial(projectId, materialRuleMessage(added.error.rules));
    throw failureResponse(added.error);
  }
  const variantId = parseVariantId(form);
  if (intent === "project-material-set") {
    const saved = await intensives.setProjectMaterialQuantity(
      actor,
      id,
      projectId,
      variantId,
      parseQuantity(form),
    );
    if (saved.ok) return done("materialSaved");
    if (saved.error.kind === "invalid")
      return refusedMaterial(
        projectId,
        materialIssueMessage(saved.error.issues),
      );
    throw failureResponse(saved.error);
  }
  const removed = await intensives.removeProjectMaterial(
    actor,
    id,
    projectId,
    variantId,
  );
  if (removed.ok) return done("materialRemoved");
  throw failureResponse(removed.error);
}

export default function AdminIntensiveDetail() {
  const intensive = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const formRejected = rejected && "values" in rejected ? rejected : undefined;
  const stateError =
    rejected && "stateError" in rejected ? rejected.stateError : undefined;
  const reschedule =
    rejected && "reschedule" in rejected ? rejected.reschedule : undefined;
  const projectsRejected =
    rejected && "projects" in rejected ? rejected.projects : undefined;
  const materialRejected =
    rejected && "projectMaterial" in rejected
      ? rejected.projectMaterial
      : undefined;
  const projectError =
    rejected && "projectError" in rejected ? rejected.projectError : undefined;
  const saved = intensive.feedback ? FEEDBACK_COPY[intensive.feedback] : null;
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={intensive.values.name}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title, href: LIST },
          { label: intensive.values.name },
        ]}
        back={{ href: LIST, label: copy.back }}
        actions={
          <AdminButtonLink
            variant="outline"
            href={`${LIST}/${intensive.id}/reservas`}
          >
            {adminMicrocopy.intensiveRequests.link}
          </AdminButtonLink>
        }
      />
      {intensive.missing ? (
        <AdminFeedback
          tone="error"
          title={intensiveMissingMessage(intensive.missing)}
        />
      ) : null}
      {saved ? <AdminFeedback tone="success" title={saved.title} /> : null}
      <IntensiveStatePanel status={intensive.status} error={stateError} />
      <IntensiveForm
        key={intensive.id}
        values={formRejected?.values ?? intensive.values}
        errors={formRejected?.errors ?? {}}
        formError={formRejected?.formError}
        teachers={intensive.teachers}
        cancelHref={LIST}
        saveVariant={
          intensiveHasPrimaryAction(intensive.status) ? "secondary" : "primary"
        }
      />
      <div id={PROJECTS_ANCHOR} className="scroll-mt-4">
        <IntensiveProjects
          projects={intensive.projects}
          materialChoices={intensive.materialChoices}
          rejected={projectsRejected}
          rejectedMaterial={materialRejected}
          error={projectError}
        />
      </div>
      <IntensiveOtherActions
        status={intensive.status}
        schedule={intensive.values}
        reschedule={reschedule}
      />
      <section
        aria-labelledby="intensive-audit-title"
        className="rounded-md bg-sand-100 p-4"
      >
        <Heading level={2} id="intensive-audit-title">
          {copy.audit.title}
        </Heading>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">{copy.audit.by}</dt>
            <dd>{intensive.audit.updatedBy}</dd>
          </div>
          <div>
            <dt className="font-semibold">{copy.audit.at}</dt>
            <dd>{intensive.audit.updatedAt}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
