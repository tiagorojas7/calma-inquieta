import {
  err,
  ok,
  type AdminFailure,
  type Clock,
  type FieldIssue,
  type NotFound,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import { validateTeacherDraft } from "../domain/teacher-core";
import type {
  TeacherLookup,
  Teacher,
  TeacherDraft,
  TeacherField,
  TeachersService,
} from "./teachers";
import type { TeacherRepository } from "./teacher-repository";

type MaybeActor = AdminActor | null | undefined;

/** The service contract, accepting an absent actor so it can be denied. */
export type TeacherUseCases = {
  [K in keyof TeachersService]: TeachersService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface TeacherServiceDeps {
  readonly repository: TeacherRepository;
  readonly clock: Clock;
  readonly newId?: () => string;
}

const duplicateName: FieldIssue<"name"> = { field: "name", code: "duplicate" };
const notFound: NotFound = { kind: "not-found" };

/**
 * Admin use cases for teachers. Every call needs an AdminActor and checks it
 * before any repository call. Archiving never consults assignments: the
 * warning that names affected activities is built from the assignments side.
 */
export function createTeachersService(
  deps: TeacherServiceDeps,
): TeacherUseCases {
  const { repository, clock } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());

  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: clock.now(),
  });

  async function isNameTaken(name: string, selfId: string): Promise<boolean> {
    const holder = await repository.findActiveByName(name);
    return holder !== null && holder.id !== selfId;
  }

  async function loadForToggle(
    actor: MaybeActor,
    id: string,
  ): Promise<
    Result<{ teacher: Teacher; actor: AdminActor }, AdminFailure | NotFound>
  > {
    const authorized = requireAdminActor(actor);
    if (!authorized.ok) return authorized;
    const teacher = await repository.findById(id);
    if (!teacher) return err(notFound);
    return ok({ teacher, actor: authorized.value });
  }

  async function save(
    teacher: Teacher,
    active: boolean,
    actor: AdminActor,
  ): Promise<Teacher> {
    const next: Teacher = { ...teacher, active, audit: stamp(actor) };
    await repository.update(next);
    return next;
  }

  return {
    async list(actor, filter) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      return ok(await repository.list(filter));
    },

    async get(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const found = await repository.findById(id);
      return found ? ok(found) : err(notFound);
    },

    async create(actor, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const issues = await draftIssues(draft, null);
      if (issues.length > 0) return err({ kind: "invalid", issues });
      const valid = validateTeacherDraft(draft);
      if (!valid.ok) return valid;
      const teacher: Teacher = {
        id: newId(),
        ...valid.value,
        active: true,
        audit: stamp(authorized.value),
      };
      await repository.insert(teacher);
      return ok(teacher);
    },

    async update(actor, id, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const current = await repository.findById(id);
      if (!current) return err(notFound);
      const issues = await draftIssues(draft, current);
      if (issues.length > 0) return err({ kind: "invalid", issues });
      const valid = validateTeacherDraft(draft);
      if (!valid.ok) return valid;
      const next: Teacher = {
        ...current,
        ...valid.value,
        audit: stamp(authorized.value),
      };
      await repository.update(next);
      return ok(next);
    },

    async archive(actor, id) {
      const loaded = await loadForToggle(actor, id);
      if (!loaded.ok) return loaded;
      const { teacher, actor: admin } = loaded.value;
      if (!teacher.active) return ok(teacher);
      return ok(await save(teacher, false, admin));
    },

    async reactivate(actor, id) {
      const loaded = await loadForToggle(actor, id);
      if (!loaded.ok) return loaded;
      const { teacher, actor: admin } = loaded.value;
      if (teacher.active) return ok(teacher);
      if (await isNameTaken(teacher.name, teacher.id))
        return err({ kind: "invalid", issues: [duplicateName] });
      return ok(await save(teacher, true, admin));
    },
  };

  /** Validation issues, plus a duplicate-name issue for an active record. */
  async function draftIssues(
    draft: TeacherDraft,
    existing: Teacher | null,
  ): Promise<readonly FieldIssue<TeacherField>[]> {
    const valid = validateTeacherDraft(draft);
    const issues = valid.ok ? [] : [...valid.error.issues];
    const name = draft.name.trim();
    const willBeActive = existing ? existing.active : true;
    if (
      name !== "" &&
      willBeActive &&
      (await isNameTaken(name, existing?.id ?? ""))
    )
      issues.push(duplicateName);
    return issues;
  }
}

/** Read port other modules use to resolve teachers, archived ones included. */
export function createTeacherLookup(
  repository: TeacherRepository,
): TeacherLookup {
  return { findByIds: (ids) => repository.findByIds(ids) };
}
