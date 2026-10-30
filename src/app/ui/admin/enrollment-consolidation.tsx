import { useState } from "react";
import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { FormError, TextAreaField, TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

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

export interface EnrollmentConsolidationProps {
  readonly period: string;
  readonly periodLabel: string;
  readonly suppliers: readonly ConsolidationSupplierView[];
  readonly grandTotal: string;
  readonly pendingOrders: number;
  readonly requestedCount?: number;
  readonly formError?: string | undefined;
}

const copy = adminMicrocopy.enrollments.consolidation;

function CopySummary({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div>
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
      </div>
      <p role="status" className="text-sm text-ink-600">
        {copied ? copy.copied : ""}
      </p>
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
    <section
      aria-label={supplier.supplierName}
      className="flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
    >
      <Heading level={2} size="h3">
        {supplier.supplierName}
      </Heading>
      <ul
        aria-label={`${supplier.supplierName}: ${copy.columns.material}`}
        className="flex flex-col gap-2"
      >
        {supplier.materials.map((item) => (
          <li
            key={item.label}
            className="flex flex-wrap items-center justify-between gap-x-4 border-t border-sand-200 pt-2"
          >
            <span className="text-ink-900">{item.label}</span>
            <span className="text-ink-700">{copy.quantity(item.quantity)}</span>
            <span className="text-ink-900">{item.total}</span>
          </li>
        ))}
      </ul>
      <p className="font-semibold text-ink-900">
        {copy.supplierTotal}: {supplier.total}
      </p>
      <TextAreaField
        label={copy.summaryLabel(supplier.supplierName)}
        readOnly
        rows={Math.max(3, supplier.summary.split("\n").length)}
        value={supplier.summary}
      />
      <CopySummary summary={supplier.summary} />
      {supplier.orderIds.length > 0 ? (
        <form method="post">
          <input type="hidden" name="intent" value="mark-requested" />
          <input type="hidden" name="mes" value={period} />
          {supplier.orderIds.map((id) => (
            <input key={id} type="hidden" name="orderId" value={id} />
          ))}
          <p className="mb-3 text-ink-700">
            {copy.consequence(supplier.orderIds.length)}
          </p>
          <Button type="submit">{copy.markRequested}</Button>
        </form>
      ) : null}
    </section>
  );
}

/** What to buy per supplier for one month, with a copyable summary and the bulk "requested" action. */
export function EnrollmentConsolidation(props: EnrollmentConsolidationProps) {
  return (
    <section className="flex flex-col gap-4">
      <AdminPageHeader
        title={copy.title(props.periodLabel)}
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          {
            label: adminMicrocopy.enrollments.title,
            href: "/admin/inscripciones",
          },
          { label: adminMicrocopy.enrollments.consolidationLink },
        ]}
        back={{
          href: "/admin/inscripciones",
          label: adminMicrocopy.enrollments.detail.back,
        }}
      />
      <ol aria-label={copy.workflowLabel} className="grid gap-2 md:grid-cols-3">
        {Object.values(adminMicrocopy.enrollments.detail.steps).map(
          (label, index) => (
            <li
              key={label}
              aria-current={index === 1 ? "step" : undefined}
              className={`rounded-md p-3 ${index === 1 ? "bg-sand-200 font-semibold text-ink-900" : "bg-surface text-ink-700 shadow-card"}`}
            >
              {label}
            </li>
          ),
        )}
      </ol>
      <form
        role="search"
        method="get"
        action="/admin/inscripciones/materiales"
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          label={copy.month}
          name="mes"
          type="month"
          defaultValue={props.period}
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
        >
          {copy.apply}
        </button>
      </form>
      {props.requestedCount ? (
        <AdminFeedback
          tone="success"
          title={copy.requested(props.requestedCount)}
          message={copy.afterRequested}
        />
      ) : null}
      <FormError message={props.formError} />
      {props.pendingOrders > 0 ? (
        <p>{copy.pending(props.pendingOrders)}</p>
      ) : null}
      {props.suppliers.length === 0 ? (
        <p>{copy.empty}</p>
      ) : (
        <>
          {props.suppliers.map((supplier) => (
            <SupplierSection
              key={`${supplier.supplierId}-${supplier.supplierName}`}
              supplier={supplier}
              period={props.period}
            />
          ))}
          <p className="text-lg font-semibold text-ink-900">
            {copy.grandTotal}: {props.grandTotal}
          </p>
        </>
      )}
    </section>
  );
}
