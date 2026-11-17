import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  IntensiveRequestRepository,
  Refund,
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
    projectId: null,
    price: null,
    deposit: null,
    balance: null,
    refund: null,
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

const TODAY = "2026-10-28";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad money");
  return money.value;
};

/** A pending request quoted 40.000 with a 15.000 deposit (25.000 left). */
const QUOTED = { price: pesos(40000), deposit: DEPOSIT } as const;

const cancelInput = (id: string, refund?: Refund) => ({
  id,
  reason: "no puede asistir",
  by: "duena@example.com",
  at: CONFIRM_AT,
  today: TODAY,
  ...(refund === undefined ? {} : { refund }),
});

const refundOf = (amount: number, refundedOn = "2026-10-22"): Refund => ({
  amount: pesos(amount),
  refundedOn,
  note: null,
});

const balanceInput = (id: string, amount = 25000) => ({
  id,
  amount: pesos(amount),
  paidOn: "2026-10-25",
  note: "efectivo",
  by: "duena@example.com",
  at: new Date("2026-10-25T15:00:00.000Z"),
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

    it("round-trips the accepted policy versions, and none for a request without them", async () => {
      const repo = await create();
      const accepted = buildStoredRequest({
        acceptance: { conditionsVersion: 2, privacyVersion: 3 },
      });
      await repo.insert(accepted);
      await repo.insert(
        buildStoredRequest({
          id: REQUEST_2,
          publicId: SECOND.publicId,
          email: SECOND.email,
        }),
      );

      expect((await repo.findById(REQUEST_1))?.acceptance).toEqual({
        conditionsVersion: 2,
        privacyVersion: 3,
      });
      expect(
        (await repo.findByPublicId(accepted.publicId))?.acceptance,
      ).toEqual({ conditionsVersion: 2, privacyVersion: 3 });
      expect(await repo.findById(REQUEST_2)).not.toHaveProperty("acceptance");
      const listed = await repo.listByIntensive(INTENSIVE_A, "all");
      expect(listed.map((request) => request.acceptance)).toEqual([
        { conditionsVersion: 2, privacyVersion: 3 },
        undefined,
      ]);
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
      await repo.cancel(cancelInput(REQUEST_1, refundOf(0)));
      expect(await repo.confirm(confirmInput(REQUEST_1))).toEqual({
        ok: false,
        error: { kind: "illegal-transition", from: "cancelled" },
      });
    });

    it("cancels a confirmed request, frees its seat and records who and why", async () => {
      const repo = await create();
      await repo.insert(buildStoredRequest());
      await repo.confirm(confirmInput(REQUEST_1));

      const cancelled = await repo.cancel(
        cancelInput(REQUEST_1, refundOf(15000)),
      );

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

    describe("balance", () => {
      async function confirmedQuoted() {
        const repo = await create();
        await repo.insert(buildStoredRequest(QUOTED));
        await repo.confirm(confirmInput(REQUEST_1));
        return repo;
      }

      it("records the one full balance of a confirmed request", async () => {
        const repo = await confirmedQuoted();

        const paid = await repo.recordBalance(balanceInput(REQUEST_1));

        expect(paid.ok && paid.value.status).toBe("confirmed");
        expect(paid.ok && paid.value.balance?.amount.toCentavos()).toBe(
          2_500_000,
        );
        const stored = await repo.findById(REQUEST_1);
        expect(stored?.balance).toEqual({
          amount: pesos(25000),
          paidOn: "2026-10-25",
          note: "efectivo",
          by: "duena@example.com",
          at: new Date("2026-10-25T15:00:00.000Z"),
        });
        expect(stored?.paidAmount?.toCentavos()).toBe(1_500_000);
      });

      it("refuses a second balance and keeps the first untouched", async () => {
        const repo = await confirmedQuoted();
        await repo.recordBalance(balanceInput(REQUEST_1));

        const again = await repo.recordBalance({
          ...balanceInput(REQUEST_1),
          paidOn: "2026-10-26",
          note: "otra vez",
        });

        expect(again).toEqual({
          ok: false,
          error: { kind: "balance-already-paid" },
        });
        expect((await repo.findById(REQUEST_1))?.balance?.note).toBe(
          "efectivo",
        );
      });

      it("refuses the balance of an unknown, pending or cancelled request", async () => {
        const repo = await create();
        await repo.insert(buildStoredRequest(QUOTED));

        expect(await repo.recordBalance(balanceInput(REQUEST_UNKNOWN))).toEqual(
          { ok: false, error: { kind: "not-found" } },
        );
        expect(await repo.recordBalance(balanceInput(REQUEST_1))).toEqual({
          ok: false,
          error: { kind: "illegal-transition", from: "pending_confirmation" },
        });
        await repo.cancel(cancelInput(REQUEST_1));
        expect(await repo.recordBalance(balanceInput(REQUEST_1))).toEqual({
          ok: false,
          error: { kind: "illegal-transition", from: "cancelled" },
        });
        expect((await repo.findById(REQUEST_1))?.balance).toBeNull();
      });
    });

    describe("cancelling with a refund", () => {
      async function confirmedQuoted(withBalance = false) {
        const repo = await create();
        await repo.insert(buildStoredRequest(QUOTED));
        await repo.confirm(confirmInput(REQUEST_1));
        if (withBalance) await repo.recordBalance(balanceInput(REQUEST_1));
        return repo;
      }

      it("records the refund next to the kept deposit and frees the seat", async () => {
        const repo = await confirmedQuoted();

        const cancelled = await repo.cancel(
          cancelInput(REQUEST_1, {
            amount: pesos(10000),
            refundedOn: "2026-10-23",
            note: "devolución parcial",
          }),
        );

        expect(cancelled.ok && cancelled.value.refund).toEqual({
          amount: pesos(10000),
          refundedOn: "2026-10-23",
          note: "devolución parcial",
        });
        const stored = await repo.findById(REQUEST_1);
        expect(stored?.status).toBe("cancelled");
        expect(stored?.paidAmount?.toCentavos()).toBe(1_500_000);
        expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(0);
      });

      it("accepts a $0 refund and one up to deposit plus balance", async () => {
        const zero = await confirmedQuoted();
        const none = await zero.cancel(cancelInput(REQUEST_1, refundOf(0)));
        expect(none.ok && none.value.refund?.amount.isZero()).toBe(true);

        const paidInFull = await confirmedQuoted(true);
        const all = await paidInFull.cancel(
          cancelInput(REQUEST_1, refundOf(40000, "2026-10-25")),
        );
        expect(all.ok && all.value.refund?.amount.toCentavos()).toBe(4_000_000);
        // The balance stays on the cancelled request as history.
        expect((await paidInFull.findById(REQUEST_1))?.balance?.note).toBe(
          "efectivo",
        );
      });

      it("refuses a refund above what was paid and leaves the request confirmed", async () => {
        const repo = await confirmedQuoted();

        const above = await repo.cancel(
          cancelInput(REQUEST_1, refundOf(15001)),
        );

        expect(above).toEqual({
          ok: false,
          error: {
            kind: "invalid-refund",
            field: "amount",
            code: "above-paid",
          },
        });
        expect((await repo.findById(REQUEST_1))?.status).toBe("confirmed");
        expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(1);
      });

      it("requires the refund of a confirmed request and refuses one on a pending request", async () => {
        const repo = await confirmedQuoted();
        expect(await repo.cancel(cancelInput(REQUEST_1))).toEqual({
          ok: false,
          error: { kind: "invalid-refund", field: "amount", code: "required" },
        });
        expect((await repo.findById(REQUEST_1))?.status).toBe("confirmed");

        await repo.insert(buildStoredRequest(SECOND));
        expect(await repo.cancel(cancelInput(REQUEST_2, refundOf(0)))).toEqual({
          ok: false,
          error: {
            kind: "invalid-refund",
            field: "amount",
            code: "not-refundable",
          },
        });
        const pending = await repo.cancel(cancelInput(REQUEST_2));
        expect(pending.ok && pending.value.refund).toBeNull();
      });

      it("checks the refund date against the payments", async () => {
        const repo = await confirmedQuoted();
        expect(
          await repo.cancel(cancelInput(REQUEST_1, refundOf(0, "2026-10-20"))),
        ).toMatchObject({
          error: { field: "refundedOn", code: "before-payment" },
        });
        expect(
          await repo.cancel(cancelInput(REQUEST_1, refundOf(0, "2026-10-29"))),
        ).toMatchObject({
          error: { field: "refundedOn", code: "future-date" },
        });
      });

      it("changes nothing when it is cancelled again", async () => {
        const repo = await confirmedQuoted();
        await repo.cancel(cancelInput(REQUEST_1, refundOf(5000)));
        const before = await repo.findById(REQUEST_1);

        const again = await repo.cancel(
          cancelInput(REQUEST_1, refundOf(15000)),
        );

        expect(again).toEqual({
          ok: false,
          error: { kind: "illegal-transition", from: "cancelled" },
        });
        expect(await repo.findById(REQUEST_1)).toEqual(before);
      });
    });

    describe("shared read state", () => {
      const first = {
        by: "agus@example.com",
        at: new Date("2026-10-25T09:30:00.000Z"),
      };
      const second = {
        by: "caro@example.com",
        at: new Date("2026-10-26T09:30:00.000Z"),
      };

      async function threeRequests() {
        const repo = await create();
        await repo.insert(buildStoredRequest());
        await repo.insert(buildStoredRequest(SECOND));
        await repo.insert(
          buildStoredRequest({
            id: REQUEST_3,
            publicId: "third-public-id-0000",
            email: "cleo@example.com",
            intensiveId: INTENSIVE_B,
          }),
        );
        return repo;
      }

      it("marks every unopened request of one intensivo and none of another", async () => {
        const repo = await threeRequests();

        expect(await repo.markSeenForIntensive(INTENSIVE_A, first)).toBe(2);
        expect(await repo.markSeenForIntensive(INTENSIVE_B, second)).toBe(1);
      });

      it("never overwrites an earlier mark and counts only what it just marked", async () => {
        const repo = await threeRequests();
        await repo.markSeenForIntensive(INTENSIVE_A, first);
        await repo.insert(
          buildStoredRequest({
            id: "5c3d4e5f-6071-4c8d-8e9f-2a3b4c5d6e06",
            publicId: "fourth-public-id-000",
            email: "dora@example.com",
          }),
        );

        expect(await repo.markSeenForIntensive(INTENSIVE_A, second)).toBe(1);
        expect(await repo.markSeenForIntensive(INTENSIVE_A, second)).toBe(0);
      });

      it("answers zero for an intensivo with no requests", async () => {
        const repo = await create();

        expect(await repo.markSeenForIntensive(INTENSIVE_A, first)).toBe(0);
      });

      it("changes nothing but the read state of the requests", async () => {
        const repo = await threeRequests();
        const before = await repo.listByIntensive(INTENSIVE_A, "all");
        const seats = await repo.confirmedSeats(INTENSIVE_A);

        await repo.markSeenForIntensive(INTENSIVE_A, first);

        expect(await repo.listByIntensive(INTENSIVE_A, "all")).toEqual(before);
        expect(await repo.confirmedSeats(INTENSIVE_A)).toBe(seats);
      });
    });
  });
}
