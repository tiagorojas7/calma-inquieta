import { useState } from "react";
import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
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
const cell = "px-4 py-3";
const head = "px-4 py-3 font-semibold";

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
      <div
        role="region"
        aria-label={`${supplier.supplierName}: ${copy.columns.material}`}
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table className="w-full text-left text-base text-ink-700">
          <caption className="sr-only">{supplier.supplierName}</caption>
          <thead className="bg-sand-100 text-ink-900">
            <tr>
              <th scope="col" className={head}>
                {copy.columns.material}
              </th>
              <th scope="col" className={head}>
                {copy.columns.quantity}
              </th>
              <th scope="col" className={head}>
                {copy.columns.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {supplier.materials.map((item) => (
              <tr key={item.label} className="border-t border-sand-200">
                <td className={cell}>{item.label}</td>
                <td className={cell}>{String(item.quantity)}</td>
                <td className={cell}>{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <Heading level={1}>{copy.title(props.periodLabel)}</Heading>
      <AdminButtonLink variant="outline" href="/admin/inscripciones">
        {adminMicrocopy.enrollments.detail.back}
      </AdminButtonLink>
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
        <p role="status" className="text-olive-800">
          {copy.requested(props.requestedCount)}
        </p>
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
