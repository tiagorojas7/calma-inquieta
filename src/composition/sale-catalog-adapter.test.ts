import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { SaleCatalogReader } from "~/modules/materials";
import { createSaleCatalogAdapter } from "./sale-catalog-adapter";

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("fixture money");
  return money.value;
}

const reader = (
  overrides: Partial<
    Awaited<ReturnType<SaleCatalogReader["listSaleCatalog"]>>[number]
  > = {},
): SaleCatalogReader => ({
  listSaleCatalog: () =>
    Promise.resolve([
      {
        materialId: "m-1",
        name: "Arcilla",
        active: true,
        available: true,
        supplierId: "s-1",
        supplierName: "Casa Pincel",
        variants: [
          {
            variantId: "v-1",
            label: "1 kg",
            unitPrice: pesos(4000),
            available: true,
          },
          { variantId: "v-2", label: "5 kg", unitPrice: null, available: true },
        ],
        ...overrides,
      },
    ]),
});

describe("sale catalog adapter", () => {
  it("offers every catalog material to enrollments whatever the period", async () => {
    const lookup = createSaleCatalogAdapter(reader());
    expect(await lookup.listForPeriod("any-period")).toEqual([
      {
        materialId: "m-1",
        name: "Arcilla",
        active: true,
        supplierId: "s-1",
        supplierName: "Casa Pincel",
        variants: [
          {
            variantId: "v-1",
            label: "1 kg",
            unitPrice: pesos(4000),
            available: true,
          },
          { variantId: "v-2", label: "5 kg", unitPrice: null, available: true },
        ],
      },
    ]);
  });

  it("treats a material that is not available for sale as inactive", async () => {
    const lookup = createSaleCatalogAdapter(reader({ available: false }));
    expect(await lookup.listForPeriod("p")).toMatchObject([{ active: false }]);
  });

  it("keeps an archived material inactive", async () => {
    const lookup = createSaleCatalogAdapter(reader({ active: false }));
    expect(await lookup.listForPeriod("p")).toMatchObject([{ active: false }]);
  });
});
