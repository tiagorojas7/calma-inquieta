import {
  err,
  ok,
  type AdminFailure,
  type Clock,
  type FieldIssue,
  type Invalid,
  type NotFound,
  type Result,
  type RulesUnmet,
  type TransitionRefused,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  validateGallery,
  type ImageUse,
  type ImageUseDraft,
  type MediaAsset,
  type MediaLookup,
} from "~/modules/media";
import type { TeacherLookup } from "~/modules/teachers";
import {
  assignmentPercentage,
  checkMonthlyTransition,
  unmetMonthlyPublishRules,
  validateMonthlyCore,
  type MonthlyCore,
  type PercentageSubmission,
} from "../domain/monthly-workshop-core";
import { validateTurnoCore } from "../domain/turno-core";
import {
  parsePercentage,
  slugify,
  type MonthlyWorkshop,
  type MonthlyWorkshopDraft,
  type MonthlyWorkshopField,
  type MonthlyWorkshopsService,
  type Percentage,
  type WorkshopPublishRule,
  type WorkshopStatus,
} from "./contracts";
import type {
  MonthlyWorkshopRepository,
  StoredMonthlyWorkshop,
} from "./monthly-workshop-repository";
import type { StoredTurno, TurnoRepository } from "./turno-repository";
type MaybeActor = AdminActor | null | undefined;
export type MonthlyWorkshopUseCases = {
  [K in keyof MonthlyWorkshopsService]: MonthlyWorkshopsService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};
/** Read-only B6 seam: B5 must not persist or inspect periods. */
export interface TurnoUsageLookup {
  isUsed(turnoId: string): Promise<boolean>;
}
/** Read-only seam until B6 owns period persistence. */
export interface WorkshopPeriodLookup {
  hasPeriods(workshopId: string): Promise<boolean>;
}
export interface MonthlyWorkshopServiceDeps {
  readonly repository: MonthlyWorkshopRepository;
  readonly teachers: TeacherLookup;
  readonly media: MediaLookup;
  readonly turnos: TurnoRepository;
  readonly turnoUsage: TurnoUsageLookup;
  readonly periods: WorkshopPeriodLookup;
  readonly clock: Clock;
  readonly newId?: () => string;
}
/** The `workshop_image.alt` column check. */
const MAX_ALT = 200;
const live: readonly WorkshopStatus[] = ["draft", "published", "paused"];
const visible: readonly WorkshopStatus[] = ["published", "paused"];
const duplicate: FieldIssue<"slug"> = { field: "slug", code: "duplicate" };
const notFound: NotFound = { kind: "not-found" };
const submission = (text: string): PercentageSubmission => {
  if (!text.trim()) return { kind: "blank" };
  const parsed = parsePercentage(text);
  return parsed.ok
    ? { kind: "value", basisPoints: parsed.value.basisPoints }
    : parsed.error === "required"
      ? { kind: "blank" }
      : { kind: "invalid", code: parsed.error };
};

export function createMonthlyWorkshopsService(
  deps: MonthlyWorkshopServiceDeps,
): MonthlyWorkshopUseCases {
  const { repository, teachers, media, turnos, turnoUsage, periods, clock } =
    deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: clock.now(),
  });
  const model = async (
    stored: StoredMonthlyWorkshop,
  ): Promise<MonthlyWorkshop> => {
    const teacher = stored.teacherId
      ? (await teachers.findByIds([stored.teacherId])).get(stored.teacherId)
      : undefined;
    const assets = stored.images.length
      ? await media.findAssets(stored.images.map((image) => image.assetId))
      : new Map<string, MediaAsset>();
    const images: ImageUse[] = stored.images.map((image) => ({
      assetId: image.assetId,
      alt: image.alt,
      asset: assets.get(image.assetId) ?? null,
    }));
    return {
      id: stored.id,
      slug: stored.slug,
      name: stored.name,
      summary: stored.summary,
      description: stored.description,
      technique: stored.technique,
      defaultFee: stored.defaultFee,
      assignment: teacher
        ? {
            teacher: {
              id: teacher.id,
              name: teacher.name,
              active: teacher.active,
            },
            percentage: stored.percentage,
          }
        : null,
      images,
      status: stored.status,
      turnos: await Promise.all(
        (await turnos.listForWorkshop(stored.id)).map(async (turno) => ({
          id: turno.id,
          label: turno.label,
          weekday: turno.weekday,
          startsAt: turno.startsAt,
          endsAt: turno.endsAt,
          defaultCapacity: turno.defaultCapacity,
          active: turno.active,
          usedByPeriods: await turnoUsage.isUsed(turno.id),
        })),
      ),
      audit: stored.audit,
    };
  };
  async function fields(
    draft: MonthlyWorkshopDraft,
    current: StoredMonthlyWorkshop | null,
  ): Promise<
    Result<
      {
        core: MonthlyCore;
        teacherId: string | null;
        percentage: Percentage | null;
        images: readonly ImageUseDraft[];
      },
      Invalid<MonthlyWorkshopField>
    >
  > {
    const slug = draft.slug.trim() || slugify(draft.name);
    const core = validateMonthlyCore({ ...draft, slug });
    const issues: FieldIssue<MonthlyWorkshopField>[] = core.ok
      ? []
      : [...core.error.issues];
    const teacherId = draft.teacherId.trim();
    let percentage: Percentage | null = null;
    if (teacherId) {
      const teacher = (await teachers.findByIds([teacherId])).get(teacherId);
      if (!teacher)
        issues.push({ field: "teacherId", code: "unknown-reference" });
      else if (!teacher.active && teacherId !== current?.teacherId)
        issues.push({ field: "teacherId", code: "not-selectable" });
      else {
        const value = assignmentPercentage(
          teacher.modality,
          submission(draft.percentage),
        );
        if (!value.ok) issues.push(value.error);
        else
          percentage =
            value.value === null ? null : { basisPoints: value.value };
      }
    } else if (draft.percentage.trim())
      issues.push({ field: "teacherId", code: "required" });
    const trimmed = draft.images.map((image) => ({
      assetId: image.assetId.trim(),
      alt: image.alt.trim(),
    }));
    const gallery = trimmed.some((image) => image.alt.length > MAX_ALT)
      ? err([{ field: "images", code: "too-long" } as const])
      : validateGallery(
          trimmed,
          trimmed.length
            ? await media.findAssets(trimmed.map((image) => image.assetId))
            : new Map(),
        );
    if (!gallery.ok) issues.push(...gallery.error);
    if (core.ok) {
      const holder = await repository.findBySlug(slug);
      if (holder && holder.id !== current?.id) issues.push(duplicate);
    }
    return !core.ok || issues.length
      ? err({ kind: "invalid", issues })
      : ok({
          core: core.value,
          teacherId: teacherId || null,
          percentage,
          images: gallery.ok ? gallery.value : [],
        });
  }
  const stored = (
    base: { id: string; status: WorkshopStatus },
    resolved: {
      core: MonthlyCore;
      teacherId: string | null;
      percentage: Percentage | null;
      images: readonly ImageUseDraft[];
    },
    actor: AdminActor,
  ): StoredMonthlyWorkshop => ({
    ...base,
    ...resolved.core,
    images: resolved.images,
    teacherId: resolved.teacherId,
    percentage: resolved.percentage,
    audit: stamp(actor),
  });
  async function load(
    actor: MaybeActor,
    id: string,
  ): Promise<
    Result<
      { value: StoredMonthlyWorkshop; actor: AdminActor },
      AdminFailure | NotFound
    >
  > {
    const admin = requireAdminActor(actor);
    if (!admin.ok) return admin;
    const value = await repository.findById(id);
    return value ? ok({ value, actor: admin.value }) : err(notFound);
  }
  async function transition(
    actor: MaybeActor,
    id: string,
    status: WorkshopStatus,
  ): Promise<
    Result<
      MonthlyWorkshop,
      | AdminFailure
      | NotFound
      | TransitionRefused<WorkshopStatus>
      | RulesUnmet<WorkshopPublishRule>
    >
  > {
    const loaded = await load(actor, id);
    if (!loaded.ok) return loaded;
    const allowed = checkMonthlyTransition(loaded.value.value.status, status);
    if (!allowed.ok) return allowed;
    const current = loaded.value.value;
    if (status === "published") {
      const teacher = current.teacherId
        ? (await teachers.findByIds([current.teacherId])).get(current.teacherId)
        : undefined;
      const rules = unmetMonthlyPublishRules({
        name: current.name,
        slug: current.slug,
        defaultFee: current.defaultFee,
        assignment: teacher
          ? {
              active: teacher.active,
              modality: teacher.modality,
              percentageBp: current.percentage?.basisPoints ?? null,
            }
          : null,
        activeTurnos: await turnos.countActiveForWorkshop(current.id),
      });
      if (rules.length) return err({ kind: "rules-unmet", rules });
    }
    const next = { ...current, status, audit: stamp(loaded.value.actor) };
    const saved = await repository.update(next);
    if (!saved.ok)
      throw new Error("workshop vanished or conflicting during transition");
    return ok(await model(next));
  }
  async function nonPublishTransition(
    actor: MaybeActor,
    id: string,
    status: WorkshopStatus,
  ): Promise<
    Result<
      MonthlyWorkshop,
      AdminFailure | NotFound | TransitionRefused<WorkshopStatus>
    >
  > {
    const result = await transition(actor, id, status);
    if (result.ok) return result;
    if (result.error.kind === "rules-unmet")
      throw new Error("unexpected publish rules");
    return err(result.error);
  }
  return {
    async list(actor, filter) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const items = await repository.list(
        filter.status === "live" ? live : [filter.status],
      );
      return ok(
        await Promise.all(
          items.map(async (item) => {
            const teacher = item.teacherId
              ? (await teachers.findByIds([item.teacherId])).get(item.teacherId)
              : undefined;
            return {
              id: item.id,
              name: item.name,
              teacherName: teacher?.name ?? null,
              status: item.status,
              activeTurnos: await turnos.countActiveForWorkshop(item.id),
              acceptsNewRequests: item.status === "published",
            };
          }),
        ),
      );
    },
    async listVisible(actor) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const items = await repository.list(visible);
      return ok(
        await Promise.all(
          items.map(async (item) => {
            const teacher = item.teacherId
              ? (await teachers.findByIds([item.teacherId])).get(item.teacherId)
              : undefined;
            return {
              id: item.id,
              name: item.name,
              teacherName: teacher?.name ?? null,
              status: item.status,
              activeTurnos: await turnos.countActiveForWorkshop(item.id),
              acceptsNewRequests: item.status === "published",
            };
          }),
        ),
      );
    },
    async get(actor, id) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const item = await repository.findById(id);
      return item ? ok(await model(item)) : err(notFound);
    },
    async create(actor, draft) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const resolved = await fields(draft, null);
      if (!resolved.ok) return resolved;
      const value = stored(
        { id: newId(), status: "draft" },
        resolved.value,
        admin.value,
      );
      const inserted = await repository.insert(value);
      return inserted.ok
        ? ok(await model(value))
        : err({ kind: "invalid", issues: [duplicate] });
    },
    async update(actor, id, draft) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      const resolved = await fields(draft, loaded.value.value);
      if (!resolved.ok) return resolved;
      if (
        loaded.value.value.status === "published" &&
        draft.slug.trim() &&
        draft.slug.trim() !== loaded.value.value.slug &&
        !draft.confirmSlugChange
      )
        return err({
          kind: "invalid",
          issues: [{ field: "slug", code: "confirmation-required" }],
        });
      const value = stored(
        loaded.value.value,
        resolved.value,
        loaded.value.actor,
      );
      const saved = await repository.update(value);
      return saved.ok
        ? ok(await model(value))
        : saved.error.kind === "slug-conflict"
          ? err({ kind: "invalid", issues: [duplicate] })
          : err(notFound);
    },
    async delete(actor, id) {
      const admin = requireAdminActor(actor);
      if (!admin.ok) return admin;
      const current = await repository.findById(id);
      if (!current) return err(notFound);
      if (current.status !== "draft" || (await periods.hasPeriods(id)))
        return err({ kind: "rules-unmet", rules: ["draft-without-periods"] });
      const result = await repository.deleteDraft(id);
      return result === "deleted"
        ? ok(undefined)
        : result === "not-found"
          ? err(notFound)
          : err({ kind: "rules-unmet", rules: ["draft-without-periods"] });
    },
    publish: (actor, id) => transition(actor, id, "published"),
    pause: (actor, id) => nonPublishTransition(actor, id, "paused"),
    archive: (actor, id) => nonPublishTransition(actor, id, "archived"),
    restore: (actor, id) => nonPublishTransition(actor, id, "draft"),
    async addTurno(actor, workshopId, draft) {
      const loaded = await load(actor, workshopId);
      if (!loaded.ok) return loaded;
      const core = validateTurnoCore(draft);
      if (!core.ok) return core;
      const value: StoredTurno = {
        id: newId(),
        workshopId,
        ...core.value,
        active: true,
      };
      const next = { ...loaded.value.value, audit: stamp(loaded.value.actor) };
      const inserted = await turnos.mutate(next, { kind: "insert", value });
      if (!inserted.ok)
        return inserted.error.kind === "label-conflict"
          ? err({
              kind: "invalid",
              issues: [{ field: "label", code: "duplicate" }],
            })
          : err(notFound);
      return ok(await model(next));
    },
    async updateTurno(actor, workshopId, turnoId, draft) {
      const loaded = await load(actor, workshopId);
      if (!loaded.ok) return loaded;
      const current = await turnos.findById(turnoId);
      if (!current || current.workshopId !== workshopId) return err(notFound);
      const core = validateTurnoCore(draft);
      if (!core.ok) return core;
      const next = { ...loaded.value.value, audit: stamp(loaded.value.actor) };
      const savedTurno = await turnos.mutate(next, {
        kind: "update",
        value: { ...current, ...core.value },
      });
      if (!savedTurno.ok)
        return savedTurno.error.kind === "label-conflict"
          ? err({
              kind: "invalid",
              issues: [{ field: "label", code: "duplicate" }],
            })
          : err(notFound);
      return ok(await model(next));
    },
    async retireTurno(actor, workshopId, turnoId) {
      const loaded = await load(actor, workshopId);
      if (!loaded.ok) return loaded;
      const current = await turnos.findById(turnoId);
      if (!current || current.workshopId !== workshopId) return err(notFound);
      if (
        current.active &&
        loaded.value.value.status === "published" &&
        (await turnos.countActiveForWorkshop(workshopId)) === 1
      )
        return err({
          kind: "rules-unmet",
          rules: ["last-active-turno-of-published"],
        });
      const next = { ...loaded.value.value, audit: stamp(loaded.value.actor) };
      const changed = await turnos.mutate(next, {
        kind: "update",
        value: { ...current, active: false },
      });
      if (!changed.ok) return err(notFound);
      return ok(await model(next));
    },
    async reactivateTurno(actor, workshopId, turnoId) {
      const loaded = await load(actor, workshopId);
      if (!loaded.ok) return loaded;
      const current = await turnos.findById(turnoId);
      if (!current || current.workshopId !== workshopId) return err(notFound);
      const next = { ...loaded.value.value, audit: stamp(loaded.value.actor) };
      const changed = await turnos.mutate(next, {
        kind: "update",
        value: { ...current, active: true },
      });
      if (!changed.ok)
        return changed.error.kind === "label-conflict"
          ? err(changed.error)
          : err(notFound);
      return ok(await model(next));
    },
    async deleteTurno(actor, workshopId, turnoId) {
      const loaded = await load(actor, workshopId);
      if (!loaded.ok) return loaded;
      const current = await turnos.findById(turnoId);
      if (!current || current.workshopId !== workshopId) return err(notFound);
      if (await turnoUsage.isUsed(turnoId))
        return err({ kind: "rules-unmet", rules: ["turno-used"] });
      if (
        current.active &&
        loaded.value.value.status === "published" &&
        (await turnos.countActiveForWorkshop(workshopId)) === 1
      )
        return err({
          kind: "rules-unmet",
          rules: ["last-active-turno-of-published"],
        });
      const next = { ...loaded.value.value, audit: stamp(loaded.value.actor) };
      const deleted = await turnos.mutate(next, {
        kind: "delete",
        id: turnoId,
      });
      if (!deleted.ok) return err(notFound);
      return ok(await model(next));
    },
    listAssignmentsOfTeacher: (actor) => {
      const admin = requireAdminActor(actor);
      return Promise.resolve(
        admin.ok ? ok({ monthly: [], intensives: [] }) : admin,
      );
    },
    techniqueSuggestions: (actor) => {
      const admin = requireAdminActor(actor);
      return Promise.resolve(admin.ok ? ok([]) : admin);
    },
  };
}
