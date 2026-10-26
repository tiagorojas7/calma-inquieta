import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import type { PublicEnrollmentUseCases } from "~/modules/enrollments";
import { createSiteContent } from "~/modules/site-content";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "~/testing/fakes/in-memory-site-content-source";
import { createLoaderArgs } from "~/testing/react-router";
import { headers, loader, meta } from "./order";

type Lookup = PublicEnrollmentUseCases["getOrderByPublicId"];

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const order = {
  publicId: "public-123",
  number: "CI-2026-0007",
  status: "pending_confirmation" as const,
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-10",
  turnoLabel: "Lunes",
  weekday: 1,
  startsAt: "10:00",
  endsAt: "12:00",
  lines: [
    {
      materialName: "Arcilla",
      variantLabel: "1 kg",
      quantity: 2,
      unitPrice: pesos(5_000),
      lineTotal: pesos(10_000),
    },
  ],
  fee: pesos(48_000),
  materialsTotal: pesos(10_000),
  total: pesos(58_000),
};

function servicesWith(getOrderByPublicId: Lookup, whatsappDisplay?: string) {
  const raw = buildRawSiteContent();
  return createTestServices({
    publicEnrollments: {
      getOffer: vi.fn(),
      requestEnrollment: vi.fn(),
      getOrderByPublicId,
    },
    ...(whatsappDisplay === undefined
      ? {}
      : {
          siteContent: createSiteContent(
            createInMemorySiteContentSource({
              ...raw,
              profile: {
                ...raw.profile,
                whatsapp: { display: whatsappDisplay, provisional: false },
              },
            }),
          ),
        }),
  });
}

function args(
  services: ReturnType<typeof createTestServices>,
  publicId: string,
) {
  return {
    ...createLoaderArgs(services, `/pedido/${publicId}`),
    params: { publicId },
  };
}

async function thrownStatus(pending: Promise<unknown>): Promise<number> {
  try {
    await pending;
  } catch (thrown) {
    if (thrown instanceof Response) return thrown.status;
    if (
      typeof thrown === "object" &&
      thrown !== null &&
      "init" in thrown &&
      typeof thrown.init === "object" &&
      thrown.init !== null &&
      "status" in thrown.init &&
      typeof thrown.init.status === "number"
    )
      return thrown.init.status;
    throw thrown;
  }
  throw new Error("expected the loader to throw");
}

describe("order route", () => {
  it("loads an allowlisted summary with live status", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue(ok(order));
    const result = await loader(args(servicesWith(lookup), "public-123"));

    expect(lookup).toHaveBeenCalledWith("public-123");
    expect(result).toMatchObject({
      number: "CI-2026-0007",
      status: "pending_confirmation",
      statusLabel: "Pendiente de confirmación",
      workshopName: "Cerámica",
      month: "octubre 2026",
      turno: "Lunes · 10:00 a 12:00 h",
      lines: [{ label: "Arcilla 1 kg", quantity: 2, lineTotal: "$ 10.000" }],
      fee: "$ 48.000",
      total: "$ 58.000",
    });
  });

  it("never serializes contact data or internal ids", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue(
      ok({
        ...order,
        email: "sentinel-email@example.test",
        phone: "sentinel-phone",
        id: "sentinel-internal-id",
      }),
    );
    const result = await loader(args(servicesWith(lookup), "public-123"));
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("sentinel");
    expect(serialized).not.toContain("public-123");
  });

  it("builds the wa.me hand-off from the business profile number", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue(ok(order));
    const result = await loader(args(servicesWith(lookup), "public-123"));

    expect(result.whatsappHref).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    const text = new URL(result.whatsappHref ?? "").searchParams.get("text");
    for (const fragment of [
      "CI-2026-0007",
      "Ana Pérez",
      "Cerámica",
      "octubre 2026",
      "Lunes",
      "$ 58.000",
    ])
      expect(text).toContain(fragment);
  });

  it("hides the hand-off when the profile number does not normalize", async () => {
    const lookup = vi.fn<Lookup>().mockResolvedValue(ok(order));
    const result = await loader(
      args(servicesWith(lookup, "sin número"), "public-123"),
    );

    expect(result.whatsappHref).toBeNull();
    expect(result.number).toBe("CI-2026-0007");
  });

  it("replaces the hand-off once the order is paid", async () => {
    const lookup = vi
      .fn<Lookup>()
      .mockResolvedValue(ok({ ...order, status: "paid" as const }));
    const result = await loader(args(servicesWith(lookup), "public-123"));

    expect(result).toMatchObject({ status: "paid", statusLabel: "Cobrado" });
    expect(result.whatsappHref).toBeNull();
  });

  it("answers 404 for an unknown or malformed public id", async () => {
    const lookup = vi
      .fn<Lookup>()
      .mockResolvedValue(err({ kind: "not-found" }));

    expect(
      await thrownStatus(loader(args(servicesWith(lookup), "CI-2026-0007"))),
    ).toBe(404);
  });

  it("answers 503 when the order store is unavailable", async () => {
    const lookup = vi
      .fn<Lookup>()
      .mockResolvedValue(err({ kind: "unavailable" }));

    expect(
      await thrownStatus(loader(args(servicesWith(lookup), "public-123"))),
    ).toBe(503);
  });

  it("is never indexed or cached", () => {
    expect(headers()).toMatchObject({
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    expect(meta()).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  });
});
