import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import { intensivePublishRulesMessage } from "~/app/admin/issue-messages";
import {
  invalidIntensiveResponse,
  parseIntensiveDraft,
} from "~/app/admin/intensive-form-data";
import {
  formatPercentage,
  formatWholePesos,
} from "~/app/admin/workshop-form-data";
import type { IntensiveWorkshop } from "~/modules/workshops";
import { Heading } from "~/app/ui/atoms/heading";
import { IntensiveForm } from "~/app/ui/admin/intensive-form";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/intensive-detail";

const LIST = "/admin/intensivos";
const copy = adminMicrocopy.intensives;

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
  const draft = parseIntensiveDraft(await request.formData());
  const saved = await context
    .get(servicesContext)
    .intensives.update(actor, params.id, draft);
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

export default function AdminIntensiveDetail() {
  const intensive = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <section className="flex flex-col gap-6">
      <Heading level={1}>{copy.editTitle}</Heading>
      <IntensiveForm
        key={intensive.id}
        values={rejected?.values ?? intensive.values}
        errors={rejected?.errors ?? {}}
        formError={rejected?.formError}
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
