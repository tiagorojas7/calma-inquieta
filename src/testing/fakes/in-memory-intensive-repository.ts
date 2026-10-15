import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import type { IntensiveStatus } from "~/modules/workshops";
import type {
  DeleteDraftOutcome,
  IntensiveRepository,
  SlugConflict,
  StoredIntensive,
} from "~/modules/workshops/application/intensive-repository";

const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/** Intensivos in memory, enforcing the same constraints as the database. */
export class InMemoryIntensiveRepository implements IntensiveRepository {
  readonly items = new Map<string, StoredIntensive>();

  private slugTakenByAnother(candidate: StoredIntensive): boolean {
    return [...this.items.values()].some(
      (stored) => stored.id !== candidate.id && stored.slug === candidate.slug,
    );
  }

  insert(intensive: StoredIntensive): Promise<Result<void, SlugConflict>> {
    if (this.items.has(intensive.id))
      return Promise.reject(new Error("intensive already exists"));
    if (this.slugTakenByAnother(intensive))
      return Promise.resolve(err({ kind: "slug-conflict" }));
    this.items.set(intensive.id, intensive);
    return Promise.resolve(ok(undefined));
  }

  update(
    intensive: StoredIntensive,
  ): Promise<Result<void, SlugConflict | NotFound>> {
    if (!this.items.has(intensive.id))
      return Promise.resolve(err({ kind: "not-found" }));
    if (this.slugTakenByAnother(intensive))
      return Promise.resolve(err({ kind: "slug-conflict" }));
    this.items.set(intensive.id, intensive);
    return Promise.resolve(ok(undefined));
  }

  findById(id: string): Promise<StoredIntensive | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findBySlug(slug: string): Promise<StoredIntensive | null> {
    const match = [...this.items.values()].find(
      (stored) => stored.slug === slug,
    );
    return Promise.resolve(match ?? null);
  }

  list(
    statuses: readonly IntensiveStatus[],
  ): Promise<readonly StoredIntensive[]> {
    const selected = [...this.items.values()].filter((stored) =>
      statuses.includes(stored.status),
    );
    selected.sort(
      (a, b) =>
        compareText(b.eventDate, a.eventDate) ||
        compareText(b.startsAt, a.startsAt) ||
        compareText(a.id, b.id),
    );
    return Promise.resolve(selected);
  }

  deleteDraft(id: string): Promise<DeleteDraftOutcome> {
    const stored = this.items.get(id);
    if (!stored) return Promise.resolve("not-found");
    if (stored.status !== "draft") return Promise.resolve("not-draft");
    this.items.delete(id);
    return Promise.resolve("deleted");
  }
}
