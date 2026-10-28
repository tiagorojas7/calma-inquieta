import type { StudentSourceOrder } from "../domain/student-core";

/**
 * Read port over the enrollment orders the registry derives students from.
 * Emails are matched after normalization (trimmed, lower-cased).
 */
export interface StudentOrderSource {
  /** Every order of every student. */
  all(): Promise<readonly StudentSourceOrder[]>;
  /** Every order whose normalized email is `email`. */
  byEmail(email: string): Promise<readonly StudentSourceOrder[]>;
}

/** The owner's observations about one student ("observaciones"). */
export interface StudentNote {
  readonly email: string;
  readonly text: string;
  readonly updatedBy: string;
  readonly updatedAt: Date;
}

export interface StudentNoteRepository {
  find(email: string): Promise<StudentNote | null>;
  /** Replaces the note of `note.email`. */
  save(note: StudentNote): Promise<void>;
}
