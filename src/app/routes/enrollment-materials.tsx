import { useEffect, useMemo, useState } from "react";
import { data, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import {
  addDraftLine,
  removeDraftLine,
  setDraftLineQuantity,
  type EnrollmentDraft,
  loadEnrollmentDraft,
  saveEnrollmentDraft,
  selectEnrollmentDraft,
  type StoredEnrollmentDraft,
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
  const [stored, setStored] = useState<StoredEnrollmentDraft | null>(null);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const currentKey = `${loaded.slug}:${loaded.offer.period}`;
  const draft = selectEnrollmentDraft(stored, loaded.slug, loaded.offer.period);

  useEffect(() => {
    const next = loadEnrollmentDraft(window.sessionStorage, loaded.slug);
    setStored(next === null ? null : { slug: loaded.slug, draft: next });
    setResolvedKey(currentKey);
  }, [currentKey, loaded.slug]);

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
    setStored({ slug: loaded.slug, draft: next.value });
  }

  function commit(next: EnrollmentDraft) {
    saveEnrollmentDraft(window.sessionStorage, loaded.slug, next);
    setStored({ slug: loaded.slug, draft: next });
  }

  function onSetQuantity(variantId: string, quantity: number) {
    if (draft !== null)
      commit(setDraftLineQuantity(draft, variantId, quantity));
  }

  function onRemove(variantId: string) {
    if (draft !== null) commit(removeDraftLine(draft, variantId));
  }

  return (
    <EnrollmentMaterialsPage
      draftState={
        resolvedKey !== currentKey
          ? "loading"
          : draft === null
            ? "missing"
            : "ready"
      }
      fee={loaded.offer.fee}
      formError={rejected?.formError}
      lines={lines}
      materials={loaded.offer.materials}
      materialsRequired={loaded.offer.materialsRequired}
      onAdd={onAdd}
      onRemove={onRemove}
      onSetQuantity={onSetQuantity}
      period={loaded.offer.period}
      recoveryHref={`/talleres/${loaded.slug}/inscripcion?period=${encodeURIComponent(loaded.offer.period)}`}
      studentJson={draft === null ? "" : JSON.stringify(draft.student)}
      total={formatPesos(total)}
      workshopName={loaded.offer.workshopName}
    />
  );
}
