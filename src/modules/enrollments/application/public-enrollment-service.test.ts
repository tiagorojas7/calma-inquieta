import { describe, expect, it, vi } from "vitest";
import type { Clock } from "~/modules/_shared";
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
import { createOfferedMaterialsAdapter } from "~/composition/offered-materials-adapter";
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
  } = {},
) {
  const offers = new InMemoryOfferLookup([options.offer ?? offerFixture()]);
  const defaultMaterials = new InMemoryOfferedMaterials({
    "p-1": [materialFixture()],
  });
  const materials = options.materials ?? defaultMaterials;
  const seats = new InMemorySeatLedger();
  const orders = new InMemoryOrderRepository();
  let counter = 0;
  const service = createPublicEnrollmentService({
    offers,
    materials,
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
    ["offer lookup", (value: ReturnType<typeof setup>) =>
      vi.spyOn(value.offers, "findOffer").mockRejectedValue(new Error("offline"))],
    ["offered-material lookup", (value: ReturnType<typeof setup>) =>
      vi
        .spyOn(value.materials, "listForPeriod")
        .mockRejectedValue(new Error("offline"))],
  ])(
    "maps rejected %s calls to unavailable for getOffer and requestEnrollment",
    async (_name, reject) => {
      const value = setup();
      reject(value);

      await expect(
        value.service.getOffer({ slug: "ceramica-inicial", period: "2026-10" }),
      ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
      await expect(
        value.service.requestEnrollment(request({ lines: [line("v-1")] })),
      ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
      expect(value.orders.size()).toBe(0);
    },
  );

  it.each([
    ["seat ledger", (value: ReturnType<typeof setup>) =>
      vi
        .spyOn(value.seats, "confirmedSeats")
        .mockRejectedValue(new Error("offline"))],
    ["order creation", (value: ReturnType<typeof setup>) =>
      vi.spyOn(value.orders, "create").mockRejectedValue(new Error("offline"))],
  ])("maps rejected %s calls to unavailable without creating an order", async (_name, reject) => {
    const value = setup();
    reject(value);

    await expect(
      value.service.requestEnrollment(request({ lines: [line("v-1")] })),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    expect(value.orders.size()).toBe(0);
  });

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
          student: studentDraft({ email: `s${String(i)}@example.com` }),
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

  it("accepts a new order once the earlier one was cancelled", async () => {
    const { service, orders } = setup();
    const first = await service.requestEnrollment(request());
    if (!first.ok) throw new Error("fixture");
    const stored = await orders.findByPublicId(first.value.publicId);
    await orders.transitionOrder(stored?.id ?? "", "cancelled", {
      actor: "owner@example.com",
      at: NOW,
    });
    const second = await service.requestEnrollment(request());
    expect(second.ok && second.value.number).toBe("CI-2026-0002");
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
      request({ student: studentDraft({ email: "bea@example.com" }) }),
    );
    if (!a.ok || !b.ok) throw new Error("fixture");
    expect(a.value.publicId).toMatch(/^[A-Za-z0-9_-]{22,}$/);
    expect(a.value.publicId).not.toBe(b.value.publicId);
  });
});

describe("requestEnrollment materials", () => {
  it("requires at least one line when the period requires materials", async () => {
    expect(
      await setup({
        offer: withPeriod({ materialsRequired: true }),
      }).service.requestEnrollment(request()),
    ).toEqual({ ok: false, error: { kind: "materials-required" } });
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

  it("shows fee, month, turnos and offered materials for an open month", async () => {
    const result = await setup().service.getOffer(query);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.fee.equals(pesos(58000))).toBe(true);
    expect(result.value.period).toBe("2026-10");
    expect(result.value.materialsRequired).toBe(false);
    expect(result.value.turnos.map((t) => t.id)).toEqual(["t-1", "t-2"]);
    expect(result.value.materials.map((m) => m.materialId)).toEqual(["m-1"]);
  });

  it("filters disappeared material sentinels from the public offer", async () => {
    const materials = createOfferedMaterialsAdapter(
      { listOfferedMaterialIds: async () => ["m-1"] },
      { findOfferedMaterialSnapshots: async () => new Map() },
    );
    const { service } = setup({ materials });

    await expect(
      service.requestEnrollment(request({ lines: [line("v-1")] })),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "material-unavailable", materialId: "m-1" },
    });
    const result = await service.getOffer(query);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.materials).toEqual([]);
    expect(JSON.stringify(result.value)).not.toContain('"supplierId":""');
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
