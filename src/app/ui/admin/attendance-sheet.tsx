import { Button } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { AdminCardList } from "./admin-sections";
import { FormError, SelectField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { OrderStatusBadge } from "./order-status-badge";

const copy = adminMicrocopy.attendance;

export interface AttendanceSheetRow {
  readonly email: string;
  readonly name: string;
  readonly orderNumber: string;
  readonly feePaid: boolean;
  readonly status: "present" | "absent" | null;
  readonly makeUp: {
    readonly status: "pending" | "done";
    readonly label: string;
  } | null;
}

/** What a rejected make-up form sends back: only that student's form shows it. */
export interface MakeUpFeedback {
  readonly email: string;
  readonly formError?: string | undefined;
  readonly errors: Readonly<
    Partial<Record<"makeUpDate" | "makeUpTurno" | "student", string>>
  >;
  readonly values: {
    readonly makeUpTurno: string;
    readonly makeUpDate: string;
  };
}

export interface AttendanceSheetProps {
  readonly heading: string;
  readonly subtitle: string;
  readonly backHref: string;
  readonly rows: readonly AttendanceSheetRow[];
  /** Every turno a make-up class can be taken in, as `periodId:turnoId`. */
  readonly makeUpTurnos: readonly { value: string; label: string }[];
  readonly feedback?:
    | {
        readonly saved?: boolean | undefined;
        readonly makeUpScheduled?: boolean | undefined;
        readonly error?: string | undefined;
        readonly makeUp?: MakeUpFeedback | undefined;
      }
    | undefined;
}

const radioClasses =
  "flex min-h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-clay-600 px-4 text-lg text-clay-800 has-[:checked]:bg-clay-600 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay-800";

function FeeBadge({ paid }: { paid: boolean }) {
  return paid ? (
    <OrderStatusBadge status="paid" label={copy.sheet.feePaid} />
  ) : (
    <OrderStatusBadge
      status="pending_confirmation"
      label={copy.sheet.feePending}
    />
  );
}

function MarkChoice({ row }: { row: AttendanceSheetRow }) {
  if (!row.feePaid) return <span>{copy.sheet.pendingNote}</span>;
  return (
    <fieldset className="flex gap-3">
      <legend className="sr-only">{row.name}</legend>
      <label className={radioClasses}>
        <input
          type="radio"
          name={`status:${row.email}`}
          value="present"
          defaultChecked={row.status === "present"}
        />
        {copy.sheet.present}
      </label>
      <label className={radioClasses}>
        <input
          type="radio"
          name={`status:${row.email}`}
          value="absent"
          defaultChecked={row.status === "absent"}
        />
        {copy.sheet.absent}
      </label>
    </fieldset>
  );
}

function MakeUpForm({
  row,
  turnos,
  feedback,
}: {
  row: AttendanceSheetRow;
  turnos: AttendanceSheetProps["makeUpTurnos"];
  feedback: MakeUpFeedback | undefined;
}) {
  const f = copy.makeUp;
  const shown = feedback?.email === row.email ? feedback : undefined;
  return (
    <form
      method="post"
      aria-label={`${f.schedule}: ${row.name}`}
      className="flex max-w-prose flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
    >
      <Heading level={3} size="h4">
        {row.name}
      </Heading>
      <input type="hidden" name="intent" value="makeup" />
      <input type="hidden" name="email" value={row.email} />
      <FormError message={shown?.formError ?? shown?.errors.student} />
      <SelectField
        label={f.turno}
        name="makeUpTurno"
        defaultValue={shown?.values.makeUpTurno ?? turnos[0]?.value ?? ""}
        options={turnos}
        error={shown?.errors.makeUpTurno}
      />
      <TextField
        label={f.date}
        hint={f.dateHint}
        name="makeUpDate"
        type="date"
        required
        defaultValue={shown?.values.makeUpDate ?? ""}
        error={shown?.errors.makeUpDate}
      />
      <div>
        <Button type="submit" variant="outline">
          {f.submit}
        </Button>
      </div>
    </form>
  );
}

/**
 * One class session: every student marked present or absent with a single
 * native form post. Unmarked students are left without a mark.
 */
export function AttendanceSheet({
  heading,
  subtitle,
  backHref,
  rows,
  makeUpTurnos,
  feedback,
}: AttendanceSheetProps) {
  const absent = rows.filter((row) => row.status === "absent");
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={heading}
        description={subtitle}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.title, href: "/admin/asistencia" },
          { label: copy.classesCrumb, href: backHref },
          { label: heading },
        ]}
        back={{ href: backHref, label: copy.sheet.back }}
      />
      {feedback?.saved ? (
        <AdminFeedback tone="success" title={copy.sheet.saved} />
      ) : null}
      {feedback?.makeUpScheduled ? (
        <AdminFeedback tone="success" title={copy.sheet.makeUpScheduled} />
      ) : null}
      <form
        method="post"
        aria-label={copy.sheet.formLabel}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="save" />
        <FormError message={feedback?.error} />
        <AdminCardList
          label={copy.sheet.caption}
          rows={rows}
          rowKey={(row) => row.email}
          card={(row) => (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-ink-900">
                  {row.name}
                  <span className="block text-sm font-normal text-ink-600">
                    {row.orderNumber}
                  </span>
                </p>
                <FeeBadge paid={row.feePaid} />
              </div>
              <MarkChoice row={row} />
            </>
          )}
          empty={{
            title: copy.sheet.empty.title,
            message: copy.sheet.empty.message,
            action: { href: backHref, label: copy.sheet.empty.action },
          }}
        />
        {rows.some((row) => row.feePaid) ? (
          <div className="sticky bottom-0 -mx-4 bg-surface p-3 shadow-card">
            <Button type="submit">{copy.sheet.save}</Button>
          </div>
        ) : null}
      </form>

      <section className="flex flex-col gap-3">
        <Heading level={2}>{copy.makeUp.title}</Heading>
        {absent.length === 0 ? <Text>{copy.makeUp.none}</Text> : null}
        {absent.map((row) =>
          row.makeUp ? (
            <p key={row.email}>
              {row.name}: <strong>{row.makeUp.label}</strong>
            </p>
          ) : (
            <MakeUpForm
              key={row.email}
              row={row}
              turnos={makeUpTurnos}
              feedback={feedback?.makeUp}
            />
          ),
        )}
      </section>
    </section>
  );
}
