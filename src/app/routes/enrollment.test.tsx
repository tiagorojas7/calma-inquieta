import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import { createFakePublicCatalog } from "~/testing/fakes/fake-public-catalog";
import type { PublicTaller } from "~/modules/workshops";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import {
  buildPolicyVersion,
  createInMemoryPolicies,
} from "~/testing/fakes/policy-builders";
import { createUnavailablePoliciesService } from "~/modules/policies";
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
  it("exposes the full workshop content from the public catalog, and none when absent", async () => {
    const taller = {
      slug: "ceramica",
      name: "Cerámica inicial",
      summary: "Resumen corto",
      description: "Contenido completo del taller.",
    } as unknown as PublicTaller;
    const withContent = createTestServices({
      publicCatalog: createFakePublicCatalog({ talleres: [taller] }),
      publicEnrollments: {
        getOffer: vi.fn().mockResolvedValue(ok(offer)),
        requestEnrollment: vi.fn(),
        getOrderByPublicId: vi.fn(),
      },
    });
    const result = await loader(args(withContent));
    expect(result).toMatchObject({
      offer: { content: "Contenido completo del taller." },
    });
    expect(JSON.stringify(result)).not.toContain("Resumen corto");

    const withoutContent = createTestServices({
      publicEnrollments: {
        getOffer: vi.fn().mockResolvedValue(ok(offer)),
        requestEnrollment: vi.fn(),
        getOrderByPublicId: vi.fn(),
      },
    });
    const empty = await loader(args(withoutContent));
    expect(empty).toMatchObject({ offer: { content: "" } });
  });

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
        periodLabel: "noviembre 2026",
        fee: "$ 58.000",
        turnos: [{ id: "turno-1" }],
      },
    });
    expect(JSON.stringify(result)).not.toContain("No serializar");
    expect(JSON.stringify(result)).not.toContain("materialsRequired");
  });

  it("never exposes a materials flag, even if the service still sent one", async () => {
    const services = createTestServices({
      publicEnrollments: {
        getOffer: vi
          .fn()
          .mockResolvedValue(ok({ ...offer, materialsRequired: true })),
        requestEnrollment: vi.fn(),
        getOrderByPublicId: vi.fn(),
      },
    });
    const result = await loader(args(services));
    if (!("offer" in result)) throw new Error("expected an open offer");
    expect(Object.keys(result.offer).sort()).toEqual([
      "content",
      "fee",
      "period",
      "periodLabel",
      "turnos",
      "workshopName",
    ]);
  });

  it("redirects to the order when the form is valid, with no materials step", async () => {
    const requestEnrollment = vi.fn().mockResolvedValue(
      ok({
        publicId: "public-9",
        number: "2026-9",
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
        honeypot: "",
      }),
    });
    if (!(result instanceof Response)) throw new Error("expected redirect");
    expect(result.headers.get("Location")).toBe("/pedido/public-9");
    expect(requestEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ lines: [] }),
    );
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
        policy:
          "Tenés que aceptar las condiciones y la política de privacidad.",
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

describe("enrollment route policy acceptance", () => {
  const openOffer = () => ({
    getOffer: vi.fn().mockResolvedValue(ok(offer)),
    requestEnrollment: vi.fn(),
    getOrderByPublicId: vi.fn(),
  });

  it("hands the page the current version of each document to post back", async () => {
    const { service } = createInMemoryPolicies([
      buildPolicyVersion({ kind: "conditions", version: 2, body: "Nueva." }),
    ]);
    const services = createTestServices({
      policies: service,
      publicEnrollments: openOffer(),
    });
    const result = await loader(args(services));
    expect(result).toMatchObject({
      policies: { conditionsVersion: 2, privacyVersion: 1 },
    });
  });

  it("still renders the form, without versions, when the documents cannot be read", async () => {
    const services = createTestServices({
      policies: createUnavailablePoliciesService(),
      publicEnrollments: openOffer(),
    });
    const result = await loader(args(services));
    expect(result).toMatchObject({
      offer: { workshopName: "Cerámica inicial" },
      policies: null,
    });
  });

  const validForm = {
    period: "2026-11",
    turnoId: "turno-1",
    fullName: "Ana Demo",
    email: "ana@example.test",
    phone: "+54 9 351 555 0000",
    policy: "on",
    honeypot: "",
  };

  it("sends the posted versions with the request", async () => {
    const requestEnrollment = vi
      .fn()
      .mockResolvedValue(err({ kind: "unavailable" }));
    const services = createTestServices({
      publicEnrollments: { ...openOffer(), requestEnrollment },
    });
    await action({
      ...args(services),
      request: formRequest({
        ...validForm,
        conditionsVersion: "2",
        privacyVersion: "1",
      }),
    });
    expect(requestEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptance: { conditionsVersion: 2, privacyVersion: 1 },
      }),
    );
  });

  it.each([
    ["missing", {}],
    ["not numbers", { conditionsVersion: "abc", privacyVersion: "1" }],
    ["zero", { conditionsVersion: "0", privacyVersion: "1" }],
    ["half", { conditionsVersion: "1" }],
  ])(
    "sends no acceptance when the posted versions are %s",
    async (_name, extra) => {
      const requestEnrollment = vi
        .fn()
        .mockResolvedValue(err({ kind: "unavailable" }));
      const services = createTestServices({
        publicEnrollments: { ...openOffer(), requestEnrollment },
      });
      const result = await action({
        ...args(services),
        request: formRequest({ ...validForm, ...extra }),
      });
      expect(requestEnrollment).toHaveBeenCalledWith(
        expect.not.objectContaining({
          acceptance: expect.anything() as unknown,
        }),
      );
      expect(result).toEqual({
        values: {
          fullName: "Ana Demo",
          email: "ana@example.test",
          phone: "+54 9 351 555 0000",
          turnoId: "turno-1",
        },
        errors: {},
        formError: "Esta inscripción no está disponible.",
      });
    },
  );

  it("tells the visitor the documents changed when a posted version is unknown, as a field error", async () => {
    const requestEnrollment = vi.fn().mockResolvedValue(
      err({
        kind: "invalid",
        issues: [{ field: "policy", code: "unknown-reference" }],
      }),
    );
    const services = createTestServices({
      publicEnrollments: { ...openOffer(), requestEnrollment },
    });
    const result = await action({
      ...args(services),
      request: formRequest({
        ...validForm,
        conditionsVersion: "9",
        privacyVersion: "9",
      }),
    });
    expect(result).toMatchObject({
      errors: {
        policy: "Las condiciones cambiaron. Volvé a leerlas y aceptalas.",
      },
    });
  });
});
