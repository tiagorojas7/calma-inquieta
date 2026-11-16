import { createStudentsService } from "~/modules/students";
import { InMemoryStudentActivityStore } from "~/testing/fakes/enrollments-student-activity-store";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryStudentNoteRepository } from "~/testing/fakes/in-memory-student-note-repository";
import { InMemoryStudentOrderSource } from "~/testing/fakes/in-memory-student-order-source";

/** Real students service over the in-memory order source, note repository and activity store. */
export function studentsFixture() {
  const orders = new InMemoryStudentOrderSource();
  const notes = new InMemoryStudentNoteRepository();
  const activity = new InMemoryStudentActivityStore();
  const service = createStudentsService({
    orders,
    notes,
    activity,
    clock: fixedClock(new Date("2026-10-31T15:30:00.000Z")),
  });
  return { orders, notes, activity, service };
}
