import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  IntensiveRequestRepository,
  StoredIntensiveRequest,
} from "~/modules/intensive-requests";

export const INTENSIVE_A = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const INTENSIVE_B = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
export const REQUEST_1 = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
export const REQUEST_2 = "3a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04";
export const REQUEST_3 = "4b2c3d4e-5f60-4b7c-9d8e-1f2a3b4c5d05";
export const REQUEST_UNKNOWN = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c99";

export const DEPOSIT = (() => {
  const money = Money.fromCentavos(1_500_000);
  if (!money.ok) throw new Error("bad money");
  return money.value;
})();

const CONFIRM_AT = new Date("2026-10-22T15:00:00.000Z");

export function buildStoredRequest(
  overrides: Partial<StoredIntensiveRequest> = {},
): StoredIntensiveRequest {
  return {
    id: REQUEST_1,
    publicId: "abcdefghijklmnopqrstuv-1",
    intensiveId: INTENSIVE_A,
    status: "pending_confirmation",
    fullName: "Ana Pérez",
    email: "ana@example.com",
    phoneDigits: "5493515550101",
    policyAcceptedAt: new Date("2026-10-20T12:00:00.000Z"),
    createdAt: new Date("2026-10-20T12:00:00.000Z"),
    paidAmount: null,
    paidOn: null,
    paymentNote: null,
    confirmedBy: null,
    confirmedAt: null,
    cancelReason: null,
    cancelledBy: null,
    cancelledAt: null,
    ...overrides,
  };
}

const SECOND = {
  id: REQUEST_2,
  publicId: "second-public-id-0000",
  email: "bea@example.com",
} as const;

const confirmInput = (id: string, capacity = 10) => ({
  id,
  capacity,
  amount: DEPOSIT,
  paidOn: "2026-10-21",
  note: "transferencia",
  by: "duena@example.com",
  at: CONFIRM_AT,
});

const cancelInput = (id: string) => ({
  id,
  reason: "no puede asistir",
  by: "duena@example.com",
  at: CONFIRM_AT,
});

/** Behavior every IntensiveRequestRepository implementation must satisfy. */
export function runIntensiveRequestRepositoryContract(
  create: () => Promise<IntensiveRequestRepository>,
): void {
  describe("IntensiveRequestRepository contract", () => {
    it("round-trips a pending request by id and by public id", async () => {
      const repo = await create();
      const stored = buildStoredRequest();
      expect(await repo.insert(stored)).toEqual({ ok: true, value: undefined });

      expect(await repo.findById(REQUEST_1)).toEqual(stored);
      expect(await repo.findByPublicId(stored.publicId)).toEqual(stored);
      expect(await repo.findById(REQUEST_UNKNOWN)).toBeNull();
      expect(await repo.findByPublicId("nope")).toBeNull();
    });

    it("refuses a second live request with the same email for an intensivo", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());

      const again = await repo.insert(
        buildStoredRequest({ id: REQUEST_2, publicId: SECOND.publicId }),
      );

      expect(again).toEqual({
        ok: false,
        error: { kind: "duplicate-request" },
      });
      expect(await repo.findById(REQUEST_2)).toBeNull();
    });

    it("allows the same email for another intensivo or after a cancellation", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      const other = await repo.insert(
        buildStoredRequest({
          id: REQUEST_2,
          publicId: SECOND.publicId,
          intensiveId: INTENSIVE_B,
        }),
      );
      expect(other.ok).toBe(true);

      await repo.cancel(cancelInput(REQUEST_1));
      const retry = await repo.insert(
        buildStoredRequest({
          id: REQUEST_3,
          publicId: "third-public-id-00000",
        }),
      );
      expect(retry.ok).toBe(true);
    });

    it("confirms a pending request and counts only confirmed seats", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(0);

      const confirmed = await repo.confirm(confirmInput(REQUEST_1));

      expect(confirmed).toMatchObject({
        ok: true,
        value: {
          id: REQUEST_1,
          status: "confirmed",
          paidOn: "2026-10-21",
          paymentNote: "transferencia",
          confirmedBy: "duena@example.com",
          confirmedAt: CONFIRM_AT,
        },
      });
      expect(confirmed.ok && confirmed.value.paidAmount?.toCentavos()).toBe(
        1_500_000,
      );
      expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(1);
      expect(await repo.confirmedSeats(INTENSIVE_B)).toBe(0);
    });

    it("never confirms past the capacity and leaves the request pending", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      await repo.insert(buildStoredRequest(SECOND));
      await repo.confirm(confirmInput(REQUEST_1, 1));

      const second = await repo.confirm(confirmInput(REQUEST_2, 1));

      expect(second).toEqual({ ok: false, error: { kind: "intensive-full" } });
      expect((await repo.findById(REQUEST_2))?.status).toBe(
        "pending_confirmation",
      );
      expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(1);
    });

    it("lets only one of two concurrent confirmations take the last seat", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      await repo.insert(buildStoredRequest(SECOND));

      const results = await Promise.all([
        repo.confirm(confirmInput(REQUEST_1, 1)),
        repo.confirm(confirmInput(REQUEST_2, 1)),
      ]);

      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(1);
    });

    it("refuses to confirm an unknown, confirmed or cancelled request", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      await repo.confirm(confirmInput(REQUEST_1));

      expect(await repo.confirm(confirmInput(REQUEST_UNKNOWN))).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
      expect(await repo.confirm(confirmInput(REQUEST_1))).toEqual({
        ok: false,
        error: { kind: "illegal-transition", from: "confirmed" },
      });
      await repo.cancel(cancelInput(REQUEST_1));
      expect(await repo.confirm(confirmInput(REQUEST_1))).toEqual({
        ok: false,
        error: { kind: "illegal-transition", from: "cancelled" },
      });
    });

    it("cancels a confirmed request, frees its seat and records who and why", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      await repo.confirm(confirmInput(REQUEST_1));

      const cancelled = await repo.cancel(cancelInput(REQUEST_1));

      expect(cancelled).toMatchObject({
        ok: true,
        value: {
          status: "cancelled",
          cancelReason: "no puede asistir",
          cancelledBy: "duena@example.com",
          cancelledAt: CONFIRM_AT,
        },
      });
      expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(0);
    });

    it("refuses to cancel an unknown or already cancelled request", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      await repo.cancel(cancelInput(REQUEST_1));

      expect(await repo.cancel(cancelInput(REQUEST_UNKNOWN))).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
      expect(await repo.cancel(cancelInput(REQUEST_1))).toEqual({
        ok: false,
        error: { kind: "illegal-transition", from: "cancelled" },
      });
    });

    it("lists one intensivo's requests oldest first, filtered by status", async () => {
      const repo = await create();
      await repo.insert(
        buildStoredRequest({ createdAt: new Date("2026-10-21T12:00:00.000Z") }),
      );
      await repo.insert(
        buildStoredRequest({
          ...SECOND,
          createdAt: new Date("2026-10-20T12:00:00.000Z"),
        }),
      );
      await repo.insert(
        buildStoredRequest({
          id: REQUEST_3,
          publicId: "third-public-id-00000",
          intensiveId: INTENSIVE_B,
        }),
      );
      await repo.confirm(confirmInput(REQUEST_1));

      const all = await repo.listByIntensive(INTENSIVE_A, "all");
      expect(all.map((request) => request.id)).toEqual([REQUEST_2, REQUEST_1]);
      const pending = await repo.listByIntensive(
        INTENSIVE_A,
        "pending_confirmation",
      );
      expect(pending.map((request) => request.id)).toEqual([REQUEST_2]);
      expect(await repo.listByIntensive(INTENSIVE_A, "cancelled")).toEqual([]);
    });
  });
}
