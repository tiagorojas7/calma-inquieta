import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { adminCopy } from "./copy";
import {
  FormError,
  ReturnToFields,
  SelectField,
  TextField,
} from "./form-fields";
import { MoreOptions } from "./more-options";
import { SavedBanner } from "./saved-banner";

const copy = adminCopy.clases.attendance;

export interface AttendanceSheetRow {
  readonly email: string;
  readonly name: string;
  readonly orderNumber: string;
  readonly feePaid: boolean;
  readonly status: "present" | "absent" | null;
  readonly makeUp: {
    readonly status: "pending" | "done" | "missed";
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
  /** This page's address, so every post comes back to it. */
  readonly path?: string | undefined;
  readonly rows: readonly AttendanceSheetRow[];
  /** Shown next to a student who still owes the monthly fee. */
  readonly pendingNote: string;
  /** Non-blocking warning shown after a make-up went into a full turno. */
  readonly makeUpFullWarning: string;
  /**
   * The turnos a make-up class can be taken in, as `periodId:turnoId`: other
   * turnos of the same workshop only.
   */
  readonly makeUpTurnos: readonly { value: string; label: string }[];
  readonly feedback?:
    | {
        readonly saved?: boolean | undefined;
        readonly makeUpScheduled?: boolean | undefined;
        /** The make-up turno had no free seat that day. */
        readonly makeUpFull?: boolean | undefined;
        readonly error?: string | undefined;
        readonly makeUp?: MakeUpFeedback | undefined;
      }
    | undefined;
}

/** The id of the form that holds every mark; the toggles belong to it by `form`. */
const SHEET_FORM = "attendance-sheet";

const toggleClasses =
  "flex min-h-16 flex-1 cursor-pointer items-center justify-center rounded-md border-2 px-4 text-xl font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay-800";
const presentClasses = `${toggleClasses} border-admin-success text-admin-success has-[:checked]:bg-admin-success has-[:checked]:text-white`;
const absentClasses = `${toggleClasses} border-admin-danger text-admin-danger has-[:checked]:bg-admin-danger has-[:checked]:text-white`;

/** Two big toggles. They post with the one "Guardar" even though the row holds its own forms. */
function MarkChoice({ row }: { row: AttendanceSheetRow }) {
  return (
    <fieldset className="flex gap-3">
      <legend className="sr-only">{row.name}</legend>
      <label className={presentClasses}>
        <input
          type="radio"
          form={SHEET_FORM}
          name={`status:${row.email}`}
          value="present"
          defaultChecked={row.status === "present"}
          className="sr-only"
        />
        {copy.present}
      </label>
      <label className={absentClasses}>
        <input
          type="radio"
          form={SHEET_FORM}
          name={`status:${row.email}`}
          value="absent"
          defaultChecked={row.status === "absent"}
          className="sr-only"
        />
        {copy.absent}
      </label>
    </fieldset>
  );
}

function MakeUpForm({
  row,
  anchor,
  path,
  turnos,
  feedback,
}: {
  row: AttendanceSheetRow;
  anchor: string;
  path: string | undefined;
  turnos: AttendanceSheetProps["makeUpTurnos"];
  feedback: MakeUpFeedback | undefined;
}) {
  const f = copy.makeUp;
  const shown = feedback?.email === row.email ? feedback : undefined;
  return (
    <form
      method="post"
      aria-label={`${f.action}: ${row.name}`}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="intent" value="makeup" />
      <input type="hidden" name="email" value={row.email} />
      {path ? <ReturnToFields to={path} anchor={anchor} /> : null}
      <MoreOptions label={f.action} defaultOpen={shown !== undefined}>
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
          name="makeUpDate"
          type="date"
          required
          defaultValue={shown?.values.makeUpDate ?? ""}
          error={shown?.errors.makeUpDate}
        />
        <div>
          <Button type="submit" variant="success">
            {f.submit}
          </Button>
        </div>
      </MoreOptions>
    </form>
  );
}

function StudentRow({
  row,
  index,
  props,
}: {
  row: AttendanceSheetRow;
  index: number;
  props: AttendanceSheetProps;
}) {
  const anchor = `alumna-${String(index + 1)}`;
  return (
    <li
      id={anchor}
      className="flex scroll-mt-20 flex-col gap-3 rounded-md bg-surface p-5 shadow-card"
    >
      <p className="text-xl font-semibold text-ink-900">{row.name}</p>
      {row.feePaid ? null : (
        <p className="text-lg font-semibold text-terracotta-700">
          {props.pendingNote}
        </p>
      )}
      <MarkChoice row={row} />
      {row.status === "absent" ? (
        row.makeUp ? (
          <p className="text-lg font-semibold text-ink-900">
            {row.makeUp.label}
          </p>
        ) : (
          <MakeUpForm
            row={row}
            anchor={anchor}
            path={props.path}
            turnos={props.makeUpTurnos}
            feedback={props.feedback?.makeUp}
          />
        )
      ) : null}
    </li>
  );
}

/**
 * One class: each student is a big row with two big toggles, "Vino" and
 * "Faltó", and one "Guardar" for the whole class. A student saved as absent
 * can have her make-up class booked right on her row. Everything is a native
 * post that comes back to this page.
 */
export function AttendanceSheet(props: AttendanceSheetProps) {
  const { heading, subtitle, backHref, rows, feedback, path } = props;
  const saved = feedback?.saved
    ? copy.saved
    : feedback?.makeUpScheduled
      ? copy.makeUpScheduled
      : null;
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={heading}
        description={subtitle}
        back={{ href: backHref, label: copy.sheetBack }}
      />
      <SavedBanner message={saved} />
      {feedback?.makeUpFull ? (
        <AdminFeedback tone="info" title={props.makeUpFullWarning} />
      ) : null}
      <FormError message={feedback?.error} />
      <form id={SHEET_FORM} method="post" aria-label={copy.formLabel}>
        <input type="hidden" name="intent" value="save" />
        {path ? <ReturnToFields to={path} /> : null}
      </form>
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-md bg-surface p-5 shadow-card">
          <p className="text-lg text-ink-700">{copy.empty}</p>
          <AdminButtonLink href={backHref} variant="secondary">
            {copy.emptyAction}
          </AdminButtonLink>
        </div>
      ) : (
        <ul aria-label={copy.list} className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <StudentRow key={row.email} row={row} index={index} props={props} />
          ))}
        </ul>
      )}
      {rows.length > 0 ? (
        <div className="sticky bottom-0 -mx-4 bg-surface p-3 shadow-card">
          <Button type="submit" form={SHEET_FORM}>
            {copy.save}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
