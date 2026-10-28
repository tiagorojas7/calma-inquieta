import type {
  PrivateEventRequestData,
  PrivateEventStatus,
} from "../domain/private-event-core";

export interface StoredPrivateEvent extends PrivateEventRequestData {
  readonly id: string;
  readonly status: PrivateEventStatus;
  readonly createdAt: Date;
  /** Admin email of the last status change; null while the request is new. */
  readonly statusChangedBy: string | null;
  readonly statusChangedAt: Date | null;
}

export type PrivateEventFilter = PrivateEventStatus | "all";

/** Persistence port for private-event requests. */
export interface PrivateEventRepository {
  /** Rejects on a duplicate id. */
  insert(request: StoredPrivateEvent): Promise<void>;
  findById(id: string): Promise<StoredPrivateEvent | null>;
  /** Newest first, then by id. */
  list(filter: PrivateEventFilter): Promise<readonly StoredPrivateEvent[]>;
  /** Returns the updated request, or null when the id is unknown. */
  setStatus(
    id: string,
    status: PrivateEventStatus,
    change: { readonly by: string; readonly at: Date },
  ): Promise<StoredPrivateEvent | null>;
}
