import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import type {
  DeletePeriodOutcome,
  PeriodExists,
  StoredWorkshopPeriod,
  WorkshopPeriodRepository,
} from "~/modules/workshops/application/workshop-period-repository";
import type { PeriodKey } from "~/modules/workshops";

const copy = (value: StoredWorkshopPeriod): StoredWorkshopPeriod => ({
  ...value,
  project: {
    ...value.project,
    images: value.project.images.map((image) => ({
      ...image,
      asset: image.asset
        ? { ...image.asset, createdAt: new Date(image.asset.createdAt) }
        : null,
    })),
  },
  turnos: value.turnos.map((turno) => ({ ...turno })),
  materials: value.materials.map((material) => ({ ...material })),
  snapshot: {
    ...value.snapshot,
    teacher: { ...value.snapshot.teacher },
    percentage: value.snapshot.percentage && { ...value.snapshot.percentage },
  },
  openedAt: new Date(value.openedAt),
  audit: { ...value.audit, updatedAt: new Date(value.audit.updatedAt) },
});

/** In-memory transactional period store. Failure switches exercise atomic callers. */
export class InMemoryWorkshopPeriodRepository implements WorkshopPeriodRepository {
  readonly items = new Map<string, StoredWorkshopPeriod>();
  failNextInsert = false;
  failNextUpdate = false;
  failNextInsertAfterWrite = false;
  failNextUpdateAfterWrite = false;

  insert(value: StoredWorkshopPeriod): Promise<Result<void, PeriodExists>> {
    // Do not await between checking and claiming the composite key: competing
    // inserts execute this section atomically in the fake's event-loop turn.
    const existing = [...this.items.values()].find(
      (item) =>
        item.workshopId === value.workshopId && item.period === value.period,
    );
    if (existing)
      return Promise.resolve(
        err({ kind: "period-exists", periodId: existing.id }),
      );
    if (this.failNextInsert) {
      this.failNextInsert = false;
      return Promise.reject(new Error("composite period insert failed"));
    }
    this.items.set(value.id, copy(value));
    if (this.failNextInsertAfterWrite) {
      this.failNextInsertAfterWrite = false;
      this.items.delete(value.id);
      return Promise.reject(
        new Error("composite period insert failed after write"),
      );
    }
    return Promise.resolve(ok(undefined));
  }
  update(value: StoredWorkshopPeriod): Promise<Result<void, NotFound>> {
    const previous = this.items.get(value.id);
    if (!previous) return Promise.resolve(err({ kind: "not-found" }));
    if (this.failNextUpdate) {
      this.failNextUpdate = false;
      return Promise.reject(new Error("composite period update failed"));
    }
    this.items.set(value.id, copy(value));
    if (this.failNextUpdateAfterWrite) {
      this.failNextUpdateAfterWrite = false;
      this.items.set(value.id, previous);
      return Promise.reject(
        new Error("composite period update failed after write"),
      );
    }
    return Promise.resolve(ok(undefined));
  }
  findById(id: string): Promise<StoredWorkshopPeriod | null> {
    const value = this.items.get(id);
    return Promise.resolve(value ? copy(value) : null);
  }
  findByWorkshopPeriod(
    workshopId: string,
    period: PeriodKey,
  ): Promise<StoredWorkshopPeriod | null> {
    const value = [...this.items.values()].find(
      (item) => item.workshopId === workshopId && item.period === period,
    );
    return Promise.resolve(value ? copy(value) : null);
  }
  listForWorkshop(
    workshopId: string,
  ): Promise<readonly StoredWorkshopPeriod[]> {
    return Promise.resolve(
      [...this.items.values()]
        .filter((item) => item.workshopId === workshopId)
        .sort(
          (a, b) =>
            b.period.localeCompare(a.period) || a.id.localeCompare(b.id),
        )
        .map(copy),
    );
  }
  async latestBefore(
    workshopId: string,
    period: PeriodKey,
  ): Promise<StoredWorkshopPeriod | null> {
    return (
      (await this.listForWorkshop(workshopId)).find(
        (item) => item.period < period,
      ) ?? null
    );
  }
  isTurnoUsed(turnoId: string): Promise<boolean> {
    return Promise.resolve(
      [...this.items.values()].some((period) =>
        period.turnos.some((turno) => turno.turnoId === turnoId),
      ),
    );
  }
  deleteDraft(id: string): Promise<DeletePeriodOutcome> {
    const item = this.items.get(id);
    if (!item) return Promise.resolve("not-found");
    if (item.status !== "draft") return Promise.resolve("not-draft");
    this.items.delete(id);
    return Promise.resolve("deleted");
  }
}
