import {
  err,
  ok,
  parseWholePesos,
  Money,
  type AdminFailure,
  type Clock,
  type NotFound,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  addMonths,
  cordobaMonthOf,
  effectivePeriodStatus,
  parsePeriodKey as parseKey,
  periodInRange,
  transitionPeriod,
  type PeriodKey as CorePeriodKey,
} from "../domain/period-core";
import type { TeacherLookup } from "~/modules/teachers";
import type { Material, MaterialLookup } from "~/modules/materials";
import type { MonthlyWorkshopRepository } from "./monthly-workshop-repository";
import type { WorkshopPeriodLookup } from "./monthly-workshop-service";
import type { TurnoRepository } from "./turno-repository";
import type { WorkshopPeriodRepository } from "./workshop-period-repository";
import { parsePercentage } from "./contracts";
import type {
  ConfirmedSeatsLookup,
  EnabledMaterial,
  OpenMonthRule,
  PeriodField,
  PeriodKey,
  PeriodStatus,
  WorkshopPeriod,
  WorkshopPeriodsService,
} from "./contracts";

type MaybeActor = AdminActor | null | undefined;
export type WorkshopPeriodUseCases = {
  [K in keyof WorkshopPeriodsService]: WorkshopPeriodsService[K] extends (
    actor: AdminActor,
    ...rest: infer R
  ) => infer O
    ? (actor: MaybeActor, ...rest: R) => O
    : never;
};
/** B5's read-only seam backed by period capacity/history rows. */
export function createPeriodTurnoUsageLookup(
  repository: WorkshopPeriodRepository,
): { isUsed(turnoId: string): Promise<boolean> } {
  return { isUsed: (turnoId) => repository.isTurnoUsed(turnoId) };
}

/** B4's read-only deletion-protection seam backed by period history rows. */
export function createWorkshopPeriodLookup(
  repository: WorkshopPeriodRepository,
): WorkshopPeriodLookup {
  return {
    hasPeriods: async (workshopId) =>
      (await repository.listForWorkshop(workshopId)).length > 0,
    openPeriodIds: async (workshopId, fromPeriod) =>
      (await repository.listForWorkshop(workshopId))
        .filter((item) => item.status === "open" && item.period >= fromPeriod)
        .map((item) => item.id),
  };
}

export interface WorkshopPeriodServiceDeps {
  readonly repository: WorkshopPeriodRepository;
  readonly workshops: MonthlyWorkshopRepository;
  readonly turnos: TurnoRepository;
  readonly teachers: TeacherLookup;
  readonly materials: MaterialLookup;
  readonly confirmedSeats: ConfirmedSeatsLookup;
  readonly clock: Clock;
  readonly newId?: () => string;
}
const notFound: NotFound = { kind: "not-found" };
const asPeriod = (period: CorePeriodKey): PeriodKey => period;

export function createWorkshopPeriodsService(
  deps: WorkshopPeriodServiceDeps,
): WorkshopPeriodUseCases {
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: deps.clock.now(),
  });
  const effective = (value: WorkshopPeriod): WorkshopPeriod => ({
    ...value,
    status: effectivePeriodStatus(
      value.status,
      value.period as CorePeriodKey,
      deps.clock.now(),
    ),
  });
  const load = async (
    actor: MaybeActor,
    id: string,
  ): Promise<
    Result<
      { actor: AdminActor; value: WorkshopPeriod },
      AdminFailure | NotFound
    >
  > => {
    const admin = requireAdminActor(actor);
    if (!admin.ok) return admin;
    const value = await deps.repository.findById(id);
    return value ? ok({ actor: admin.value, value }) : err(notFound);
  };
  const closed = (value: WorkshopPeriod) =>
    effective(value).status === "closed";

  return {
    async list(actor, workshopId) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const current = asPeriod(cordobaMonthOf(deps.clock.now()));
      const periods = await deps.repository.listForWorkshop(workshopId);
      const latest = periods[0];
      const candidate = latest
        ? addMonths(latest.period as CorePeriodKey, 1)
        : current;
      const suggestedNext = candidate < current ? current : candidate;
      return ok({
        periods: periods.map((item) => {
          const value = effective(item);
          return {
            id: value.id,
            period: value.period,
            status: value.status,
            fee: value.fee,
            totalCapacity: value.turnos.reduce(
              (sum, turno) => sum + turno.capacity,
              0,
            ),
            activeTurnos: value.turnos.filter((turno) => turno.turnoActive)
              .length,
          };
        }),
        suggestedNext: periodInRange(
          suggestedNext as CorePeriodKey,
          current as CorePeriodKey,
        )
          ? asPeriod(suggestedNext as CorePeriodKey)
          : null,
      });
    },
    async get(actor, workshopId, period) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const value = await deps.repository.findByWorkshopPeriod(
        workshopId,
        period,
      );
      return value ? ok(effective(value)) : err(notFound);
    },
    async openMonth(actor, workshopId, submitted) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const parsed = parseKey(submitted);
      const current = cordobaMonthOf(deps.clock.now());
      const periodIssues: {
        field: "period";
        code: "invalid-format" | "out-of-range";
      }[] = !parsed.ok
        ? [{ field: "period", code: "invalid-format" }]
        : !periodInRange(parsed.value, current)
          ? [{ field: "period", code: "out-of-range" }]
          : [];
      const workshop = await deps.workshops.findById(workshopId);
      if (!workshop) return err(notFound);
      const turnos = await deps.turnos.listForWorkshop(workshopId);
      const teacher = workshop.teacherId
        ? (await deps.teachers.findByIds([workshop.teacherId])).get(
            workshop.teacherId,
          )
        : undefined;
      const rules: OpenMonthRule[] = [];
      if (workshop.status !== "published" && workshop.status !== "paused")
        rules.push("workshop-status");
      if (!teacher?.active) rules.push("teacher");
      if (
        teacher?.modality === "third_party" &&
        (workshop.percentage === null ||
          !Number.isInteger(workshop.percentage.basisPoints) ||
          workshop.percentage.basisPoints < 0 ||
          workshop.percentage.basisPoints > 10000)
      )
        rules.push("percentage");
      if (!turnos.some((turno) => turno.active)) rules.push("active-turno");
      if (periodIssues.length)
        return err({
          kind: "invalid",
          issues: periodIssues,
          ...(rules.length ? { rules } : {}),
        });
      if (rules.length) return err({ kind: "rules-unmet", rules });
      if (!parsed.ok) throw new Error("unreachable invalid period");
      const period: PeriodKey = asPeriod(parsed.value);
      const exists = await deps.repository.findByWorkshopPeriod(
        workshopId,
        period,
      );
      if (exists) return err({ kind: "period-exists", periodId: exists.id });
      // All required facts have passed: teacher exists and is active.
      if (!teacher) throw new Error("unreachable missing teacher");
      const source = await deps.repository.latestBefore(workshopId, period);
      // Period project images stay deferred, so a successor copies none; the
      // taller gallery lives on the workshop and never blocks a new month.
      const sourceMaterialIds = source?.materials.map(
        (material) => material.id,
      );
      const currentMaterials: ReadonlyMap<string, Material> =
        sourceMaterialIds?.length
          ? await deps.materials.findByIds(sourceMaterialIds)
          : new Map<string, Material>();
      const materials: EnabledMaterial[] = (sourceMaterialIds ?? []).flatMap(
        (id) => {
          const material = currentMaterials.get(id);
          return material?.active && material.available
            ? [
                {
                  id: material.id,
                  name: material.name,
                  active: material.active,
                  available: material.available,
                },
              ]
            : [];
        },
      );
      const sourceCapacities = new Map(
        source?.turnos.map((turno) => [turno.turnoId, turno.capacity]),
      );
      const now = deps.clock.now();
      const value: WorkshopPeriod = {
        id: newId(),
        workshopId,
        period,
        fee: source?.fee ?? workshop.defaultFee,
        materialsRequired: source?.materialsRequired ?? false,
        status: "draft",
        project: {
          title: source?.project.title ?? "",
          description: source?.project.description ?? "",
          images: [],
        },
        turnos: turnos
          .filter((turno) => turno.active)
          .map((turno) => ({
            turnoId: turno.id,
            label: turno.label,
            weekday: turno.weekday,
            startsAt: turno.startsAt,
            endsAt: turno.endsAt,
            turnoActive: true,
            capacity: sourceCapacities.get(turno.id) ?? turno.defaultCapacity,
          })),
        materials,
        snapshot: {
          teacher: {
            id: teacher.id,
            name: teacher.name,
            active: teacher.active,
          },
          modality: teacher.modality,
          percentage: teacher.modality === "own" ? null : workshop.percentage,
        },
        openedBy: admin.value.email,
        openedAt: now,
        audit: { updatedBy: admin.value.email, updatedAt: now },
      };
      const inserted = await deps.repository.insert(value);
      return inserted.ok ? ok(value) : err(inserted.error);
    },
    async update(actor, id, draft) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      if (closed(loaded.value.value)) return err({ kind: "period-closed" });
      if (draft.projectImages.length) return err({ kind: "unavailable" });
      if (new Set(draft.materialIds).size !== draft.materialIds.length)
        return err({
          kind: "invalid",
          issues: [{ field: "materialIds", code: "duplicate" }],
        });
      const fee = parseWholePesos(draft.fee.trim());
      const issues: {
        field: PeriodField;
        code:
          | "required"
          | "invalid-format"
          | "not-whole-pesos"
          | "too-many-decimals"
          | "out-of-range"
          | "unknown-reference"
          | "not-selectable"
          | "percentage-not-applicable";
      }[] = [];
      if (!fee.ok) issues.push({ field: "fee", code: fee.error });
      else if (fee.value.compare(Money.zero()) <= 0)
        issues.push({ field: "fee", code: "out-of-range" });
      const offered = new Set(
        loaded.value.value.turnos.map((turno) => turno.turnoId),
      );
      const seen = new Set<string>();
      for (const capacity of draft.capacities) {
        const amount = Number(capacity.capacity);
        if (!offered.has(capacity.turnoId))
          issues.push({ field: "capacities", code: "unknown-reference" });
        else if (seen.has(capacity.turnoId))
          issues.push({ field: "capacities", code: "out-of-range" });
        else if (
          !/^\d+$/.test(capacity.capacity.trim()) ||
          !Number.isSafeInteger(amount) ||
          amount < 1
        )
          issues.push({ field: "capacities", code: "out-of-range" });
        seen.add(capacity.turnoId);
      }
      for (const turnoId of offered)
        if (!seen.has(turnoId))
          issues.push({ field: "capacities", code: "required" });
      if (draft.capacities.length === 0 && offered.size === 0)
        issues.push({ field: "capacities", code: "required" });

      const percentage =
        loaded.value.value.snapshot.modality === "third_party"
          ? parsePercentage(draft.snapshotPercentage)
          : null;
      if (percentage && !percentage.ok)
        issues.push({ field: "snapshotPercentage", code: percentage.error });
      if (
        loaded.value.value.snapshot.modality === "own" &&
        draft.snapshotPercentage.trim()
      )
        issues.push({
          field: "snapshotPercentage",
          code: "percentage-not-applicable",
        });
      const historicalById = new Map(
        loaded.value.value.materials.map((material) => [material.id, material]),
      );
      const addedIds = draft.materialIds.filter(
        (materialId) => !historicalById.has(materialId),
      );
      const selectedMaterials: ReadonlyMap<string, Material> = addedIds.length
        ? await deps.materials.findByIds(addedIds)
        : new Map<string, Material>();
      const materials: EnabledMaterial[] = [];
      for (const id of draft.materialIds) {
        const historical = historicalById.get(id);
        if (historical) {
          materials.push(historical);
          continue;
        }
        const material = selectedMaterials.get(id);
        if (!material)
          issues.push({ field: "materialIds", code: "unknown-reference" });
        else if (!material.active || !material.available)
          issues.push({ field: "materialIds", code: "not-selectable" });
        else
          materials.push({
            id: material.id,
            name: material.name,
            active: material.active,
            available: material.available,
          });
      }
      if (issues.length || !fee.ok || (percentage && !percentage.ok))
        return err({ kind: "invalid", issues });
      const capacities = new Map(
        draft.capacities.map((capacity) => [
          capacity.turnoId,
          Number(capacity.capacity),
        ]),
      );
      const currentCapacities = new Map(
        loaded.value.value.turnos.map((turno) => [
          turno.turnoId,
          turno.capacity,
        ]),
      );
      for (const [turnoId, capacity] of capacities) {
        if (capacity === currentCapacities.get(turnoId)) continue;
        let confirmed: number;
        try {
          confirmed = await deps.confirmedSeats.confirmedSeats(id, turnoId);
        } catch {
          return err({ kind: "unavailable" });
        }
        if (capacity < confirmed)
          return err({ kind: "capacity-below-confirmed" });
      }
      const value: WorkshopPeriod = {
        ...loaded.value.value,
        fee: fee.value,
        materialsRequired: draft.materialsRequired,
        materials,
        project: {
          title: draft.projectTitle.trim(),
          description: draft.projectDescription.trim(),
          images: loaded.value.value.project.images,
        },
        turnos: loaded.value.value.turnos.map((turno) => ({
          ...turno,
          capacity: capacities.get(turno.turnoId) ?? turno.capacity,
        })),
        snapshot: {
          ...loaded.value.value.snapshot,
          percentage: percentage?.ok
            ? percentage.value
            : loaded.value.value.snapshot.percentage,
        },
        audit: stamp(loaded.value.actor),
      };
      const saved = await deps.repository.update(value);
      return saved.ok ? ok(effective(value)) : err(notFound);
    },
    async fillTurnos(actor, id) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      const value = loaded.value.value;
      if (closed(value)) return err({ kind: "period-closed" });
      const present = new Set(value.turnos.map((turno) => turno.turnoId));
      const missing = (await deps.turnos.listForWorkshop(value.workshopId))
        .filter((turno) => turno.active && !present.has(turno.id))
        .map((turno) => ({
          turnoId: turno.id,
          label: turno.label,
          weekday: turno.weekday,
          startsAt: turno.startsAt,
          endsAt: turno.endsAt,
          turnoActive: true,
          capacity: turno.defaultCapacity,
        }));
      if (missing.length === 0) return ok(effective(value));
      const next: WorkshopPeriod = {
        ...value,
        turnos: [...value.turnos, ...missing],
        audit: stamp(loaded.value.actor),
      };
      const saved = await deps.repository.update(next);
      return saved.ok ? ok(effective(next)) : err(notFound);
    },
    async publish(actor, id) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      const value = loaded.value.value;
      const from = effective(value).status;
      const allowed = transitionPeriod(from, "open");
      if (!allowed.ok) return allowed;
      const next = {
        ...value,
        status: "open" as PeriodStatus,
        audit: stamp(loaded.value.actor),
      };
      const saved = await deps.repository.update(next);
      return saved.ok ? ok(next) : err(notFound);
    },
    async close(actor, id) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      const value = loaded.value.value;
      const from = effective(value).status;
      const allowed = transitionPeriod(from, "closed");
      if (!allowed.ok) return allowed;
      const next = {
        ...value,
        status: "closed" as PeriodStatus,
        audit: stamp(loaded.value.actor),
      };
      const saved = await deps.repository.update(next);
      return saved.ok ? ok(next) : err(notFound);
    },
    async delete(actor, id) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      const value = loaded.value.value;
      if (closed(value) || value.status !== "draft")
        return err({
          kind: "transition-refused",
          from: effective(value).status,
          to: "draft",
        });
      const outcome = await deps.repository.deleteDraft(id);
      return outcome === "deleted"
        ? ok(undefined)
        : outcome === "not-found"
          ? err(notFound)
          : err({
              kind: "transition-refused",
              from: value.status,
              to: "draft",
            });
    },
  };
}
