import { describe, expect, it } from "vitest";
import type { OrderRepository } from "~/modules/enrollments/application/enrollment-repository";
import type { StudentActivityStore } from "~/modules/enrollments/application/student-activity";
import {
  orderDraft as rawOrderDraft,
  pesos,
} from "~/testing/fakes/enrollments-builders";

const IDs = {
  workshop: "00000000-0000-4000-8000-000000000001",
  weavingWorkshop: "00000000-0000-4000-8000-000000000002",
  period: "00000000-0000-4000-8000-000000000003",
  otherPeriod: "00000000-0000-4000-8000-000000000004",
  turno: "00000000-0000-4000-8000-000000000005",
  otherTurno: "00000000-0000-4000-8000-000000000006",
  material: "00000000-0000-4000-8000-000000000007",
  variant: "00000000-0000-4000-8000-000000000008",
  supplier: "00000000-0000-4000-8000-000000000009",
};

/** Uses persistence-valid identifiers so every adapter shares the same inputs. */
const orderDraft = (...args: Parameters<typeof rawOrderDraft>) => {
  const value = rawOrderDraft(...args);
  return {
    ...value,
    workshopId:
      value.workshopId === "w-weaving" ? IDs.weavingWorkshop : IDs.workshop,
    periodId: value.periodId === "p-2" ? IDs.otherPeriod : IDs.period,
    turnoId: value.turnoId === "t-2" ? IDs.otherTurno : IDs.turno,
    lines: value.lines.map((line) => ({
      ...line,
      materialId: IDs.material,
      variantId: IDs.variant,
      supplierId: IDs.supplier,
    })),
  };
};

const other = (email: string) => {
  const numbered = email.match(/\d+/)?.[0];
  let emailCodeUnitSum = 0;
  for (let index = 0; index < email.length; index += 1)
    emailCodeUnitSum += email.charCodeAt(index);
  const suffix =
    numbered === undefined ? emailCodeUnitSum : 1_000_000 + Number(numbered);
  return {
    fullName: "Otra Persona",
    email,
    phoneDigits: `549351${String(suffix).padStart(7, "0")}`,
  };
};

export interface OrderRepositoryContractHarness {
  readonly repository: OrderRepository;
  /** Reads and writes the `active` flag of the profiles the repository creates. */
  readonly activity: StudentActivityStore;
  /** The stock a paid order's transaction takes from: arrange and read units per variant. */
  readonly stock: {
    seed(variantId: string, units: number): Promise<void>;
    onHand(variantId: string): Promise<number>;
  };
  /** Confirmed seats of a turno, read from the same store the repository claims from. */
  readonly confirmedSeats: (
    periodId: string,
    turnoId: string,
  ) => Promise<number>;
  /** Performs a create that fails after allocating its number. */
  readonly failCreateAfterNumbering: (
    draft: ReturnType<typeof orderDraft>,
  ) => Promise<unknown>;
}

const createDraft = (index: number, overrides = {}) =>
  orderDraft({
    publicId: `P${String(index).padStart(21, "0")}`,
    student: other(`student-${String(index)}@example.com`),
    ...overrides,
  });

/** Behavior every persistence-backed `OrderRepository` must share. */
export function runOrderRepositoryContract(
  create: () =>
    Promise<OrderRepositoryContractHarness> | OrderRepositoryContractHarness,
): void {
  describe("OrderRepository contract", () => {
    it("stores the fee an admin set, including $0, as fee and total", async () => {
      const { repository: repo } = await create();
      const scholarship = await repo.create(
        orderDraft({ fee: pesos(0), total: pesos(0) }),
      );
      const discounted = await repo.create(
        orderDraft({
          publicId: "D".repeat(22),
          student: other("desc@example.com"),
          fee: pesos(40000),
          total: pesos(40000),
        }),
      );
      if (!scholarship.ok || !discounted.ok) throw new Error("expected ok");
      expect(scholarship.value.fee.isZero()).toBe(true);
      expect(scholarship.value.total.isZero()).toBe(true);
      expect(discounted.value.fee.equals(pesos(40000))).toBe(true);
      expect(discounted.value.total.equals(pesos(40000))).toBe(true);
      const found = await repo.findByPublicId("D".repeat(22));
      expect(found?.total.equals(pesos(40000))).toBe(true);
    });

    it("creates a free admin order already paid and claims its seat in the same transaction", async () => {
      const { repository: repo, confirmedSeats } = await create();
      const paidAt = new Date("2026-10-19T03:00:00.000Z");
      const draft = orderDraft({
        fee: pesos(0),
        total: pesos(0),
        createdBy: "admin@example.com",
        paidOnCreation: {
          paidAt,
          confirmedBy: "admin@example.com",
          capacity: 8,
        },
      });

      const created = await repo.create(draft);

      if (!created.ok) throw new Error("expected ok");
      expect(created.value).toMatchObject({
        status: "paid",
        paidAt,
        confirmedBy: "admin@example.com",
      });
      expect(created.value.paidAmount?.isZero()).toBe(true);
      expect(await confirmedSeats(draft.periodId, draft.turnoId)).toBe(1);
      expect((await repo.findForAdmin(created.value.id))?.status).toBe("paid");
      expect(await repo.auditTrail(created.value.id)).toEqual([
        {
          at: draft.requestedAt,
          actor: "admin@example.com",
          from: null,
          to: "paid",
          note: null,
        },
      ]);
    });

    describe("an order created already paid with stock lines", () => {
      const paidWith = (
        sources: readonly ("stock" | "supplier")[],
        quantity: number,
        capacity = 8,
        paid = true,
      ) =>
        orderDraft({
          fee: pesos(0),
          materialsTotal: pesos(4000 * sources.length * quantity),
          total: pesos(4000 * sources.length * quantity),
          createdBy: "admin@example.com",
          ...(paid
            ? {
                paidOnCreation: {
                  paidAt: new Date("2026-10-19T03:00:00.000Z"),
                  confirmedBy: "admin@example.com",
                  capacity,
                },
              }
            : {}),
          lines: sources.map((source) => ({
            materialId: "m-1",
            variantId: "v-1",
            materialName: "Arcilla",
            variantLabel: "Grande",
            unitPrice: pesos(4000),
            quantity,
            supplierId: "s-1",
            supplierName: "Proveedor Uno",
            source,
            unitCost: pesos(2500),
          })),
        });

      it("takes the units of the stock lines in the creation transaction", async () => {
        const { repository: repo, stock } = await create();
        await stock.seed(IDs.variant, 5);

        const created = await repo.create(paidWith(["stock"], 2));

        if (!created.ok) throw new Error("expected ok");
        expect(created.value.status).toBe("paid");
        expect(created.value.lines.map((line) => line.source)).toEqual([
          "stock",
        ]);
        expect(await stock.onHand(IDs.variant)).toBe(3);
      });

      it("switches a line to the supplier when the stock ran out, and still stores the paid order", async () => {
        const { repository: repo, stock } = await create();
        await stock.seed(IDs.variant, 1);

        const created = await repo.create(paidWith(["stock"], 2));

        if (!created.ok) throw new Error("expected ok");
        expect(created.value.status).toBe("paid");
        expect(created.value.lines.map((line) => line.source)).toEqual([
          "supplier",
        ]);
        expect(await stock.onHand(IDs.variant)).toBe(1);
      });

      it("takes nothing for supplier lines or for a pending order", async () => {
        const { repository: repo, stock } = await create();
        await stock.seed(IDs.variant, 5);

        await repo.create(paidWith(["supplier"], 2));
        await repo.create({
          ...paidWith(["stock"], 2, 8, false),
          publicId: "T".repeat(22),
          student: other("pending@example.com"),
        });

        expect(await stock.onHand(IDs.variant)).toBe(5);
      });

      it("leaves the stock untouched when the full turno refuses the order", async () => {
        const { repository: repo, stock } = await create();
        await stock.seed(IDs.variant, 5);
        const first = await repo.create(paidWith(["supplier"], 1, 1));
        const refused = await repo.create({
          ...paidWith(["stock"], 2, 1),
          publicId: "S".repeat(22),
          student: other("refused@example.com"),
        });

        expect(first.ok).toBe(true);
        expect(refused).toEqual({ ok: false, error: { kind: "turno-full" } });
        expect(await stock.onHand(IDs.variant)).toBe(5);
      });
    });

    it("stores nothing, burns no number and claims no seat when a free paid order finds the turno full", async () => {
      const { repository: repo, confirmedSeats } = await create();
      const paidOnCreation = {
        paidAt: new Date("2026-10-19T03:00:00.000Z"),
        confirmedBy: "admin@example.com",
        capacity: 1,
      };
      const free = { fee: pesos(0), total: pesos(0), paidOnCreation };
      const first = await repo.create(orderDraft(free));
      const second = createDraft(2, {
        ...free,
        createdBy: "admin@example.com",
      });
      const refused = await repo.create(second);
      const retry = await repo.create(createDraft(3));

      expect(first.ok && first.value.number).toBe("CI-2026-0001");
      expect(refused).toEqual({ ok: false, error: { kind: "turno-full" } });
      expect(await repo.findByPublicId(second.publicId)).toBeNull();
      expect(await confirmedSeats(second.periodId, second.turnoId)).toBe(1);
      expect(retry.ok && retry.value.number).toBe("CI-2026-0002");
    });

    it("creates a pending order with consecutive numbers per Córdoba year", async () => {
      const { repository: repo } = await create();
      const first = await repo.create(orderDraft({ year: 2026 }));
      const second = await repo.create(
        orderDraft({
          year: 2026,
          publicId: "B".repeat(22),
          student: other("bea@example.com"),
        }),
      );
      const nextYear = await repo.create(
        orderDraft({
          year: 2027,
          publicId: "C".repeat(22),
          student: other("cai@example.com"),
        }),
      );
      expect(
        [first, second, nextYear].map((r) => r.ok && r.value.number),
      ).toEqual(["CI-2026-0001", "CI-2026-0002", "CI-2027-0001"]);
      expect(first.ok && first.value.status).toBe("pending_confirmation");
    });

    it("gives 20 parallel creators unique consecutive Córdoba-year numbers", async () => {
      const { repository: repo } = await create();
      const created = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          repo.create(createDraft(index)),
        ),
      );

      expect(created.every((result) => result.ok)).toBe(true);
      expect(
        created.map((result) => (result.ok ? result.value.number : "")).sort(),
      ).toEqual(
        Array.from(
          { length: 20 },
          (_, index) => `CI-2026-${String(index + 1).padStart(4, "0")}`,
        ),
      );
    });

    it("does not burn a number when creation fails after numbering", async () => {
      const { repository: repo, failCreateAfterNumbering } = await create();

      await expect(failCreateAfterNumbering(orderDraft())).rejects.toThrow();
      const retry = await repo.create(orderDraft());
      expect(retry.ok && retry.value.number).toBe("CI-2026-0001");
    });

    it("does not burn a number when an active duplicate is refused", async () => {
      const { repository: repo } = await create();
      await repo.create(orderDraft());
      expect(
        await repo.create(
          orderDraft({ publicId: "B".repeat(22), turnoId: "t-2" }),
        ),
      ).toEqual({ ok: false, error: { kind: "duplicate-order" } });

      const next = await repo.create(
        orderDraft({
          publicId: "C".repeat(22),
          student: other("bea@example.com"),
        }),
      );
      expect(next.ok && next.value.number).toBe("CI-2026-0002");
    });

    it("allows one active record per student and month, and a cancelled one frees the month", async () => {
      const { repository: repo } = await create();
      const first = await repo.create(orderDraft());
      if (!first.ok) throw new Error("fixture");

      const sameActive = await repo.create(
        orderDraft({ publicId: "B".repeat(22), turnoId: "t-2" }),
      );
      const otherEmail = await repo.create(
        orderDraft({
          publicId: "C".repeat(22),
          student: other("bea@example.com"),
        }),
      );
      const otherPeriod = await repo.create(
        orderDraft({
          publicId: "D".repeat(22),
          periodId: "p-2",
          period: "2026-11",
        }),
      );
      expect(sameActive).toEqual({
        ok: false,
        error: { kind: "duplicate-order" },
      });
      expect(otherEmail.ok && otherPeriod.ok).toBe(true);

      await repo.transitionOrder(first.value.id, "cancelled", {
        actor: "owner@example.com",
        at: new Date("2026-10-21T12:00:00Z"),
      });
      const replacement = await repo.create(
        orderDraft({ publicId: "E".repeat(22), turnoId: "t-2" }),
      );
      expect(replacement.ok && replacement.value.number).toBe("CI-2026-0004");
      expect(
        await repo.create(orderDraft({ publicId: "F".repeat(22) })),
      ).toEqual({ ok: false, error: { kind: "duplicate-order" } });
      expect((await repo.findForAdmin(first.value.id))?.status).toBe(
        "cancelled",
      );

      const next = await repo.create(
        orderDraft({
          publicId: "G".repeat(22),
          periodId: "p-3",
          period: "2026-12",
          student: other("cai@example.com"),
        }),
      );
      expect(next.ok && next.value.number).toBe("CI-2026-0005");
    });

    it("round-trips by public id and never by order number", async () => {
      const { repository: repo } = await create();
      const created = await repo.create(orderDraft());
      if (!created.ok) throw new Error("fixture");
      expect(await repo.findByPublicId(created.value.publicId)).toEqual(
        created.value,
      );
      expect(await repo.findByPublicId(created.value.number)).toBeNull();
      expect(await repo.findByPublicId("Z".repeat(22))).toBeNull();
    });

    it("round-trips complete order lines and the creation audit", async () => {
      const { repository: repo } = await create();
      const requestedAt = new Date("2026-10-20T15:00:00Z");
      const draft = orderDraft({
        requestedAt,
        materialsTotal: pesos(29000),
        total: pesos(87000),
        lines: [
          {
            materialId: "m-1",
            variantId: "v-1",
            materialName: "Arcilla",
            variantLabel: "Grande",
            unitPrice: pesos(12500),
            quantity: 2,
            supplierId: "s-1",
            supplierName: "Proveedor Uno",
            source: "stock",
            unitCost: pesos(9000),
          },
          {
            materialId: "m-2",
            variantId: "v-2",
            materialName: "Esmalte",
            variantLabel: "Azul",
            unitPrice: pesos(4000),
            quantity: 1,
            supplierId: "s-2",
            supplierName: "Proveedor Dos",
            source: "supplier",
            unitCost: null,
          },
        ],
      });
      const created = await repo.create(draft);
      if (!created.ok) throw new Error("fixture");

      expect((await repo.findForAdmin(created.value.id))?.lines).toEqual(
        draft.lines,
      );
      expect(await repo.auditTrail(created.value.id)).toEqual([
        {
          at: requestedAt,
          actor: "public",
          from: null,
          to: "pending_confirmation",
          note: null,
        },
      ]);
    });

    it("names the admin who created an order on behalf of a student", async () => {
      const { repository: repo } = await create();
      const created = await repo.create(
        orderDraft({ createdBy: "owner@example.com" }),
      );
      if (!created.ok) throw new Error("fixture");

      expect(await repo.auditTrail(created.value.id)).toMatchObject([
        { actor: "owner@example.com", from: null, to: "pending_confirmation" },
      ]);
      expect(created.value).not.toHaveProperty("createdBy");
    });

    it("stores the accepted policy versions with the order and reads them back", async () => {
      const { repository: repo } = await create();
      const created = await repo.create(
        orderDraft({ acceptance: { conditionsVersion: 2, privacyVersion: 3 } }),
      );
      if (!created.ok) throw new Error("fixture");

      expect(created.value.acceptance).toEqual({
        conditionsVersion: 2,
        privacyVersion: 3,
      });
      const found = await repo.findByPublicId(created.value.publicId);
      expect(found?.acceptance).toEqual({
        conditionsVersion: 2,
        privacyVersion: 3,
      });
      const listed = await repo.listForAdmin({});
      expect(listed[0]?.acceptance).toEqual({
        conditionsVersion: 2,
        privacyVersion: 3,
      });
    });

    it("keeps no acceptance on an order created without one", async () => {
      const { repository: repo } = await create();
      const created = await repo.create(orderDraft());
      if (!created.ok) throw new Error("fixture");

      expect(created.value).not.toHaveProperty("acceptance");
      const found = await repo.findForAdmin(created.value.id);
      expect(found).not.toHaveProperty("acceptance");
    });

    it("filters admin lists by status, period, workshop and text, newest first", async () => {
      const { repository: repo } = await create();
      const oldest = await repo.create(
        createDraft(1, {
          requestedAt: new Date("2026-10-20T10:00:00Z"),
          workshopId: "w-ceramics",
          period: "2026-10",
        }),
      );
      const newest = await repo.create(
        createDraft(2, {
          requestedAt: new Date("2026-10-20T12:00:00Z"),
          workshopId: "w-ceramics",
          period: "2026-10",
        }),
      );
      const november = await repo.create(
        createDraft(3, {
          requestedAt: new Date("2026-11-20T12:00:00Z"),
          workshopId: "w-ceramics",
          period: "2026-11",
        }),
      );
      const weaving = await repo.create(
        createDraft(4, {
          requestedAt: new Date("2026-10-21T12:00:00Z"),
          workshopId: "w-weaving",
        }),
      );
      if (!oldest.ok || !newest.ok || !november.ok || !weaving.ok)
        throw new Error("fixture");
      await repo.transitionOrder(weaving.value.id, "cancelled", {
        actor: "owner@example.com",
        at: new Date("2026-10-22T12:00:00Z"),
      });

      expect(
        (
          await repo.listForAdmin({
            status: "pending_confirmation",
            period: "2026-10",
          })
        ).map((order) => order.id),
      ).toEqual([newest.value.id, oldest.value.id]);
      expect(
        (await repo.listForAdmin({ workshopId: IDs.weavingWorkshop })).map(
          (order) => order.id,
        ),
      ).toEqual([weaving.value.id]);
      expect(
        (await repo.listForAdmin({ text: "student-3@" })).map(
          (order) => order.id,
        ),
      ).toEqual([november.value.id]);
      expect(
        (await repo.listForAdmin({ status: "cancelled" })).map(
          (order) => order.id,
        ),
      ).toEqual([weaving.value.id]);
    });

    it("uses fixed 50-row pages for admin lists", async () => {
      const { repository: repo } = await create();
      const created = [];
      for (let index = 0; index < 51; index += 1) {
        created.push(
          await repo.create(
            createDraft(index, {
              requestedAt: new Date(
                Date.parse("2026-10-20T10:00:00Z") + index * 1_000,
              ),
            }),
          ),
        );
      }
      if (created.some((result) => !result.ok)) throw new Error("fixture");

      const firstPage = await repo.listForAdmin({ page: 1 });
      const secondPage = await repo.listForAdmin({ page: 2 });
      expect(firstPage).toHaveLength(50);
      expect(firstPage[0]?.requestedAt).toEqual(
        new Date("2026-10-20T10:00:50Z"),
      );
      expect(secondPage).toHaveLength(1);
      expect(secondPage[0]?.requestedAt).toEqual(
        new Date("2026-10-20T10:00:00Z"),
      );
    });

    it("refuses an illegal transition, leaves the order unchanged and writes no audit", async () => {
      const { repository: repo } = await create();
      const created = await repo.create(orderDraft());
      if (!created.ok) throw new Error("fixture");
      const refused = await repo.transitionOrder(
        created.value.id,
        "materials_requested",
        { actor: "owner@example.com", at: new Date("2026-10-21T12:00:00Z") },
      );
      expect(refused).toEqual({
        ok: false,
        error: {
          kind: "illegal-transition",
          from: "pending_confirmation",
          to: "materials_requested",
        },
      });
      expect(await repo.findByPublicId(created.value.publicId)).toEqual(
        created.value,
      );
      expect(await repo.auditTrail(created.value.id)).toHaveLength(1);
    });

    it("cancels a pending order with an audit row and reports an unknown id", async () => {
      const { repository: repo } = await create();
      const created = await repo.create(orderDraft());
      if (!created.ok) throw new Error("fixture");
      const at = new Date("2026-10-21T12:00:00Z");
      const cancelled = await repo.transitionOrder(
        created.value.id,
        "cancelled",
        {
          actor: "owner@example.com",
          at,
          note: "pidió baja",
        },
      );
      expect(cancelled.ok && cancelled.value.status).toBe("cancelled");
      expect((await repo.auditTrail(created.value.id)).at(-1)).toEqual({
        at,
        actor: "owner@example.com",
        from: "pending_confirmation",
        to: "cancelled",
        note: "pidió baja",
      });
      expect(
        await repo.transitionOrder(
          "00000000-0000-4000-8000-000000000099",
          "cancelled",
          { actor: "x", at },
        ),
      ).toEqual({ ok: false, error: { kind: "not-found" } });
    });

    it.each([[[]], [["materials_requested"]]] as const)(
      "cancels a paid order after %j, keeping the payment and recording the refund",
      async (steps) => {
        const { repository: repo } = await create();
        const created = await repo.create(
          orderDraft({
            lines: [
              {
                materialId: "m-1",
                variantId: "v-1",
                materialName: "Clay",
                variantLabel: "Large",
                unitPrice: pesos(1),
                quantity: 1,
                supplierId: "supplier-1",
                supplierName: "Supplier",
              },
            ],
            materialsTotal: pesos(1),
            total: pesos(58001),
          }),
        );
        if (!created.ok) throw new Error("fixture");
        const paidAt = new Date("2026-10-20T03:00:00Z");
        await repo.transitionOrder(created.value.id, "paid", {
          actor: "owner@example.com",
          at: paidAt,
          paidAt,
          paidAmount: pesos(58001),
        });
        for (const to of steps)
          await repo.transitionOrder(created.value.id, to, {
            actor: "owner@example.com",
            at: paidAt,
          });

        const refundedAt = new Date("2026-10-25T03:00:00Z");
        const cancelled = await repo.transitionOrder(
          created.value.id,
          "cancelled",
          {
            actor: "boss@example.com",
            at: new Date("2026-10-25T15:00:00Z"),
            note: "pidió baja",
            refund: { amount: pesos(58000), refundedAt, note: "transferencia" },
          },
        );

        const expected = {
          status: "cancelled",
          paidAt,
          paidAmount: pesos(58001),
          refund: {
            amount: pesos(58000),
            refundedAt,
            note: "transferencia",
            refundedBy: "boss@example.com",
          },
        };
        expect(cancelled.ok && cancelled.value).toMatchObject(expected);
        expect(await repo.findForAdmin(created.value.id)).toMatchObject(
          expected,
        );
      },
    );

    describe("student profile activity", () => {
      const at = new Date("2026-10-25T15:00:00Z");

      it("deactivates and reactivates a profile without touching its history", async () => {
        const { repository: repo, activity } = await create();
        const first = await repo.create(orderDraft());
        if (!first.ok) throw new Error("fixture");
        await expect(activity.inactiveEmails()).resolves.toEqual(new Set());

        await expect(
          activity.setActive("  Ana@Example.com ", false, at),
        ).resolves.toBe(true);
        await expect(activity.inactiveEmails()).resolves.toEqual(
          new Set(["ana@example.com"]),
        );
        expect(await repo.findForAdmin(first.value.id)).toEqual(first.value);

        await expect(
          activity.setActive("ana@example.com", true, at),
        ).resolves.toBe(true);
        await expect(activity.inactiveEmails()).resolves.toEqual(new Set());
        expect(await repo.findForAdmin(first.value.id)).toEqual(first.value);
      });

      it("counts a student without a profile as active and changes nothing for her", async () => {
        const { repository: repo, activity } = await create();
        await repo.create(orderDraft());

        await expect(
          activity.setActive("nobody@example.com", false, at),
        ).resolves.toBe(false);
        await expect(activity.inactiveEmails()).resolves.toEqual(new Set());
      });

      it("keeps the other students as they were when one is deactivated", async () => {
        const { repository: repo, activity } = await create();
        await repo.create(orderDraft());
        await repo.create(
          orderDraft({
            publicId: "B".repeat(22),
            student: other("bea@example.com"),
          }),
        );

        await activity.setActive("bea@example.com", false, at);

        await expect(activity.inactiveEmails()).resolves.toEqual(
          new Set(["bea@example.com"]),
        );
      });

      it("reactivates an inactive profile when a new public enrollment arrives", async () => {
        const { repository: repo, activity } = await create();
        await repo.create(orderDraft());
        await activity.setActive("ana@example.com", false, at);

        const next = await repo.create(
          orderDraft({
            publicId: "B".repeat(22),
            periodId: "p-2",
            period: "2026-11",
          }),
        );

        expect(next.ok).toBe(true);
        await expect(activity.inactiveEmails()).resolves.toEqual(new Set());
      });

      it("reactivates an inactive profile when an admin enrolls her by phone with a new email", async () => {
        const { repository: repo, activity } = await create();
        await repo.create(orderDraft());
        await activity.setActive("ana@example.com", false, at);

        const next = await repo.create(
          orderDraft({
            publicId: "B".repeat(22),
            periodId: "p-2",
            period: "2026-11",
            createdBy: "admin@example.com",
            student: {
              fullName: "Ana Pérez",
              email: "ana.nueva@example.com",
              phoneDigits: "5493515551234",
            },
          }),
        );

        expect(next.ok).toBe(true);
        await expect(activity.inactiveEmails()).resolves.toEqual(new Set());
      });

      it("leaves the profile inactive when the enrollment is refused", async () => {
        const { repository: repo, activity } = await create();
        await repo.create(orderDraft());
        await activity.setActive("ana@example.com", false, at);

        const refused = await repo.create(
          orderDraft({ publicId: "B".repeat(22), turnoId: "t-2" }),
        );

        expect(refused).toEqual({
          ok: false,
          error: { kind: "duplicate-order" },
        });
        await expect(activity.inactiveEmails()).resolves.toEqual(
          new Set(["ana@example.com"]),
        );
      });
    });
  });
}
