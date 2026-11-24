import type {
  PrivateEventRequestData,
  PrivateEventStatus,
} from "../domain/private-event-core";
import type { PrivateEventNoveltyReader } from "./private-event-novelty-reader";

export interface StoredPrivateEvent extends PrivateEventRequestData {
  readonly id: string;
  readonly status: PrivateEventStatus;
  readonly createdAt: Date;
  /** Admin email of the last status change; null while the request is new. */
  readonly statusChangedBy: string | null;
  readonly statusChangedAt: Date | null;
}

export type PrivateEventFilter = PrivateEventStatus | "all";

/** The shared read state: first opened now, or already read. */
export type PrivateEventSeenMark = "seen" | "already-seen";

/** Persistence port for private-event requests. */
export interface PrivateEventRepository extends PrivateEventNoveltyReader {
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
  /**
   * Marks the request read for both owners. The first call stamps who and
   * when; later calls change nothing and never overwrite it. Returns null
   * when the id is unknown. Nothing else about the request changes.
   */
  markSeen(
    id: string,
    change: { readonly by: string; readonly at: Date },
  ): Promise<PrivateEventSeenMark | null>;
}
