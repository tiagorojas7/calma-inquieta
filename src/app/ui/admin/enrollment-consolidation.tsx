import { useState, type ReactNode } from "react";
import { AdminButton as Button } from "./admin-button";
import { Heading } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { FormError, TextAreaField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { StatusChip } from "./status-chip";
import { ADMIN_PANEL, adminFilterClasses } from "./admin-sections";

export interface ConsolidationSupplierView {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materials: readonly {
    label: string;
    quantity: number;
    total: string;
  }[];
  readonly total: string;
  readonly summary: string;
  /** Paid orders that can still be marked as requested. */
  readonly orderIds: readonly string[];
}

/** One order to hand over: the student, her taller and her own material lines. */
export interface DeliveryCardView {
  readonly id: string;
  readonly studentName: string;
  readonly detail: string;
  readonly lines: readonly { label: string; quantity: number }[];
  readonly whatsappHref?: string | undefined;
}

export type MaterialsSection = "pedir" | "entregar";

export interface EnrollmentConsolidationProps {
  readonly period: string;
  readonly periodLabel: string;
  readonly section: MaterialsSection;
  readonly counts: { readonly pedir: number; readonly entregar: number };
  readonly suppliers: readonly ConsolidationSupplierView[];
  readonly grandTotal: string;
  readonly pendingOrders: number;
  /** Orders whose materials were requested and still wait to be marked received. */
  readonly toDeliver: readonly DeliveryCardView[];
  /** Orders already marked received. */
  readonly delivered: readonly DeliveryCardView[];
  readonly notice?:
    | { readonly kind: "requested" | "received"; readonly count: number }
    | undefined;
  readonly formError?: string | undefined;
}

const copy = adminMicrocopy.enrollments.consolidation;
const deliver = copy.deliver;

const sectionHref = (period: string, section: MaterialsSection) =>
  `/admin/inscripciones/materiales?mes=${period}&seccion=${section}`;

function CopySummary({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(summary).then(() => {
            setCopied(true);
          });
        }}
      >
        {copy.copy}
      </Button>
      <p role="status" className="text-sm text-ink-700">
        {copied ? copy.copied : ""}
      </p>
    </div>
  );
}

/** One numbered step of ordering; the number repeats what the list already says. */
function OrderStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-area-materials-bg text-sm font-bold text-area-materials-fg"
      >
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="font-semibold text-ink-900">{title}</p>
        {children}
      </div>
    </li>
  );
}

/** The answer to "how much is this month": it opens Para pedir. */
function OrderSummary({
  grandTotal,
  suppliers,
}: {
  grandTotal: string;
  suppliers: number;
}) {
  return (
    <div
      data-order-summary
      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-md bg-area-materials-bg px-5 py-4 text-area-materials-fg"
    >
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-semibold">{copy.grandTotal}</span>
        <span className="font-display text-3xl font-semibold lining-nums">
          {grandTotal}
        </span>
      </p>
      <p className="font-semibold">{copy.suppliers(suppliers)}</p>
    </div>
  );
}

function SupplierSection({
  supplier,
  period,
}: {
  supplier: ConsolidationSupplierView;
  period: string;
}) {
  return (
    <section aria-label={supplier.supplierName} className={ADMIN_PANEL}>
      <div
        data-supplier-head
        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-admin-line pb-3"
      >
        <Heading level={2}>{supplier.supplierName}</Heading>
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm font-semibold text-ink-700">
            {copy.supplierTotal}
          </span>
          <span className="font-display text-3xl font-semibold text-ink-900 lining-nums">
            {supplier.total}
          </span>
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <Heading level={3}>{copy.itemsTitle}</Heading>
          <ul
            aria-label={`${supplier.supplierName}: ${copy.columns.material}`}
            className="flex flex-col divide-y divide-admin-line"
          >
            {supplier.materials.map((item) => (
              <li
                key={item.label}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 last:pb-0"
              >
                <span className="min-w-0 flex-1 basis-full font-semibold text-ink-900 sm:basis-0">
                  {item.label}
                </span>
                <span className="whitespace-nowrap text-ink-700">
                  {copy.quantity(item.quantity)}
                </span>
                <span className="ml-auto min-w-24 whitespace-nowrap text-right tabular-nums text-ink-900">
                  {item.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ol
          aria-label={copy.stepsLabel(supplier.supplierName)}
          className="flex min-w-0 flex-col gap-5"
        >
          <OrderStep number={1} title={copy.steps.copy}>
            <TextAreaField
              label={copy.summaryLabel(supplier.supplierName)}
              readOnly
              rows={Math.max(3, supplier.summary.split("\n").length)}
              value={supplier.summary}
            />
            <CopySummary summary={supplier.summary} />
          </OrderStep>
          {supplier.orderIds.length > 0 ? (
            <OrderStep number={2} title={copy.steps.done}>
              <form method="post" className="flex flex-col items-start gap-3">
                <input type="hidden" name="intent" value="mark-requested" />
                <input type="hidden" name="mes" value={period} />
                <input type="hidden" name="seccion" value="pedir" />
                {supplier.orderIds.map((id) => (
                  <input key={id} type="hidden" name="orderId" value={id} />
                ))}
                <p className="text-ink-700">
                  {copy.consequence(supplier.orderIds.length)}
                </p>
                <Button type="submit" variant="success">
                  {copy.markRequested}
                </Button>
              </form>
            </OrderStep>
          ) : null}
        </ol>
      </div>
    </section>
  );
}

function SectionLinks({
  period,
  section,
  counts,
}: Pick<EnrollmentConsolidationProps, "period" | "section" | "counts">) {
  return (
    <nav aria-label={copy.sectionsLabel}>
      <ul className="flex flex-wrap gap-2">
        {(["pedir", "entregar"] as const).map((key) => (
          <li key={key}>
            <a
              href={sectionHref(period, key)}
              aria-current={key === section ? "page" : undefined}
              className={adminFilterClasses(key === section)}
            >
              {copy.sections[key]} <span>{String(counts[key])}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Notice({
  notice,
  period,
}: {
  notice: NonNullable<EnrollmentConsolidationProps["notice"]>;
  period: string;
}) {
  return (
    <AdminFeedback
      tone="success"
      title={copy[notice.kind](notice.count)}
      message={
        notice.kind === "requested" ? (
          <a
            href={sectionHref(period, "entregar")}
            className="font-semibold text-clay-800 underline"
          >
            {copy.goDeliver}
          </a>
        ) : undefined
      }
    />
  );
}

function DeliveryCard({
  card,
  period,
  status,
}: {
  card: DeliveryCardView;
  period: string;
  status: "materials_requested" | "materials_received";
}) {
  return (
    <li className="flex flex-col gap-2 rounded-md bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level={2} size="h4">
          {card.studentName}
        </Heading>
        <StatusChip
          status={status}
          label={
            status === "materials_received"
              ? deliver.receivedStatus
              : deliver.requestedStatus
          }
        />
      </div>
      <p className="text-ink-600">{card.detail}</p>
      <ul className="flex flex-col gap-1">
        {card.lines.map((line) => (
          <li
            key={line.label}
            className="flex flex-wrap items-center justify-between gap-x-4 border-t border-sand-200 pt-1"
          >
            <span className="text-ink-900">{line.label}</span>
            <span className="text-ink-700">{copy.quantity(line.quantity)}</span>
          </li>
        ))}
      </ul>
      {card.whatsappHref ? (
        <div>
          <a
            href={card.whatsappHref}
            aria-label={deliver.whatsappWith(card.studentName)}
            className="inline-flex min-h-11 items-center font-semibold text-clay-800 underline"
          >
            {deliver.whatsapp}
          </a>
        </div>
      ) : null}
      {status === "materials_requested" ? (
        <form method="post">
          <input type="hidden" name="intent" value="mark-received" />
          <input type="hidden" name="mes" value={period} />
          <input type="hidden" name="seccion" value="entregar" />
          <input type="hidden" name="orderId" value={card.id} />
          <Button
            type="submit"
            variant="success"
            aria-label={deliver.receivedOf(card.studentName)}
            className="w-full sm:w-auto"
          >
            {deliver.received}
          </Button>
        </form>
      ) : null}
    </li>
  );
}

function ToDeliverSection({
  period,
  toDeliver,
  delivered,
}: Pick<EnrollmentConsolidationProps, "period" | "toDeliver" | "delivered">) {
  return (
    <div className="flex flex-col gap-4">
      {toDeliver.length === 0 ? (
        <p>{deliver.empty}</p>
      ) : (
        <>
          <form
            method="post"
            className="flex flex-wrap items-center gap-3 rounded-md bg-surface p-4 shadow-card"
          >
            <input type="hidden" name="intent" value="mark-received" />
            <input type="hidden" name="mes" value={period} />
            <input type="hidden" name="seccion" value="entregar" />
            {toDeliver.map((card) => (
              <input
                key={card.id}
                type="hidden"
                name="orderId"
                value={card.id}
              />
            ))}
            <p className="text-ink-700">
              {deliver.markAllConsequence(toDeliver.length)}
            </p>
            <Button type="submit" variant="success">
              {deliver.markAll}
            </Button>
          </form>
          <ul
            aria-label={deliver.label}
            className="grid grid-cols-1 gap-3 lg:grid-cols-2"
          >
            {toDeliver.map((card) => (
              <DeliveryCard
                key={card.id}
                card={card}
                period={period}
                status="materials_requested"
              />
            ))}
          </ul>
        </>
      )}
      {delivered.length > 0 ? (
        <details className="rounded-md bg-surface p-4 shadow-card">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-ink-900">
            {deliver.delivered(delivered.length)}
          </summary>
          <ul
            aria-label={deliver.deliveredLabel}
            className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2"
          >
            {delivered.map((card) => (
              <DeliveryCard
                key={card.id}
                card={card}
                period={period}
                status="materials_received"
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/** One Materiales screen: what to order per supplier, and what to hand to each student. */
export function EnrollmentConsolidation(props: EnrollmentConsolidationProps) {
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title(props.periodLabel)}
        description={copy.subtitle}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: copy.crumb },
        ]}
        back={{
          href: "/admin/inscripciones",
          label: adminMicrocopy.enrollments.detail.back,
        }}
        actions={
          <form
            role="search"
            method="get"
            action="/admin/inscripciones/materiales"
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="seccion" value={props.section} />
            <TextField
              label={copy.month}
              name="mes"
              type="month"
              defaultValue={props.period}
            />
            <Button type="submit" variant="secondary">
              {copy.apply}
            </Button>
          </form>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLinks
          period={props.period}
          section={props.section}
          counts={props.counts}
        />
        <a
          href={`/admin/estadisticas?mes=${props.period}#registro-materiales`}
          className="inline-flex min-h-11 items-center font-semibold text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
        >
          {copy.record}
        </a>
      </div>
      {props.notice ? (
        <Notice notice={props.notice} period={props.period} />
      ) : null}
      <FormError message={props.formError} />
      {props.section === "entregar" ? (
        <ToDeliverSection
          period={props.period}
          toDeliver={props.toDeliver}
          delivered={props.delivered}
        />
      ) : (
        <>
          {props.pendingOrders > 0 ? (
            <p className="rounded-md bg-status-orange-bg px-4 py-3 font-semibold text-status-orange-fg">
              {copy.pending(props.pendingOrders)}
            </p>
          ) : null}
          {props.suppliers.length === 0 ? (
            <p>{copy.empty}</p>
          ) : (
            <>
              <OrderSummary
                grandTotal={props.grandTotal}
                suppliers={props.suppliers.length}
              />
              {props.suppliers.map((supplier) => (
                <SupplierSection
                  key={`${supplier.supplierId}-${supplier.supplierName}`}
                  supplier={supplier}
                  period={props.period}
                />
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
