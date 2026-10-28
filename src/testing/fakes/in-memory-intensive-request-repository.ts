import { err, ok, type Result } from "~/modules/_shared";
import type {
  CancelInput,
  ConfirmInput,
  DuplicateRequest,
  IllegalTransition,
  IntensiveFull,
  IntensiveRequestRepository,
  RequestFilter,
  StoredIntensiveRequest,
} from "~/modules/intensive-requests";

type NotFound = { readonly kind: "not-found" };

/** Seat requests in memory, with the same rules as the database adapter. */
export class InMemoryIntensiveRequestRepository implements IntensiveRequestRepository {
  readonly requests = new Map<string, StoredIntensiveRequest>();

  insert(
    request: StoredIntensiveRequest,
  ): Promise<Result<void, DuplicateRequest>> {
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

  confirmedSeats(intensiveId: string): Promise<number> {
    return Promise.resolve(this.countConfirmed(intensiveId));
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

  cancel(
    input: CancelInput,
  ): Promise<Result<StoredIntensiveRequest, NotFound | IllegalTransition>> {
    const stored = this.requests.get(input.id);
    if (!stored) return Promise.resolve(err({ kind: "not-found" }));
    if (stored.status === "cancelled")
      return Promise.resolve(
        err({ kind: "illegal-transition", from: stored.status }),
      );
    const next: StoredIntensiveRequest = {
      ...stored,
      status: "cancelled",
      cancelReason: input.reason,
      cancelledBy: input.by,
      cancelledAt: input.at,
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
