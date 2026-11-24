import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { loadEmptyMonthTasks } from "~/app/admin/empty-months";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { isUuid } from "~/app/admin/enrollment-ids";
import { feedbackCode } from "~/app/admin/feedback-code";
import { loadClassesToday } from "~/app/admin/hoy-classes";
import { loadOpenMonthTasks } from "~/app/admin/hoy-open-months";
import { toHoyScreen } from "~/app/admin/hoy-view";
import { safeAnchor, safeReturnTo, stayOnPage } from "~/app/admin/return-to";
import { openNextMonth } from "~/app/admin/workshop-quick-publish";
import { isExactPeriodValue } from "~/app/admin/workshop-period-form-data";
import { hoyCopy } from "~/app/ui/admin/copy/hoy";
import { Hoy } from "~/app/ui/admin/hoy";
import { cordobaDateOf } from "~/modules/intensive-requests";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/home";

const HOME = "/admin";
const FEEDBACK = ["charged", "deposit", "balance", "opened"] as const;

export function meta() {
  return [{ title: "Hoy | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const url = new URL(request.url);
  const today = cordobaDateOf(new Date());
  const [panel, notifications, events] = await Promise.all([
    services.insights.panel(actor),
    services.insights.notifications(actor),
    services.privateEvents.list(actor, "nueva"),
  ]);
  if (!panel.ok) throw enrollmentFailureResponse(panel.error);
  if (!notifications.ok) throw enrollmentFailureResponse(notifications.error);
  // What cannot be read must not hide the rest of the day: private events,
  // months with no turno, months to open and today's classes each degrade to
  // nothing.
  const [emptyMonths, openMonths, classes] = await Promise.all([
    loadEmptyMonthTasks(services, actor, panel.value.period),
    loadOpenMonthTasks(services, actor, panel.value.nextPeriod),
    loadClassesToday(services, actor, today),
  ]);
  const saved = feedbackCode(request, FEEDBACK);
  return {
    screen: toHoyScreen({
      panel: panel.value,
      notifications: notifications.value,
      events: events.ok ? events.value : [],
      emptyMonths,
      openMonths,
      classes,
      today,
      showAll: url.searchParams.get("ver") === "todo",
    }),
    returnTo: safeReturnTo(`${url.pathname}${url.search}`, HOME),
    saved: saved === null ? null : hoyCopy.saved[saved],
  };
}

type Refusal = keyof typeof hoyCopy.refused;

/** The words for a refusal the existing rules raise; null for anything else. */
function refusalOf(kind: string): string | null {
  const known: readonly Refusal[] = [
    "turno-full",
    "period-closed",
    "amount-mismatch",
    "illegal-transition",
    "already-confirmed",
    "already-cancelled",
    "invalid",
    "intensive-full",
    "balance-already-paid",
    "no-balance-due",
  ];
  const found = known.find((candidate) => candidate === kind);
  return found === undefined ? null : hoyCopy.refused[found];
}

/** A workshop reservation: a request that was cancelled reads differently. */
function reservationRefusal(
  failure: { kind: string; from?: string },
  intent: "confirm-deposit" | "record-balance",
): string | null {
  if (failure.kind !== "illegal-transition") return refusalOf(failure.kind);
  if (failure.from === "cancelled") return hoyCopy.refused["already-cancelled"];
  return intent === "record-balance"
    ? hoyCopy.refused["not-confirmed"]
    : hoyCopy.refused["illegal-transition"];
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Every button of Hoy posts here. The existing use cases keep every rule; a
 * refusal comes back on the card it belongs to (422, no redirect) and a save
 * comes back to the same page at the same card.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const services = context.get(servicesContext);
  const card = safeAnchor(form.get("anchor")) ?? "";
  const saved = (code: (typeof FEEDBACK)[number]) =>
    redirect(stayOnPage(form, { fallback: HOME, code }));
  const refused = (message: string) =>
    data({ failure: { card, message } }, { status: 422 });
  const today = cordobaDateOf(new Date());

  switch (text(form, "intent")) {
    case "confirm-order": {
      const orderId = text(form, "orderId");
      if (!isUuid(orderId)) throw data(null, { status: 404 });
      const result = await services.enrollments.confirmPayment(actor, {
        orderId,
        amount: text(form, "amount"),
        paidOn: today,
      });
      if (!result.ok) {
        const message = refusalOf(result.error.kind);
        if (message !== null) return refused(message);
        throw enrollmentFailureResponse(result.error);
      }
      const message = refusalOf(result.value.kind);
      return message === null ? saved("charged") : refused(message);
    }
    case "confirm-deposit":
    case "record-balance": {
      const intent = text(form, "intent") as
        "confirm-deposit" | "record-balance";
      const intensiveId = text(form, "intensiveId");
      const requestId = text(form, "requestId");
      if (!isUuid(intensiveId) || !isUuid(requestId))
        throw data(null, { status: 404 });
      const payment = {
        intensiveId,
        requestId,
        amount: text(form, "amount"),
        paidOn: today,
        note: "",
      };
      const result =
        intent === "confirm-deposit"
          ? await services.intensiveRequests.confirm(actor, payment)
          : await services.intensiveRequests.recordBalance(actor, payment);
      if (result.ok)
        return saved(intent === "confirm-deposit" ? "deposit" : "balance");
      const message = reservationRefusal(result.error, intent);
      if (message !== null) return refused(message);
      throw enrollmentFailureResponse(result.error);
    }
    case "open-month": {
      const workshopId = text(form, "workshopId");
      const period = text(form, "period");
      if (!workshopId || !isExactPeriodValue(period))
        throw data(null, { status: 400 });
      const outcome = await openNextMonth(services, actor, workshopId, period);
      switch (outcome.kind) {
        case "opened":
          return saved("opened");
        case "unpublished":
          return refused(hoyCopy.refused["month-unpublished"]);
        case "refused":
          return refused(hoyCopy.refused["month-refused"]);
        case "failed":
          throw enrollmentFailureResponse(outcome.failure);
      }
      break;
    }
    default:
      throw data(null, { status: 400 });
  }
}

export default function AdminHome() {
  const { screen, returnTo, saved } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <Hoy
      screen={screen}
      returnTo={returnTo}
      saved={saved}
      failure={rejected?.failure ?? null}
    />
  );
}
