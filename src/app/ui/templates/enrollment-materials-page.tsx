import { useState } from "react";
import { Button, ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icons";
import { Text } from "../atoms/text";
import { QuantityStepper } from "../molecules/quantity-stepper";
import { StepIndicator } from "../molecules/step-indicator";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;
const STEPS = ["Tus datos", "Materiales", "Pedido"];

export interface EnrollmentMaterialsPageProps {
  workshopName: string;
  period: string;
  fee: string;
  materialsRequired: boolean;
  materials: readonly {
    materialId: string;
    name: string;
    variants: readonly {
      variantId: string;
      label: string;
      unitPrice: string;
    }[];
  }[];
  lines: readonly {
    materialId: string;
    variantId: string;
    label: string;
    quantity: number;
    lineTotal: string;
  }[];
  total: string;
  studentJson?: string;
  formError?: string | undefined;
  draftState?: "loading" | "missing" | "ready";
  recoveryHref?: string;
  onAdd(materialId: string, variantId: string, quantity: number): void;
  /** Replaces the quantity of a line already in the order. */
  onSetQuantity(variantId: string, quantity: number): void;
  onRemove(variantId: string): void;
}

/** Structural materials selector; the delivery route owns draft persistence and pricing. */
export function EnrollmentMaterialsPage(props: EnrollmentMaterialsPageProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const emptyOptional = !props.materialsRequired && props.lines.length === 0;
  let materialsLabel = "Materiales opcionales";
  if (props.materialsRequired) materialsLabel = "Materiales requeridos";
  else if (emptyOptional) materialsLabel = "Ya tengo mis materiales";

  const header = (
    <header className="flex flex-col gap-2">
      <Heading level={1}>{props.workshopName}</Heading>
      <Text>{props.period}</Text>
      <Text>Cuota: {props.fee}</Text>
      <Text tone="accent">{materialsLabel}</Text>
    </header>
  );
  if (props.draftState === "loading") {
    return (
      <main className="flex flex-col gap-6 py-section">
        {header}
        <Text>Cargando tu inscripción…</Text>
      </main>
    );
  }
  if (props.draftState === "missing") {
    return (
      <main className="flex flex-col gap-6 py-section">
        {header}
        <Text>Volvé a completar tus datos para continuar.</Text>
        <ButtonLink href={props.recoveryHref ?? "/talleres"}>
          Volver a la inscripción
        </ButtonLink>
      </main>
    );
  }

  const inOrder = new Map(
    props.lines.map((line) => [line.variantId, line.quantity]),
  );
  return (
    <main className="flex flex-col gap-6 py-section">
      {props.recoveryHref ? (
        <ButtonLink
          href={props.recoveryHref}
          variant="tertiary"
          className="self-start"
        >
          <Icon name="chevron-left" aria-hidden="true" className="size-5" />
          Volver a mis datos
        </ButtonLink>
      ) : null}
      <StepIndicator steps={STEPS} current={2} />
      {header}
      {props.formError ? (
        <p role="alert" className="font-semibold text-terracotta-700">
          {props.formError}
        </p>
      ) : null}
      <form className="grid gap-6 lg:grid-cols-[1fr_20rem]" method="post">
        <input name="student" type="hidden" value={props.studentJson ?? ""} />
        <div className="flex flex-col gap-6">
          {props.materials.map((material) => (
            <fieldset className="flex flex-col gap-3" key={material.materialId}>
              <legend className="font-serif text-xl">{material.name}</legend>
              {material.variants.map((variant) => {
                const quantity = quantities[variant.variantId] ?? MIN_QUANTITY;
                const label = `${material.name} ${variant.label}`;
                const already = inOrder.get(variant.variantId);
                return (
                  <div
                    role="group"
                    aria-label={label}
                    data-variant-card
                    className={`flex flex-col gap-3 rounded-md bg-surface p-4 shadow-card ${already ? "border-2 border-clay-600" : "border border-sand-300"}`}
                    key={variant.variantId}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Text>{`${variant.label} · ${variant.unitPrice}`}</Text>
                      {already ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sand-200 px-3 py-1 text-sm font-semibold text-clay-800">
                          <span aria-hidden="true">✓</span>
                          {`En tu pedido: ${String(already)}`}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <QuantityStepper
                        label={label}
                        value={quantity}
                        min={MIN_QUANTITY}
                        max={MAX_QUANTITY}
                        onChange={(next) => {
                          setQuantities((current) => ({
                            ...current,
                            [variant.variantId]: Number.isFinite(next)
                              ? Math.min(
                                  MAX_QUANTITY,
                                  Math.max(MIN_QUANTITY, next),
                                )
                              : MIN_QUANTITY,
                          }));
                        }}
                      />
                      <Button
                        onClick={() => {
                          props.onAdd(
                            material.materialId,
                            variant.variantId,
                            quantity,
                          );
                        }}
                        type="button"
                        variant="secondary"
                      >
                        {`Agregar ${label}`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>

        <aside
          aria-label="Resumen del pedido"
          className="flex h-fit flex-col gap-4 rounded-md bg-sand-100 p-4 shadow-raised lg:sticky lg:top-24"
        >
          <Heading level={2}>Tu pedido</Heading>
          <ul className="flex flex-col gap-4">
            {props.lines.map((line) => (
              <li key={line.variantId} className="flex flex-col gap-2">
                <Text>{`${line.label}: ${line.lineTotal}`}</Text>
                <div className="flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    label={line.label}
                    value={line.quantity}
                    min={MIN_QUANTITY}
                    max={MAX_QUANTITY}
                    onChange={(next) => {
                      props.onSetQuantity(line.variantId, next);
                    }}
                  />
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
                    onClick={() => {
                      props.onRemove(line.variantId);
                    }}
                  >
                    {`Quitar ${line.label}`}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-sand-300 pt-3">
            <Text>Total</Text>
            <strong className="font-display text-h3 tabular-nums">
              {props.total}
            </strong>
          </div>
          <p role="status" className="sr-only">
            {`Total del pedido: ${props.total}`}
          </p>
          <input
            name="lines"
            type="hidden"
            value={JSON.stringify(
              props.lines.map(({ materialId, variantId, quantity }) => ({
                materialId,
                variantId,
                quantity,
              })),
            )}
          />
          <Button type="submit">
            {emptyOptional ? "Continuar sin materiales" : "Continuar"}
          </Button>
        </aside>
      </form>
    </main>
  );
}
