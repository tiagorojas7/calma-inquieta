import { Money } from "~/modules/_shared";
import type { StudentSourceOrder } from "~/modules/students";

const total = Money.fromCentavos(5_800_000);
if (!total.ok) throw new Error("student builder money");

const uuid = (kind: number, index: number) =>
  `00000000-0000-4000-8000-${String(kind).padStart(4, "0")}${String(index).padStart(8, "0")}`;

/** A pending order of "Student n"; the overrides replace any field. */
export const studentOrder = (
  index: number,
  overrides: Partial<StudentSourceOrder> = {},
): StudentSourceOrder => ({
  id: uuid(1, index),
  number: `CI-2026-${String(index).padStart(4, "0")}`,
  status: "pending_confirmation",
  requestedAt: new Date(Date.UTC(2026, 9, 1 + index, 15)),
  paidAt: null,
  total: total.value,
  workshopId: uuid(2, 1),
  workshopName: "Cerámica inicial",
  period: "2026-10",
  turnoLabel: "Martes 18:00 a 20:00",
  studentName: `Student ${String(index)}`,
  studentEmail: `student-${String(index)}@example.com`,
  studentPhoneDigits: `549351555${String(index).padStart(4, "0")}`,
  ...overrides,
});
