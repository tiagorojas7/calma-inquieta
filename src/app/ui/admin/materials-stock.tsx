import { Heading } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { adminCopy } from "./copy";
import { FormError, ReturnToFields } from "./form-fields";
import { MaterialsSectionTitle } from "./materials-section-title";
import { StatusChip } from "./status-chip";

const copy = adminCopy.materiales.stock;
const BASE = "/admin/materiales";

export interface StockVariantLine {
  readonly id: string;
  readonly label: string;
  readonly state: "hay" | "sin";
  readonly onHand: number;
}

export interface StockCard {
  readonly id: string;
  readonly anchor: string;
  readonly name: string;
  readonly price: string;
  readonly state: "hay" | "sin";
  readonly onHand: number;
  readonly variantId?: string | undefined;
  readonly variants: readonly StockVariantLine[];
}

/** "Hay N" or "Se acabó", always in words; the color only backs them up. */
export function StockBadge({
  state,
  onHand,
}: {
  state: "hay" | "sin";
  onHand: number;
}) {
  return (
    <StatusChip
      status={state === "hay" ? "active" : "pending"}
      label={state === "hay" ? copy.state.hay(onHand) : copy.state.sin}
    />
  );
}

/** A small number field and "Llegaron" for one variant: it adds those units. */
function ArrivedForm({
  materialId,
  variantId,
  label,
  anchor,
  returnTo,
}: {
  materialId: string;
  variantId: string;
  label: string;
  anchor: string;
  returnTo: string;
}) {
  return (
    <form method="post" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="intent" value="arrived" />
      <input type="hidden" name="materialId" value={materialId} />
      <input type="hidden" name="variantId" value={variantId} />
      <ReturnToFields to={returnTo} anchor={anchor} />
      <input
        type="number"
        name="units"
        inputMode="numeric"
        min={1}
        step={1}
        required
        aria-label={copy.arrivedField(label)}
        placeholder={copy.arrivedPlaceholder}
        className="min-h-12 w-28 rounded-md border border-admin-line bg-surface px-3 text-lg text-ink-900"
      />
      <Button type="submit" variant="success">
        {copy.arrived}
      </Button>
    </form>
  );
}

function MaterialCard({
  card,
  returnTo,
  highlighted,
  error,
}: {
  card: StockCard;
  returnTo: string;
  highlighted: boolean;
  error: string | undefined;
}) {
  const titleId = `${card.anchor}-title`;
  return (
    <li>
      <article
        id={card.anchor}
        aria-labelledby={titleId}
        data-highlight={highlighted ? "" : undefined}
        className={`flex scroll-mt-20 flex-col gap-3 rounded-md bg-surface p-5 shadow-card ${highlighted ? "ring-4 ring-clay-800" : ""}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <Heading level={3} size="h4" id={titleId}>
              {card.name}
            </Heading>
          </div>
        </div>
        <p className="text-2xl font-bold tabular-nums text-admin-neutral-fg">
          {card.state === "hay" ? copy.state.hay(card.onHand) : copy.state.sin}
        </p>
        <p className="text-lg text-ink-700">{card.price}</p>
        <FormError message={error} />
        {card.variants.length > 0 ? (
          <ul
            aria-label={copy.variantsLabel(card.name)}
            className="flex flex-col divide-y divide-admin-line"
          >
            {card.variants.map((variant) => (
              <li
                key={variant.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
              >
                <span className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink-900">
                  {variant.label}
                  <StockBadge state={variant.state} onHand={variant.onHand} />
                </span>
                <ArrivedForm
                  materialId={card.id}
                  variantId={variant.id}
                  label={`${card.name} ${variant.label}`}
                  anchor={card.anchor}
                  returnTo={returnTo}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {card.variantId ? (
            <ArrivedForm
              materialId={card.id}
              variantId={card.variantId}
              label={card.name}
              anchor={card.anchor}
              returnTo={returnTo}
            />
          ) : (
            <span />
          )}
          <a
            href={`${BASE}/${card.id}`}
            aria-label={copy.editOf(card.name)}
            className="inline-flex min-h-12 items-center rounded-md px-2 text-lg font-semibold text-clay-800 underline underline-offset-4 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
          >
            {copy.edit}
          </a>
        </div>
      </article>
    </li>
  );
}

/** "En el estudio": one card per material the studio keeps, with Hay N or Se acabó and Llegaron. */
export function StudioSection({
  cards,
  returnTo,
  highlightId,
  error,
}: {
  cards: readonly StockCard[];
  returnTo: string;
  highlightId?: string | undefined;
  /** A refused "Llegaron": the card it belongs to and the message. */
  error?: { anchor: string; message: string } | undefined;
}) {
  return (
    <section
      id="en-el-estudio"
      aria-labelledby="en-el-estudio-title"
      className="flex scroll-mt-20 flex-col gap-4"
    >
      <MaterialsSectionTitle
        id="en-el-estudio-title"
        title={copy.title}
        count={cards.length}
      />
      {cards.length === 0 ? (
        <p className="text-lg text-ink-700">{copy.empty}</p>
      ) : (
        <ul
          aria-label={copy.listLabel}
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {cards.map((card) => (
            <MaterialCard
              key={card.id}
              card={card}
              returnTo={returnTo}
              highlighted={card.id === highlightId}
              error={error?.anchor === card.anchor ? error.message : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
