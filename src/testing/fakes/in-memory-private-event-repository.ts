import type {
  PrivateEventFilter,
  PrivateEventRepository,
  StoredPrivateEvent,
} from "~/modules/private-events";

/** Private-event requests in memory, ordered like the database adapter. */
export class InMemoryPrivateEventRepository implements PrivateEventRepository {
  readonly requests = new Map<string, StoredPrivateEvent>();

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
