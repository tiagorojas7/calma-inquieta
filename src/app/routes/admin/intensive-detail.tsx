import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  fieldErrors,
  intensiveDeleteRuleMessage,
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
  formatPercentage,
  formatWholePesos,
} from "~/app/admin/workshop-form-data";
import type { FieldIssue } from "~/modules/_shared";
import type { IntensiveWorkshop } from "~/modules/workshops";
import { Heading } from "~/app/ui/atoms/heading";
import { AdminButtonLink } from "~/app/ui/admin/admin-button-link";
import { IntensiveForm } from "~/app/ui/admin/intensive-form";
import { IntensiveStatePanel } from "~/app/ui/admin/intensive-state-panel";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/intensive-detail";

const LIST = "/admin/intensivos";
const copy = adminMicrocopy.intensives;

function rescheduleErrors(
  issues: readonly FieldIssue<"eventDate" | "timeRange">[],
): Partial<Record<"eventDate" | "timeRange", string>> {
  return fieldErrors(issues, INTENSIVE_FIELD_MESSAGES);
}

export function meta() {
  return [{ title: "Editar intensivo | Panel | Calma Inquieta" }];
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
  const assigned = intensive.assignment?.teacher.id;
  return {
    id: intensive.id,
    status: intensive.status,
    values: formValues(intensive),
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
  const intensives = context.get(servicesContext).intensives;

  if (intent === "save") {
    const draft = parseIntensiveDraft(form);
    const saved = await intensives.update(actor, params.id, draft);
    if (saved.ok) return redirect(LIST);
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
  if (intent === "reschedule") {
    const schedule = parseIntensiveSchedule(form);
    const changed = await intensives.reschedule(actor, params.id, schedule);
    if (changed.ok) return redirect(`${LIST}/${params.id}`);
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
    if (deleted.ok) return redirect(LIST);
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
  if (changed.ok) return redirect(`${LIST}/${params.id}`);
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

export default function AdminIntensiveDetail() {
  const intensive = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const formRejected = rejected && "values" in rejected ? rejected : undefined;
  const stateError =
    rejected && "stateError" in rejected ? rejected.stateError : undefined;
  const reschedule =
    rejected && "reschedule" in rejected ? rejected.reschedule : undefined;
  return (
    <section className="flex flex-col gap-6">
      <Heading level={1}>{copy.editTitle}</Heading>
      <div>
        <AdminButtonLink
          variant="outline"
          href={`${LIST}/${intensive.id}/reservas`}
        >
          {adminMicrocopy.intensiveRequests.link}
        </AdminButtonLink>
      </div>
      <IntensiveStatePanel
        status={intensive.status}
        schedule={intensive.values}
        error={stateError}
        reschedule={reschedule}
      />
      <IntensiveForm
        key={intensive.id}
        values={formRejected?.values ?? intensive.values}
        errors={formRejected?.errors ?? {}}
        formError={formRejected?.formError}
        teachers={intensive.teachers}
        cancelHref={LIST}
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
