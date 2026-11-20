import { enrollmentFailureResponse } from "~/app/admin/enrollment-failure";
import type { EnrollmentMaterialChoice } from "~/app/ui/admin/enrollment-new-materials";
import type { AppServices } from "~/composition/request-services";
import { formatPesos } from "~/modules/enrollments";

type Actor = Parameters<AppServices["materials"]["listSaleVariants"]>[0];

/**
 * Active, available catalog variants that have a price: the only ones an owner
 * may add to a hand-made enrollment or to a material sale, each with the units
 * the studio holds and whether the studio keeps the material. A stock that cannot be read must not close the form: every
 * variant is then offered as "a pedir", the supplier path that always works.
 */
export async function loadMaterialChoices(
  services: AppServices,
  actor: Actor,
): Promise<EnrollmentMaterialChoice[]> {
  const variants = await services.materials.listSaleVariants(actor);
  if (!variants.ok) throw enrollmentFailureResponse(variants.error);
  const onHand = await services.variantStock
    .onHand(variants.value.map((variant) => variant.variantId))
    .catch(() => new Map<string, number>());
  return variants.value.map((variant) => ({
    materialId: variant.materialId,
    variantId: variant.variantId,
    name: variant.materialName,
    label: variant.variantLabel,
    unitPrice: variant.unitPrice.toCentavos() / 100,
    priceLabel: formatPesos(variant.unitPrice),
    onHand: onHand.get(variant.variantId) ?? 0,
    keptInStudio: variant.keptInStudio,
  }));
}
