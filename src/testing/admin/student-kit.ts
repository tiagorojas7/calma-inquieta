import { createStudentsService } from "~/modules/students";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryStudentNoteRepository } from "~/testing/fakes/in-memory-student-note-repository";
import { InMemoryStudentOrderSource } from "~/testing/fakes/in-memory-student-order-source";

/** Real students service over the in-memory order source and note repository. */
export function studentsFixture() {
  const orders = new InMemoryStudentOrderSource();
  const notes = new InMemoryStudentNoteRepository();
  const service = createStudentsService({
    orders,
    notes,
    clock: fixedClock(new Date("2026-10-31T15:30:00.000Z")),
  });
  return { orders, notes, service };
}
