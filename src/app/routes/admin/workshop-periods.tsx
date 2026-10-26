import { data, redirect, useActionData, useLoaderData } from "react-router";
import { failureResponse } from "~/app/admin/failure-response";
import { servicesContext } from "~/app/context";
import { formatWholePesos } from "~/app/admin/workshop-form-data";
import {
  fieldErrors,
  issueMessage,
  openMonthRulesMessage,
} from "~/app/admin/issue-messages";
import {
  isExactPeriodValue,
  parseOpenMonthIntent,
  parsePeriodValue,
} from "~/app/admin/workshop-period-form-data";
import { WorkshopPeriodsList } from "~/app/ui/admin/workshop-periods-list";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshop-periods";

const LIST = "/admin/talleres";
const copy = adminMicrocopy.workshops.periods;
const emptyPeriodErrors = (): Partial<Record<"period", string>> => ({});

export function meta() {
  return [{ title: "Períodos | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const workshop = await services.monthlyWorkshops.get(actor, params.id);
  if (!workshop.ok) throw failureResponse(workshop.error);
  const listed = await services.workshopPeriods.list(actor, params.id);
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    workshopId: workshop.value.id,
    workshopName: workshop.value.name,
    suggestedNext: listed.value.suggestedNext,
    periods: listed.value.periods.map((period) => ({
      id: period.id,
      period: period.period,
      href: `${LIST}/${params.id}/periodos/${period.period}`,
      status: period.status,
      fee: formatWholePesos(period.fee),
      totalCapacity: period.totalCapacity,
    })),
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  if (parseOpenMonthIntent(form) === null) throw data(null, { status: 400 });
  const period = parsePeriodValue(form);
  if (!isExactPeriodValue(period))
    return data(
      {
        values: { period },
        errors: { period: issueMessage("invalid-format") },
        formError: copy.form.saveFailed,
      },
      { status: 422 },
    );
  const opened = await context
    .get(servicesContext)
    .workshopPeriods.openMonth(actor, params.id, period);
  if (opened.ok) return redirect(`${LIST}/${params.id}/periodos`);
  if (opened.error.kind === "invalid")
    return data(
      {
        values: { period },
        errors: fieldErrors(opened.error.issues),
        formError: opened.error.rules
          ? openMonthRulesMessage(opened.error.rules)
          : copy.form.saveFailed,
      },
      { status: 422 },
    );
  if (opened.error.kind === "rules-unmet")
    return data(
      {
        values: { period },
        errors: emptyPeriodErrors(),
        formError: openMonthRulesMessage(opened.error.rules),
      },
      { status: 422 },
    );
  if (opened.error.kind === "period-exists")
    return data(
      {
        values: { period },
        errors: { period: copy.form.conflict },
        formError: copy.form.saveFailed,
      },
      { status: 422 },
    );
  throw failureResponse(opened.error);
}

export default function AdminWorkshopPeriods() {
  const screen = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <WorkshopPeriodsList
      workshopName={screen.workshopName}
      workshopHref={`${LIST}/${screen.workshopId}`}
      rows={screen.periods}
      form={{
        period: rejected?.values.period ?? screen.suggestedNext ?? "",
        error: rejected?.errors.period,
        formError: rejected?.formError,
      }}
    />
  );
}
