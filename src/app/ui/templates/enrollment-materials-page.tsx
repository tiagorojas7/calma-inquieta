import { useEffect, useState } from "react";
import { Button, ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icons";
import { Text } from "../atoms/text";
import {
  PRIMARY_ACTION_ID,
  stickyBarClasses,
  usePrimaryActionOffScreen,
} from "../molecules/off-screen";
import { QuantityStepper } from "../molecules/quantity-stepper";
import {
  MAX_QUANTITY,
  MIN_QUANTITY,
  MaterialCard,
  type MaterialCardVariant,
} from "../organisms/material-card";
import { StepIndicator } from "../molecules/step-indicator";

const ALL = "__all__";
const STEPS = ["Tus datos", "Materiales", "Pedido"];

export interface EnrollmentMaterialsPageProps {
  workshopName: string;
  period: string;
  fee: string;
  materialsRequired: boolean;
  materials: readonly {
    materialId: string;
    name: string;
    image?: {
      src: string;
      alt: string;
      width: number;
      height: number;
    } | null;
    /** Grouping and filter key; empty when the material has no category. */
    category?: string;
    variants: readonly MaterialCardVariant[];
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
  /** Chooses one measure of a product, replacing any other measure of it. */
  onSelect(materialId: string, variantId: string, quantity: number): void;
  /** Replaces the quantity of a line already in the order. */
  onSetQuantity(variantId: string, quantity: number): void;
  onRemove(variantId: string): void;
}

function groupByCategory(materials: EnrollmentMaterialsPageProps["materials"]) {
  const groups = new Map<
    string,
    {
      category: string;
      materials: EnrollmentMaterialsPageProps["materials"][number][];
    }
  >();
  for (const material of materials) {
    const category = material.category ?? "";
    const group = groups.get(category) ?? { category, materials: [] };
    group.materials.push(material);
    groups.set(category, group);
  }
  return [...groups.values()];
}

/**
 * Mobile copy of the summary's submit: the list is long, so the total and
 * Continuar stay in reach while the real one is off screen. Hidden from
 * assistive technology and the keyboard; the summary keeps the real one.
 */
function StickyContinue({ total, label }: { total: string; label: string }) {
  const shown = usePrimaryActionOffScreen();
  return (
    <div
      data-sticky-action
      data-shown={shown}
      aria-hidden="true"
      className={`glass sticky bottom-0 z-20 -mx-4 flex items-center gap-4 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-ink-900 lg:hidden ${stickyBarClasses(shown)}`}
    >
      <span className="flex flex-col">
        <span className="text-sm">Total</span>
        <strong className="font-display tabular-nums">{total}</strong>
      </span>
      <Button type="submit" tabIndex={-1} className="flex-1">
        {label}
      </Button>
    </div>
  );
}

/** Structural materials selector; the delivery route owns draft persistence and pricing. */
export function EnrollmentMaterialsPage(props: EnrollmentMaterialsPageProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState(ALL);
  // The category filter needs script; without it every product stays listed.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const groups = groupByCategory(props.materials);
  const emptyOptional = !props.materialsRequired && props.lines.length === 0;
  let materialsLabel = "Materiales opcionales";
  if (props.materialsRequired) materialsLabel = "Materiales requeridos";
  else if (emptyOptional) materialsLabel = "Ya tengo mis materiales";
  const continueLabel = emptyOptional
    ? "Continuar sin materiales"
    : "Continuar";

  const header = (
    <header className="flex flex-col gap-2">
      <Heading level={1}>{props.workshopName}</Heading>
      <p className="font-display text-xl italic text-ink-900 first-letter:uppercase">
        {props.period}
      </p>
      <Text className="font-semibold tabular-nums">Cuota: {props.fee}</Text>
      <Text tone="accent">{materialsLabel}</Text>
    </header>
  );
  if (props.draftState === "loading") {
    return (
      <main className="flex flex-col gap-8 pt-page-top pb-section">
        {header}
        <Text>Cargando tu inscripción…</Text>
      </main>
    );
  }
  if (props.draftState === "missing") {
    return (
      <main className="flex flex-col gap-8 pt-page-top pb-section">
        {header}
        <Text>Volvé a completar tus datos para continuar.</Text>
        <ButtonLink href={props.recoveryHref ?? "/talleres"}>
          Volver a la inscripción
        </ButtonLink>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8 pt-page-top pb-section">
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
          {groups.length > 1 && hydrated ? (
            <div
              role="group"
              aria-label="Filtrar por categoría"
              className="-mx-4 flex flex-nowrap gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            >
              {[ALL, ...groups.map((group) => group.category)].map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={filter === category}
                    onClick={() => {
                      setFilter(category);
                    }}
                    className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-pill border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 ${filter === category ? "border-clay-600 bg-clay-600 text-white" : "border-clay-600 text-clay-800 hover:bg-sand-200"}`}
                  >
                    {category === ALL ? "Todas" : category}
                  </button>
                ),
              )}
            </div>
          ) : null}
          {groups
            .filter((group) => filter === ALL || group.category === filter)
            .map((group) => (
              <section
                key={group.category}
                aria-label={group.category || "Materiales"}
                className="flex flex-col gap-4"
              >
                {group.category ? (
                  <Heading level={2}>{group.category}</Heading>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.materials.map((material) => {
                    const selected = props.lines.find(
                      (line) => line.materialId === material.materialId,
                    );
                    const picked =
                      selected?.quantity ??
                      quantities[material.materialId] ??
                      MIN_QUANTITY;
                    return (
                      <MaterialCard
                        key={material.materialId}
                        materialId={material.materialId}
                        name={material.name}
                        image={material.image}
                        variants={material.variants}
                        selectedVariantId={selected?.variantId ?? null}
                        quantity={picked}
                        onSelect={(variantId) => {
                          props.onSelect(
                            material.materialId,
                            variantId,
                            picked,
                          );
                        }}
                        onQuantity={(next) => {
                          const quantity = Number.isFinite(next)
                            ? Math.min(
                                MAX_QUANTITY,
                                Math.max(MIN_QUANTITY, next),
                              )
                            : MIN_QUANTITY;
                          if (selected)
                            props.onSetQuantity(selected.variantId, quantity);
                          else
                            setQuantities((current) => ({
                              ...current,
                              [material.materialId]: quantity,
                            }));
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          <StickyContinue total={props.total} label={continueLabel} />
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
                    aria-label={`Quitar ${line.label}`}
                    className="inline-flex min-h-11 items-center text-berry-600 underline underline-offset-4 hover:text-berry-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
                    onClick={() => {
                      props.onRemove(line.variantId);
                    }}
                  >
                    Quitar
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
          <Button id={PRIMARY_ACTION_ID} type="submit">
            {continueLabel}
          </Button>
        </aside>
      </form>
    </main>
  );
}
