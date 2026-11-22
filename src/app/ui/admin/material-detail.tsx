import { Heading, Text } from "../atoms/heading";
import { AdminFeedback, AdminPageHeader } from "./admin-page";
import { ADMIN_PANEL, AdminDangerZone } from "./admin-sections";
import { ConfirmedSubmit } from "./confirmed-submit";
import { AdminButton as Button } from "./admin-button";
import { FormError, TextField } from "./form-fields";
import { MaterialForm, type MaterialFormErrors } from "./material-form";
import type { ImageFieldFailure } from "./image-field";
import { materialCatalogCopy } from "./material-catalog-copy";
import { adminMicrocopy } from "./microcopy";
import { StatusBadge } from "./status-badge";
import { materialesCopy } from "./copy/materiales";

const copy = adminMicrocopy.materialDetail;

async function upload(file: File) {
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/admin/imagenes", { method: "POST", body });
    if (!response.ok)
      return {
        ok: false as const,
        error:
          response.status === 413
            ? "too-large"
            : response.status === 503
              ? "unavailable"
              : ("failed" as ImageFieldFailure),
      };
    return {
      ok: true as const,
      image: (await response.json()) as { id: string; src: string },
    };
  } catch {
    return { ok: false as const, error: "failed" as ImageFieldFailure };
  }
}

export function MaterialDetail({
  name,
  description,
  category,
  active,
  available,
  supplierId,
  suppliers,
  image,
  variants,
  audit,
  values,
  errors,
  formError,
  stateError,
  stockRejection,
  feedback = null,
}: {
  name: string;
  description: string;
  category: string;
  active: boolean;
  available: boolean;
  supplierId: string;
  suppliers: readonly { id: string; name: string }[];
  image: { assetId: string; alt: string; src?: string } | null;
  variants: readonly {
    id: string;
    label: string;
    price: string;
    /** Current supplier cost in whole pesos; blank when not loaded. */
    cost: string;
    /** Exact units on hand; 0 when the variant has no stock row. */
    onHand: number;
    priceOnRequest?: boolean;
    available: boolean;
    used: boolean;
    swatch: string | null;
  }[];
  audit: { updatedBy: string; updatedAt: string };
  values: {
    name: string;
    description: string;
    category: string;
    supplierId: string;
    available: boolean;
    keptInStudio?: boolean | undefined;
    image: { assetId: string; alt: string; src?: string } | null;
    variants: readonly {
      id?: string;
      label: string;
      price: string;
      cost?: string;
      priceOnRequest?: boolean;
      swatch: string | null;
      available: boolean;
    }[];
  };
  errors: MaterialFormErrors;
  formError: string | undefined;
  stateError: string | undefined;
  /** The refused stock adjustment, to redisplay its text and errors. */
  stockRejection?:
    | {
        variantId: string;
        delta: string;
        reason: string;
        errors: { delta?: string | undefined; reason?: string | undefined };
      }
    | undefined;
  /** Success text from the redirect that brought the owner here. */
  feedback?: string | null | undefined;
}) {
  const supplier = suppliers.find((choice) => choice.id === supplierId);
  const formValues = {
    ...values,
    image: values.image
      ? { ...values.image, src: values.image.src ?? "" }
      : null,
    variants: values.variants.map((variant) => ({
      ...variant,
      swatch: variant.swatch ?? "",
    })),
  };
  return (
    <section className="flex max-w-4xl flex-col gap-5">
      <AdminPageHeader
        title={name}
        description={
          description.trim() === name.trim() ? undefined : description
        }
        back={{ href: "/admin/materiales", label: copy.back }}
      />
      {feedback ? <AdminFeedback tone="success" title={feedback} /> : null}
      <header>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-700">
          <div>
            <dt className="sr-only">{copy.category}</dt>
            <dd className="font-semibold">{category}</dd>
          </div>
          <div>
            <dt className="sr-only">{copy.state}</dt>
            <dd>
              <StatusBadge status={active ? "active" : "archived"} />
            </dd>
          </div>
          <div>
            <dt className="sr-only">{copy.availability}</dt>
            <dd>{available ? copy.available : copy.unavailable}</dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="material-variants-title"
        className={ADMIN_PANEL}
      >
        <Heading level={2} id="material-variants-title">
          {copy.variants}
        </Heading>
        <ul className="divide-y divide-admin-line">
          {variants.map((variant) => (
            <li key={variant.id} className="py-4 first:pt-2 last:pb-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <strong className="font-display text-2xl font-semibold tabular-nums text-ink-900">
                  {copy.stock.onHand(variant.onHand)}
                </strong>
                {variant.swatch && (
                  <span
                    role="img"
                    aria-label={`${copy.swatch}: ${variant.swatch}`}
                    className="h-5 w-5 rounded-full border border-ink-900"
                    style={{ backgroundColor: variant.swatch }}
                  />
                )}
                <span className="font-semibold text-ink-900">
                  {variant.label}
                </span>
                {!variant.available && <span>{copy.unavailable}</span>}
                {variant.used && <span>{copy.used}</span>}
              </div>
              <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-ink-700">
                <span>
                  {variant.priceOnRequest
                    ? materialCatalogCopy.priceOnRequest
                    : copy.price(variant.price)}
                </span>
                <span>
                  {variant.cost === ""
                    ? copy.costMissing
                    : copy.cost(variant.cost)}
                </span>
              </p>
              <form
                method="post"
                aria-label={materialesCopy.stock.arrivalForm(variant.label)}
                className="mt-3 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="intent" value="adjust-stock" />
                <input type="hidden" name="variantId" value={variant.id} />
                <input
                  type="hidden"
                  name="reason"
                  value={materialesCopy.arrivedReason}
                />
                <label
                  htmlFor={`arrival-${variant.id}`}
                  className="font-semibold text-ink-900"
                >
                  {materialesCopy.stock.arrivalShortLabel}
                </label>
                <input
                  id={`arrival-${variant.id}`}
                  aria-label={materialesCopy.stock.arrivalField(variant.label)}
                  aria-invalid={
                    stockRejection?.variantId === variant.id &&
                    stockRejection.reason === materialesCopy.arrivedReason &&
                    stockRejection.errors.delta
                      ? true
                      : undefined
                  }
                  name="delta"
                  type="number"
                  min="1"
                  step="1"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  defaultValue={
                    stockRejection?.variantId === variant.id &&
                    stockRejection.reason === materialesCopy.arrivedReason
                      ? stockRejection.delta
                      : ""
                  }
                  className="min-h-12 w-16 rounded-sm border border-clay-600 bg-surface px-2 py-2 text-lg text-ink-900"
                />
                <Button type="submit" variant="outline">
                  {materialesCopy.stock.arrivalAction}
                </Button>
                {stockRejection?.variantId === variant.id &&
                stockRejection.reason === materialesCopy.arrivedReason &&
                stockRejection.errors.delta ? (
                  <p
                    role="alert"
                    className="w-full text-sm text-terracotta-700"
                  >
                    {stockRejection.errors.delta}
                  </p>
                ) : null}
              </form>
              <details
                className="mt-2"
                open={
                  stockRejection?.variantId === variant.id &&
                  stockRejection.reason !== materialesCopy.arrivedReason
                    ? true
                    : undefined
                }
              >
                <summary className="min-h-11 cursor-pointer py-2 font-semibold text-clay-800 underline-offset-4 hover:underline">
                  {materialesCopy.stock.otherAdjustment}
                </summary>
                <form
                  method="post"
                  noValidate
                  aria-label={copy.stock.formLabel(variant.label)}
                  className="mt-2 grid gap-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="intent" value="adjust-stock" />
                  <input type="hidden" name="variantId" value={variant.id} />
                  <TextField
                    label={copy.stock.delta}
                    hint={copy.stock.deltaHint}
                    name="delta"
                    autoComplete="off"
                    defaultValue={
                      stockRejection?.variantId === variant.id
                        ? stockRejection.delta
                        : ""
                    }
                    error={
                      stockRejection?.variantId === variant.id
                        ? stockRejection.errors.delta
                        : undefined
                    }
                  />
                  <TextField
                    label={copy.stock.reason}
                    hint={copy.stock.reasonHint}
                    name="reason"
                    autoComplete="off"
                    defaultValue={
                      stockRejection?.variantId === variant.id
                        ? stockRejection.reason
                        : ""
                    }
                    error={
                      stockRejection?.variantId === variant.id
                        ? stockRejection.errors.reason
                        : undefined
                    }
                  />
                  <div className="sm:col-span-2">
                    <Button type="submit" variant="outline">
                      {copy.stock.submit}
                    </Button>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <details
        className={ADMIN_PANEL}
        open={formError || Object.keys(errors).length ? true : undefined}
      >
        <summary className="min-h-11 cursor-pointer font-display text-xl font-semibold text-ink-900">
          {materialesCopy.stock.editData}
        </summary>
        <section aria-labelledby="material-edit-title">
          <Heading level={2} id="material-edit-title">
            {copy.edit.title}
          </Heading>
          <div className="mt-2">
            <MaterialForm
              values={formValues}
              errors={errors}
              formError={formError}
              suppliers={suppliers}
              upload={upload}
              submitLabel={copy.edit.save}
              cancelHref="/admin/materiales"
            />
          </div>
        </section>
      </details>

      <details className={ADMIN_PANEL}>
        <summary className="min-h-11 cursor-pointer font-display text-xl font-semibold text-ink-900">
          {materialesCopy.stock.moreData}
        </summary>
        <div className="flex flex-col gap-5">
          <section aria-labelledby="material-supplier-title">
            <Heading level={2} id="material-supplier-title">
              {copy.supplier}
            </Heading>
            <Text>{supplier?.name ?? copy.noSupplier}</Text>
          </section>
          <section aria-labelledby="material-image-title">
            <Heading level={2} id="material-image-title">
              {copy.image}
            </Heading>
            {image?.src ? (
              <img
                className="mt-2 max-h-80 rounded-md"
                src={image.src}
                alt={image.alt}
              />
            ) : (
              <Text>{copy.imageUnavailable}</Text>
            )}
          </section>
          <section aria-labelledby="material-audit-title">
            <Heading level={2} id="material-audit-title">
              {copy.audit.title}
            </Heading>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="font-semibold">{copy.audit.by}</dt>
                <dd>{audit.updatedBy}</dd>
              </div>
              <div>
                <dt className="font-semibold">{copy.audit.at}</dt>
                <dd>{audit.updatedAt}</dd>
              </div>
            </dl>
          </section>
        </div>
      </details>

      <AdminDangerZone title={copy.lifecycle.title}>
        <div className="flex flex-col gap-3">
          <FormError message={stateError} />
          <ConfirmedSubmit
            intent={active ? "deactivate" : "reactivate"}
            label={
              active ? copy.lifecycle.deactivate : copy.lifecycle.reactivate
            }
            tone={active ? "destructive" : "default"}
            variant={active ? "danger" : "success"}
            title={
              active
                ? copy.lifecycle.confirmDeactivate.title
                : copy.lifecycle.confirmReactivate.title
            }
            message={
              active
                ? copy.lifecycle.confirmDeactivate.message
                : copy.lifecycle.confirmReactivate.message
            }
          />
        </div>
      </AdminDangerZone>
    </section>
  );
}
