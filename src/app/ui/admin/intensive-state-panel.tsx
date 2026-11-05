import { AdminButton as Button } from "./admin-button";
import { ADMIN_SHEET, AdminDangerZone } from "./admin-sections";
import { Text } from "../atoms/heading";
import { ConfirmedSubmit } from "./confirmed-submit";
import { FormError } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge, type AdminStatus } from "./status-badge";

const copy = adminMicrocopy.intensives.state;
const other = adminMicrocopy.intensives.otherActions;
const statusLine = adminMicrocopy.intensives.statusLine;
type Status = Extract<
  AdminStatus,
  "draft" | "published" | "paused" | "cancelled" | "archived"
>;
type Schedule = {
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
};

function PlainSubmit({
  intent,
  label,
  variant = "outline",
}: {
  intent: string;
  label: string;
  variant?: "success" | "outline";
}) {
  return (
    <form method="post">
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

/**
 * The status line of an intensivo: its state, what it means, and the one
 * action that moves it forward (publish, resume or restore). Everything else
 * lives in `IntensiveOtherActions`.
 */
export function IntensiveStatePanel({
  status,
  error,
}: {
  status: Status;
  error: string | undefined;
}) {
  return (
    <section className={ADMIN_SHEET}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-ink-900">{copy.status}</span>
        <StatusBadge status={status} />
        <Text tone="muted">{statusLine[status]}</Text>
      </div>
      <FormError message={error} />
      {status === "draft" && (
        <div>
          <PlainSubmit
            intent="publish"
            label={copy.publish}
            variant="success"
          />
        </div>
      )}
      {status === "paused" && (
        <div>
          <PlainSubmit intent="publish" label={copy.resume} variant="success" />
        </div>
      )}
      {status === "archived" && (
        <div>
          <PlainSubmit
            intent="restore"
            label={copy.restore}
            variant="success"
          />
        </div>
      )}
    </section>
  );
}

/** Whether the status line already offers a primary action of its own. */
export function intensiveHasPrimaryAction(status: Status): boolean {
  return status === "draft" || status === "paused" || status === "archived";
}

/**
 * The secondary block: pause, change the date and time, and the danger zone
 * with cancel, archive and delete. Closed by default; it opens by itself when
 * a rescheduling error needs to be seen.
 */
export function IntensiveOtherActions({
  status,
  schedule,
  reschedule,
}: {
  status: Status;
  schedule: Schedule;
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
  const canCancel = status === "published" || status === "paused";
  const canArchive = status !== "archived";
  const canDelete = status === "draft";
  return (
    <details
      className="max-w-prose rounded-md border border-admin-line p-4"
      open={reschedule ? true : undefined}
    >
      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink-900">
        {other.title}
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        {status === "published" && (
          <div>
            <ConfirmedSubmit
              intent="pause"
              label={copy.pause}
              {...copy.confirm.pause}
            />
          </div>
        )}
        <form method="post" noValidate className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="intent" value="reschedule" />
          <label>
            Fecha
            <input
              name="eventDate"
              type="date"
              defaultValue={values.eventDate}
              aria-describedby={
                reschedule?.errors.eventDate
                  ? "reschedule-date-error"
                  : undefined
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
                reschedule?.errors.timeRange
                  ? "reschedule-time-error"
                  : undefined
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
                reschedule?.errors.timeRange
                  ? "reschedule-time-error"
                  : undefined
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
        {(canCancel || canArchive || canDelete) && (
          <AdminDangerZone title={other.dangerTitle}>
            <div className="flex flex-wrap gap-3">
              {canCancel && (
                <ConfirmedSubmit
                  intent="cancel"
                  variant="danger"
                  label={copy.cancel}
                  {...copy.confirm.cancel}
                />
              )}
              {canArchive && (
                <ConfirmedSubmit
                  intent="archive"
                  variant="danger"
                  label={copy.archive}
                  {...copy.confirm.archive}
                />
              )}
              {canDelete && (
                <ConfirmedSubmit
                  intent="delete"
                  label={copy.delete}
                  tone="destructive"
                  {...copy.confirm.delete}
                />
              )}
            </div>
          </AdminDangerZone>
        )}
      </div>
    </details>
  );
}
