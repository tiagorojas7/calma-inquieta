import { err, ok, type Clock } from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  STUDENT_PAGE_SIZE,
  deriveStudents,
  filterStudents,
  normalizeStudentEmail,
  validateNote,
} from "../domain/student-core";
import type {
  StudentNoteRepository,
  StudentOrderSource,
} from "./student-ports";
import type { StudentsService } from "./students";

type MaybeActor = AdminActor | null | undefined;

/** The service contract, accepting an absent actor so it can be denied. */
export type StudentUseCases = {
  [K in keyof StudentsService]: StudentsService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface StudentServiceDeps {
  readonly orders: StudentOrderSource;
  readonly notes: StudentNoteRepository;
  readonly clock: Clock;
}

/**
 * The students registry. A student is never stored: the registry groups the
 * enrollment orders by normalized email, so one person who joins several
 * workshops keeps a single record. Only the owner's note is persisted.
 */
export function createStudentsService(
  deps: StudentServiceDeps,
): StudentUseCases {
  const { orders, notes, clock } = deps;
  const notFound = err({ kind: "not-found" as const });

  async function profileOf(email: string) {
    return deriveStudents(await orders.byEmail(email))[0] ?? null;
  }

  return {
    async list(actor, query = {}) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const matched = filterStudents(deriveStudents(await orders.all()), query);
      const page = query.page !== undefined && query.page >= 1 ? query.page : 1;
      const start = (page - 1) * STUDENT_PAGE_SIZE;
      return ok({
        items: matched.slice(start, start + STUDENT_PAGE_SIZE),
        page,
        pageSize: STUDENT_PAGE_SIZE,
        hasNext: matched.length > start + STUDENT_PAGE_SIZE,
      });
    },

    async detail(actor, email) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const key = normalizeStudentEmail(email);
      const profile = await profileOf(key);
      if (!profile) return notFound;
      return ok({ ...profile, note: await notes.find(key) });
    },

    async saveNote(actor, email, text) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const key = normalizeStudentEmail(email);
      if (!(await profileOf(key))) return notFound;
      const valid = validateNote(text);
      if (!valid.ok) return valid;
      const note = {
        email: key,
        text: valid.value,
        updatedBy: authorized.value.email,
        updatedAt: clock.now(),
      };
      await notes.save(note);
      return ok(note);
    },
  };
}

/** Every call fails closed as unavailable once the actor is authorized. */
export function createUnavailableStudentsService(): StudentUseCases {
  const fail = (actor: MaybeActor) => {
    const authorized = requireAdminActor(actor);
    return Promise.resolve(
      authorized.ok ? err({ kind: "unavailable" as const }) : authorized,
    );
  };
  return { list: fail, detail: fail, saveNote: fail };
}
