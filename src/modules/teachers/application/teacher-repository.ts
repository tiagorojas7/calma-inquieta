import type { Teacher } from "./teachers";

export type TeacherFilter = "active" | "archived" | "all";

/**
 * Persistence port for teachers. A second ACTIVE teacher whose name matches
 * case-insensitively is a unique violation: implementations reject the write
 * (the use cases check first; this is the race-proof backstop).
 */
export interface TeacherRepository {
  /** Rejects on a duplicate id or a duplicate active name. */
  insert(teacher: Teacher): Promise<void>;
  /** Replaces every field. Returns false when the id is unknown. Rejects on a duplicate active name. */
  update(teacher: Teacher): Promise<boolean>;
  findById(id: string): Promise<Teacher | null>;
  /** Known ids only; unknown ids are absent from the map. */
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Teacher>>;
  /** Case-insensitive match among ACTIVE teachers only. */
  findActiveByName(name: string): Promise<Teacher | null>;
  /** Ordered by name (case-insensitive), then id. */
  list(filter: TeacherFilter): Promise<readonly Teacher[]>;
}
