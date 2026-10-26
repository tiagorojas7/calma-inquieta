import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { action, loader } from "./enrollment";

function pesos(value: number): Money {
  const money = Money.fromCentavos(value * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

const offer = {
  workshopName: "Cerámica inicial",
  period: "2026-11",
  fee: pesos(58_000),
  materialsRequired: false,
  turnos: [
    {
      id: "turno-1",
      label: "Martes",
      weekday: 2,
      startsAt: "18:00",
      endsAt: "20:00",
    },
  ],
  materials: [{ materialId: "private", name: "No serializar", variants: [] }],
};

function args(
  services: ReturnType<typeof createTestServices>,
  slug = "ceramica",
) {
  return {
    ...createLoaderArgs(services, `/talleres/${slug}/inscripcion`),
    params: { slug },
  };
}

function formRequest(values: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return new Request("http://localhost/talleres/ceramica/inscripcion", {
    method: "POST",
    body: form,
  });
}

describe("enrollment route", () => {
  it("maps a public offer without serializing material data", async () => {
    const services = createTestServices({
      publicEnrollments: {
        getOffer: vi.fn().mockResolvedValue(ok(offer)),
        requestEnrollment: vi.fn(),
        getOrderByPublicId: vi.fn(),
      },
    });
    const result = await loader(args(services));
    expect(result).toMatchObject({
      offer: {
        workshopName: "Cerámica inicial",
        period: "2026-11",
        fee: "$ 58.000",
        materialsRequired: false,
        turnos: [{ id: "turno-1" }],
      },
    });
    expect(JSON.stringify(result)).not.toContain("No serializar");
  });

  it("uses the same 404 for unpublished and invalid offers and fails closed when unavailable", async () => {
    for (const error of [
      { kind: "not-found" },
      { kind: "period-closed" },
      { kind: "unavailable" },
    ]) {
      const services = createTestServices({
        publicEnrollments: {
          getOffer: vi.fn().mockResolvedValue(err(error)),
          requestEnrollment: vi.fn(),
          getOrderByPublicId: vi.fn(),
        },
      });
      await expect(loader(args(services))).rejects.toMatchObject({
        data: null,
        init: { status: 404 },
      });
    }
  });

  it("shows the paused state without a form and only exposes a supported contact link", async () => {
    const services = createTestServices({
      publicEnrollments: {
        getOffer: vi
          .fn()
          .mockResolvedValue(err({ kind: "enrollments-paused" })),
        requestEnrollment: vi.fn(),
        getOrderByPublicId: vi.fn(),
      },
    });
    await expect(loader(args(services))).resolves.toEqual({ paused: true });
  });

  it("returns every named student field error and preserves safe values", async () => {
    const requestEnrollment = vi.fn().mockResolvedValue(
      err({
        kind: "invalid",
        issues: [
          { field: "fullName", code: "required" },
          { field: "email", code: "invalid-format" },
          { field: "phone", code: "invalid-format" },
          { field: "policy", code: "required" },
        ],
      }),
    );
    const services = createTestServices({
      publicEnrollments: {
        getOffer: vi.fn(),
        requestEnrollment,
        getOrderByPublicId: vi.fn(),
      },
    });
    const result = await action({
      ...args(services),
      request: formRequest({
        period: "2026-11",
        turnoId: "turno-1",
        fullName: "",
        email: "mal",
        phone: "123",
        policy: "",
        honeypot: "",
      }),
    });
    expect(result).toEqual({
      values: { fullName: "", email: "mal", phone: "123", turnoId: "turno-1" },
      errors: {
        fullName: "Ingresá tu nombre completo.",
        email: "Ingresá un email válido.",
        phone: "Ingresá un teléfono argentino válido.",
        policy: "Tenés que aceptar la política de privacidad.",
      },
    });
    expect(requestEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "ceramica",
        period: "2026-11",
        turnoId: "turno-1",
        lines: [],
      }),
    );
  });

  it("looks successful for a honeypot and redirects a no-material order without trusting posted totals", async () => {
    const requestEnrollment = vi.fn().mockResolvedValue(
      ok({
        publicId: "public-123",
        number: "2026-1",
        status: "pending",
        studentName: "Ana",
        workshopName: "Cerámica",
        period: "2026-11",
        turnoLabel: "Martes",
        weekday: 2,
        startsAt: "18:00",
        endsAt: "20:00",
        lines: [],
        fee: pesos(1),
        materialsTotal: pesos(0),
        total: pesos(1),
      }),
    );
    const services = createTestServices({
      publicEnrollments: {
        getOffer: vi.fn(),
        requestEnrollment,
        getOrderByPublicId: vi.fn(),
      },
    });
    const result = await action({
      ...args(services),
      request: formRequest({
        period: "2026-11",
        turnoId: "turno-1",
        fullName: "Ana Demo",
        email: "ana@example.test",
        phone: "+54 9 351 555 0000",
        policy: "on",
        honeypot: "bot",
        total: "0",
        materialName: "inyectado",
      }),
    });
    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response))
      throw new Error("expected enrollment redirect");
    expect(result).toMatchObject({ status: 302 });
    expect(result.headers.get("Location")).toBe("/pedido/public-123");
    expect(requestEnrollment).toHaveBeenCalledWith(
      expect.not.objectContaining({
        total: expect.anything() as unknown,
        materialName: expect.anything() as unknown,
      }),
    );
  });
});
