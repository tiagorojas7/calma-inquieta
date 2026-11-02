import { ButtonLink } from "../atoms/button";
import { Icon } from "../atoms/icons";
import { QuantityStepper } from "../molecules/quantity-stepper";
import { MaterialPhoto, type MaterialPhotoImage } from "./material-photo";

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 20;

export interface MaterialCardVariant {
  variantId: string;
  label: string;
  /** Plain-language price; null when the measure is "consultar precio". */
  unitPrice: string | null;
  swatch?: string | null;
  /** True for a measure without a price: never selectable, only a link. */
  onRequest?: boolean;
  /** Prefilled WhatsApp link that asks for the price of this measure. */
  whatsappHref?: string | null;
}

export interface MaterialCardProps {
  materialId: string;
  name: string;
  image?: MaterialPhotoImage | null | undefined;
  variants: readonly MaterialCardVariant[];
  /** The measure currently in the order, if any. */
  selectedVariantId: string | null;
  quantity: number;
  onSelect(variantId: string): void;
  onQuantity(quantity: number): void;
}

/**
 * One product: a large photo that opens full screen, its measures as native
 * radio options (label and price in plain language), and the quantity. The
 * radios and the number are real form fields (`variant-<id>`, `quantity-<id>`).
 */
export function MaterialCard(props: MaterialCardProps) {
  const orderable = props.variants.filter((variant) => !variant.onRequest);
  return (
    <fieldset
      data-material-card
      className={`flex min-w-0 flex-col gap-4 rounded-md bg-surface p-4 shadow-card ${props.selectedVariantId ? "border-2 border-clay-600" : "border border-sand-300"}`}
    >
      <legend className="sr-only">{props.name}</legend>
      {props.image ? (
        <MaterialPhoto image={props.image} name={props.name} />
      ) : (
        <div
          aria-hidden="true"
          data-material-placeholder
          className="aspect-4/3 w-full rounded-md border border-sand-300 bg-sand-200"
        />
      )}
      <p aria-hidden="true" className="font-serif text-xl">
        {props.name}
      </p>
      <div className="flex flex-col gap-2">
        {props.variants.map((variant) => {
          if (variant.onRequest) {
            return (
              <div
                key={variant.variantId}
                data-on-request
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-sand-300 px-3 py-1"
              >
                <span className="text-ink-900">{variant.label}</span>
                {variant.whatsappHref ? (
                  <ButtonLink
                    href={variant.whatsappHref}
                    variant="tertiary"
                    aria-label={`Consultar precio de ${props.name}, ${variant.label}, por WhatsApp`}
                  >
                    <Icon
                      name="whatsapp"
                      aria-hidden="true"
                      className="size-5"
                    />
                    Consultar precio
                  </ButtonLink>
                ) : (
                  <span className="text-ink-700">Consultar precio</span>
                )}
              </div>
            );
          }
          const checked = props.selectedVariantId === variant.variantId;
          return (
            <label
              key={variant.variantId}
              data-measure-option
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-clay-800 ${checked ? "border-clay-600 bg-sand-100" : "border-sand-300 hover:bg-sand-100"}`}
            >
              <input
                type="radio"
                name={`variant-${props.materialId}`}
                value={variant.variantId}
                checked={checked}
                onChange={() => {
                  props.onSelect(variant.variantId);
                }}
                className="size-5 shrink-0 accent-clay-600"
              />
              {variant.swatch ? (
                <span
                  aria-hidden="true"
                  data-swatch
                  className="size-5 shrink-0 rounded-full border border-sand-300"
                  style={{ backgroundColor: variant.swatch }}
                />
              ) : null}
              <span>{`${variant.label} · ${variant.unitPrice ?? ""}`}</span>
            </label>
          );
        })}
      </div>
      {orderable.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            label={props.name}
            name={`quantity-${props.materialId}`}
            value={props.quantity}
            min={MIN_QUANTITY}
            max={MAX_QUANTITY}
            onChange={(next) => {
              props.onQuantity(next);
            }}
          />
          {props.selectedVariantId ? (
            <span className="inline-flex items-center rounded-full bg-sand-200 px-3 py-1 text-sm font-semibold text-clay-800">
              {`En tu pedido: ${String(props.quantity)}`}
            </span>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
