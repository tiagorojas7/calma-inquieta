import { Button } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { DataTable, type DataTableColumn } from "./data-table";
import { FormError } from "./form-fields";
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

export interface AttendanceSheetProps {
  readonly heading: string;
  readonly subtitle: string;
  readonly backHref: string;
  readonly rows: readonly AttendanceSheetRow[];
  readonly feedback?:
    | {
        readonly saved?: boolean | undefined;
        readonly error?: string | undefined;
      }
    | undefined;
}

const radioClasses = "inline-flex min-h-11 items-center gap-2 pr-4";

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
    <fieldset className="flex flex-wrap">
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

const columns: readonly DataTableColumn<AttendanceSheetRow>[] = [
  {
    key: "student",
    header: copy.sheet.columns.student,
    cell: (row) => (
      <>
        {row.name}
        <span className="block text-sm text-ink-600">{row.orderNumber}</span>
      </>
    ),
  },
  {
    key: "fee",
    header: copy.sheet.columns.fee,
    cell: (row) => <FeeBadge paid={row.feePaid} />,
  },
  {
    key: "attendance",
    header: copy.sheet.columns.attendance,
    cell: (row) => <MarkChoice row={row} />,
  },
];

/**
 * One class session: every student marked present or absent with a single
 * native form post. Unmarked students are left without a mark.
 */
export function AttendanceSheet({
  heading,
  subtitle,
  backHref,
  rows,
  feedback,
}: AttendanceSheetProps) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{heading}</Heading>
      <Text>{subtitle}</Text>
      <div>
        <AdminButtonLink variant="outline" href={backHref}>
          {copy.sheet.back}
        </AdminButtonLink>
      </div>
      {feedback?.saved ? <p role="status">{copy.sheet.saved}</p> : null}
      <form
        method="post"
        aria-label={copy.sheet.formLabel}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="save" />
        <FormError message={feedback?.error} />
        <DataTable
          caption={copy.sheet.caption}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.email}
          empty={{
            title: copy.sheet.empty.title,
            message: copy.sheet.empty.message,
            action: { href: backHref, label: copy.sheet.empty.action },
          }}
        />
        {rows.some((row) => row.feePaid) ? (
          <div>
            <Button type="submit">{copy.sheet.save}</Button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
