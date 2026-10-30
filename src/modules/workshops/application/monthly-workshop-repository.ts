import type { Audit, Money, NotFound, Result } from "~/modules/_shared";
import type { ImageUseDraft } from "~/modules/media";
import type { Percentage, WorkshopStatus } from "./contracts";

export interface StoredMonthlyWorkshop {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly technique: string;
  readonly defaultFee: Money;
  readonly teacherId: string | null;
  readonly percentage: Percentage | null;
  /** The gallery in position order; the first image is the cover. */
  readonly images: readonly ImageUseDraft[];
  readonly status: WorkshopStatus;
  readonly audit: Audit;
}
export interface SlugConflict {
  readonly kind: "slug-conflict";
}
export type DeleteDraftOutcome = "deleted" | "not-draft" | "not-found";
export interface MonthlyWorkshopRepository {
  insert(value: StoredMonthlyWorkshop): Promise<Result<void, SlugConflict>>;
  update(
    value: StoredMonthlyWorkshop,
  ): Promise<Result<void, SlugConflict | NotFound>>;
  findById(id: string): Promise<StoredMonthlyWorkshop | null>;
  findBySlug(slug: string): Promise<StoredMonthlyWorkshop | null>;
  list(
    statuses: readonly WorkshopStatus[],
  ): Promise<readonly StoredMonthlyWorkshop[]>;
  deleteDraft(id: string): Promise<DeleteDraftOutcome>;
}
