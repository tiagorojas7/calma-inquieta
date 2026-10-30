import { data, redirect, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  parseWorkshopFilter,
  parseWorkshopFilterKey,
} from "~/app/admin/workshop-form-data";
import {
  isExactPeriodValue,
  parseOpenMonthIntent,
  parsePeriodValue,
} from "~/app/admin/workshop-period-form-data";
import { monthName, workshopReadiness } from "~/app/admin/workshop-readiness";
import { openNextMonth } from "~/app/admin/workshop-quick-publish";
import { withFailure } from "~/app/admin/failure-code";
import { cordobaMonthOf } from "~/modules/workshops";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { WorkshopsList } from "~/app/ui/admin/workshops-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/workshops";

const LIST = "/admin/talleres";

export function meta() {
  return [{ title: "Talleres | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const estado = new URL(request.url).searchParams.get("estado");
  const services = context.get(servicesContext);
  const listed = await services.monthlyWorkshops.list(actor, {
    status: parseWorkshopFilter(estado),
  });
  if (!listed.ok) throw failureResponse(listed.error);
  const month = cordobaMonthOf(new Date());
  const rows = await Promise.all(
    listed.value.map(async (workshop) => {
      const periods = await services.workshopPeriods.list(actor, workshop.id);
      if (!periods.ok) throw failureResponse(periods.error);
      const current = periods.value.periods.find(
        (period) => period.period === month,
      );
      const readiness = workshopReadiness({
        workshopId: workshop.id,
        status: workshop.status,
        activeTurnos: workshop.activeTurnos,
        month,
        period: current
          ? {
              status: current.status,
              totalCapacity: current.totalCapacity,
              materialsRequired: false,
              materialsCount: null,
            }
          : null,
      });
      // "Abrir <mes>" is offered for the next month nobody has opened yet,
      // unless the latest month is still a draft that needs publishing first.
      const { suggestedNext } = periods.value;
      const latest = periods.value.periods.reduce<
        (typeof periods.value.periods)[number] | null
      >(
        (best, item) => (best && best.period > item.period ? best : item),
        null,
      );
      const openNext =
        workshop.status === "published" &&
        suggestedNext !== null &&
        (latest === null || latest.status !== "draft") &&
        !periods.value.periods.some((item) => item.period === suggestedNext)
          ? { period: suggestedNext, label: monthName(suggestedNext) }
          : null;
      const monthStep = readiness.next?.key === "month";
      return {
        id: workshop.id,
        name: workshop.name,
        teacherName: workshop.teacherName,
        status: workshop.status,
        activeTurnos: workshop.activeTurnos,
        enrollment: {
          open: readiness.complete,
          summary: readiness.summary,
          cta: monthStep && openNext ? null : (readiness.next?.cta ?? null),
          href: monthStep && openNext ? null : (readiness.next?.href ?? null),
        },
        openNext,
      };
    }),
  );
  return {
    filter: parseWorkshopFilterKey(estado),
    rows,
    feedback: feedbackCode(request, ["deleted", "opened"] as const),
  };
}

/** "Abrir <mes>": one post opens the month copying the previous one and publishes it. */
export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  if (parseOpenMonthIntent(form) === null) throw data(null, { status: 400 });
  const rawId = form.get("workshopId");
  const workshopId = typeof rawId === "string" ? rawId.trim() : "";
  const period = parsePeriodValue(form);
  if (!workshopId || !isExactPeriodValue(period))
    throw data(null, { status: 400 });
  const outcome = await openNextMonth(
    context.get(servicesContext),
    actor,
    workshopId,
    period,
  );
  switch (outcome.kind) {
    case "opened":
      return redirect(withFeedback(LIST, "opened"));
    case "unpublished":
      return redirect(withFailure(`${LIST}/${workshopId}`, "enroll"));
    case "refused":
      return redirect(withFailure(`${LIST}/${workshopId}`, "month"));
    case "failed":
      throw failureResponse(outcome.failure);
  }
}

export default function AdminWorkshops() {
  const { filter, rows, feedback } = useLoaderData<typeof loader>();
  return <WorkshopsList rows={rows} filter={filter} feedback={feedback} />;
}
