import type { NotFound, Result } from "~/modules/_shared";
import type { Teacher } from "./teachers";

export type TeacherFilter = "active" | "archived" | "all";

/** Another ACTIVE teacher already holds this name (case-insensitively). */
export interface NameConflict {
  readonly kind: "name-conflict";
}

/**
 * Persistence port for teachers. A second ACTIVE teacher whose name matches
 * case-insensitively is a typed conflict, not a throw (Postgres: SQLSTATE
 * 23505 on the active-name index), so the use cases can map a lost race to
 * the same result as their pre-check. A duplicate id is a defect and rejects.
 */
export interface TeacherRepository {
  /** Name conflict on a duplicate active name; rejects on a duplicate id. */
  insert(teacher: Teacher): Promise<Result<void, NameConflict>>;
  /** Replaces every field. Not found for an unknown id; name conflict on a duplicate active name. */
  update(teacher: Teacher): Promise<Result<void, NameConflict | NotFound>>;
  findById(id: string): Promise<Teacher | null>;
  /** Known ids only; unknown ids are absent from the map. */
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Teacher>>;
  /** Case-insensitive match among ACTIVE teachers only. */
  findActiveByName(name: string): Promise<Teacher | null>;
  /**
   * Ordered by `compareTeachersByName` (Spanish collation on the name key,
   * then id), owned by the code so it never depends on a database collation.
   */
  list(filter: TeacherFilter): Promise<readonly Teacher[]>;
}
