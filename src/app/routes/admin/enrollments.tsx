import { data, redirect, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import {
  enrollmentFieldErrors,
  enrollmentRefusalMessage,
  parseEnrollmentIntent,
} from "~/app/admin/enrollment-action-data";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { parseEnrollmentFilter } from "~/app/admin/enrollment-filter";
import { isUuid } from "~/app/admin/enrollment-ids";
import {
  ENROLLMENT_TABS,
  safeReturnTo,
  tabForStatus,
  TAB_STATUSES,
  type EnrollmentTab,
} from "~/app/admin/enrollment-tabs";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import {
  dateLabel,
  monthLabel,
  ORDER_STATUS_LABELS,
} from "~/app/enrollment/order-labels";
import { EnrollmentsList } from "~/app/ui/admin/enrollments-list";
import { formatPesos } from "~/modules/enrollments";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/enrollments";

const PAGE_SIZE = 50;
const FEEDBACK = ["paid", "cancelled"] as const;
const ALL_STATUSES = ENROLLMENT_TABS.flatMap((tab) => TAB_STATUSES[tab]);

export function meta() {
  return [{ title: "Inscripciones | Panel | Calma Inquieta" }];
}

function countLabel(count: number): string {
  return count >= PAGE_SIZE ? `${String(PAGE_SIZE)}+` : String(count);
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const url = new URL(request.url);
  const { query, values } = parseEnrollmentFilter(url.searchParams);
  const tab = tabForStatus(values.estado);
  const shared = {
    ...(query.period === undefined ? {} : { period: query.period }),
    ...(query.workshopId === undefined ? {} : { workshopId: query.workshopId }),
    ...(query.text === undefined ? {} : { text: query.text }),
  };

  // Page 1 of every status gives the tab counts; the active tab's own page
  // is fetched again only when it is not the first.
  const [firstPages, workshops] = await Promise.all([
    Promise.all(
      ALL_STATUSES.map((status) =>
        services.enrollments.list(actor, { ...shared, status, page: 1 }),
      ),
    ),
    services.monthlyWorkshops.list(actor, { status: "live" }),
  ]);
  const pages = new Map(
    ALL_STATUSES.map((status, index) => [status, firstPages[index]] as const),
  );
  if (values.page > 1) {
    const requested = await Promise.all(
      TAB_STATUSES[tab].map((status) =>
        services.enrollments.list(actor, {
          ...shared,
          status,
          page: values.page,
        }),
      ),
    );
    TAB_STATUSES[tab].forEach((status, index) => {
      pages.set(status, requested[index]);
    });
  }
  for (const status of ALL_STATUSES) {
    const listed = pages.get(status);
    if (listed && !listed.ok) throw enrollmentFailureResponse(listed.error);
  }
  const itemsOf = (status: (typeof ALL_STATUSES)[number]) => {
    const listed = pages.get(status);
    return listed?.ok ? listed.value.items : [];
  };
  // Counts come from page 1 even when the visible page is another one.
  const counts = Object.fromEntries(
    ENROLLMENT_TABS.map((name) => {
      let total = 0;
      for (const status of TAB_STATUSES[name]) {
        const first = firstPages[ALL_STATUSES.indexOf(status)];
        total += first?.ok ? first.value.items.length : 0;
      }
      return [name, countLabel(total)] as const;
    }),
  ) as Record<EnrollmentTab, string>;

  const visible = TAB_STATUSES[tab]
    .flatMap((status) => itemsOf(status))
    .sort((a, b) => b.requestedOn.localeCompare(a.requestedOn));

  const feedbackKind = feedbackCode(request, FEEDBACK);
  const orderParam = url.searchParams.get("pedido") ?? "";
  let name: string | null = null;
  if (feedbackKind !== null && isUuid(orderParam)) {
    const found = await services.enrollments.detail(actor, orderParam);
    if (found.ok) name = found.value.student.fullName;
  }

  return {
    filter: values,
    tab,
    counts,
    rows: visible.map((order) => ({
      id: order.id,
      number: order.number,
      studentName: order.studentName,
      workshopName: order.workshopName,
      month: monthLabel(order.period),
      turno: order.turnoLabel,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status],
      total: formatPesos(order.total),
      totalPesos: String(order.total.toCentavos() / 100),
      requestedOn: dateLabel(order.requestedOn),
    })),
    // A workshop list failure only drops the workshop filter.
    workshops: workshops.ok
      ? workshops.value.map(({ id, name: workshopName }) => ({
          id,
          name: workshopName,
        }))
      : [],
    hasNext: TAB_STATUSES[tab].some(
      (status) => itemsOf(status).length === PAGE_SIZE,
    ),
    today: new Date(Date.now() - 10_800_000).toISOString().slice(0, 10),
    feedback: feedbackKind === null ? null : { kind: feedbackKind, name },
  };
}

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** Marks an order paid or cancels it from its card and stays on the list. */
export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const intent = parseEnrollmentIntent(form);
  const orderId = text(form, "orderId");
  if (
    intent === null ||
    (intent.kind !== "confirm" && intent.kind !== "cancel") ||
    !isUuid(orderId)
  )
    throw data(null, { status: 400 });
  const enrollments = context.get(servicesContext).enrollments;
  const result =
    intent.kind === "confirm"
      ? await enrollments.confirmPayment(actor, {
          orderId,
          amount: intent.amount,
          paidOn: intent.paidOn,
          ...(intent.note === "" ? {} : { note: intent.note }),
        })
      : await enrollments.cancel(actor, { orderId, reason: intent.reason });
  if (!result.ok) {
    if (result.error.kind === "invalid") {
      const messages = Object.values(
        enrollmentFieldErrors(result.error.issues),
      );
      return data({ error: messages.join(" "), orderId }, { status: 422 });
    }
    const message = enrollmentRefusalMessage(result.error);
    if (message !== null)
      return data({ error: message, orderId }, { status: 409 });
    throw enrollmentFailureResponse(result.error);
  }
  const refusal = enrollmentRefusalMessage({ kind: result.value.kind });
  if (refusal !== null)
    return data({ error: refusal, orderId }, { status: 409 });
  const back = withFeedback(
    safeReturnTo(form.get("returnTo")),
    intent.kind === "confirm" ? "paid" : "cancelled",
  );
  return redirect(`${back}&pedido=${orderId}`);
}

export default function AdminEnrollments() {
  const list = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <EnrollmentsList {...list} {...(result ? { actionError: result } : {})} />
  );
}
