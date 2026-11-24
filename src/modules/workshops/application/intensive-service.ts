import {
  err,
  ok,
  type AdminFailure,
  type Clock,
  type FieldIssue,
  type Invalid,
  type Money,
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
import type { Teacher, TeacherLookup } from "~/modules/teachers";
import {
  assignmentPercentage,
  checkTransition,
  startsInFuture,
  unmetEditRules,
  unmetPublishRules,
  validateIntensiveCore,
  validateSchedule,
  type IntensiveCore,
  type IntensiveSchedule,
  type PercentageSubmission,
} from "../domain/intensive-core";
import type { IntensiveProjectField } from "../domain/intensive-project-core";
import { validateProjectMaterial } from "../domain/intensive-project-material-core";
import {
  parsePercentage,
  slugify,
  type IntensivePublishRule,
  type IntensiveStatus,
  type IntensiveWorkshop,
  type IntensiveWorkshopDraft,
  type IntensiveWorkshopField,
  type IntensivesService,
  type NewProjectDraft,
  type NewProjectField,
  type Percentage,
} from "./contracts";
import { createIntensiveProjectMaterialsUseCases } from "./intensive-project-materials-use-cases";
import {
  createIntensiveProjectUseCases,
  createProjectDraftResolver,
} from "./intensive-project-use-cases";
import type {
  IntensiveRepository,
  NewBillLine,
  NewWorkshopProject,
  StoredIntensive,
} from "./intensive-repository";

type MaybeActor = AdminActor | null | undefined;
/** The service contract, accepting an absent actor so it can be denied. */
export type IntensiveUseCases = {
  [K in keyof IntensivesService]: IntensivesService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface IntensiveServiceDeps {
  readonly repository: IntensiveRepository;
  readonly teachers: TeacherLookup;
  readonly media: MediaLookup;
  readonly clock: Clock;
  readonly newId?: () => string;
}

const MAX_ALT = 200;
const LIVE: readonly IntensiveStatus[] = [
  "draft",
  "published",
  "paused",
  "cancelled",
];
const VISIBLE: readonly IntensiveStatus[] = ["published", "paused"];
const notFound: NotFound = { kind: "not-found" };
const PROJECT_FIELDS = {
  name: "Name",
  price: "Price",
  deposit: "Deposit",
  description: "Description",
  image: "Image",
} as const satisfies Record<IntensiveProjectField, string>;
const duplicateSlug: FieldIssue<"slug"> = { field: "slug", code: "duplicate" };

function submissionOf(text: string): PercentageSubmission {
  if (text.trim() === "") return { kind: "blank" };
  const parsed = parsePercentage(text);
  if (parsed.ok)
    return { kind: "value", basisPoints: parsed.value.basisPoints };
  return parsed.error === "required"
    ? { kind: "blank" }
    : { kind: "invalid", code: parsed.error };
}

type ResolvedProject = Extract<
  Awaited<ReturnType<ReturnType<typeof createProjectDraftResolver>>>,
  { ok: true }
>["value"];

interface ResolvedFields {
  readonly core: IntensiveCore;
  readonly teacherId: string | null;
  readonly percentage: Percentage | null;
  readonly images: readonly ImageUseDraft[];
}

const sameSchedule = (a: IntensiveSchedule, b: IntensiveSchedule): boolean =>
  a.eventDate === b.eventDate &&
  a.startsAt === b.startsAt &&
  a.endsAt === b.endsAt;

/**
 * Admin use cases for intensivos. Every call needs an AdminActor and checks it
 * before any port call. Money, the percentage and the time range are parsed by
 * the domain; the teacher and the gallery are resolved through the lookups of
 * the teachers and media modules.
 */
export function createIntensivesService(
  deps: IntensiveServiceDeps,
): IntensiveUseCases {
  const { repository, teachers, media, clock } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const resolveProjectDraft = createProjectDraftResolver(media);
  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: clock.now(),
  });

  async function readModels(
    stored: readonly StoredIntensive[],
  ): Promise<readonly IntensiveWorkshop[]> {
    const teacherIds = [
      ...new Set(stored.flatMap((s) => (s.teacherId ? [s.teacherId] : []))),
    ];
    const assetIds = [
      ...new Set(stored.flatMap((s) => s.images.map((i) => i.assetId))),
    ];
    const [teacherById, assetById] = await Promise.all([
      teachers.findByIds(teacherIds),
      media.findAssets(assetIds),
    ]);
    return stored.map((s) => toReadModel(s, teacherById, assetById));
  }

  function toReadModel(
    s: StoredIntensive,
    teacherById: ReadonlyMap<string, Teacher>,
    assetById: ReadonlyMap<string, MediaAsset>,
  ): IntensiveWorkshop {
    const teacher = s.teacherId ? teacherById.get(s.teacherId) : undefined;
    const images: ImageUse[] = s.images.map((image) => ({
      assetId: image.assetId,
      alt: image.alt,
      asset: assetById.get(image.assetId) ?? null,
    }));
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      summary: s.summary,
      description: s.description,
      assignment: teacher
        ? {
            teacher: {
              id: teacher.id,
              name: teacher.name,
              active: teacher.active,
            },
            percentage: s.percentage,
          }
        : null,
      eventDate: s.eventDate,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      price: s.price,
      deposit: s.deposit,
      capacity: s.capacity,
      minSeats: s.minSeats,
      policyText: s.policyText,
      materialsIncluded: s.materialsIncluded,
      images,
      status: s.status,
      audit: s.audit,
    };
  }

  async function readModel(s: StoredIntensive): Promise<IntensiveWorkshop> {
    const [model] = await readModels([s]);
    if (!model) throw new Error("read model missing");
    return model;
  }

  /** The assignment for a draft, or the issues that refuse it. */
  async function resolveAssignment(
    draft: IntensiveWorkshopDraft,
    currentTeacherId: string | null,
  ): Promise<
    Result<
      { teacherId: string | null; percentage: Percentage | null },
      readonly FieldIssue<IntensiveWorkshopField>[]
    >
  > {
    const teacherId = draft.teacherId.trim();
    const submission = submissionOf(draft.percentage);
    if (teacherId === "")
      return submission.kind === "blank"
        ? ok({ teacherId: null, percentage: null })
        : err([{ field: "teacherId", code: "required" }]);
    const teacher = (await teachers.findByIds([teacherId])).get(teacherId);
    if (!teacher)
      return err([{ field: "teacherId", code: "unknown-reference" }]);
    // An assignment already in place survives her archiving; a new one does not.
    if (!teacher.active && teacherId !== currentTeacherId)
      return err([{ field: "teacherId", code: "not-selectable" }]);
    const basisPoints = assignmentPercentage(teacher.modality, submission);
    if (!basisPoints.ok) return err([basisPoints.error]);
    return ok({
      teacherId,
      percentage:
        basisPoints.value === null ? null : { basisPoints: basisPoints.value },
    });
  }

  async function resolveGallery(
    drafts: readonly ImageUseDraft[],
  ): Promise<
    Result<readonly ImageUseDraft[], readonly FieldIssue<"images">[]>
  > {
    const trimmed = drafts.map((d) => ({
      assetId: d.assetId.trim(),
      alt: d.alt.trim(),
    }));
    if (trimmed.some((d) => d.alt.length > MAX_ALT))
      return err([{ field: "images", code: "too-long" }]);
    const known = await media.findAssets(trimmed.map((d) => d.assetId));
    return validateGallery(trimmed, known);
  }

  /** Validates a whole draft; `current` is the stored record when updating. */
  async function resolveFields(
    draft: IntensiveWorkshopDraft,
    current: StoredIntensive | null,
  ): Promise<Result<ResolvedFields, Invalid<IntensiveWorkshopField>>> {
    const slug = draft.slug.trim() || slugify(draft.name);
    const issues: FieldIssue<IntensiveWorkshopField>[] = [];
    const core = validateIntensiveCore({ ...draft, slug });
    if (!core.ok) issues.push(...core.error.issues);
    // A live intensivo cannot slip into the past through an ordinary edit.
    const schedule = validateSchedule(draft);
    if (
      schedule.ok &&
      current &&
      (current.status === "published" || current.status === "paused") &&
      !sameSchedule(schedule.value, current) &&
      !startsInFuture(schedule.value, clock.now())
    )
      issues.push({ field: "eventDate", code: "in-past" });
    const assignment = await resolveAssignment(
      draft,
      current?.teacherId ?? null,
    );
    if (!assignment.ok) issues.push(...assignment.error);
    const gallery = await resolveGallery(draft.images);
    if (!gallery.ok) issues.push(...gallery.error);
    if (core.ok || !core.error.issues.some((i) => i.field === "slug")) {
      const holder = await repository.findBySlug(slug);
      if (holder && holder.id !== current?.id) issues.push(duplicateSlug);
    }
    if (!core.ok || !assignment.ok || !gallery.ok || issues.length > 0)
      return err({ kind: "invalid", issues });
    return ok({
      core: core.value,
      teacherId: assignment.value.teacherId,
      percentage: assignment.value.percentage,
      images: gallery.value,
    });
  }

  /**
   * The workshop is not a project and has no price of its own; the stored
   * price and deposit are an internal fallback (old requests, publish rules),
   * copied from the first project on creation and never touched by an edit.
   */
  const merge = (
    base: { id: string; status: IntensiveStatus },
    fields: ResolvedFields,
    actor: AdminActor,
    money: { readonly price: Money; readonly deposit: Money },
  ): StoredIntensive => ({
    id: base.id,
    status: base.status,
    slug: fields.core.slug,
    name: fields.core.name,
    summary: fields.core.summary,
    description: fields.core.description,
    teacherId: fields.teacherId,
    percentage: fields.percentage,
    eventDate: fields.core.schedule.eventDate,
    startsAt: fields.core.schedule.startsAt,
    endsAt: fields.core.schedule.endsAt,
    price: money.price,
    deposit: money.deposit,
    capacity: fields.core.capacity,
    minSeats: fields.core.minSeats,
    policyText: fields.core.policyText,
    materialsIncluded: fields.core.materialsIncluded,
    images: fields.images,
    audit: stamp(actor),
  });

  const duplicateSlugResult = err({
    kind: "invalid",
    issues: [duplicateSlug],
  } as const);

  /** The bill of one new project, each refused line named by its block and its own index. */
  function resolveBill(
    block: number,
    lines: NewProjectDraft["materials"],
  ): Result<readonly NewBillLine[], readonly FieldIssue<NewProjectField>[]> {
    const issues: FieldIssue<NewProjectField>[] = [];
    const bill: NewBillLine[] = [];
    const listed = new Set<string>();
    lines.forEach((line, index) => {
      const checked = validateProjectMaterial(line);
      if (!checked.ok) {
        issues.push(
          ...checked.error.issues.map((issue) => ({
            field:
              issue.field === "variantId"
                ? (`project${String(block)}MaterialVariant${String(index)}` as const)
                : (`project${String(block)}MaterialQuantity${String(index)}` as const),
            code: issue.code,
          })),
        );
        return;
      }
      const variant = checked.value.variantId.toLowerCase();
      if (listed.has(variant))
        issues.push({
          field: `project${String(block)}MaterialVariant${String(index)}`,
          code: "duplicate",
        });
      else bill.push(checked.value);
      listed.add(variant);
    });
    return issues.length > 0 ? err(issues) : ok(bill);
  }

  /**
   * Every project block of a new workshop: the editor's own rules for its
   * fields and image, plus its bill. Each issue names its block, and every
   * block is checked so the owner sees all the problems at once.
   */
  async function resolveProjects(
    drafts: readonly NewProjectDraft[],
  ): Promise<
    Result<
      readonly (ResolvedProject & { readonly bill: readonly NewBillLine[] })[],
      readonly FieldIssue<NewProjectField>[]
    >
  > {
    if (drafts.length === 0)
      return err([{ field: "project0Name", code: "required" }]);
    const issues: FieldIssue<NewProjectField>[] = [];
    const resolved: (ResolvedProject & {
      readonly bill: readonly NewBillLine[];
    })[] = [];
    for (const [block, draft] of drafts.entries()) {
      const fields = await resolveProjectDraft(draft);
      if (!fields.ok)
        issues.push(
          ...fields.error.issues.map((issue) => ({
            field:
              `project${String(block)}${PROJECT_FIELDS[issue.field]}` as const,
            code: issue.code,
          })),
        );
      const bill = resolveBill(block, draft.materials);
      if (!bill.ok) issues.push(...bill.error);
      if (fields.ok && bill.ok)
        resolved.push({ ...fields.value, bill: bill.value });
    }
    return issues.length > 0 ? err(issues) : ok(resolved);
  }

  async function load(
    actor: MaybeActor,
    id: string,
  ): Promise<
    Result<
      { current: StoredIntensive; actor: AdminActor },
      AdminFailure | NotFound
    >
  > {
    const authorized = requireAdminActor(actor);
    if (!authorized.ok) return authorized;
    const current = await repository.findById(id);
    return current ? ok({ current, actor: authorized.value }) : err(notFound);
  }

  /** Writes a record whose slug did not change: a conflict here is a defect. */
  async function saveInPlace(
    next: StoredIntensive,
  ): Promise<Result<IntensiveWorkshop, NotFound>> {
    const saved = await repository.update(next);
    if (saved.ok) return ok(await readModel(next));
    if (saved.error.kind === "slug-conflict")
      throw new Error("unexpected slug conflict");
    return err(notFound);
  }

  /** Moves to a status; `guard` may refuse after the transition table allows it. */
  async function transition<E = never>(
    actor: MaybeActor,
    id: string,
    to: IntensiveStatus,
    guard?: (current: StoredIntensive) => Promise<E | null>,
  ): Promise<
    Result<
      IntensiveWorkshop,
      AdminFailure | NotFound | TransitionRefused<IntensiveStatus> | E
    >
  > {
    const loaded = await load(actor, id);
    if (!loaded.ok) return loaded;
    const { current, actor: admin } = loaded.value;
    const allowed = checkTransition(current.status, to);
    if (!allowed.ok) return allowed;
    const refusal = guard ? await guard(current) : null;
    if (refusal !== null) return err(refusal);
    return saveInPlace({ ...current, status: to, audit: stamp(admin) });
  }

  /**
   * The publish rules a record fails. Publishing (and resuming) also needs a
   * future start; editing a live record does not, because an event that has
   * started stays editable and a schedule change is guarded on its own.
   */
  async function unmetRules(
    current: StoredIntensive,
    moment: "publish" | "edit",
    /** The stored record an edit starts from; its assignment may be kept as is. */
    previous?: StoredIntensive,
  ): Promise<RulesUnmet<IntensivePublishRule> | null> {
    const teacher = current.teacherId
      ? (await teachers.findByIds([current.teacherId])).get(current.teacherId)
      : undefined;
    // An assignment left untouched survives the teacher's archiving.
    const assignmentKept =
      previous !== undefined &&
      current.teacherId !== null &&
      current.teacherId === previous.teacherId &&
      current.percentage?.basisPoints === previous.percentage?.basisPoints;
    const facts = {
      name: current.name,
      slug: current.slug,
      schedule: current,
      price: current.price,
      deposit: current.deposit,
      capacity: current.capacity,
      minSeats: current.minSeats,
      projectCount: (await repository.listProjects(current.id)).length,
      assignment: teacher
        ? {
            active: teacher.active || assignmentKept,
            modality: teacher.modality,
            percentageBp: current.percentage?.basisPoints ?? null,
          }
        : null,
    };
    const rules =
      moment === "publish"
        ? unmetPublishRules(facts, clock.now())
        : unmetEditRules(facts);
    return rules.length > 0 ? { kind: "rules-unmet", rules } : null;
  }

  return {
    ...createIntensiveProjectUseCases({ repository, media, clock, newId }),
    ...createIntensiveProjectMaterialsUseCases({ repository }),
    async list(actor, filter) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const statuses =
        filter.status === "live" ? LIVE : ([filter.status] as const);
      return ok(await readModels(await repository.list(statuses)));
    },
    async listVisible(actor) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return ok(await readModels(await repository.list(VISIBLE)));
    },
    async get(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const found = await repository.findById(id);
      return found ? ok(await readModel(found)) : err(notFound);
    },
    async create(actor, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const fields = await resolveFields(draft, null);
      const projects = await resolveProjects(draft.projects);
      const [first] = projects.ok ? projects.value : [];
      if (!fields.ok || !projects.ok || !first)
        return err({
          kind: "invalid",
          issues: [
            ...(fields.ok ? [] : fields.error.issues),
            ...(projects.ok ? [] : projects.error),
          ],
        });
      const stored = merge(
        { id: newId(), status: "draft" },
        fields.value,
        authorized.value,
        first,
      );
      // A new workshop is written with every project the owner typed, their
      // images and bills, in one atomic write, so it can be published without
      // further steps; the projects are projects, the workshop is not.
      const inserted = await repository.insert(
        stored,
        projects.value.map((project): NewWorkshopProject => ({
          id: newId(),
          intensiveId: stored.id,
          name: project.name,
          description: project.description,
          image: project.image,
          price: project.price,
          deposit: project.deposit,
          audit: stored.audit,
          materials: project.bill,
        })),
      );
      return inserted.ok ? ok(await readModel(stored)) : duplicateSlugResult;
    },
    async update(actor, id, draft) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      const { current, actor: admin } = loaded.value;
      const fields = await resolveFields(draft, current);
      if (!fields.ok) return fields;
      const next = merge(current, fields.value, admin, current);
      // A live intensivo must keep meeting the publish rules after the edit.
      if (current.status === "published" || current.status === "paused") {
        const unmet = await unmetRules(next, "edit", current);
        if (unmet !== null) return err(unmet);
      }
      const saved = await repository.update(next);
      if (saved.ok) return ok(await readModel(next));
      return saved.error.kind === "slug-conflict"
        ? duplicateSlugResult
        : err(notFound);
    },
    async delete(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const outcome = await repository.deleteDraft(id);
      if (outcome === "deleted") return ok(undefined);
      return outcome === "not-found"
        ? err(notFound)
        : err({ kind: "rules-unmet", rules: ["draft-only"] });
    },
    publish: (actor, id) =>
      transition(actor, id, "published", (current) =>
        unmetRules(current, "publish"),
      ),
    pause: (actor, id) => transition(actor, id, "paused"),
    cancel: (actor, id) => transition(actor, id, "cancelled"),
    archive: (actor, id) => transition(actor, id, "archived"),
    restore: (actor, id) => transition(actor, id, "draft"),
    async reschedule(actor, id, input) {
      const loaded = await load(actor, id);
      if (!loaded.ok) return loaded;
      const { current, actor: admin } = loaded.value;
      const schedule = validateSchedule(input);
      if (!schedule.ok) return schedule;
      if (
        (current.status === "published" || current.status === "paused") &&
        !startsInFuture(schedule.value, clock.now())
      )
        return err({
          kind: "invalid",
          issues: [{ field: "eventDate", code: "in-past" }],
        });
      return saveInPlace({
        ...current,
        ...schedule.value,
        audit: stamp(admin),
      });
    },
  };
}
