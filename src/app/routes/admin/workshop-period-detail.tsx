import { data, redirect, useActionData, useLoaderData } from "react-router";
import { failureResponse } from "~/app/admin/failure-response";
import { fieldErrors } from "~/app/admin/issue-messages";
import {
  parsePeriodDetailIntent,
  parsePeriodDraft,
} from "~/app/admin/workshop-period-form-data";
import {
  formatPercentage,
  formatWholePesos,
} from "~/app/admin/workshop-form-data";
import { servicesContext } from "~/app/context";
import { Button } from "~/app/ui/atoms/button";
import { Heading } from "~/app/ui/atoms/heading";
import { ConfirmedSubmit } from "~/app/ui/admin/confirmed-submit";
import { FormError } from "~/app/ui/admin/form-fields";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { WorkshopPeriodForm } from "~/app/ui/admin/workshop-period-form";
import {
  parsePeriodKey,
  type WorkshopPeriod,
  type WorkshopPeriodDraft,
} from "~/modules/workshops";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshop-period-detail";

const copy = adminMicrocopy.workshops.periods.detail;
const statuses = adminMicrocopy.workshops.periods.statuses;
const transitionMessage = (
  from: keyof typeof statuses,
  to: keyof typeof statuses,
) => `No se puede pasar de ${statuses[from]} a ${statuses[to]}.`;

async function getPeriod(
  actor: ReturnType<typeof requireAdmin>,
  context: Route.LoaderArgs["context"],
  workshopId: string,
  periodKey: string | undefined,
) {
  const period = parsePeriodKey(periodKey ?? "");
  if (!period.ok) throw data(null, { status: 404 });
  const found = await context
    .get(servicesContext)
    .workshopPeriods.get(actor, workshopId, period.value);
  if (!found.ok) throw failureResponse(found.error);
  return found.value;
}

export function meta() {
  return [{ title: "Período | Panel | Calma Inquieta" }];
}

function formValues(period: WorkshopPeriod, draft?: WorkshopPeriodDraft) {
  const capacities = new Map(
    draft?.capacities.map(({ turnoId, capacity }) => [turnoId, capacity]),
  );
  return {
    fee: draft?.fee ?? formatWholePesos(period.fee),
    materialsRequired: draft?.materialsRequired ?? period.materialsRequired,
    projectTitle: draft?.projectTitle ?? period.project.title,
    projectDescription: draft?.projectDescription ?? period.project.description,
    capacities: period.turnos.map((turno) => ({
      turnoId: turno.turnoId,
      label: turno.label,
      capacity: capacities.get(turno.turnoId) ?? String(turno.capacity),
    })),
    snapshotPercentage:
      draft?.snapshotPercentage ?? formatPercentage(period.snapshot.percentage),
    materialIds:
      draft?.materialIds ?? period.materials.map((material) => material.id),
  };
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const period = await getPeriod(actor, context, params.id, params.period);
  const historicalOptions = period.materials.map((material) => ({
    ...material,
    historical: true,
  }));
  let materialOptions = historicalOptions;
  if (period.status !== "closed") {
    const selectable = await context
      .get(servicesContext)
      .materials.listSelectable(actor);
    if (!selectable.ok) throw failureResponse(selectable.error);
    const selectableIds = new Set(
      selectable.value.map((material) => material.id),
    );
    materialOptions = [
      ...selectable.value.map((material) => ({
        id: material.id,
        name: material.name,
        active: material.active,
        available: material.available,
        historical: false,
      })),
      ...historicalOptions.filter(
        (material) => !selectableIds.has(material.id),
      ),
    ];
  }
  return {
    period: period.period,
    status: period.status,
    values: formValues(period),
    images: period.project.images.map((image) => ({ alt: image.alt })),
    materialOptions,
    materials: period.materials,
    snapshot: {
      teacherName: period.snapshot.teacher.name,
      modality: period.snapshot.modality,
      percentage: formatPercentage(period.snapshot.percentage),
    },
    audit: {
      updatedBy: period.audit.updatedBy,
      updatedAt: new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Cordoba",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(period.audit.updatedAt),
    },
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const intent = parsePeriodDetailIntent(form);
  if (intent === null) throw data(null, { status: 400 });
  const period = await getPeriod(actor, context, params.id, params.period);
  const periods = context.get(servicesContext).workshopPeriods;
  if (intent === "save") {
    const draft = parsePeriodDraft(form, period);
    const saved = await periods.update(actor, period.id, draft);
    if (saved.ok)
      return redirect(`/admin/talleres/${params.id}/periodos/${period.period}`);
    const values = formValues(period, draft);
    const rejected = { values, formError: undefined };
    if (saved.error.kind === "invalid")
      return data(
        {
          ...rejected,
          errors: fieldErrors(saved.error.issues, {
            materialIds: { duplicate: copy.duplicateMaterial },
          }),
        },
        { status: 422 },
      );
    if (saved.error.kind === "period-closed")
      return data(
        { values, errors: {}, formError: copy.periodClosed },
        { status: 422 },
      );
    if (saved.error.kind === "capacity-below-confirmed")
      return data(
        { ...rejected, errors: { capacities: copy.capacityFloor } },
        { status: 422 },
      );
    throw failureResponse(saved.error);
  }
  const transitioned = await periods[intent](actor, period.id);
  if (transitioned.ok)
    return redirect(
      intent === "delete"
        ? `/admin/talleres/${params.id}/periodos`
        : `/admin/talleres/${params.id}/periodos/${period.period}`,
    );
  if (transitioned.error.kind === "transition-refused")
    return data(
      {
        stateError: transitionMessage(
          transitioned.error.from,
          transitioned.error.to,
        ),
      },
      { status: 422 },
    );
  throw failureResponse(transitioned.error);
}

export default function AdminWorkshopPeriodDetail() {
  const screen = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const formRejected = rejected && "values" in rejected ? rejected : undefined;
  const stateError =
    rejected && "stateError" in rejected ? rejected.stateError : undefined;
  return (
    <section className="flex max-w-prose flex-col gap-6">
      <Heading level={1}>{copy.title(screen.period)}</Heading>
      {screen.status !== "closed" && (
        <WorkshopPeriodForm
          values={formRejected?.values ?? screen.values}
          materialOptions={screen.materialOptions}
          errors={formRejected?.errors ?? {}}
          formError={formRejected?.formError}
        />
      )}
      {screen.status !== "closed" && (
        <section
          aria-labelledby="period-actions-title"
          className="flex flex-col gap-3"
        >
          <Heading level={2} id="period-actions-title">
            {copy.actions}
          </Heading>
          <FormError message={stateError} />
          <div className="flex flex-wrap gap-3">
            {screen.status === "draft" && (
              <form method="post">
                <input type="hidden" name="intent" value="publish" />
                <Button type="submit">{copy.publish}</Button>
              </form>
            )}
            {screen.status === "open" && (
              <ConfirmedSubmit
                intent="close"
                label={copy.close}
                title={copy.confirm.close.title}
                message={copy.confirm.close.message}
              />
            )}
            {screen.status === "draft" && (
              <ConfirmedSubmit
                intent="delete"
                label={copy.delete}
                title={copy.confirm.delete.title}
                message={copy.confirm.delete.message}
                tone="destructive"
              />
            )}
          </div>
        </section>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="font-semibold">{copy.status}</dt>
          <dd>{statuses[screen.status]}</dd>
        </div>
        <div>
          <dt className="font-semibold">{copy.fee}</dt>
          <dd>{screen.values.fee}</dd>
        </div>
        <div>
          <dt className="font-semibold">{copy.materialsRequired}</dt>
          <dd>{screen.values.materialsRequired ? copy.yes : copy.no}</dd>
        </div>
      </dl>
      <section aria-labelledby="period-project-title">
        <Heading level={2} id="period-project-title">
          {copy.project}
        </Heading>
        <dl className="mt-3 grid gap-3">
          <div>
            <dt className="font-semibold">{copy.projectTitle}</dt>
            <dd>{screen.values.projectTitle}</dd>
          </div>
          <div>
            <dt className="font-semibold">{copy.projectDescription}</dt>
            <dd>{screen.values.projectDescription}</dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="period-capacities-title">
        <Heading level={2} id="period-capacities-title">
          {copy.capacities}
        </Heading>
        <ul className="mt-3 flex flex-col gap-1">
          {screen.values.capacities.map((capacity) => (
            <li key={capacity.turnoId}>
              {copy.capacity(capacity.label, capacity.capacity)}
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="period-history-title"
        className="grid gap-6 sm:grid-cols-2"
      >
        <div>
          <Heading level={2} id="period-history-title">
            {copy.history}
          </Heading>
          <dl className="mt-3 flex flex-col gap-1">
            <div>
              <dt className="inline font-semibold">{copy.teacher}: </dt>
              <dd className="inline">{screen.snapshot.teacherName}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{copy.modality}: </dt>
              <dd className="inline">
                {copy.modalities[screen.snapshot.modality]}
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">{copy.percentage}: </dt>
              <dd className="inline">
                {screen.snapshot.percentage || copy.notApplicable}
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">{copy.updatedBy}: </dt>
              <dd className="inline">{screen.audit.updatedBy}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">{copy.updatedAt}: </dt>
              <dd className="inline">{screen.audit.updatedAt}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col gap-4">
          <section aria-labelledby="period-materials-title">
            <Heading level={2} id="period-materials-title">
              {copy.historicalMaterials}
            </Heading>
            <ul className="mt-3 flex flex-col gap-1">
              {screen.materials.map((material) => (
                <li key={material.id}>{copy.material(material)}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="period-images-title">
            <Heading level={2} id="period-images-title">
              {copy.images}
            </Heading>
            <ul className="mt-3 flex flex-col gap-1">
              {screen.images.map((image) => (
                <li key={image.alt}>{image.alt}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </section>
  );
}
