import { describe, expect, it } from "vitest";
import type { OrderRepository } from "~/modules/enrollments/application/enrollment-repository";
import { orderDraft } from "~/testing/fakes/enrollments-builders";

const other = (email: string) => ({
  fullName: "Otra Persona",
  email,
  phoneDigits: "5493515551234",
});

/**
 * Behavior every `OrderRepository` must share. The in-memory fake runs it in
 * E2; the Drizzle repository runs the same suite in E4, where the rows below
 * marked "E4" (parallel creators, CHECKs, filters) are added.
 */
export function runOrderRepositoryContract(
  create: () => Promise<OrderRepository>,
): void {
  describe("OrderRepository contract", () => {
    it("creates a pending order with consecutive numbers per Córdoba year", async () => {
      const repo = await create();
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

    it("round-trips by public id and never by order number", async () => {
      const repo = await create();
      const created = await repo.create(orderDraft());
      if (!created.ok) throw new Error("fixture");
      expect(await repo.findByPublicId(created.value.publicId)).toEqual(
        created.value,
      );
      expect(await repo.findByPublicId(created.value.number)).toBeNull();
      expect(await repo.findByPublicId("Z".repeat(22))).toBeNull();
    });

    it("refuses a second active order for the same email, workshop and period", async () => {
      const repo = await create();
      await repo.create(orderDraft());
      const again = await repo.create(
        orderDraft({ publicId: "B".repeat(22), turnoId: "t-2" }),
      );
      expect(again).toEqual({ ok: false, error: { kind: "duplicate-order" } });
      const other = await repo.create(
        orderDraft({
          publicId: "C".repeat(22),
          student: {
            fullName: "Bea",
            email: "bea@example.com",
            phoneDigits: "5493515551234",
          },
        }),
      );
      const otherPeriod = await repo.create(
        orderDraft({
          publicId: "D".repeat(22),
          periodId: "p-2",
          period: "2026-11",
        }),
      );
      expect(other.ok && otherPeriod.ok).toBe(true);
    });

    it("lets a cancelled order be replaced and does not burn a number on refusal", async () => {
      const repo = await create();
      const first = await repo.create(orderDraft());
      if (!first.ok) throw new Error("fixture");
      await repo.create(orderDraft({ publicId: "B".repeat(22) }));
      await repo.transitionOrder(first.value.id, "cancelled", {
        actor: "owner@example.com",
        at: new Date("2026-10-21T12:00:00Z"),
      });
      const replacement = await repo.create(
        orderDraft({ publicId: "C".repeat(22) }),
      );
      expect(replacement.ok && replacement.value.number).toBe("CI-2026-0002");
    });

    it("writes the creation audit row", async () => {
      const repo = await create();
      const created = await repo.create(
        orderDraft({ requestedAt: new Date("2026-10-20T15:00:00Z") }),
      );
      if (!created.ok) throw new Error("fixture");
      expect(await repo.auditTrail(created.value.id)).toEqual([
        {
          at: new Date("2026-10-20T15:00:00Z"),
          actor: "public",
          from: null,
          to: "pending_confirmation",
          note: null,
        },
      ]);
    });

    it("refuses an illegal transition, leaves the order unchanged and writes no audit", async () => {
      const repo = await create();
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
      const repo = await create();
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
        await repo.transitionOrder("missing", "cancelled", { actor: "x", at }),
      ).toEqual({ ok: false, error: { kind: "not-found" } });
    });
  });
}
