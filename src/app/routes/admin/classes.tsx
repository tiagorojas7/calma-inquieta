import { data, redirect, useActionData, useLoaderData } from "react-router";
import {
  isReservationIntent,
  runReservationAction,
} from "./classes-reservation-action";
import {
  datedCard,
  isPastWorkshop,
  monthlyCard,
} from "~/app/admin/classes-view";
import { isUuid } from "~/app/admin/enrollment-ids";
import { failureResponse } from "~/app/admin/failure-response";
import { withFailure } from "~/app/admin/failure-code";
import { feedbackCode } from "~/app/admin/feedback-code";
import { markOpened } from "~/app/admin/notifications-view";
import { stayOnPage } from "~/app/admin/return-to";
import { openNextMonth } from "~/app/admin/workshop-quick-publish";
import {
  isExactPeriodValue,
  parseOpenMonthIntent,
  parsePeriodValue,
} from "~/app/admin/workshop-period-form-data";
import { servicesContext } from "~/app/context";
import { intensiveRequestsView } from "~/app/intensive-requests/admin-view";
import {
  AdminClassesScreen,
  type ClassesScreenData,
} from "~/app/ui/admin/classes-screen";
import { parseReservationBrowse } from "~/app/ui/admin/reservation-browse";
import { cordobaDateOf } from "~/modules/intensive-requests";
import { cordobaMonthOf } from "~/modules/workshops";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/classes";

const PATH = "/admin/clases";
const SAVED = ["opened", "confirmed", "balance", "cancelled"] as const;

export function meta() {
  return [{ title: "Clases | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const url = new URL(request.url);
  const showPast = url.searchParams.get("anteriores") === "1";
  const asked = url.searchParams.get("abrir");
  const askedId = asked !== null && isUuid(asked) ? asked : null;
  const browse = parseReservationBrowse(url.searchParams);
  const now = new Date();
  const month = cordobaMonthOf(now);
  const today = cordobaDateOf(now);

  const [live, archived, intensives, extraIntensives, statistics] =
    await Promise.all([
      services.monthlyWorkshops.list(actor, { status: "live" }),
      showPast
        ? services.monthlyWorkshops.list(actor, { status: "archived" })
        : null,
      services.intensives.list(actor, { status: "live" }),
      showPast
        ? Promise.all([
            services.intensives.list(actor, { status: "archived" }),
            services.intensives.list(actor, { status: "cancelled" }),
          ])
        : null,
      services.insights.statistics(actor, { period: month }),
    ]);
  if (!live.ok) throw failureResponse(live.error);
  if (archived && !archived.ok) throw failureResponse(archived.error);
  if (!intensives.ok) throw failureResponse(intensives.error);
  if (extraIntensives)
    for (const listed of extraIntensives)
      if (!listed.ok) throw failureResponse(listed.error);
  if (!statistics.ok) {
    // The month is always valid here, so only a service failure can come back.
    if (statistics.error.kind === "invalid") throw data(null, { status: 500 });
    throw failureResponse(statistics.error);
  }
  const seats = statistics.value.occupancy.rows.map((row) => ({
    workshopId: row.workshopId,
    turnoId: row.turnoId,
    turnoLabel: row.turnoLabel,
    free: row.free,
  }));

  const monthlyOf = async (workshop: (typeof live.value)[number]) => {
    const periods = await services.workshopPeriods.list(actor, workshop.id);
    if (!periods.ok) throw failureResponse(periods.error);
    return monthlyCard({
      workshop,
      periods: periods.value.periods,
      suggestedNext: periods.value.suggestedNext,
      month,
      seats,
    });
  };

  const everyIntensive = [
    ...intensives.value,
    ...(extraIntensives ?? []).flatMap((listed) =>
      listed.ok ? listed.value : [],
    ),
  ];
  const upcoming = everyIntensive
    .filter((workshop) => !isPastWorkshop(workshop, today))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const past = everyIntensive
    .filter((workshop) => isPastWorkshop(workshop, today))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const listedForCards = showPast ? [...upcoming, ...past] : upcoming;
  const opened =
    askedId !== null && listedForCards.some((entry) => entry.id === askedId)
      ? askedId
      : null;

  const datedOf = async (workshop: (typeof everyIntensive)[number]) => {
    const found = await services.intensiveRequests.overview(actor, workshop.id);
    if (!found.ok) throw failureResponse(found.error);
    const view = intensiveRequestsView(found.value, today);
    const pending =
      view.groups.find((group) => group.status === "pending_confirmation")?.rows
        .length ?? 0;
    return datedCard({
      workshop,
      taken: found.value.confirmedSeats,
      pending,
      reservations:
        workshop.id === opened ? { today, groups: view.groups, browse } : null,
    });
  };

  const [monthly, pastMonthly, dated, pastDated] = await Promise.all([
    Promise.all(live.value.map(monthlyOf)),
    Promise.all((archived?.ok ? archived.value : []).map(monthlyOf)),
    Promise.all(upcoming.map(datedOf)),
    showPast ? Promise.all(past.map(datedOf)) : [],
  ]);
  // Opening a card's reservations reads every request of that workshop for both owners.
  if (opened !== null)
    await markOpened(() => services.intensiveRequests.markSeen(actor, opened));

  const screen: ClassesScreenData = {
    saved: feedbackCode(request, SAVED),
    showPast,
    openId: opened,
    monthly,
    dated,
    pastMonthly,
    pastDated,
  };
  return screen;
}

function text(form: FormData, name: string): string {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

/**
 * Every action of the cards: "Abrir <mes>", and for a reservation confirming
 * the deposit, recording the balance or cancelling. Each goes back to the page
 * and the card it came from.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const services = context.get(servicesContext);
  const intent = text(form, "intent");

  if (parseOpenMonthIntent(form) !== null) {
    const workshopId = text(form, "workshopId").trim();
    const period = parsePeriodValue(form);
    if (!workshopId || !isExactPeriodValue(period))
      throw data(null, { status: 400 });
    const outcome = await openNextMonth(services, actor, workshopId, period);
    switch (outcome.kind) {
      case "opened":
        return redirect(stayOnPage(form, { fallback: PATH, code: "opened" }));
      case "unpublished":
        return redirect(withFailure(`/admin/talleres/${workshopId}`, "enroll"));
      case "refused":
        return redirect(withFailure(`/admin/talleres/${workshopId}`, "month"));
      case "failed":
        throw failureResponse(outcome.failure);
    }
  }

  if (!isReservationIntent(intent)) throw data(null, { status: 400 });
  const intensiveId = text(form, "intensiveId");
  if (!isUuid(intensiveId)) throw data(null, { status: 404 });
  return runReservationAction({
    actor,
    requests: services.intensiveRequests,
    form,
    intensiveId,
    fallback: PATH,
  });
}

export default function AdminClasses() {
  const screen = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <AdminClassesScreen
      data={screen}
      feedback={
        rejected && "feedback" in rejected ? rejected.feedback : undefined
      }
    />
  );
}
