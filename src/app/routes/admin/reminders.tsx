import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import { parseReminderRequest } from "~/app/admin/reminder-filter";
import { ORDER_STATUS_LABELS } from "~/app/enrollment/order-labels";
import { adminMicrocopy } from "~/app/ui/admin/microcopy";
import { RemindersScreen } from "~/app/ui/admin/reminders-screen";
import { monthLabel } from "~/modules/enrollments";
import { REMINDER_KINDS, REMINDER_STATUSES } from "~/modules/reminders";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/reminders";

export function meta() {
  return [{ title: "Recordatorios | Panel | Calma Inquieta" }];
}

const copy = adminMicrocopy.reminders;

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const services = context.get(servicesContext);
  const { request: reminder, values } = parseReminderRequest(
    new URL(request.url).searchParams,
  );
  const [options, workshops, prepared] = await Promise.all([
    services.reminders.options(actor),
    services.monthlyWorkshops.list(actor, { status: "live" }),
    reminder === null
      ? Promise.resolve(null)
      : services.reminders.prepare(actor, reminder),
  ]);
  if (!options.ok) throw enrollmentFailureResponse(options.error);
  if (prepared !== null && !prepared.ok && prepared.error.kind !== "invalid")
    throw enrollmentFailureResponse(prepared.error);

  const errors: Record<string, string> = {};
  if (prepared !== null && !prepared.ok && prepared.error.kind === "invalid") {
    for (const { field, code } of prepared.error.issues) {
      const messages: Record<string, string> = copy.errors[field];
      errors[{ when: "cuando", activity: "actividad", text: "texto" }[field]] =
        messages[code] ?? messages["required"] ?? "";
    }
  }

  return {
    values,
    errors,
    kinds: REMINDER_KINDS.map((value) => ({
      value,
      label: copy.kinds[value],
    })),
    // A workshop list failure only drops the workshop filter.
    workshops: workshops.ok
      ? workshops.value.map(({ id, name }) => ({ id, name }))
      : [],
    periods: options.value.periods.map((value) => ({
      value,
      label: monthLabel(value),
    })),
    turnos: [...options.value.turnos],
    statuses: REMINDER_STATUSES.map((value) => ({
      value,
      label: ORDER_STATUS_LABELS[value],
    })),
    result:
      prepared?.ok === true
        ? {
            preview: prepared.value.preview,
            recipients: prepared.value.recipients.map((r, index) => ({
              key: `${r.email}#${String(index)}`,
              name: r.name,
              email: r.email,
              message: r.message,
              link: r.link,
            })),
          }
        : null,
  };
}

export default function AdminReminders() {
  return <RemindersScreen {...useLoaderData<typeof loader>()} />;
}
