import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import type { WorkshopStatus } from "~/modules/workshops";
import type {
  DeleteDraftOutcome,
  MonthlyWorkshopRepository,
  SlugConflict,
  StoredMonthlyWorkshop,
} from "~/modules/workshops/application/monthly-workshop-repository";

const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

export class InMemoryMonthlyWorkshopRepository implements MonthlyWorkshopRepository {
  readonly items = new Map<string, StoredMonthlyWorkshop>();

  private slugTakenByAnother(candidate: StoredMonthlyWorkshop): boolean {
    return [...this.items.values()].some(
      (stored) => stored.id !== candidate.id && stored.slug === candidate.slug,
    );
  }

  insert(value: StoredMonthlyWorkshop): Promise<Result<void, SlugConflict>> {
    if (this.items.has(value.id))
      return Promise.reject(new Error("workshop already exists"));
    if (this.slugTakenByAnother(value))
      return Promise.resolve(err({ kind: "slug-conflict" }));
    this.items.set(value.id, value);
    return Promise.resolve(ok(undefined));
  }

  update(
    value: StoredMonthlyWorkshop,
  ): Promise<Result<void, SlugConflict | NotFound>> {
    if (!this.items.has(value.id))
      return Promise.resolve(err({ kind: "not-found" }));
    if (this.slugTakenByAnother(value))
      return Promise.resolve(err({ kind: "slug-conflict" }));
    this.items.set(value.id, value);
    return Promise.resolve(ok(undefined));
  }

  findById(id: string): Promise<StoredMonthlyWorkshop | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findBySlug(slug: string): Promise<StoredMonthlyWorkshop | null> {
    return Promise.resolve(
      [...this.items.values()].find((stored) => stored.slug === slug) ?? null,
    );
  }

  list(
    statuses: readonly WorkshopStatus[],
  ): Promise<readonly StoredMonthlyWorkshop[]> {
    const items = [...this.items.values()]
      .filter((item) => statuses.includes(item.status))
      .sort((a, b) => compareText(a.name, b.name) || compareText(a.id, b.id));
    return Promise.resolve(items);
  }

  deleteDraft(id: string): Promise<DeleteDraftOutcome> {
    const item = this.items.get(id);
    if (!item) return Promise.resolve("not-found");
    if (item.status !== "draft") return Promise.resolve("not-draft");
    this.items.delete(id);
    return Promise.resolve("deleted");
  }
}
