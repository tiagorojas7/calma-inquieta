import { AdminButton as Button } from "./admin-button";
import { Text } from "../atoms/heading";
import { ConfirmedSubmit } from "./confirmed-submit";
import { FormError } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

const copy = adminMicrocopy.intensives.state;
type Status = Extract<
  AdminStatus,
  "draft" | "published" | "paused" | "cancelled" | "archived"
>;
type Schedule = {
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
};

function PlainSubmit({ intent, label }: { intent: string; label: string }) {
  return (
    <form method="post">
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit" variant="outline">
        {label}
      </Button>
    </form>
  );
}

export function IntensiveStatePanel({
  status,
  schedule,
  error,
  reschedule,
}: {
  status: Status;
  schedule: Schedule;
  error: string | undefined;
  reschedule?:
    | {
        readonly values: Schedule;
        readonly errors: Readonly<
          Partial<Record<"eventDate" | "timeRange", string>>
        >;
      }
    | undefined;
}) {
  const values = reschedule?.values ?? schedule;
  return (
    <section className="flex max-w-prose flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-ink-900">{copy.status}</span>
        <StatusBadge status={status} />
      </div>
      <FormError message={error} />
      <div className="flex flex-wrap gap-3">
        {status === "draft" && (
          <PlainSubmit intent="publish" label={copy.publish} />
        )}
        {status === "paused" && (
          <PlainSubmit intent="publish" label={copy.resume} />
        )}
        {status === "published" && (
          <ConfirmedSubmit
            intent="pause"
            label={copy.pause}
            {...copy.confirm.pause}
          />
        )}
        {(status === "published" || status === "paused") && (
          <ConfirmedSubmit
            intent="cancel"
            label={copy.cancel}
            {...copy.confirm.cancel}
          />
        )}
        {status !== "archived" && (
          <ConfirmedSubmit
            intent="archive"
            label={copy.archive}
            {...copy.confirm.archive}
          />
        )}
        {status === "archived" && (
          <PlainSubmit intent="restore" label={copy.restore} />
        )}
        {status === "draft" && (
          <ConfirmedSubmit
            intent="delete"
            label={copy.delete}
            tone="destructive"
            {...copy.confirm.delete}
          />
        )}
      </div>
      <form method="post" noValidate className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="intent" value="reschedule" />
        <label>
          Fecha
          <input
            name="eventDate"
            type="date"
            defaultValue={values.eventDate}
            aria-describedby={
              reschedule?.errors.eventDate ? "reschedule-date-error" : undefined
            }
          />
        </label>
        <label>
          Desde
          <input
            name="startsAt"
            type="time"
            defaultValue={values.startsAt}
            aria-describedby={
              reschedule?.errors.timeRange ? "reschedule-time-error" : undefined
            }
          />
        </label>
        <label>
          Hasta
          <input
            name="endsAt"
            type="time"
            defaultValue={values.endsAt}
            aria-describedby={
              reschedule?.errors.timeRange ? "reschedule-time-error" : undefined
            }
          />
        </label>
        {reschedule?.errors.eventDate && (
          <Text id="reschedule-date-error" role="alert">
            {reschedule.errors.eventDate}
          </Text>
        )}
        {reschedule?.errors.timeRange && (
          <Text id="reschedule-time-error" role="alert">
            {reschedule.errors.timeRange}
          </Text>
        )}
        <div>
          <Button type="submit" variant="outline">
            {copy.reschedule}
          </Button>
        </div>
      </form>
    </section>
  );
}
