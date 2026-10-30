import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { loader } from "./enrollment-materials";

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const offer = {
  workshopName: "Cerámica inicial",
  period: "2026-11",
  fee: pesos(58_000),
  materialsRequired: true,
  turnos: [],
  materials: [
    {
      materialId: "arcilla",
      name: "Arcilla",
      image: {
        src: "/media/arcilla.webp",
        alt: "Arcilla blanca",
        width: 800,
        height: 600,
      },
      variants: [
        {
          variantId: "grande",
          label: "Grande",
          unitPrice: pesos(12_500),
          swatch: "#aabbcc",
        },
      ],
    },
  ],
};

function args(services: ReturnType<typeof createTestServices>) {
  return {
    ...createLoaderArgs(
      services,
      "/talleres/ceramica/inscripcion/materiales?period=2026-11",
    ),
    params: { slug: "ceramica" },
  };
}

function servicesWith(getOffer: unknown) {
  return createTestServices({
    publicEnrollments: {
      getOffer,
      requestEnrollment: vi.fn(),
      getOrderByPublicId: vi.fn(),
    } as never,
  });
}

describe("enrollment materials loader", () => {
  it("reloads and allowlists the current offer with server-owned prices", async () => {
    const getOffer = vi.fn().mockResolvedValue(ok(offer));
    const result = await loader(args(servicesWith(getOffer)));

    expect(getOffer).toHaveBeenCalledWith({
      slug: "ceramica",
      period: "2026-11",
    });
    expect(result).toMatchObject({
      offer: {
        fee: "$ 58.000",
        feeCentavos: 5_800_000,
        materials: [
          {
            materialId: "arcilla",
            image: {
              src: "/media/arcilla.webp",
              alt: "Arcilla blanca",
              width: 800,
              height: 600,
            },
            variants: [
              {
                variantId: "grande",
                swatch: "#aabbcc",
                unitPrice: "$ 12.500",
                unitPriceCentavos: 1_250_000,
              },
            ],
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("supplier");
  });

  it("fails closed when the current offer is unavailable", async () => {
    const services = servicesWith(
      vi.fn().mockResolvedValue(err({ kind: "unavailable" })),
    );
    await expect(loader(args(services))).rejects.toMatchObject({
      data: null,
      init: { status: 404 },
    });
  });
});
