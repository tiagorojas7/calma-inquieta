import { data, redirect, useActionData, useLoaderData } from "react-router";
import { isUuid } from "~/app/admin/enrollment-ids";
import { failureResponse } from "~/app/admin/failure-response";
import { servicesContext } from "~/app/context";
import { intensiveRequestsView } from "~/app/intensive-requests/admin-view";
import {
  IntensiveRequestsScreen,
  type IntensiveRequestFeedback,
} from "~/app/ui/admin/intensive-requests";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { cordobaDateOf } from "~/modules/intensive-requests";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/intensive-requests";

const copy = adminMicrocopy.intensiveRequests;

export function meta() {
  return [{ title: "Reservas | Panel | Calma Inquieta" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const found = await context
    .get(servicesContext)
    .intensiveRequests.overview(actor, params.id);
  if (!found.ok) throw failureResponse(found.error);
  return intensiveRequestsView(found.value, cordobaDateOf(new Date()));
}

function text(form: FormData, name: string): string {
  const entry = form.get(name);
  return typeof entry === "string" ? entry : "";
}

type Failure =
  | { kind: "invalid"; issues: readonly { field: string }[] }
  | { kind: "intensive-full" }
  | { kind: "illegal-transition"; from: string };

/** The message and field errors a rejected form shows next to its request. */
function feedbackFor(
  failure: Failure,
  base: Pick<IntensiveRequestFeedback, "requestId" | "intent" | "values">,
): IntensiveRequestFeedback {
  const errors: Record<string, string> = {};
  let formError: string | undefined;
  if (failure.kind === "invalid") {
    for (const issue of failure.issues) {
      const message = copy.errors[issue.field as keyof typeof copy.errors];
      errors[issue.field] ??= message;
    }
  } else if (failure.kind === "intensive-full") formError = copy.errors.full;
  else
    formError =
      failure.from === "cancelled"
        ? copy.errors.alreadyCancelled
        : copy.errors.notPending;
  return { ...base, formError, errors };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  if (!isUuid(params.id)) throw data(null, { status: 404 });
  const form = await request.formData().catch(() => null);
  if (form === null) throw data(null, { status: 400 });
  const intent = text(form, "intent");
  if (intent !== "confirm" && intent !== "cancel")
    throw data(null, { status: 400 });
  const requestId = text(form, "requestId");
  if (!isUuid(requestId)) throw data(null, { status: 404 });
  const requests = context.get(servicesContext).intensiveRequests;

  const amount = text(form, "amount");
  const paidOn = text(form, "paidOn");
  const note = text(form, "note");
  const reason = text(form, "reason");
  const values = intent === "confirm" ? { amount, paidOn, note } : { reason };
  const result =
    intent === "confirm"
      ? await requests.confirm(actor, {
          intensiveId: params.id,
          requestId,
          amount,
          paidOn,
          note,
        })
      : await requests.cancel(actor, {
          intensiveId: params.id,
          requestId,
          reason,
        });
  if (result.ok) return redirect(`/admin/intensivos/${params.id}/reservas`);

  const error = result.error;
  if (
    error.kind === "invalid" ||
    error.kind === "intensive-full" ||
    error.kind === "illegal-transition"
  )
    return data(
      { feedback: feedbackFor(error, { requestId, intent, values }) },
      { status: 422 },
    );
  throw failureResponse(error);
}

export default function AdminIntensiveRequests() {
  const view = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return <IntensiveRequestsScreen view={view} feedback={rejected?.feedback} />;
}
