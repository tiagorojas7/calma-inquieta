import { AdminPageHeader } from "./admin-page";
import { adminCopy } from "./copy";
import { AdminButton as Button } from "./admin-button";
import { FormError, TextField } from "./form-fields";
import { MoreOptions } from "./more-options";
import {
  DeliverSection,
  OrderSection,
  type DeliveryCardView,
  type OrderSupplierView,
} from "./materials-orders";
import {
  StockSection,
  type StockCard,
  type StockFilterKey,
} from "./materials-stock";
import { SavedBanner } from "./saved-banner";

const copy = adminCopy.materiales;
const BASE = "/admin/materiales";

export interface MaterialsScreenProps {
  readonly cards: readonly StockCard[];
  readonly filter: StockFilterKey;
  readonly query: string;
  /** `activos` or `inactivos`: which materials "Qué hay" lists. */
  readonly estado: string;
  readonly period: string;
  readonly periodLabel: string;
  /** The page's own address, so a post comes back to this same view. */
  readonly returnTo: string;
  readonly highlightId?: string | undefined;
  /** What was just saved, in words; nothing when there is nothing to say. */
  readonly saved?: string | null | undefined;
  readonly suppliers: readonly OrderSupplierView[];
  readonly pendingOrders: number;
  readonly toDeliver: readonly DeliveryCardView[];
  readonly delivered: readonly DeliveryCardView[];
  /** A refused post of "Para pedir" or "Para entregar". */
  readonly formError?: string | undefined;
  /** A refused "Llegaron". */
  readonly arrivedError?: { anchor: string; message: string } | undefined;
}

const linkClasses =
  "inline-flex min-h-12 items-center rounded-md px-2 text-lg font-semibold text-clay-800 underline underline-offset-4 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function Tools({ period, estado }: { period: string; estado: string }) {
  const archived = estado === "inactivos";
  return (
    <MoreOptions label={copy.tools.title}>
      <ul className="flex flex-col">
        <li>
          <a href={`${BASE}/importar`} className={linkClasses}>
            {copy.tools.import}
          </a>
        </li>
        <li>
          <a href={`${BASE}/precios`} className={linkClasses}>
            {copy.tools.prices}
          </a>
        </li>
        <li>
          <a href={`${BASE}/proveedores`} className={linkClasses}>
            {copy.tools.suppliers}
          </a>
        </li>
        <li>
          <a
            href={archived ? BASE : `${BASE}?estado=inactivos`}
            className={linkClasses}
          >
            {archived ? copy.tools.active : copy.tools.archived}
          </a>
        </li>
        <li>
          <a
            href={`/admin/estadisticas?mes=${period}#registro-materiales`}
            className={linkClasses}
          >
            {copy.tools.record}
          </a>
        </li>
      </ul>
    </MoreOptions>
  );
}

/** One Materiales screen: what there is, what to order, what to hand over. */
export function MaterialsScreen(props: MaterialsScreenProps) {
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title={copy.title} />
      <SavedBanner message={props.saved} />
      <StockSection
        cards={props.cards}
        filter={props.filter}
        query={props.query}
        period={props.period}
        estado={props.estado}
        returnTo={props.returnTo}
        highlightId={props.highlightId}
        error={props.arrivedError}
      />
      <div className="flex flex-col gap-3">
        <p className="text-lg font-semibold text-ink-900">
          {copy.month.showing(props.periodLabel)}
        </p>
        <MoreOptions label={copy.month.more}>
          <form
            role="search"
            aria-label={copy.month.label}
            method="get"
            action={BASE}
            className="flex flex-wrap items-end gap-3"
          >
            {props.filter === "todos" ? null : (
              <input type="hidden" name="stock" value={props.filter} />
            )}
            {props.query === "" ? null : (
              <input type="hidden" name="q" value={props.query} />
            )}
            <TextField
              label={copy.month.label}
              name="mes"
              type="month"
              defaultValue={props.period}
            />
            <Button type="submit" variant="outline">
              {copy.month.apply}
            </Button>
          </form>
        </MoreOptions>
      </div>
      <FormError message={props.formError} />
      <OrderSection
        suppliers={props.suppliers}
        pendingOrders={props.pendingOrders}
        period={props.period}
        returnTo={props.returnTo}
      />
      <DeliverSection
        toDeliver={props.toDeliver}
        delivered={props.delivered}
        period={props.period}
        returnTo={props.returnTo}
      />
      <Tools period={props.period} estado={props.estado} />
    </div>
  );
}
