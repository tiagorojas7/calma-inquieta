import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { ADMIN_CARD_GRID } from "./admin-sections";
import { adminCopy } from "./copy";
import { ReturnToFields } from "./form-fields";
import { MaterialsSectionTitle } from "./materials-section-title";
import { StatusChip } from "./status-chip";

const copy = adminCopy.materiales.catalog;
const BASE = "/admin/materiales";

/** One simple result of the catalog search. */
export interface CatalogRow {
  readonly id: string;
  readonly anchor: string;
  readonly name: string;
  /** "Lo tenemos en el estudio". */
  readonly kept: boolean;
}

function CatalogResult({
  row,
  returnTo,
  highlighted,
}: {
  row: CatalogRow;
  returnTo: string;
  highlighted: boolean;
}) {
  return (
    <li
      id={row.anchor}
      data-highlight={highlighted ? "" : undefined}
      className={`flex scroll-mt-20 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md bg-surface p-4 shadow-card ${highlighted ? "ring-4 ring-clay-800" : ""}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-ink-900">{row.name}</span>
        <StatusChip
          status={row.kept ? "active" : "requested"}
          label={row.kept ? copy.kept : copy.ordered}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`${BASE}/${row.id}`}
          aria-label={copy.editOf(row.name)}
          className="inline-flex min-h-12 items-center rounded-md px-2 text-lg font-semibold text-clay-800 underline underline-offset-4 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
        >
          {copy.edit}
        </a>
        <form method="post" className="contents">
          <input type="hidden" name="intent" value="set-kept" />
          <input type="hidden" name="materialId" value={row.id} />
          <input type="hidden" name="kept" value={row.kept ? "0" : "1"} />
          <ReturnToFields to={returnTo} anchor={row.anchor} />
          <Button
            type="submit"
            variant={row.kept ? "outline" : "success"}
            aria-label={
              row.kept ? copy.unkeepOf(row.name) : copy.keepOf(row.name)
            }
          >
            {row.kept ? copy.unkeep : copy.keep}
          </Button>
        </form>
      </div>
    </li>
  );
}

/**
 * "Catálogo": a search and nothing else until the owner searches. Each result
 * is a simple row with Editar and the yes or no "Lo tenemos en el estudio".
 */
export function CatalogSection({
  rows,
  found,
  total,
  query,
  studioQuery,
  period,
  estado,
  returnTo,
  highlightId,
}: {
  rows: readonly CatalogRow[];
  /** How many materials matched the search. */
  found: number;
  /** How many materials the catalog holds. */
  total: number;
  query: string;
  studioQuery: string;
  period: string;
  estado: string;
  returnTo: string;
  highlightId?: string | undefined;
}) {
  return (
    <section
      id="catalogo"
      aria-labelledby="catalogo-title"
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MaterialsSectionTitle
          id="catalogo-title"
          title={copy.title}
          count={total}
        />
        <AdminButtonLink href={`${BASE}/nuevo`} variant="success">
          {adminCopy.materiales.stock.newAction}
        </AdminButtonLink>
      </div>
      <form
        role="search"
        aria-label={copy.searchAction}
        method="get"
        action={`${BASE}#catalogo`}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="mes" value={period} />
        {studioQuery && (
          <input type="hidden" name="estudio" value={studioQuery} />
        )}
        {estado === "activos" ? null : (
          <input type="hidden" name="estado" value={estado} />
        )}
        <label className="flex min-w-0 flex-1 basis-64 flex-col gap-1 font-semibold text-ink-900 lg:max-w-xl">
          {copy.search}
          <input
            type="search"
            name="q"
            defaultValue={query}
            autoComplete="off"
            className="min-h-14 rounded-md border border-admin-line bg-surface px-4 text-xl font-normal text-ink-900"
          />
        </label>
        <Button type="submit" variant="outline">
          {copy.searchAction}
        </Button>
      </form>
      {query === "" ? (
        <p className="text-lg text-ink-700">
          {total === 0 ? copy.empty : copy.hint}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-lg text-ink-700">{copy.emptyFound}</p>
      ) : (
        <>
          <ul aria-label={copy.listLabel} className={ADMIN_CARD_GRID}>
            {rows.map((row) => (
              <CatalogResult
                key={row.id}
                row={row}
                returnTo={returnTo}
                highlighted={row.id === highlightId}
              />
            ))}
          </ul>
          {found > rows.length ? (
            <p className="text-lg text-ink-700">
              {copy.more(rows.length, found)}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
