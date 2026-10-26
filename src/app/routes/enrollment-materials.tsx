import { useEffect, useMemo, useState } from "react";
import { data, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import {
  addDraftLine,
  loadEnrollmentDraft,
  saveEnrollmentDraft,
  type EnrollmentDraft,
} from "~/app/enrollment/enrollment-draft";
import { EnrollmentMaterialsPage } from "~/app/ui/templates/enrollment-materials-page";
import type { AppServices } from "~/composition/request-services";
import { action } from "./enrollment-materials-action";

export { action };

type RouteArgs = {
  request: Request;
  params: { slug?: string };
  context: { get(key: typeof servicesContext): AppServices };
};

function formatPesos(centavos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

function periodFrom(request: Request): string {
  try {
    return new URL(request.url).searchParams.get("period") ?? "";
  } catch {
    return "";
  }
}

export async function loader({ context, params, request }: RouteArgs) {
  const slug = params.slug ?? "";
  const result = await context
    .get(servicesContext)
    .publicEnrollments.getOffer({ slug, period: periodFrom(request) });
  if (!result.ok) throw data(null, { status: 404 });
  return {
    slug,
    offer: {
      workshopName: result.value.workshopName,
      period: result.value.period,
      fee: formatPesos(result.value.fee.toCentavos()),
      feeCentavos: result.value.fee.toCentavos(),
      materialsRequired: result.value.materialsRequired,
      materials: result.value.materials.map((material) => ({
        materialId: material.materialId,
        name: material.name,
        variants: material.variants.map((variant) => ({
          variantId: variant.variantId,
          label: variant.label,
          unitPrice: formatPesos(variant.unitPrice.toCentavos()),
          unitPriceCentavos: variant.unitPrice.toCentavos(),
        })),
      })),
    },
  };
}

export default function EnrollmentMaterialsRoute() {
  const loaded = useLoaderData<typeof loader>();
  const rejected = useActionData<typeof action>();
  const [draft, setDraft] = useState<EnrollmentDraft | null>(null);

  useEffect(() => {
    setDraft(loadEnrollmentDraft(window.sessionStorage, loaded.slug));
  }, [loaded.slug]);

  const lines = useMemo(
    () =>
      (draft?.lines ?? []).flatMap((line) => {
        const material = loaded.offer.materials.find(
          (item) => item.materialId === line.materialId,
        );
        const variant = material?.variants.find(
          (item) => item.variantId === line.variantId,
        );
        return material && variant
          ? [
              {
                ...line,
                label: `${material.name} · ${variant.label}`,
                lineTotal: formatPesos(
                  variant.unitPriceCentavos * line.quantity,
                ),
                centavos: variant.unitPriceCentavos * line.quantity,
              },
            ]
          : [];
      }),
    [draft, loaded.offer.materials],
  );
  const total =
    loaded.offer.feeCentavos +
    lines.reduce((sum, line) => sum + line.centavos, 0);

  function onAdd(materialId: string, variantId: string, quantity: number) {
    if (draft === null) return;
    const next = addDraftLine(draft, { materialId, variantId, quantity });
    if (!next.ok) return;
    saveEnrollmentDraft(window.sessionStorage, loaded.slug, next.value);
    setDraft(next.value);
  }

  return (
    <EnrollmentMaterialsPage
      fee={loaded.offer.fee}
      formError={rejected?.formError}
      lines={lines}
      materials={loaded.offer.materials}
      materialsRequired={loaded.offer.materialsRequired}
      onAdd={onAdd}
      period={loaded.offer.period}
      studentJson={draft === null ? "" : JSON.stringify(draft.student)}
      total={formatPesos(total)}
      workshopName={loaded.offer.workshopName}
    />
  );
}
