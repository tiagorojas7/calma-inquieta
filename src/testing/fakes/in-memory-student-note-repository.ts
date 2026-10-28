import type { StudentNote, StudentNoteRepository } from "~/modules/students";

/** Student notes in memory, one per email, replaced on save. */
export class InMemoryStudentNoteRepository implements StudentNoteRepository {
  readonly notes = new Map<string, StudentNote>();

  find(email: string): Promise<StudentNote | null> {
    return Promise.resolve(this.notes.get(email) ?? null);
  }

  save(note: StudentNote): Promise<void> {
    this.notes.set(note.email, note);
    return Promise.resolve();
  }
}
