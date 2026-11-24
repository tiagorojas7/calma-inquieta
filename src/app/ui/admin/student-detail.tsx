import { useRef, useState, type ReactNode } from "react";
import { Heading } from "../atoms/heading";
import { AdminButton as Button, adminButtonClasses } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { AdminPageHeader } from "./admin-page";
import { ADMIN_CARD_GRID, AdminColumns } from "./admin-sections";
import { ConfirmDialog } from "./confirm-dialog";
import { adminCopy } from "./copy";
import {
  EnrollmentNewMaterials,
  type EnrollmentMaterialChoice,
  type EnrollmentMaterialLine,
} from "./enrollment-new-materials";
import {
  CheckboxField,
  FormError,
  ReturnToFields,
  TextAreaField,
  TextField,
} from "./form-fields";
import { MoreOptions } from "./more-options";
import { SavedBanner } from "./saved-banner";
import { StatusChip } from "./status-chip";

const copy = adminCopy.alumnas.file;

/** What an owner reads of a payable order, a monthly record or a sale alike. */
export interface StudentPayableCard {
  readonly id: string;
  /** The plain element id the redirect after a save returns to. */
  readonly anchor: string;
  readonly number: string;
  readonly state: "owes" | "paid" | "cancelled";
  readonly total: string;
  /** Whole pesos, as the payment form posts them. */
  readonly totalPesos: string;
  readonly lines: readonly { label: string; quantity: number }[];
  readonly delivery: "delivered" | "toDeliver" | null;
  readonly canPay: boolean;
  readonly canCancel: boolean;
  /** Set when cancelling must record a refund: what was paid, as text and whole pesos. */
  readonly cancelRefund: { paid: string; paidPesos: string } | null;
}

export type StudentSaleCard = StudentPayableCard;

export interface StudentRecordCard extends StudentPayableCard {
  readonly workshop: string;
  readonly month: string;
  readonly turno: string;
  readonly canSell: boolean;
  /** The material sales of this record, oldest first. */
  readonly sales: readonly StudentSaleCard[];
}

/** What a refused submit hands back, so the card it came from shows it again. */
export interface StudentFileForm {
  readonly orderId?: string | undefined;
  readonly intent?: "confirm" | "sale" | "cancel" | "note" | undefined;
  readonly message?: string | undefined;
  readonly lines?: readonly EnrollmentMaterialLine[] | undefined;
  readonly paid?: boolean | undefined;
  readonly noteValue?: string | undefined;
}

export interface StudentDetailProps {
  readonly student: {
    readonly name: string;
    readonly email: string;
    readonly phone: string;
    /** The phone as people say it ("351 678-5675"), or the raw digits when it cannot be. */
    readonly phoneShown: string;
    /** The `tel:` link; null when there is nothing to dial. */
    readonly phoneLink: string | null;
    readonly whatsappLink: string | null;
    /** Everything she owes as text, a sale and a workshop payment included; null when nothing. */
    readonly owes: string | null;
    /** The workshop deposits and balances behind that, which have no card in the file. */
    readonly seatDebts: readonly { label: string; amount: string }[];
    readonly active: boolean;
    readonly records: readonly StudentRecordCard[];
    /** A few words about her attendance; null when it could not be read. */
    readonly attendance: string | null;
    readonly note: { readonly text: string; readonly meta: string | null };
  };
  /** The page's own path, which every form returns to. */
  readonly path: string;
  /** The Córdoba day, `YYYY-MM-DD`. */
  readonly today: string;
  /** Where "Inscribir en otro mes" opens the enrollment form, filled with her data. */
  readonly enrollHref: string;
  readonly materials: readonly EnrollmentMaterialChoice[];
  /** "cobro de Ana": what was just saved; the banner adds "Guardado". */
  readonly saved?: string | null | undefined;
  readonly form?: StudentFileForm | undefined;
}

const summaryButton = `${adminButtonClasses.secondary} cursor-pointer list-none [&::-webkit-details-marker]:hidden`;

/** A paid monthly record reads as a paid fee: the sales under it may still be owed. */
function stateLabel(card: StudentPayableCard, isRecord = false): string {
  if (card.state === "paid") return isRecord ? copy.feePaid : copy.paid;
  if (card.state === "cancelled") return copy.cancelled;
  return copy.owes(card.total);
}

const stateStatus = {
  owes: "pending_confirmation",
  paid: "paid",
  cancelled: "cancelled",
} as const;

function Materials({ card }: { card: StudentPayableCard }) {
  if (card.lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-ink-900">{copy.materials}</p>
      <ul className="flex flex-col gap-1 text-lg text-ink-700">
        {card.lines.map((line) => (
          <li key={line.label}>{`${line.label} × ${String(line.quantity)}`}</li>
        ))}
      </ul>
      {card.delivery === null ? null : (
        <p className="font-semibold text-ink-900">
          {card.delivery === "delivered" ? copy.delivered : copy.toDeliver}
        </p>
      )}
    </div>
  );
}

/** "Cobrar": the full amount, today. Another amount or day sits behind the options. */
function PayForm({
  card,
  path,
  today,
}: {
  card: StudentPayableCard;
  path: string;
  today: string;
}) {
  return (
    <form method="post" className="flex flex-col gap-3">
      <input type="hidden" name="intent" value="confirm" />
      <input type="hidden" name="orderId" value={card.id} />
      <ReturnToFields to={path} anchor={card.anchor} />
      <div>
        <Button type="submit" variant="success">
          {copy.pay}
        </Button>
      </div>
      <MoreOptions label={copy.otherAmount}>
        <TextField
          label={copy.amount}
          name="amount"
          inputMode="numeric"
          defaultValue={card.totalPesos}
        />
        <TextField
          label={copy.paidOn}
          name="paidOn"
          type="date"
          max={today}
          defaultValue={today}
        />
      </MoreOptions>
    </form>
  );
}

/** "Vender materiales": the catalog picker and "Ya pagó" in one inline panel. */
function SellPanel({
  record,
  path,
  materials,
  form,
}: {
  record: StudentRecordCard;
  path: string;
  materials: readonly EnrollmentMaterialChoice[];
  form: StudentFileForm | undefined;
}) {
  const mine = form?.orderId === record.id && form.intent === "sale";
  return (
    <details open={mine || undefined} className="group">
      <summary className={summaryButton}>{copy.sell}</summary>
      <form method="post" className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="intent" value="sale" />
        <input type="hidden" name="orderId" value={record.id} />
        <ReturnToFields to={path} anchor={record.anchor} />
        <EnrollmentNewMaterials
          choices={materials}
          initialLines={mine ? (form.lines ?? []) : []}
          legend={copy.materials}
          hint=""
        />
        <CheckboxField
          label={copy.alreadyPaid}
          name="paid"
          defaultChecked={mine && form.paid === true}
        />
        <div>
          <Button type="submit">{copy.sellSubmit}</Button>
        </div>
      </form>
    </details>
  );
}

/** "Cancelar", behind the options: the reason, the refund of a paid one, and one confirmation. */
function CancelForm({
  card,
  path,
  today,
  label,
  isSale,
}: {
  card: StudentPayableCard;
  path: string;
  today: string;
  label: string;
  isSale: boolean;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} method="post" className="flex flex-col gap-3">
      <input type="hidden" name="intent" value="cancel" />
      <input type="hidden" name="orderId" value={card.id} />
      <ReturnToFields to={path} anchor={card.anchor} />
      <TextAreaField
        label={copy.reason}
        name="reason"
        required
        rows={2}
        maxLength={300}
      />
      {card.cancelRefund ? (
        <>
          <TextField
            label={copy.refundAmount}
            hint={card.cancelRefund.paid}
            name="refundAmount"
            inputMode="numeric"
            required
            defaultValue={card.cancelRefund.paidPesos}
          />
          <TextField label={copy.refundNote} name="refundNote" />
          {/* The refund is dated today; the use case checks it against the payment. */}
          <input type="hidden" name="refundedOn" value={today} />
        </>
      ) : null}
      <div>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            setOpen(true);
          }}
        >
          {label}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title={isSale ? copy.confirmTitleSale : copy.confirmTitleRecord}
        message={
          card.cancelRefund ? copy.confirmMessagePaid : copy.confirmMessage
        }
        confirmLabel={copy.confirmCancel}
        tone="destructive"
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}

function SaleBlock({
  sale,
  path,
  today,
  form,
}: {
  sale: StudentSaleCard;
  path: string;
  today: string;
  form: StudentFileForm | undefined;
}) {
  return (
    <li
      id={sale.anchor}
      className="flex scroll-mt-20 flex-col gap-3 rounded-md bg-sand-100 p-4 target:ring-4 target:ring-clay-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level={4}>{copy.sale}</Heading>
        <StatusChip status={stateStatus[sale.state]} label={stateLabel(sale)} />
      </div>
      <p
        className={`text-2xl font-bold tabular-nums ${sale.state === "owes" ? "text-admin-warning-fg" : sale.state === "paid" ? "text-admin-positive-fg" : "text-admin-neutral-fg"}`}
      >
        {sale.total}
      </p>
      <Materials card={sale} />
      <ErrorFor form={form} orderId={sale.id} />
      {sale.canPay ? <PayForm card={sale} path={path} today={today} /> : null}
      {sale.canCancel ? (
        <MoreOptions label={copy.cancelSale}>
          <CancelForm
            card={sale}
            path={path}
            label={copy.cancelSale}
            isSale
            today={today}
          />
        </MoreOptions>
      ) : null}
    </li>
  );
}

function ErrorFor({
  form,
  orderId,
}: {
  form: StudentFileForm | undefined;
  orderId: string;
}) {
  return form?.orderId === orderId ? (
    <FormError message={form.message} />
  ) : null;
}

function RecordBlock({
  record,
  path,
  today,
  materials,
  form,
}: {
  record: StudentRecordCard;
  path: string;
  today: string;
  materials: readonly EnrollmentMaterialChoice[];
  form: StudentFileForm | undefined;
}) {
  const titleId = `${record.anchor}-title`;
  return (
    <article
      id={record.anchor}
      aria-labelledby={titleId}
      className="flex scroll-mt-20 flex-col gap-4 rounded-md bg-surface p-5 shadow-card target:ring-4 target:ring-clay-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Heading level={3} size="h4" id={titleId}>
            {record.workshop}
          </Heading>
        </div>
        <StatusChip
          status={stateStatus[record.state]}
          label={stateLabel(record, true)}
        />
      </div>
      <p
        className={`text-2xl font-bold tabular-nums ${record.state === "owes" ? "text-admin-warning-fg" : record.state === "paid" ? "text-admin-positive-fg" : "text-admin-neutral-fg"}`}
      >
        {record.total}
      </p>
      <p className="text-lg text-ink-700">{`${record.month} · ${record.turno}`}</p>
      <Materials card={record} />
      <ErrorFor form={form} orderId={record.id} />
      {record.canPay ? (
        <PayForm card={record} path={path} today={today} />
      ) : null}
      {record.canSell ? (
        <SellPanel
          record={record}
          path={path}
          materials={materials}
          form={form}
        />
      ) : null}
      {record.sales.length > 0 ? (
        <ul
          aria-label={`${copy.sale} · ${record.workshop}`}
          className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start"
        >
          {record.sales.map((sale) => (
            <SaleBlock
              key={sale.id}
              sale={sale}
              path={path}
              today={today}
              form={form}
            />
          ))}
        </ul>
      ) : null}
      {record.canCancel ? (
        <MoreOptions label={copy.cancel}>
          <CancelForm
            card={record}
            path={path}
            label={copy.cancel}
            isSale={false}
            today={today}
          />
        </MoreOptions>
      ) : null}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <Heading level={2}>{title}</Heading>
      {children}
    </section>
  );
}

/**
 * One student on one screen: her data, then each monthly record as a card with
 * its materials and sales nested in it and its actions inline. Every form is a
 * native post to this same page that returns to the card it acted on.
 */
export function StudentDetail({
  student,
  path,
  today,
  enrollHref,
  materials,
  saved,
  form,
}: StudentDetailProps) {
  const noteMine = form?.intent === "note";
  return (
    <section className="flex flex-col gap-6">
      <AdminPageHeader
        title={student.name}
        back={{ href: "/admin/alumnas", label: copy.back }}
      />
      <SavedBanner message={saved} />

      <div className="flex flex-col gap-4 rounded-md bg-surface p-5 shadow-card lg:p-6">
        <AdminColumns
          start={
            <div
              role="group"
              aria-label={copy.debtLabel}
              className="flex flex-col gap-2"
            >
              <p
                data-summary-tone={student.owes === null ? "paid" : "owed"}
                className={`text-3xl font-bold tabular-nums ${student.owes === null ? "text-admin-positive-fg" : "text-admin-warning-fg"}`}
              >
                {student.owes === null
                  ? copy.upToDate
                  : copy.owes(student.owes)}
              </p>
              {student.seatDebts.map((debt) => (
                <p
                  key={debt.label}
                  className="flex flex-wrap gap-x-2 text-lg text-ink-700"
                >
                  <span>{debt.label}</span>
                  <span className="font-semibold text-ink-900">
                    {debt.amount}
                  </span>
                </p>
              ))}
            </div>
          }
          end={
            <div className="flex min-w-0 flex-col gap-3 border-t border-admin-line pt-4 lg:border-t-0 lg:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                {student.phoneLink === null ? (
                  <p className="text-lg text-ink-900">{student.phoneShown}</p>
                ) : (
                  <a
                    href={student.phoneLink}
                    className="inline-flex min-h-12 items-center text-lg font-semibold text-ink-900 underline underline-offset-4"
                  >
                    {student.phoneShown}
                  </a>
                )}
                {student.whatsappLink === null ? null : (
                  <a
                    href={student.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-variant="secondary"
                    className={adminButtonClasses.secondary}
                  >
                    {copy.whatsapp}
                  </a>
                )}
              </div>
              <p className="text-lg text-ink-700">{student.email}</p>
              <p className="font-semibold text-ink-900">
                {student.active ? copy.active : copy.inactive}
              </p>
            </div>
          }
        />
        <MoreOptions label={copy.edit}>
          <form method="post" className="flex flex-col gap-3">
            <input
              type="hidden"
              name="intent"
              value={student.active ? "deactivate" : "reactivate"}
            />
            <ReturnToFields to={path} />
            <div>
              <Button type="submit" variant="outline">
                {student.active ? copy.deactivate : copy.reactivate}
              </Button>
            </div>
          </form>
        </MoreOptions>
      </div>

      <div>
        <AdminButtonLink href={enrollHref}>{copy.enrollAgain}</AdminButtonLink>
      </div>

      <Section title={copy.records}>
        {student.records.length === 0 ? (
          <p className="text-lg text-ink-700">{copy.noRecords}</p>
        ) : (
          <div
            className={
              student.records.length > 1
                ? `${ADMIN_CARD_GRID} lg:items-start`
                : "grid gap-4"
            }
          >
            {student.records.map((record) => (
              <RecordBlock
                key={record.id}
                record={record}
                path={path}
                today={today}
                materials={materials}
                form={form}
              />
            ))}
          </div>
        )}
      </Section>

      <MoreOptions label={copy.more} defaultOpen={noteMine}>
        {student.attendance ? (
          <p className="text-lg text-ink-700">{student.attendance}</p>
        ) : null}
        <form
          id="nota"
          method="post"
          className="flex scroll-mt-20 flex-col gap-3"
        >
          <input type="hidden" name="intent" value="note" />
          <ReturnToFields to={path} anchor="nota" />
          <TextAreaField
            label={copy.noteLabel}
            name="note"
            rows={5}
            maxLength={2000}
            defaultValue={noteMine ? (form.noteValue ?? "") : student.note.text}
            error={noteMine ? form.message : undefined}
          />
          {student.note.meta ? (
            <p className="text-sm text-ink-600">{student.note.meta}</p>
          ) : null}
          <div>
            <Button type="submit">{copy.noteSave}</Button>
          </div>
        </form>
      </MoreOptions>
    </section>
  );
}
