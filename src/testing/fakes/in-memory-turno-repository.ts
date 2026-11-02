import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import {
  compareTurnos,
  turnoLabelKey,
} from "~/modules/workshops/domain/turno-core";
import type {
  StoredTurno,
  TurnoLabelConflict,
  TurnoMutation,
  TurnoRepository,
} from "~/modules/workshops/application/turno-repository";
import type {
  MonthlyWorkshopRepository,
  StoredMonthlyWorkshop,
} from "~/modules/workshops/application/monthly-workshop-repository";

export class InMemoryTurnoRepository implements TurnoRepository {
  readonly items = new Map<string, StoredTurno>();
  /** The default-capacity rows an insert wrote into open months. */
  readonly joined: { turnoId: string; periodId: string; capacity: number }[] =
    [];
  private readonly workshops:
    Pick<MonthlyWorkshopRepository, "update"> | undefined;

  constructor(workshops?: Pick<MonthlyWorkshopRepository, "update">) {
    this.workshops = workshops;
  }
  private conflict(value: StoredTurno): boolean {
    return [...this.items.values()].some(
      (item) =>
        item.id !== value.id &&
        item.workshopId === value.workshopId &&
        turnoLabelKey(item.label) === turnoLabelKey(value.label),
    );
  }
  insert(value: StoredTurno): Promise<Result<void, TurnoLabelConflict>> {
    if (this.items.has(value.id))
      return Promise.reject(new Error("turno already exists"));
    if (this.conflict(value))
      return Promise.resolve(err({ kind: "label-conflict" }));
    this.items.set(value.id, {
      ...value,
      labelKey: turnoLabelKey(value.label),
    });
    return Promise.resolve(ok(undefined));
  }
  update(
    value: StoredTurno,
  ): Promise<Result<void, TurnoLabelConflict | NotFound>> {
    if (!this.items.has(value.id))
      return Promise.resolve(err({ kind: "not-found" }));
    if (this.conflict(value))
      return Promise.resolve(err({ kind: "label-conflict" }));
    this.items.set(value.id, {
      ...value,
      labelKey: turnoLabelKey(value.label),
    });
    return Promise.resolve(ok(undefined));
  }
  findById(id: string): Promise<StoredTurno | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }
  listForWorkshop(workshopId: string): Promise<readonly StoredTurno[]> {
    return Promise.resolve(
      [...this.items.values()]
        .filter((item) => item.workshopId === workshopId)
        .sort(compareTurnos),
    );
  }
  countActiveForWorkshop(workshopId: string): Promise<number> {
    return Promise.resolve(
      [...this.items.values()].filter(
        (item) => item.workshopId === workshopId && item.active,
      ).length,
    );
  }
  delete(id: string): Promise<Result<void, NotFound>> {
    if (!this.items.has(id)) return Promise.resolve(err({ kind: "not-found" }));
    this.items.delete(id);
    return Promise.resolve(ok(undefined));
  }
  async mutate(
    workshop: StoredMonthlyWorkshop,
    mutation: TurnoMutation,
  ): Promise<Result<void, TurnoLabelConflict | NotFound>> {
    const before = new Map(this.items);
    const joinedBefore = this.joined.length;
    const changed =
      mutation.kind === "insert"
        ? await this.insert(mutation.value)
        : mutation.kind === "update"
          ? await this.update(mutation.value)
          : await this.delete(mutation.id);
    if (!changed.ok) return changed;
    if (mutation.kind === "insert")
      for (const join of mutation.joinPeriods ?? [])
        this.joined.push({ turnoId: mutation.value.id, ...join });
    if (!this.workshops) return changed;
    const audit = await this.workshops.update(workshop);
    if (audit.ok) return changed;
    this.joined.length = joinedBefore;
    this.items.clear();
    for (const [id, value] of before) this.items.set(id, value);
    return err({ kind: "not-found" });
  }
}
