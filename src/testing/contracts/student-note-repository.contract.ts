import { describe, expect, it } from "vitest";
import type { StudentNote, StudentNoteRepository } from "~/modules/students";

const note = (overrides: Partial<StudentNote> = {}): StudentNote => ({
  email: "ana@example.com",
  text: "Prefiere el turno de la tarde.",
  updatedBy: "owner@example.com",
  updatedAt: new Date("2026-10-30T15:00:00Z"),
  ...overrides,
});

/** Behavior every student note repository implementation must share. */
export function runStudentNoteRepositoryContract(
  setup: () => Promise<StudentNoteRepository> | StudentNoteRepository,
): void {
  describe("StudentNoteRepository contract", () => {
    it("finds nothing for a student without a note", async () => {
      const repository = await setup();
      await expect(repository.find("ana@example.com")).resolves.toBeNull();
    });

    it("saves a note and reads it back", async () => {
      const repository = await setup();
      await repository.save(note());
      await expect(repository.find("ana@example.com")).resolves.toEqual(note());
    });

    it("replaces the note of the same student and keeps the others", async () => {
      const repository = await setup();
      await repository.save(note());
      await repository.save(note({ email: "bea@example.com", text: "Otra." }));
      const later = note({
        text: "Cambió de turno.",
        updatedBy: "other@example.com",
        updatedAt: new Date("2026-11-02T12:00:00Z"),
      });
      await repository.save(later);

      await expect(repository.find("ana@example.com")).resolves.toEqual(later);
      await expect(repository.find("bea@example.com")).resolves.toMatchObject({
        text: "Otra.",
      });
    });
  });
}
