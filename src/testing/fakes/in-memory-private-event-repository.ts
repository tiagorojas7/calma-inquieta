import type {
  PrivateEventFilter,
  PrivateEventRepository,
  PrivateEventSeenMark,
  StoredPrivateEvent,
  UnseenPrivateEvent,
} from "~/modules/private-events";

/** Private-event requests in memory, ordered like the database adapter. */
export class InMemoryPrivateEventRepository implements PrivateEventRepository {
  readonly requests = new Map<string, StoredPrivateEvent>();
  /** Who opened each request first and when; absent while unread. */
  readonly seenMarks = new Map<string, { by: string; at: Date }>();

  insert(request: StoredPrivateEvent): Promise<void> {
    if (this.requests.has(request.id))
      return Promise.reject(new Error("private event already exists"));
    this.requests.set(request.id, request);
    return Promise.resolve();
  }

  findById(id: string): Promise<StoredPrivateEvent | null> {
    return Promise.resolve(this.requests.get(id) ?? null);
  }

  list(filter: PrivateEventFilter): Promise<readonly StoredPrivateEvent[]> {
    const selected = [...this.requests.values()].filter(
      (request) => filter === "all" || request.status === filter,
    );
    selected.sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    return Promise.resolve(selected);
  }

  unseen(): Promise<readonly UnseenPrivateEvent[]> {
    return Promise.resolve(
      [...this.requests.values()]
        .filter((request) => !this.seenMarks.has(request.id))
        .sort(
          (a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime() ||
            (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        )
        .map(({ id, fullName, desiredDate, createdAt }) => ({
          id,
          fullName,
          desiredDate,
          createdAt,
        })),
    );
  }

  markSeen(
    id: string,
    change: { readonly by: string; readonly at: Date },
  ): Promise<PrivateEventSeenMark | null> {
    if (!this.requests.has(id)) return Promise.resolve(null);
    if (this.seenMarks.has(id)) return Promise.resolve("already-seen");
    this.seenMarks.set(id, { by: change.by, at: change.at });
    return Promise.resolve("seen");
  }

  setStatus(
    id: string,
    status: StoredPrivateEvent["status"],
    change: { readonly by: string; readonly at: Date },
  ): Promise<StoredPrivateEvent | null> {
    const stored = this.requests.get(id);
    if (!stored) return Promise.resolve(null);
    const next: StoredPrivateEvent = {
      ...stored,
      status,
      statusChangedBy: change.by,
      statusChangedAt: change.at,
    };
    this.requests.set(id, next);
    return Promise.resolve(next);
  }
}
