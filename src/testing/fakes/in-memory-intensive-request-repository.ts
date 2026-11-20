import { err, ok, type Money, type Result } from "~/modules/_shared";
import {
  checkRefund,
  type BalanceAlreadyPaid,
  type BalanceInput,
  type CancelInput,
  type ConfirmInput,
  type DuplicateRequest,
  type IllegalTransition,
  type IntensiveFull,
  type IntensiveRequestRepository,
  type OwedPayment,
  type InvalidRequestRefund,
  type RequestFilter,
  type StoredIntensiveRequest,
  type UnknownProject,
} from "~/modules/intensive-requests";

type NotFound = { readonly kind: "not-found" };

/**
 * Seat requests in memory, with the same rules as the database adapter,
 * except that it copies no project materials and moves no stock: those are
 * the adapter's transaction, proven against the real database.
 */
export class InMemoryIntensiveRequestRepository implements IntensiveRequestRepository {
  readonly requests = new Map<string, StoredIntensiveRequest>();
  /** Who opened each request first and when; absent while unread. */
  readonly seenMarks = new Map<string, { by: string; at: Date }>();

  insert(
    request: StoredIntensiveRequest,
  ): Promise<Result<void, DuplicateRequest | UnknownProject>> {
    if (this.requests.has(request.id))
      return Promise.reject(new Error("intensive request already exists"));
    const live = [...this.requests.values()].some(
      (stored) =>
        stored.intensiveId === request.intensiveId &&
        stored.email === request.email &&
        stored.status !== "cancelled",
    );
    if (live) return Promise.resolve(err({ kind: "duplicate-request" }));
    this.requests.set(request.id, request);
    return Promise.resolve(ok(undefined));
  }

  findById(id: string): Promise<StoredIntensiveRequest | null> {
    return Promise.resolve(this.requests.get(id) ?? null);
  }

  findByPublicId(publicId: string): Promise<StoredIntensiveRequest | null> {
    const found = [...this.requests.values()].find(
      (stored) => stored.publicId === publicId,
    );
    return Promise.resolve(found ?? null);
  }

  listByIntensive(
    intensiveId: string,
    filter: RequestFilter,
  ): Promise<readonly StoredIntensiveRequest[]> {
    const selected = [...this.requests.values()].filter(
      (stored) =>
        stored.intensiveId === intensiveId &&
        (filter === "all" || stored.status === filter),
    );
    selected.sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    return Promise.resolve(selected);
  }

  listOwed(email?: string): Promise<readonly OwedPayment[]> {
    const owed: { payment: OwedPayment; createdAt: Date }[] = [];
    for (const stored of this.requests.values()) {
      if (email !== undefined && stored.email.trim().toLowerCase() !== email)
        continue;
      const base = {
        requestId: stored.id,
        intensiveId: stored.intensiveId,
        email: stored.email.trim().toLowerCase(),
      };
      const payment = (kind: OwedPayment["kind"], amount: Money) =>
        owed.push({
          payment: { ...base, kind, amount },
          createdAt: stored.createdAt,
        });
      if (stored.status === "pending_confirmation") {
        // A request made before projects has no quote: its workshop prices it.
        if (stored.deposit !== null && !stored.deposit.isZero())
          payment("deposit", stored.deposit);
      } else if (
        stored.status === "confirmed" &&
        stored.balance === null &&
        stored.price !== null &&
        stored.deposit !== null &&
        stored.price.compare(stored.deposit) > 0
      )
        payment("balance", stored.price.subtract(stored.deposit));
    }
    owed.sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        (a.payment.requestId < b.payment.requestId ? -1 : 1),
    );
    return Promise.resolve(owed.map(({ payment }) => payment));
  }

  confirmedSeats(intensiveId: string): Promise<number> {
    return Promise.resolve(this.countConfirmed(intensiveId));
  }

  markSeenForIntensive(
    intensiveId: string,
    change: { readonly by: string; readonly at: Date },
  ): Promise<number> {
    let marked = 0;
    for (const stored of this.requests.values()) {
      if (stored.intensiveId !== intensiveId || this.seenMarks.has(stored.id))
        continue;
      this.seenMarks.set(stored.id, { by: change.by, at: change.at });
      marked += 1;
    }
    return Promise.resolve(marked);
  }

  confirm(
    input: ConfirmInput,
  ): Promise<
    Result<StoredIntensiveRequest, NotFound | IllegalTransition | IntensiveFull>
  > {
    const stored = this.requests.get(input.id);
    if (!stored) return Promise.resolve(err({ kind: "not-found" }));
    if (stored.status !== "pending_confirmation")
      return Promise.resolve(
        err({ kind: "illegal-transition", from: stored.status }),
      );
    if (this.countConfirmed(stored.intensiveId) >= input.capacity)
      return Promise.resolve(err({ kind: "intensive-full" }));
    const next: StoredIntensiveRequest = {
      ...stored,
      status: "confirmed",
      paidAmount: input.amount,
      paidOn: input.paidOn,
      paymentNote: input.note,
      confirmedBy: input.by,
      confirmedAt: input.at,
    };
    this.requests.set(next.id, next);
    return Promise.resolve(ok(next));
  }

  recordBalance(
    input: BalanceInput,
  ): Promise<
    Result<
      StoredIntensiveRequest,
      NotFound | IllegalTransition | BalanceAlreadyPaid
    >
  > {
    const stored = this.requests.get(input.id);
    if (!stored) return Promise.resolve(err({ kind: "not-found" }));
    if (stored.status !== "confirmed")
      return Promise.resolve(
        err({ kind: "illegal-transition", from: stored.status }),
      );
    if (stored.balance !== null)
      return Promise.resolve(err({ kind: "balance-already-paid" }));
    const next: StoredIntensiveRequest = {
      ...stored,
      balance: {
        amount: input.amount,
        paidOn: input.paidOn,
        note: input.note,
        by: input.by,
        at: input.at,
      },
    };
    this.requests.set(next.id, next);
    return Promise.resolve(ok(next));
  }

  cancel(
    input: CancelInput,
  ): Promise<
    Result<
      StoredIntensiveRequest,
      NotFound | IllegalTransition | InvalidRequestRefund
    >
  > {
    const stored = this.requests.get(input.id);
    if (!stored) return Promise.resolve(err({ kind: "not-found" }));
    if (stored.status === "cancelled")
      return Promise.resolve(
        err({ kind: "illegal-transition", from: stored.status }),
      );
    const refund = checkRefund(
      {
        status: stored.status,
        deposit: stored.paidAmount,
        depositPaidOn: stored.paidOn,
        balance: stored.balance?.amount ?? null,
        balancePaidOn: stored.balance?.paidOn ?? null,
      },
      input.refund,
      input.today,
    );
    if (!refund.ok) return Promise.resolve(refund);
    const next: StoredIntensiveRequest = {
      ...stored,
      status: "cancelled",
      cancelReason: input.reason,
      cancelledBy: input.by,
      cancelledAt: input.at,
      refund: input.refund ?? null,
    };
    this.requests.set(next.id, next);
    return Promise.resolve(ok(next));
  }

  private countConfirmed(intensiveId: string): number {
    return [...this.requests.values()].filter(
      (stored) =>
        stored.intensiveId === intensiveId && stored.status === "confirmed",
    ).length;
  }
}
