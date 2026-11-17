import { describe, expect, it, vi } from "vitest";
import { Money, type Clock } from "~/modules/_shared";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import {
  materialFixture,
  offerFixture,
  pesos,
  studentDraft,
} from "~/testing/fakes/enrollments-builders";
import { InMemoryOfferLookup } from "~/testing/fakes/enrollments-offer-lookup";
import { InMemoryOfferedMaterials } from "~/testing/fakes/enrollments-offered-materials";
import { InMemoryOrderRepository } from "~/testing/fakes/enrollments-order-repository";
import { InMemorySeatLedger } from "~/testing/fakes/enrollments-seat-ledger";
import type { EnrollmentOffer } from "./offer-lookup";
import type { OfferedMaterialsLookup } from "./offered-materials";
import {
  createPublicEnrollmentService,
  type RequestEnrollmentInput,
} from "./public-enrollment-service";

const NOW = new Date("2026-10-20T15:00:00Z");

function setup(
  options: {
    offer?: EnrollmentOffer;
    clock?: Clock;
    materials?: OfferedMaterialsLookup;
    adminMaterials?: OfferedMaterialsLookup;
  } = {},
) {
  const offers = new InMemoryOfferLookup([options.offer ?? offerFixture()]);
  const defaultMaterials = new InMemoryOfferedMaterials({
    "p-1": [materialFixture()],
  });
  const materials = options.materials ?? defaultMaterials;
  const seats = new InMemorySeatLedger();
  const orders = new InMemoryOrderRepository(seats);
  let counter = 0;
  const service = createPublicEnrollmentService({
    offers,
    materials,
    ...(options.adminMaterials === undefined
      ? {}
      : { adminMaterials: options.adminMaterials }),
    seats,
    orders,
    clock: options.clock ?? fixedClock(NOW),
    random: {
      bytes: (length) => {
        counter += 1;
        return new Uint8Array(length).fill(counter);
      },
    },
    policyVersion: "2026-10",
  });
  return { service, offers, materials: defaultMaterials, seats, orders };
}

const request = (
  overrides: Partial<RequestEnrollmentInput> = {},
): RequestEnrollmentInput => ({
  slug: "ceramica-inicial",
  period: "2026-10",
  turnoId: "t-1",
  student: studentDraft(),
  lines: [],
  ...overrides,
});

const withPeriod = (
  patch: Partial<NonNullable<EnrollmentOffer["period"]>>,
): EnrollmentOffer => {
  const base = offerFixture();
  return {
    ...base,
    period: base.period === null ? null : { ...base.period, ...patch },
  };
};

const line = (variantId: string, quantity = 1, materialId = "m-1") => ({
  materialId,
  variantId,
  quantity,
});

describe("requestEnrollment happy path", () => {
  it("creates one pending order with the server-computed total and untouched seats", async () => {
    const { service, seats, orders } = setup();
    const before = seats.snapshot();
    const result = await service.requestEnrollment(request());
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value).toMatchObject({
      number: "CI-2026-0001",
      status: "pending_confirmation",
      workshopName: "Cerámica inicial",
      period: "2026-10",
      turnoLabel: "Martes 18:00 a 20:00",
      studentName: "Ana Pérez",
    });
    expect(result.value.total.equals(pesos(58000))).toBe(true);
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(stored?.student).toEqual({
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phoneDigits: "5493515551234",
    });
    expect(stored?.policyVersion).toBe("2026-10");
    expect(seats.snapshot()).toEqual(before);
  });

  it("attributes an enrollment created on behalf of a student to that admin", async () => {
    const { service, orders } = setup();
    const result = await service.requestEnrollment(request(), {
      createdBy: "owner@example.com",
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const stored = await orders.findByPublicId(result.value.publicId);
    if (!stored) throw new Error("fixture");

    expect(await orders.auditTrail(stored.id)).toMatchObject([
      { actor: "owner@example.com", to: "pending_confirmation" },
    ]);
  });

  it("stores an admin-set fee as fee and total, with no materials", async () => {
    const { service, orders } = setup();
    const result = await service.requestEnrollment(request(), {
      createdBy: "owner@example.com",
      fee: pesos(40000),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.fee.equals(pesos(40000))).toBe(true);
    expect(result.value.total.equals(pesos(40000))).toBe(true);
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(stored?.fee.equals(pesos(40000))).toBe(true);
    expect(stored?.materialsTotal.isZero()).toBe(true);
    expect(stored?.total.equals(pesos(40000))).toBe(true);
  });

  it("accepts a zero admin-set fee as a free enrollment", async () => {
    const { service, orders } = setup();
    const result = await service.requestEnrollment(request(), {
      createdBy: "owner@example.com",
      fee: pesos(0),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(stored?.fee.isZero()).toBe(true);
    expect(stored?.total.isZero()).toBe(true);
  });

  const settle = {
    createdBy: "owner@example.com",
    fee: pesos(0),
    paidAtIfFree: new Date("2026-10-20T03:00:00.000Z"),
  };

  it("stores a free manual order already paid and claims its seat in the same creation", async () => {
    const { service, orders, seats } = setup();
    const result = await service.requestEnrollment(request(), settle);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.status).toBe("paid");
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(stored).toMatchObject({
      status: "paid",
      paidAt: settle.paidAtIfFree,
      confirmedBy: "owner@example.com",
    });
    expect(stored?.paidAmount?.isZero()).toBe(true);
    expect(await seats.confirmedSeats("p-1", "t-1")).toBe(1);
  });

  it("stores nothing and returns turno-full for a free manual order on a full turno", async () => {
    const { service, orders, seats } = setup();
    seats.setConfirmed("p-1", "t-1", 8);
    await expect(service.requestEnrollment(request(), settle)).resolves.toEqual(
      { ok: false, error: { kind: "turno-full" } },
    );
    expect(orders.size()).toBe(0);
    expect(seats.snapshot()).toEqual([["p-1|t-1", 8]]);
  });

  it("keeps a priced manual order pending even when a paid-if-free date is given", async () => {
    const { service, orders, seats } = setup();
    const result = await service.requestEnrollment(request(), {
      ...settle,
      fee: pesos(40000),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.status).toBe("pending_confirmation");
    expect((await orders.findByPublicId(result.value.publicId))?.status).toBe(
      "pending_confirmation",
    );
    expect(await seats.confirmedSeats("p-1", "t-1")).toBe(0);
  });

  it("never settles a public enrollment: it stays pending and claims no seat", async () => {
    const { service, orders, seats } = setup();
    const result = await service.requestEnrollment(request());
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.status).toBe("pending_confirmation");
    expect((await orders.findByPublicId(result.value.publicId))?.status).toBe(
      "pending_confirmation",
    );
    expect(seats.snapshot()).toEqual([]);
  });

  it("refuses an admin-set fee that is negative or not whole pesos", async () => {
    const { service, orders } = setup();
    const fraction = Money.fromCentavos(5_800_050);
    if (!fraction.ok) throw new Error("fixture");
    for (const fee of [pesos(-1000), fraction.value])
      expect(await service.requestEnrollment(request(), { fee })).toEqual({
        ok: false,
        error: { kind: "invalid-fee" },
      });
    expect(orders.size()).toBe(0);
  });

  it("keeps the period fee when no admin fee is given and never takes one from the input", async () => {
    const { service } = setup();
    const tampered = {
      ...request(),
      fee: pesos(1),
    } as unknown as RequestEnrollmentInput;
    const result = await service.requestEnrollment(tampered);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.fee.equals(pesos(58000))).toBe(true);
    expect(result.value.total.equals(pesos(58000))).toBe(true);
  });

  it("normalizes email and phone", async () => {
    const { service, orders } = setup();
    const result = await service.requestEnrollment(
      request({
        student: studentDraft({
          email: " Ana@Example.COM ",
          phone: "351 555-1234",
        }),
      }),
    );
    if (!result.ok) throw new Error("fixture");
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(stored?.student.email).toBe("ana@example.com");
    expect(stored?.student.phoneDigits).toBe("5493515551234");
  });

  it("ignores a client-sent total and snapshots material lines", async () => {
    const { service, orders } = setup();
    const tampered = {
      ...request({ lines: [line("v-1", 2), line("v-2", 1)] }),
      total: 1000,
    };
    const result = await service.requestEnrollment(tampered);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.total.equals(pesos(87000))).toBe(true);
    expect(result.value.materialsTotal.equals(pesos(29000))).toBe(true);
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(
      stored?.lines.map((l) => [
        l.materialName,
        l.variantLabel,
        l.quantity,
        l.supplierName,
      ]),
    ).toEqual([
      ["Arcilla", "Grande", 2, "Proveedor Uno"],
      ["Arcilla", "Chico", 1, "Proveedor Uno"],
    ]);
  });
});

describe("requestEnrollment student validation and honeypot", () => {
  it("returns every issue together and stores nothing", async () => {
    const { service, orders } = setup();
    const result = await service.requestEnrollment(
      request({
        student: studentDraft({
          fullName: "",
          email: "ana.example.com",
          policyAccepted: false,
        }),
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "fullName", code: "required" },
          { field: "email", code: "invalid-format" },
          { field: "policy", code: "required" },
        ],
      },
    });
    expect(orders.size()).toBe(0);
  });

  it("answers a filled honeypot like a success, before any lookup, storing nothing", async () => {
    const { service, offers, materials, seats, orders } = setup();
    const materialLookup = vi.spyOn(materials, "listForPeriod");
    const seatLookup = vi.spyOn(seats, "confirmedSeats");
    const create = vi.spyOn(orders, "create");
    const result = await service.requestEnrollment(
      request({ student: studentDraft({ honeypot: "http://spam" }) }),
    );
    expect(result.ok).toBe(true);
    expect(offers.lookups).toBe(0);
    expect(materialLookup).not.toHaveBeenCalled();
    expect(seatLookup).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(orders.size()).toBe(0);
  });
});

describe("dependency availability", () => {
  it.each([
    [
      "offer lookup",
      (value: ReturnType<typeof setup>) =>
        vi
          .spyOn(value.offers, "findOffer")
          .mockRejectedValue(new Error("offline")),
    ],
    [
      "offered-material lookup",
      (value: ReturnType<typeof setup>) =>
        vi
          .spyOn(value.materials, "listForPeriod")
          .mockRejectedValue(new Error("offline")),
    ],
  ])(
    "maps rejected %s calls to unavailable for requestEnrollment",
    async (_name, reject) => {
      const value = setup();
      reject(value);

      await expect(
        value.service.requestEnrollment(request({ lines: [line("v-1")] })),
      ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
      expect(value.orders.size()).toBe(0);
    },
  );

  it("maps a rejected offer lookup to unavailable for getOffer", async () => {
    const value = setup();
    vi.spyOn(value.offers, "findOffer").mockRejectedValue(new Error("offline"));
    await expect(
      value.service.getOffer({ slug: "ceramica-inicial", period: "2026-10" }),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
  });

  it.each([
    [
      "seat ledger",
      (value: ReturnType<typeof setup>) =>
        vi
          .spyOn(value.seats, "confirmedSeats")
          .mockRejectedValue(new Error("offline")),
    ],
    [
      "order creation",
      (value: ReturnType<typeof setup>) =>
        vi
          .spyOn(value.orders, "create")
          .mockRejectedValue(new Error("offline")),
    ],
  ])(
    "maps rejected %s calls to unavailable without creating an order",
    async (_name, reject) => {
      const value = setup();
      reject(value);

      await expect(
        value.service.requestEnrollment(request({ lines: [line("v-1")] })),
      ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
      expect(value.orders.size()).toBe(0);
    },
  );

  it("maps a rejected public order read to unavailable", async () => {
    const { service, orders } = setup();
    vi.spyOn(orders, "findByPublicId").mockRejectedValue(new Error("offline"));

    await expect(service.getOrderByPublicId("A".repeat(22))).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("requestEnrollment offer rules", () => {
  it("answers not-found for a missing or unpublished taller", async () => {
    const unpublished = offerFixture({
      workshop: { ...offerFixture().workshop, published: false },
    });
    expect(
      await setup({ offer: unpublished }).service.requestEnrollment(request()),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
    expect(
      await setup().service.requestEnrollment(request({ slug: "otro" })),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it("answers enrollments-paused for a paused taller", async () => {
    const paused = offerFixture({
      workshop: { ...offerFixture().workshop, paused: true },
    });
    expect(
      await setup({ offer: paused }).service.requestEnrollment(request()),
    ).toEqual({ ok: false, error: { kind: "enrollments-paused" } });
  });

  it.each(["draft", "closed"] as const)(
    "refuses a %s period",
    async (status) => {
      expect(
        await setup({
          offer: withPeriod({ status }),
        }).service.requestEnrollment(request()),
      ).toEqual({ ok: false, error: { kind: "period-closed" } });
    },
  );

  it("refuses a month with no period", async () => {
    const offer = { ...offerFixture(), period: null };
    expect(await setup({ offer }).service.requestEnrollment(request())).toEqual(
      { ok: false, error: { kind: "period-closed" } },
    );
  });

  it("accepts 2026-10 until 02:59Z of 1 November and refuses it from 03:00Z", async () => {
    const before = setup({
      clock: fixedClock(new Date("2026-11-01T02:59:59Z")),
    });
    expect((await before.service.requestEnrollment(request())).ok).toBe(true);
    const after = setup({
      clock: fixedClock(new Date("2026-11-01T03:00:00Z")),
    });
    expect(await after.service.requestEnrollment(request())).toEqual({
      ok: false,
      error: { kind: "period-closed" },
    });
  });

  it("refuses a foreign or retired turno and stores nothing", async () => {
    const { service, orders } = setup();
    const result = await service.requestEnrollment(
      request({ turnoId: "other-workshop-turno" }),
    );
    expect(result).toEqual({ ok: false, error: { kind: "turno-not-offered" } });
    expect(orders.size()).toBe(0);
  });
});

describe("requestEnrollment seats and duplicates", () => {
  it("refuses a full turno", async () => {
    const { service, seats } = setup();
    seats.setConfirmed("p-1", "t-1", 8);
    expect(await service.requestEnrollment(request())).toEqual({
      ok: false,
      error: { kind: "turno-full" },
    });
  });

  it("does not let pending orders reduce availability", async () => {
    const { service, seats } = setup();
    seats.setConfirmed("p-1", "t-1", 7);
    for (let i = 0; i < 5; i += 1) {
      const r = await service.requestEnrollment(
        request({
          student: studentDraft({
            email: `s${String(i)}@example.com`,
            phone: `351 555-200${String(i)}`,
          }),
        }),
      );
      expect(r.ok).toBe(true);
    }
    expect(seats.snapshot()).toEqual([["p-1|t-1", 7]]);
  });

  it("refuses a second active order for the same email, taller and month", async () => {
    const { service } = setup();
    expect((await service.requestEnrollment(request())).ok).toBe(true);
    expect(
      await service.requestEnrollment(request({ turnoId: "t-2" })),
    ).toEqual({ ok: false, error: { kind: "duplicate-order" } });
  });

  it("lets the same student enroll again that month after a cancellation", async () => {
    const { service, orders } = setup();
    const first = await service.requestEnrollment(request());
    if (!first.ok) throw new Error("fixture");
    const stored = await orders.findByPublicId(first.value.publicId);
    await orders.transitionOrder(stored?.id ?? "", "cancelled", {
      actor: "owner@example.com",
      at: NOW,
    });
    const again = await service.requestEnrollment(request());
    expect(again.ok && again.value.number).toBe("CI-2026-0002");
    expect(await service.requestEnrollment(request())).toEqual({
      ok: false,
      error: { kind: "duplicate-order" },
    });
  });
});

describe("requestEnrollment order number", () => {
  it("uses the Córdoba year and restarts at 0001 after local midnight", async () => {
    const lastMoment = setup({
      clock: fixedClock(new Date("2027-01-01T02:00:00Z")),
      offer: offerFixture({ periodKey: "2026-12" }),
    });
    const a = await lastMoment.service.requestEnrollment(
      request({ period: "2026-12" }),
    );
    expect(a.ok && a.value.number).toBe("CI-2026-0001");
    const newYear = setup({
      clock: fixedClock(new Date("2027-01-01T03:00:00Z")),
      offer: offerFixture({ periodKey: "2027-01" }),
    });
    const b = await newYear.service.requestEnrollment(
      request({ period: "2027-01" }),
    );
    expect(b.ok && b.value.number).toBe("CI-2027-0001");
  });

  it("reuses the number when the repository fails mid-create", async () => {
    const { service, orders } = setup();
    orders.failNextCreateAfterNumbering();
    await expect(service.requestEnrollment(request())).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
    const retry = await service.requestEnrollment(request());
    expect(retry.ok && retry.value.number).toBe("CI-2026-0001");
  });

  it("gives each order a distinct public id of at least 22 characters", async () => {
    const { service } = setup();
    const a = await service.requestEnrollment(request());
    const b = await service.requestEnrollment(
      request({
        student: studentDraft({
          email: "bea@example.com",
          phone: "351 555-9876",
        }),
      }),
    );
    if (!a.ok || !b.ok) throw new Error("fixture");
    expect(a.value.publicId).toMatch(/^[A-Za-z0-9_-]{22,}$/);
    expect(a.value.publicId).not.toBe(b.value.publicId);
  });
});

describe("requestEnrollment materials", () => {
  it("accepts an enrollment with no lines and never asks for materials", async () => {
    const result = await setup().service.requestEnrollment(request());
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.lines).toEqual([]);
    expect(result.value.materialsTotal.isZero()).toBe(true);
    expect(result.value.total.equals(pesos(58000))).toBe(true);
  });

  it("refuses an invalid quantity naming the variant", async () => {
    const result = await setup().service.requestEnrollment(
      request({ lines: [line("v-1", 21)] }),
    );
    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid-quantity", variantId: "v-1" },
    });
  });

  it("refuses a material the period does not offer, naming it", async () => {
    const { service, orders } = setup();
    const result = await service.requestEnrollment(
      request({ lines: [line("v-9", 1, "m-9")] }),
    );
    expect(result).toEqual({
      ok: false,
      error: { kind: "material-not-offered", materialId: "m-9" },
    });
    expect(orders.size()).toBe(0);
  });

  it("refuses a variant that is not one of the material's variants", async () => {
    expect(
      await setup().service.requestEnrollment(
        request({ lines: [line("v-9")] }),
      ),
    ).toEqual({
      ok: false,
      error: { kind: "material-not-offered", materialId: "m-1" },
    });
  });

  it("refuses a material deactivated after the cart was built", async () => {
    const { service, materials } = setup();
    materials.set("p-1", [materialFixture({ active: false })]);
    expect(
      await service.requestEnrollment(request({ lines: [line("v-1")] })),
    ).toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
  });

  it("refuses a variant without a price as unavailable", async () => {
    const { service, materials } = setup();
    materials.set("p-1", [
      materialFixture({
        variants: materialFixture().variants.map((v) =>
          v.variantId === "v-2" ? { ...v, unitPrice: null } : v,
        ),
      }),
    ]);
    expect(
      await service.requestEnrollment(request({ lines: [line("v-2")] })),
    ).toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
  });

  it("refuses an inactive offered material before checking its variants", async () => {
    const { service, materials } = setup();
    materials.set("p-1", [materialFixture({ active: false, variants: [] })]);

    await expect(
      service.requestEnrollment(request({ lines: [line("not-current")] })),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
  });

  it("refuses an unavailable variant", async () => {
    const { service, materials } = setup();
    materials.set("p-1", [
      materialFixture({
        variants: materialFixture().variants.map((v) =>
          v.variantId === "v-2" ? { ...v, available: false } : v,
        ),
      }),
    ]);
    expect(
      await service.requestEnrollment(request({ lines: [line("v-2")] })),
    ).toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
  });

  it("refuses a price that is not whole pesos", async () => {
    const { service, materials } = setup();
    materials.set("p-1", [
      materialFixture({
        variants: materialFixture().variants.map((v) =>
          v.variantId === "v-1" ? { ...v, unitPrice: pesos(1250.5) } : v,
        ),
      }),
    ]);
    expect(
      await service.requestEnrollment(request({ lines: [line("v-1")] })),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-price", variantId: "v-1" },
    });
  });
});

describe("requestEnrollment catalog materials of a hand-made enrollment", () => {
  const owner = { createdBy: "owner@example.com" };
  // The catalog lookup ignores the period it is asked for.
  const catalogLookup = (
    materials: readonly ReturnType<typeof materialFixture>[],
  ): OfferedMaterialsLookup => ({
    listForPeriod: () => Promise.resolve(materials),
  });
  const catalogSetup = (
    overrides: Parameters<typeof materialFixture>[0] = {},
  ) =>
    setup({
      materials: new InMemoryOfferedMaterials(),
      adminMaterials: catalogLookup([materialFixture(overrides)]),
    });

  it("stores catalog lines with their snapshots and totals fee plus materials", async () => {
    const { service, orders } = setup({
      materials: new InMemoryOfferedMaterials(),
      adminMaterials: catalogLookup([materialFixture()]),
    });
    const result = await service.requestEnrollment(
      request({ lines: [line("v-1", 2), line("v-2", 1)] }),
      { ...owner, fee: pesos(40000) },
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.fee.equals(pesos(40000))).toBe(true);
    expect(result.value.materialsTotal.equals(pesos(29000))).toBe(true);
    expect(result.value.total.equals(pesos(69000))).toBe(true);
    expect(result.value.status).toBe("pending_confirmation");
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(
      stored?.lines.map((l) => [
        l.materialId,
        l.variantId,
        l.materialName,
        l.variantLabel,
        l.unitPrice.toCentavos() / 100,
        l.quantity,
        l.supplierId,
        l.supplierName,
      ]),
    ).toEqual([
      ["m-1", "v-1", "Arcilla", "Grande", 12500, 2, "s-1", "Proveedor Uno"],
      ["m-1", "v-2", "Arcilla", "Chico", 4000, 1, "s-1", "Proveedor Uno"],
    ]);
    expect(stored?.total.equals(pesos(69000))).toBe(true);
  });

  describe("line source and cost snapshot", () => {
    const withStock = (
      stock: Readonly<Record<string, { onHand?: number; cost?: number }>>,
    ) =>
      catalogSetup({
        variants: materialFixture().variants.map((v) => {
          const facts = stock[v.variantId] ?? {};
          return {
            ...v,
            ...(facts.onHand === undefined ? {} : { onHand: facts.onHand }),
            ...(facts.cost === undefined
              ? {}
              : { unitCost: pesos(facts.cost) }),
          };
        }),
      });
    const storedLines = async (
      harness: ReturnType<typeof withStock>,
      lines: ReturnType<typeof line>[],
    ) => {
      const result = await harness.service.requestEnrollment(
        request({ lines }),
        owner,
      );
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      const stored = await harness.orders.findByPublicId(result.value.publicId);
      return (stored?.lines ?? []).map((l) => ({
        variantId: l.variantId,
        source: l.source,
        cost: l.unitCost ? l.unitCost.toCentavos() / 100 : null,
      }));
    };

    it("takes a line from stock when the units on hand cover the quantity", async () => {
      expect(
        await storedLines(withStock({ "v-1": { onHand: 2, cost: 9000 } }), [
          line("v-1", 2),
        ]),
      ).toEqual([{ variantId: "v-1", source: "stock", cost: 9000 }]);
    });

    it("orders a line from the supplier when the stock falls short or is empty", async () => {
      expect(
        await storedLines(
          withStock({
            "v-1": { onHand: 1, cost: 9000 },
            "v-2": { cost: 2500 },
          }),
          [line("v-1", 2), line("v-2", 1)],
        ),
      ).toEqual([
        { variantId: "v-1", source: "supplier", cost: 9000 },
        { variantId: "v-2", source: "supplier", cost: 2500 },
      ]);
    });

    it("stores no cost when the variant has none", async () => {
      expect(
        await storedLines(withStock({ "v-1": { onHand: 3 } }), [line("v-1")]),
      ).toEqual([{ variantId: "v-1", source: "stock", cost: null }]);
    });
  });

  it("keeps a zero fee with materials pending for the materials amount", async () => {
    const { service, orders, seats } = setup({
      materials: new InMemoryOfferedMaterials(),
      adminMaterials: catalogLookup([materialFixture()]),
    });
    const result = await service.requestEnrollment(
      request({ lines: [line("v-2", 3)] }),
      {
        ...owner,
        fee: pesos(0),
        paidAtIfFree: new Date("2026-10-20T03:00:00.000Z"),
      },
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.status).toBe("pending_confirmation");
    expect(result.value.total.equals(pesos(12000))).toBe(true);
    const stored = await orders.findByPublicId(result.value.publicId);
    expect(stored).toMatchObject({ status: "pending_confirmation" });
    expect(stored?.paidAt ?? null).toBeNull();
    expect(await seats.confirmedSeats("p-1", "t-1")).toBe(0);
  });

  it("still stores a zero total paid when no material is chosen", async () => {
    const { service, orders } = setup({
      materials: new InMemoryOfferedMaterials(),
      adminMaterials: catalogLookup([materialFixture()]),
    });
    const result = await service.requestEnrollment(request(), {
      ...owner,
      fee: pesos(0),
      paidAtIfFree: new Date("2026-10-20T03:00:00.000Z"),
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.status).toBe("paid");
    expect((await orders.findByPublicId(result.value.publicId))?.status).toBe(
      "paid",
    );
  });

  it("refuses every line on the public path, whatever the catalog holds", async () => {
    const { service, orders } = setup({
      materials: new InMemoryOfferedMaterials(),
      adminMaterials: catalogLookup([materialFixture()]),
    });
    expect(
      await service.requestEnrollment(request({ lines: [line("v-1")] })),
    ).toEqual({
      ok: false,
      error: { kind: "material-not-offered", materialId: "m-1" },
    });
    expect(orders.size()).toBe(0);
  });

  it("refuses a variant the catalog does not know and stores nothing", async () => {
    const { service, orders } = catalogSetup();
    expect(
      await service.requestEnrollment(request({ lines: [line("v-9")] }), owner),
    ).toEqual({
      ok: false,
      error: { kind: "material-not-offered", materialId: "m-1" },
    });
    expect(
      await service.requestEnrollment(
        request({ lines: [line("v-1", 1, "m-9")] }),
        owner,
      ),
    ).toEqual({
      ok: false,
      error: { kind: "material-not-offered", materialId: "m-9" },
    });
    expect(orders.size()).toBe(0);
  });

  it("refuses an archived material and an unavailable or unpriced variant, storing nothing", async () => {
    const archived = catalogSetup({ active: false });
    expect(
      await archived.service.requestEnrollment(
        request({ lines: [line("v-1")] }),
        owner,
      ),
    ).toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
    const variants = materialFixture().variants;
    const unavailable = catalogSetup({
      variants: variants.map((v) =>
        v.variantId === "v-1" ? { ...v, available: false } : v,
      ),
    });
    expect(
      await unavailable.service.requestEnrollment(
        request({ lines: [line("v-1")] }),
        owner,
      ),
    ).toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
    const unpriced = catalogSetup({
      variants: variants.map((v) =>
        v.variantId === "v-1" ? { ...v, unitPrice: null } : v,
      ),
    });
    expect(
      await unpriced.service.requestEnrollment(
        request({ lines: [line("v-1")] }),
        owner,
      ),
    ).toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
    for (const { orders } of [archived, unavailable, unpriced])
      expect(orders.size()).toBe(0);
  });

  it.each([0, -1, 1.5, Number.NaN, 21])(
    "refuses the quantity %s and stores nothing",
    async (quantity) => {
      const { service, orders } = catalogSetup();
      expect(
        await service.requestEnrollment(
          request({ lines: [line("v-1", quantity)] }),
          owner,
        ),
      ).toEqual({
        ok: false,
        error: { kind: "invalid-quantity", variantId: "v-1" },
      });
      expect(orders.size()).toBe(0);
    },
  );
});

describe("getOrderByPublicId", () => {
  it("returns the allowlisted view with no email, phone or internal id", async () => {
    const { service, orders } = setup();
    const created = await service.requestEnrollment(
      request({
        student: studentDraft({
          email: "sentinel-mail@example.com",
          phone: "351 555-1234",
        }),
      }),
    );
    if (!created.ok) throw new Error("fixture");
    const stored = await orders.findByPublicId(created.value.publicId);
    const view = await service.getOrderByPublicId(created.value.publicId);
    expect(view.ok && view.value.number).toBe("CI-2026-0001");
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("sentinel-mail");
    expect(serialized).not.toContain("5493515551234");
    expect(stored?.id).toBeTruthy();
    expect(serialized).not.toContain(stored?.id ?? "");
  });

  it("answers not-found for an unknown id, an order number and malformed input", async () => {
    const { service } = setup();
    const created = await service.requestEnrollment(request());
    if (!created.ok) throw new Error("fixture");
    for (const key of ["Z".repeat(22), created.value.number, "x"]) {
      expect(await service.getOrderByPublicId(key)).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
    }
  });
});

describe("getOffer", () => {
  const query = { slug: "ceramica-inicial", period: "2026-10" };

  it("shows fee, month and turnos for an open month, with no material data", async () => {
    const result = await setup().service.getOffer(query);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.fee.equals(pesos(58000))).toBe(true);
    expect(result.value.period).toBe("2026-10");
    expect(result.value.turnos.map((t) => t.id)).toEqual(["t-1", "t-2"]);
    expect(Object.keys(result.value).sort()).toEqual([
      "fee",
      "period",
      "turnos",
      "workshopName",
    ]);
  });

  it("never reads the offered materials", async () => {
    const { service, materials } = setup();
    const lookup = vi.spyOn(materials, "listForPeriod");
    const result = await service.getOffer(query);
    expect(result.ok).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("applies the same gates: paused, unpublished and past month", async () => {
    const paused = offerFixture({
      workshop: { ...offerFixture().workshop, paused: true },
    });
    expect(await setup({ offer: paused }).service.getOffer(query)).toEqual({
      ok: false,
      error: { kind: "enrollments-paused" },
    });
    const late = setup({ clock: fixedClock(new Date("2026-11-01T03:00:00Z")) });
    expect(await late.service.getOffer(query)).toEqual({
      ok: false,
      error: { kind: "period-closed" },
    });
    expect(
      await setup().service.getOffer({ slug: "otro", period: "2026-10" }),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
  });
});
