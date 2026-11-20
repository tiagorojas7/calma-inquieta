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
import { CatalogSection, type CatalogRow } from "./materials-catalog";
import { StudioSection, type StockCard } from "./materials-stock";
import { SavedBanner } from "./saved-banner";

const copy = adminCopy.materiales;
const BASE = "/admin/materiales";

export interface MaterialsScreenProps {
  /** "En el estudio": the materials the studio keeps. */
  readonly studio: readonly StockCard[];
  /** "Catálogo": the search results, how many matched and how many there are. */
  readonly catalog: {
    readonly rows: readonly CatalogRow[];
    readonly found: number;
    readonly total: number;
  };
  /** What the owner searched in the catalog. */
  readonly query: string;
  /** `activos` or `inactivos`: which materials the screen lists. */
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

/**
 * One Materiales screen, in this order: what to hand over, what to order, what
 * is in the studio, and the catalog behind a search.
 */
export function MaterialsScreen(props: MaterialsScreenProps) {
  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title={copy.title} />
      <SavedBanner message={props.saved} />
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
            {props.query === "" ? null : (
              <input type="hidden" name="q" value={props.query} />
            )}
            {props.estado === "activos" ? null : (
              <input type="hidden" name="estado" value={props.estado} />
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
      <DeliverSection
        toDeliver={props.toDeliver}
        delivered={props.delivered}
        period={props.period}
        returnTo={props.returnTo}
      />
      <OrderSection
        suppliers={props.suppliers}
        pendingOrders={props.pendingOrders}
        period={props.period}
        returnTo={props.returnTo}
      />
      <StudioSection
        cards={props.studio}
        returnTo={props.returnTo}
        highlightId={props.highlightId}
        error={props.arrivedError}
      />
      <CatalogSection
        rows={props.catalog.rows}
        found={props.catalog.found}
        total={props.catalog.total}
        query={props.query}
        period={props.period}
        estado={props.estado}
        returnTo={props.returnTo}
        highlightId={props.highlightId}
      />
      <Tools period={props.period} estado={props.estado} />
    </div>
  );
}
