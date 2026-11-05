import { useEffect, useMemo, useState } from "react";
import { data, useActionData, useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import {
  removeDraftLine,
  setDraftLineQuantity,
  type EnrollmentDraft,
  loadEnrollmentDraft,
  saveEnrollmentDraft,
  selectDraftVariant,
  selectEnrollmentDraft,
  type StoredEnrollmentDraft,
} from "~/app/enrollment/enrollment-draft";
import { monthLabel } from "~/app/enrollment/order-labels";
import { EnrollmentMaterialsPage } from "~/app/ui/templates/enrollment-materials-page";
import type { AppServices } from "~/composition/request-services";
import { buildWhatsAppUrl } from "~/modules/site-content";
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

function priceInquiry(
  workshopName: string,
  material: string,
  measure: string,
): string {
  return `Hola, ¿cómo andás? Quiero consultar el precio de ${material} (${measure}) para el taller ${workshopName}.`;
}

export async function loader({ context, params, request }: RouteArgs) {
  const slug = params.slug ?? "";
  const services = context.get(servicesContext);
  const result = await services.publicEnrollments.getOffer({
    slug,
    period: periodFrom(request),
  });
  if (!result.ok) throw data(null, { status: 404 });
  const profile = result.value.materials.some((material) =>
    material.variants.some((variant) => variant.onRequest),
  )
    ? await services.siteContent.getBusinessProfile()
    : null;
  const inquiryHref = (material: string, measure: string): string | null => {
    if (profile === null) return null;
    const url = buildWhatsAppUrl(
      profile.whatsapp.display,
      priceInquiry(result.value.workshopName, material, measure),
    );
    return url.ok ? url.value : null;
  };
  return {
    slug,
    offer: {
      workshopName: result.value.workshopName,
      period: result.value.period,
      periodLabel: monthLabel(result.value.period),
      fee: formatPesos(result.value.fee.toCentavos()),
      feeCentavos: result.value.fee.toCentavos(),
      materialsRequired: result.value.materialsRequired,
      materials: result.value.materials.map((material) => ({
        materialId: material.materialId,
        name: material.name,
        category: material.category,
        image: material.image,
        variants: material.variants.map((variant) => ({
          variantId: variant.variantId,
          label: variant.label,
          swatch: variant.swatch,
          onRequest: variant.onRequest,
          whatsappHref: variant.onRequest
            ? inquiryHref(material.name, variant.label)
            : null,
          unitPrice:
            variant.unitPrice === null
              ? null
              : formatPesos(variant.unitPrice.toCentavos()),
          unitPriceCentavos: variant.unitPrice?.toCentavos() ?? null,
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
        return material && variant && variant.unitPriceCentavos !== null
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

  function onSelect(materialId: string, variantId: string, quantity: number) {
    if (draft === null) return;
    const next = selectDraftVariant(draft, materialId, variantId, quantity);
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
      onSelect={onSelect}
      onRemove={onRemove}
      onSetQuantity={onSetQuantity}
      period={loaded.offer.periodLabel}
      recoveryHref={`/talleres/${loaded.slug}/inscripcion?period=${encodeURIComponent(loaded.offer.period)}`}
      studentJson={draft === null ? "" : JSON.stringify(draft.student)}
      total={formatPesos(total)}
      workshopName={loaded.offer.workshopName}
    />
  );
}
