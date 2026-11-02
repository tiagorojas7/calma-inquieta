import { describe, expect, it, vi } from "vitest";
import { err, ok } from "~/modules/_shared";
import { createPublicEnrollmentService } from "~/modules/enrollments";
import {
  materialFixture,
  offerFixture,
} from "~/testing/fakes/enrollments-builders";
import { InMemoryOfferLookup } from "~/testing/fakes/enrollments-offer-lookup";
import { InMemoryOfferedMaterials } from "~/testing/fakes/enrollments-offered-materials";
import { InMemoryOrderRepository } from "~/testing/fakes/enrollments-order-repository";
import { InMemorySeatLedger } from "~/testing/fakes/enrollments-seat-ledger";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { action } from "./enrollment-materials-action";

const student = {
  fullName: "Ana Demo",
  email: "ana@example.test",
  phone: "+54 9 351 555 0000",
  turnoId: "turno-1",
  period: "2026-11",
  policyAccepted: true,
};

function args(services: ReturnType<typeof createTestServices>) {
  return { ...createLoaderArgs(services), params: { slug: "ceramica" } };
}

function post(
  studentValue: unknown,
  lines: unknown,
  extra: Record<string, string> = {},
  requestPeriod = "2026-11",
) {
  const form = new FormData();
  form.set("student", JSON.stringify(studentValue));
  form.set("lines", JSON.stringify(lines));
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return new Request(
    `http://localhost/talleres/ceramica/inscripcion/materiales?period=${requestPeriod}`,
    {
      method: "POST",
      body: form,
    },
  );
}

function servicesWith(requestEnrollment: unknown) {
  return createTestServices({
    publicEnrollments: {
      getOffer: vi.fn(),
      requestEnrollment,
      getOrderByPublicId: vi.fn(),
    } as never,
  });
}

describe("enrollment materials action", () => {
  it("rejects a malformed whole draft before calling the use case", async () => {
    const requestEnrollment = vi.fn();
    const services = servicesWith(requestEnrollment);
    const result = await action({
      ...args(services),
      request: post(student, [
        { materialId: "arcilla", variantId: "grande", quantity: 21 },
      ]),
    });

    expect(result).toMatchObject({ init: { status: 422 } });
    expect(requestEnrollment).not.toHaveBeenCalled();
  });

  it("refuses a persisted student draft from a different displayed period", async () => {
    const requestEnrollment = vi.fn();
    const services = servicesWith(requestEnrollment);
    const result = await action({
      ...args(services),
      request: post({ ...student, period: "2026-10" }, [], {}, "2026-11"),
    });

    expect(result).toMatchObject({ init: { status: 422 } });
    expect(requestEnrollment).not.toHaveBeenCalled();
  });

  it("submits only student and cart fields and redirects to the public order", async () => {
    const requestEnrollment = vi
      .fn()
      .mockResolvedValue(ok({ publicId: "public-123" }));
    const services = servicesWith(requestEnrollment);
    const result = await action({
      ...args(services),
      request: post(
        student,
        [{ materialId: "arcilla", variantId: "grande", quantity: 2 }],
        {
          total: "1",
          unitPrice: "1",
        },
      ),
    });

    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response))
      throw new Error("expected order redirect");
    expect(result.headers.get("Location")).toBe("/pedido/public-123");
    expect(requestEnrollment).toHaveBeenCalledWith({
      slug: "ceramica",
      period: "2026-11",
      turnoId: "turno-1",
      student: { ...student, honeypot: "" },
      lines: [{ materialId: "arcilla", variantId: "grande", quantity: 2 }],
    });
  });

  it.each([
    [{ kind: "materials-required" }, "Elegí al menos un material."],
    [
      { kind: "material-not-offered", materialId: "otro" },
      "Uno de los materiales ya no está disponible.",
    ],
    [
      { kind: "material-unavailable", materialId: "arcilla" },
      "Uno de los materiales ya no está disponible.",
    ],
    [
      { kind: "invalid-quantity", variantId: "grande" },
      "Revisá las cantidades seleccionadas.",
    ],
    [
      { kind: "turno-full" },
      "Ese turno ya no está disponible. Volvé a elegirlo.",
    ],
    [
      { kind: "turno-not-offered" },
      "Ese turno ya no está disponible. Volvé a elegirlo.",
    ],
    [
      { kind: "duplicate-order" },
      "Ya tenés una inscripción activa para este taller.",
    ],
    [{ kind: "invalid", issues: [] }, "Revisá tus datos antes de continuar."],
    [
      { kind: "period-closed" },
      "La inscripción cambió. Volvé al taller para empezar de nuevo.",
    ],
    [{ kind: "unavailable" }, "Actualizá la página y probá de nuevo."],
  ])("maps %o to actionable fail-closed feedback", async (failure, message) => {
    const services = servicesWith(vi.fn().mockResolvedValue(err(failure)));
    const result = await action({
      ...args(services),
      request: post(student, []),
    });
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { formError: message },
    });
  });

  it("builds a line from the native radio and quantity fields when the draft has none for that material", async () => {
    const requestEnrollment = vi
      .fn()
      .mockResolvedValue(ok({ publicId: "public-1" }));
    await action({
      ...args(servicesWith(requestEnrollment)),
      request: post(student, [], {
        "variant-arcilla": "grande",
        "quantity-arcilla": "3",
      }),
    });
    expect(requestEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [{ materialId: "arcilla", variantId: "grande", quantity: 3 }],
      }),
    );
  });

  it("does not count a material twice when the draft already holds a line for it", async () => {
    const requestEnrollment = vi
      .fn()
      .mockResolvedValue(ok({ publicId: "public-1" }));
    await action({
      ...args(servicesWith(requestEnrollment)),
      request: post(
        student,
        [{ materialId: "arcilla", variantId: "grande", quantity: 2 }],
        { "variant-arcilla": "grande", "quantity-arcilla": "2" },
      ),
    });
    expect(requestEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [{ materialId: "arcilla", variantId: "grande", quantity: 2 }],
      }),
    );
  });

  it("rejects a malformed native quantity before calling the use case", async () => {
    const requestEnrollment = vi.fn();
    const result = await action({
      ...args(servicesWith(requestEnrollment)),
      request: post(student, [], {
        "variant-arcilla": "grande",
        "quantity-arcilla": "abc",
      }),
    });
    expect(result).toMatchObject({ init: { status: 422 } });
    expect(requestEnrollment).not.toHaveBeenCalled();
  });
});

describe("enrollment materials action, consultar precio measures", () => {
  function realServices() {
    const orders = new InMemoryOrderRepository();
    const service = createPublicEnrollmentService({
      offers: new InMemoryOfferLookup([offerFixture()]),
      materials: new InMemoryOfferedMaterials({
        "p-1": [
          materialFixture({
            variants: materialFixture().variants.map((v) =>
              v.variantId === "v-2" ? { ...v, unitPrice: null } : v,
            ),
          }),
        ],
      }),
      seats: new InMemorySeatLedger(),
      orders,
      clock: fixedClock(new Date("2026-10-20T15:00:00Z")),
      random: { bytes: (length) => new Uint8Array(length).fill(7) },
      policyVersion: "2026-10",
    });
    return {
      services: createTestServices({ publicEnrollments: service }),
      orders,
    };
  }
  const realStudent = {
    ...student,
    phone: "351 555-1234",
    turnoId: "t-1",
    period: "2026-10",
  };
  const submit = (
    services: ReturnType<typeof createTestServices>,
    lines: unknown,
    extra: Record<string, string> = {},
  ) =>
    action({
      ...createLoaderArgs(services),
      params: { slug: "ceramica-inicial" },
      request: post(realStudent, lines, extra, "2026-10"),
    });

  it("refuses a measure without a price sent in the cart lines", async () => {
    const { services, orders } = realServices();
    const result = await submit(services, [
      { materialId: "m-1", variantId: "v-2", quantity: 1 },
    ]);
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { formError: "Uno de los materiales ya no está disponible." },
    });
    expect(orders.size()).toBe(0);
  });

  it("refuses a measure without a price sent through the native radio field", async () => {
    const { services, orders } = realServices();
    const result = await submit(services, [], {
      "variant-m-1": "v-2",
      "quantity-m-1": "1",
    });
    expect(result).toMatchObject({ init: { status: 422 } });
    expect(orders.size()).toBe(0);
  });

  it("still accepts the priced measure of the same material", async () => {
    const { services, orders } = realServices();
    const result = await submit(services, [
      { materialId: "m-1", variantId: "v-1", quantity: 1 },
    ]);
    expect(result).toBeInstanceOf(Response);
    expect(orders.size()).toBe(1);
  });
});
