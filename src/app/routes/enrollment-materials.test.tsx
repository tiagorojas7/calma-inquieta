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
      category: "Arcillas",
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
          onRequest: false,
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
        period: "2026-11",
        periodLabel: "noviembre 2026",
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
                onRequest: false,
                whatsappHref: null,
              },
            ],
            category: "Arcillas",
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("supplier");
  });

  it("sends a measure without a price as a prefilled WhatsApp link and never as a price", async () => {
    const onRequestOffer = {
      ...offer,
      materials: [
        {
          ...offer.materials[0],
          variants: [
            {
              variantId: "especial",
              label: "40 × 20 × 10 alto",
              unitPrice: null,
              onRequest: true,
              swatch: null,
            },
          ],
        },
      ],
    };
    const result = await loader(
      args(servicesWith(vi.fn().mockResolvedValue(ok(onRequestOffer)))),
    );
    const [variant] = result.offer.materials[0]?.variants ?? [];
    expect(variant).toMatchObject({
      onRequest: true,
      unitPrice: null,
      unitPriceCentavos: null,
    });
    const href = new URL(variant?.whatsappHref ?? "");
    expect(href.hostname).toBe("wa.me");
    const text = href.searchParams.get("text") ?? "";
    expect(text).toContain("Arcilla");
    expect(text).toContain("40 × 20 × 10 alto");
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
