import { useState } from "react";
import { Button, ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";

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

  return (
    <main className="flex flex-col gap-6 py-section">
      {header}
      {props.formError ? <p role="alert">{props.formError}</p> : null}
      <form className="grid gap-6 lg:grid-cols-[1fr_20rem]" method="post">
        <input name="student" type="hidden" value={props.studentJson ?? ""} />
        <div className="flex flex-col gap-6">
          {props.materials.map((material) => (
            <fieldset className="flex flex-col gap-3" key={material.materialId}>
              <legend className="font-serif text-xl">{material.name}</legend>
              {material.variants.map((variant) => {
                const quantity = quantities[variant.variantId] ?? 1;
                const label = `${material.name} ${variant.label}`;
                return (
                  <div
                    className="flex flex-wrap items-end gap-3"
                    key={variant.variantId}
                  >
                    <Text>{`${variant.label} · ${variant.unitPrice}`}</Text>
                    <label className="flex flex-col gap-1">
                      {`Cantidad para ${label}`}
                      <input
                        className="w-20"
                        max={20}
                        min={1}
                        onChange={(event) => {
                          setQuantities((current) => ({
                            ...current,
                            [variant.variantId]: Number(event.target.value),
                          }));
                        }}
                        type="number"
                        value={quantity}
                      />
                    </label>
                    <Button
                      onClick={() => {
                        props.onAdd(
                          material.materialId,
                          variant.variantId,
                          quantity,
                        );
                      }}
                      type="button"
                      variant="outline"
                    >
                      {`Agregar ${label}`}
                    </Button>
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>

        <aside className="sticky bottom-0 flex h-fit flex-col gap-3 bg-sand-100 p-4">
          <Heading level={2}>Tu pedido</Heading>
          {props.lines.map((line) => (
            <Text
              key={line.variantId}
            >{`${line.label} ×${String(line.quantity)}: ${line.lineTotal}`}</Text>
          ))}
          <Text>Total</Text>
          <strong>{props.total}</strong>
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
