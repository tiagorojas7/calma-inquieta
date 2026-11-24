import { data, redirect, useActionData, useLoaderData } from "react-router";
import { feedbackCode, withFeedback } from "~/app/admin/feedback-code";
import { failureResponse } from "~/app/admin/failure-response";
import { POLICY_FIELD_MESSAGES, fieldErrors } from "~/app/admin/issue-messages";
import { servicesContext } from "~/app/context";
import { dateTimeLabel } from "~/app/enrollment/order-labels";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { AdminPolicies } from "~/app/ui/admin/policies";
import { isPolicyKind, POLICY_KINDS } from "~/modules/policies";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/policies";

const PATH = "/admin/politicas";
const FEEDBACK = ["published"] as const;
const copy = adminMicrocopy.policies;

export function meta() {
  return [{ title: "Políticas | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const policies = context.get(servicesContext).policies;
  const sections = await Promise.all(
    POLICY_KINDS.map(async (kind) => {
      const history = await policies.history(actor, kind);
      if (!history.ok) throw failureResponse(history.error);
      const [latest] = history.value;
      return {
        kind,
        title: copy.sections[kind].title,
        description: copy.sections[kind].description,
        currentVersion: latest?.version ?? 0,
        body: latest?.body ?? "",
        history: history.value.map((entry) => ({
          version: entry.version,
          label: `Versión ${String(entry.version)}`,
          publishedOn: dateTimeLabel(entry.publishedAt).slice(0, 10),
          publishedBy: entry.publishedBy,
          body: entry.body,
          current: entry === latest,
        })),
      };
    }),
  );
  return { feedback: feedbackCode(request, FEEDBACK), sections };
}

function textField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function action({ request, context }: Route.ActionArgs) {
  const actor = requireAdmin(request, context);
  const form = await request.formData();
  const kind = textField(form, "kind");
  if (!isPolicyKind(kind)) throw data(null, { status: 400 });
  const body = textField(form, "body");
  const published = await context
    .get(servicesContext)
    .policies.publish(actor, kind, body);
  if (published.ok) return redirect(withFeedback(PATH, "published"));
  if (published.error.kind === "invalid")
    return data(
      {
        kind,
        body,
        message:
          fieldErrors(published.error.issues, POLICY_FIELD_MESSAGES).body ??
          copy.errors.saveFailed,
      },
      { status: 422 },
    );
  if (published.error.kind === "conflict")
    return data({ kind, body, message: copy.errors.conflict }, { status: 409 });
  throw failureResponse(published.error);
}

export default function AdminPoliciesRoute() {
  const { feedback, sections } = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  return (
    <AdminPolicies
      sections={sections}
      feedback={feedback}
      rejected={rejected}
    />
  );
}
