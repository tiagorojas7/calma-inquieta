import type { Audit, Money, NotFound, Result } from "~/modules/_shared";
import type { ImageUseDraft } from "~/modules/media";
import type { IntensiveStatus, Percentage } from "./contracts";

/**
 * An intensivo as persisted: references instead of joined read models. The
 * service resolves the teacher and the images; the gallery is stored in
 * position order (the cover first).
 */
export interface StoredIntensive {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly teacherId: string | null;
  /** Null unless a third-party teacher is assigned. */
  readonly percentage: Percentage | null;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly images: readonly ImageUseDraft[];
  readonly status: IntensiveStatus;
  readonly audit: Audit;
}

/** The slug is already taken by another intensivo, archived ones included. */
export interface SlugConflict {
  readonly kind: "slug-conflict";
}

export type DeleteDraftOutcome = "deleted" | "not-draft" | "not-found";

/**
 * Persistence port for intensivos. Uniqueness is typed, not thrown: an
 * adapter returns a slug conflict (Postgres: SQLSTATE 23505 on the slug
 * index) so the service can map a lost race to the same result as its
 * pre-check. A duplicate id is a defect and rejects.
 */
export interface IntensiveRepository {
  insert(intensive: StoredIntensive): Promise<Result<void, SlugConflict>>;
  /** Replaces every field, the gallery included, in one atomic write. */
  update(
    intensive: StoredIntensive,
  ): Promise<Result<void, SlugConflict | NotFound>>;
  findById(id: string): Promise<StoredIntensive | null>;
  /** Exact match, whatever the status. */
  findBySlug(slug: string): Promise<StoredIntensive | null>;
  /**
   * Intensivos in any of the given statuses (none: empty). Order: event date
   * descending, start time descending, then id ascending. Names are not part
   * of the order, so it never depends on a collation; ids compare by code
   * unit (an adapter must use a byte-wise collation or a uuid column).
   */
  list(
    statuses: readonly IntensiveStatus[],
  ): Promise<readonly StoredIntensive[]>;
  /** Deletes only a draft, atomically with the status check. */
  deleteDraft(id: string): Promise<DeleteDraftOutcome>;
}
