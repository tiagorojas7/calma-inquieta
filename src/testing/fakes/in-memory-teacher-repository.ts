import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import {
  compareTeachersByName,
  teacherNameKey,
} from "~/modules/teachers/domain/teacher-core";
import type { Teacher } from "~/modules/teachers";
import type {
  NameConflict,
  TeacherFilter,
  TeacherRepository,
} from "~/modules/teachers/application/teacher-repository";

/** Teachers in memory, enforcing the same constraints as the database. */
export class InMemoryTeacherRepository implements TeacherRepository {
  readonly teachers = new Map<string, Teacher>();

  private nameTakenByAnother(candidate: Teacher): boolean {
    if (!candidate.active) return false;
    const key = teacherNameKey(candidate.name);
    return [...this.teachers.values()].some(
      (stored) =>
        stored.id !== candidate.id &&
        stored.active &&
        teacherNameKey(stored.name) === key,
    );
  }

  insert(teacher: Teacher): Promise<Result<void, NameConflict>> {
    if (this.teachers.has(teacher.id))
      return Promise.reject(new Error("teacher already exists"));
    if (this.nameTakenByAnother(teacher))
      return Promise.resolve(err({ kind: "name-conflict" }));
    this.teachers.set(teacher.id, teacher);
    return Promise.resolve(ok(undefined));
  }

  update(teacher: Teacher): Promise<Result<void, NameConflict | NotFound>> {
    if (!this.teachers.has(teacher.id))
      return Promise.resolve(err({ kind: "not-found" }));
    if (this.nameTakenByAnother(teacher))
      return Promise.resolve(err({ kind: "name-conflict" }));
    this.teachers.set(teacher.id, teacher);
    return Promise.resolve(ok(undefined));
  }

  findById(id: string): Promise<Teacher | null> {
    return Promise.resolve(this.teachers.get(id) ?? null);
  }

  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Teacher>> {
    const found = new Map<string, Teacher>();
    for (const id of ids) {
      const teacher = this.teachers.get(id);
      if (teacher) found.set(id, teacher);
    }
    return Promise.resolve(found);
  }

  findActiveByName(name: string): Promise<Teacher | null> {
    const key = teacherNameKey(name);
    const match = [...this.teachers.values()].find(
      (stored) => stored.active && teacherNameKey(stored.name) === key,
    );
    return Promise.resolve(match ?? null);
  }

  list(filter: TeacherFilter): Promise<readonly Teacher[]> {
    const selected = [...this.teachers.values()].filter(
      (teacher) => filter === "all" || teacher.active === (filter === "active"),
    );
    selected.sort(compareTeachersByName);
    return Promise.resolve(selected);
  }
}
