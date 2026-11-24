import { useState } from "react";
import { Heading } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { ADMIN_CARD_GRID } from "./admin-sections";
import { adminCopy } from "./copy";
import { ReturnToFields, TextAreaField } from "./form-fields";
import { MaterialsSectionTitle } from "./materials-section-title";
import { MoreOptions } from "./more-options";
import { StatusChip } from "./status-chip";

const copy = adminCopy.materiales;

/** What one supplier is owed: monthly orders and workshop lines together. */
export interface OrderSupplierView {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materials: readonly {
    label: string;
    quantity: number;
    /** The workshop the units are for; absent on monthly lines. */
    origin?: string | undefined;
    originId?: string | undefined;
    /** Who the units are for: the owner's context, never the supplier text. */
    forWhom: readonly {
      student: string;
      /** Workshop and turno, or workshop and project. */
      place: string;
      quantity: number;
    }[];
  }[];
  readonly total: string;
  readonly summary: string;
  /** Paid orders that can still be marked as requested. */
  readonly orderIds: readonly string[];
  /** The workshops with lines for this supplier, each once. */
  readonly workshops: readonly { id: string; name: string }[];
}

/** One order to hand over: the student, her workshop and her own lines. */
export interface DeliveryCardView {
  readonly id: string;
  readonly studentName: string;
  readonly detail: string;
  readonly lines: readonly { label: string; quantity: number }[];
  readonly whatsappHref?: string | undefined;
  /** Paid order whose lines all come from the studio's stock. */
  readonly fromStock?: boolean | undefined;
}

const card =
  "flex scroll-mt-20 flex-col gap-3 rounded-md bg-surface p-5 shadow-card";

function CopySummary({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          void navigator.clipboard.writeText(summary).then(() => {
            setCopied(true);
          });
        }}
      >
        {copy.order.copy}
      </Button>
      <p role="status" className="basis-full text-ink-700 empty:hidden">
        {copied ? copy.order.copied : ""}
      </p>
    </>
  );
}

function SupplierCard({
  supplier,
  period,
  returnTo,
}: {
  supplier: OrderSupplierView;
  period: string;
  returnTo: string;
}) {
  const anchor = `pedir-${supplier.supplierId}`;
  const canMark = supplier.orderIds.length > 0 || supplier.workshops.length > 0;
  return (
    <li>
      <article id={anchor} aria-labelledby={`${anchor}-title`} className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Heading level={3} size="h4" id={`${anchor}-title`}>
            {supplier.supplierName}
          </Heading>
          <p className="text-2xl font-bold tabular-nums text-admin-neutral-fg">
            {copy.order.total(supplier.total)}
          </p>
        </div>
        <ul
          aria-label={supplier.supplierName}
          className="flex flex-col divide-y divide-admin-line"
        >
          {supplier.materials.map((item) => (
            <li
              key={`${item.label}|${item.originId ?? ""}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-lg"
            >
              <span className="min-w-0 font-semibold text-ink-900">
                {item.label}
                {item.origin === undefined ? null : (
                  <span className="block text-base font-normal text-ink-700">
                    {copy.order.workshop(item.origin)}
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap text-ink-700">
                {copy.order.quantity(item.quantity)}
              </span>
              {item.forWhom.length === 0 ? null : (
                <ul
                  aria-label={copy.order.forWhom(
                    `${item.label}, ${copy.order.quantity(item.quantity)}`,
                  )}
                  className="flex w-full flex-col gap-1 border-l-4 border-admin-line pl-3 text-base text-ink-700"
                >
                  {item.forWhom.map((who) => (
                    <li key={`${who.student}|${who.place}`}>
                      <span className="font-semibold text-ink-900">
                        {who.student}
                      </span>
                      {who.place === "" ? null : ` · ${who.place}`}
                      {` · ${copy.order.units(who.quantity)}`}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          {canMark ? (
            <form method="post" className="contents">
              <input
                type="hidden"
                name="intent"
                value="mark-supplier-requested"
              />
              <input type="hidden" name="mes" value={period} />
              <input
                type="hidden"
                name="supplierId"
                value={supplier.supplierId}
              />
              {supplier.orderIds.map((id) => (
                <input key={id} type="hidden" name="orderId" value={id} />
              ))}
              {supplier.workshops.map((workshop) => (
                <input
                  key={workshop.id}
                  type="hidden"
                  name="workshopId"
                  value={workshop.id}
                />
              ))}
              <ReturnToFields to={returnTo} anchor={anchor} />
              <Button
                type="submit"
                variant="success"
                aria-label={copy.order.doneOf(supplier.supplierName)}
              >
                {copy.order.done}
              </Button>
            </form>
          ) : null}
          <CopySummary summary={supplier.summary} />
        </div>
        <MoreOptions label={copy.order.seeText}>
          <TextAreaField
            label={copy.order.textLabel(supplier.supplierName)}
            readOnly
            rows={Math.max(3, supplier.summary.split("\n").length)}
            value={supplier.summary}
          />
        </MoreOptions>
      </article>
    </li>
  );
}

/** What to ask each supplier for, with one "Ya lo pedí" per supplier. */
export function OrderSection({
  suppliers,
  pendingOrders,
  period,
  returnTo,
}: {
  suppliers: readonly OrderSupplierView[];
  pendingOrders: number;
  period: string;
  returnTo: string;
}) {
  return (
    <section
      id="para-pedir"
      aria-labelledby="para-pedir-title"
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <MaterialsSectionTitle
        id="para-pedir-title"
        title={copy.order.title}
        count={suppliers.length}
      />
      {pendingOrders > 0 ? (
        <p className="rounded-md bg-status-orange-bg px-4 py-3 text-lg font-semibold text-status-orange-fg">
          {copy.order.unconfirmed(pendingOrders)}
        </p>
      ) : null}
      {suppliers.length === 0 ? (
        <p className="text-lg text-ink-700">{copy.order.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={`${supplier.supplierId}-${supplier.supplierName}`}
              supplier={supplier}
              period={period}
              returnTo={returnTo}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeliveryCard({
  delivery,
  period,
  returnTo,
  done,
}: {
  delivery: DeliveryCardView;
  period: string;
  returnTo: string;
  /** Already handed over: no action. */
  done?: boolean;
}) {
  const anchor = `entregar-${delivery.id}`;
  return (
    <li>
      <article id={anchor} aria-labelledby={`${anchor}-title`} className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading level={3} size="h4" id={`${anchor}-title`}>
            {delivery.studentName}
          </Heading>
          {done ? null : delivery.fromStock === true ? (
            <StatusChip status="paid" label={copy.deliver.fromStock} />
          ) : (
            <StatusChip
              status="materials_requested"
              label={copy.deliver.asked}
            />
          )}
        </div>
        <p className="text-2xl font-bold tabular-nums text-admin-neutral-fg">
          {copy.order.quantity(
            delivery.lines.reduce((total, line) => total + line.quantity, 0),
          )}
        </p>
        <p className="text-lg text-ink-700">{delivery.detail}</p>
        <ul className="flex flex-col gap-1">
          {delivery.lines.map((line) => (
            <li
              key={line.label}
              className="flex flex-wrap justify-between gap-x-4 border-t border-sand-200 pt-1 text-lg"
            >
              <span className="text-ink-900">{line.label}</span>
              <span className="text-ink-700">
                {copy.order.quantity(line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        {done ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <form method="post" className="contents">
              <input type="hidden" name="intent" value="mark-received" />
              <input type="hidden" name="mes" value={period} />
              <input type="hidden" name="orderId" value={delivery.id} />
              <ReturnToFields to={returnTo} anchor={anchor} />
              <Button
                type="submit"
                variant="success"
                aria-label={copy.deliver.doneOf(delivery.studentName)}
              >
                {copy.deliver.done}
              </Button>
            </form>
            {delivery.whatsappHref ? (
              <a
                href={delivery.whatsappHref}
                aria-label={copy.deliver.whatsappWith(delivery.studentName)}
                className="inline-flex min-h-12 items-center px-2 text-lg font-semibold text-clay-800 underline underline-offset-4"
              >
                {copy.deliver.whatsapp}
              </a>
            ) : null}
          </div>
        )}
      </article>
    </li>
  );
}

/** What arrived and goes to each student: "Entregado" per student, or all at once. */
export function DeliverSection({
  toDeliver,
  delivered,
  period,
  returnTo,
}: {
  toDeliver: readonly DeliveryCardView[];
  delivered: readonly DeliveryCardView[];
  period: string;
  returnTo: string;
}) {
  return (
    <section
      id="para-entregar"
      aria-labelledby="para-entregar-title"
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MaterialsSectionTitle
          id="para-entregar-title"
          title={copy.deliver.title}
          count={toDeliver.length}
        />
        {toDeliver.length > 1 ? (
          <form method="post">
            <input type="hidden" name="intent" value="mark-received" />
            <input type="hidden" name="mes" value={period} />
            {toDeliver.map((delivery) => (
              <input
                key={delivery.id}
                type="hidden"
                name="orderId"
                value={delivery.id}
              />
            ))}
            <ReturnToFields to={returnTo} anchor="para-entregar" />
            <Button type="submit" variant="outline">
              {copy.deliver.all}
            </Button>
          </form>
        ) : null}
      </div>
      {toDeliver.length === 0 ? (
        <p className="text-lg text-ink-700">{copy.deliver.empty}</p>
      ) : (
        <ul className={ADMIN_CARD_GRID}>
          {toDeliver.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              period={period}
              returnTo={returnTo}
            />
          ))}
        </ul>
      )}
      {delivered.length > 0 ? (
        <MoreOptions label={copy.deliver.delivered(delivered.length)}>
          <ul
            aria-label={copy.deliver.deliveredLabel}
            className={ADMIN_CARD_GRID}
          >
            {delivered.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                period={period}
                returnTo={returnTo}
                done
              />
            ))}
          </ul>
        </MoreOptions>
      ) : null}
    </section>
  );
}
