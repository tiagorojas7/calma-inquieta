import { describe, expect, it } from "vitest";
import type {
  AttendanceRepository,
  StoredMakeUp,
  StoredMark,
} from "~/modules/attendance";

export const PERIOD_A = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const TURNO_A = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
export const TURNO_B = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
export const MAKEUP_A = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04";
export const MAKEUP_B = "1d2c3b4a-5f6e-4d7c-8b9a-0f1e2d3c4b05";

export function buildMark(overrides: Partial<StoredMark> = {}): StoredMark {
  return {
    periodId: PERIOD_A,
    turnoId: TURNO_A,
    date: "2026-10-05",
    email: "ana@example.com",
    status: "present",
    markedBy: "owner@example.com",
    markedAt: new Date("2026-10-05T22:00:00.000Z"),
    ...overrides,
  };
}

export function buildMakeUp(
  overrides: Partial<StoredMakeUp> = {},
): StoredMakeUp {
  return {
    id: MAKEUP_A,
    email: "ana@example.com",
    studentName: "Ana Pérez",
    periodId: PERIOD_A,
    turnoId: TURNO_A,
    date: "2026-10-05",
    makeUpPeriodId: PERIOD_A,
    makeUpTurnoId: TURNO_B,
    makeUpDate: "2026-10-14",
    status: "pending",
    createdBy: "owner@example.com",
    createdAt: new Date("2026-10-06T12:00:00.000Z"),
    doneBy: null,
    doneAt: null,
    ...overrides,
  };
}

const session = (date: string) => ({
  periodId: PERIOD_A,
  turnoId: TURNO_A,
  date,
});

/** Behavior every AttendanceRepository implementation must satisfy. */
export function runAttendanceRepositoryContract(
  create: () => Promise<AttendanceRepository>,
): void {
  describe("AttendanceRepository contract", () => {
    it("round-trips marks ordered by date and email", async () => {
      const repo = await create();
      const later = buildMark({ date: "2026-10-12", email: "bea@example.com" });
      const second = buildMark({ email: "bea@example.com", status: "absent" });
      const first = buildMark({ email: "ana@example.com" });
      await repo.replaceSession(session("2026-10-12"), [later]);
      await repo.replaceSession(session("2026-10-05"), [second, first]);

      expect(await repo.marksForTurno(PERIOD_A, TURNO_A)).toEqual([
        first,
        second,
        later,
      ]);
    });

    it("replaces only the marks of the given session", async () => {
      const repo = await create();
      const other = buildMark({ date: "2026-10-12" });
      await repo.replaceSession(session("2026-10-12"), [other]);
      await repo.replaceSession(session("2026-10-05"), [
        buildMark({ email: "ana@example.com", status: "absent" }),
        buildMark({ email: "bea@example.com" }),
      ]);
      await repo.replaceSession(session("2026-10-05"), [
        buildMark({ email: "ana@example.com", status: "present" }),
      ]);

      const marks = await repo.marksForTurno(PERIOD_A, TURNO_A);
      expect(marks.map((m) => [m.date, m.email, m.status])).toEqual([
        ["2026-10-05", "ana@example.com", "present"],
        ["2026-10-12", "ana@example.com", "present"],
      ]);
    });

    it("clears a session when replaced with no marks", async () => {
      const repo = await create();
      await repo.replaceSession(session("2026-10-05"), [buildMark()]);
      await repo.replaceSession(session("2026-10-05"), []);
      expect(await repo.marksForTurno(PERIOD_A, TURNO_A)).toEqual([]);
    });

    it("keeps turnos apart and finds marks by student", async () => {
      const repo = await create();
      const mine = buildMark();
      await repo.replaceSession(session("2026-10-05"), [mine]);
      await repo.replaceSession(
        { periodId: PERIOD_A, turnoId: TURNO_B, date: "2026-10-07" },
        [buildMark({ turnoId: TURNO_B, date: "2026-10-07" })],
      );

      expect(await repo.marksForTurno(PERIOD_A, TURNO_A)).toEqual([mine]);
      expect(await repo.marksByStudent("ana@example.com")).toHaveLength(2);
      expect(await repo.marksByStudent("nadie@example.com")).toEqual([]);
    });

    it("round-trips a make-up and refuses a second one for the same absence", async () => {
      const repo = await create();
      const makeUp = buildMakeUp();
      expect(await repo.insertMakeUp(makeUp)).toEqual({
        ok: true,
        value: undefined,
      });
      expect(await repo.insertMakeUp(buildMakeUp({ id: MAKEUP_B }))).toEqual({
        ok: false,
        error: { kind: "make-up-exists" },
      });

      expect(await repo.listMakeUps("all")).toEqual([makeUp]);
      expect(await repo.makeUpsByStudent("ana@example.com")).toEqual([makeUp]);
      expect(await repo.makeUpsForTurno(PERIOD_A, TURNO_A)).toEqual([makeUp]);
      expect(await repo.makeUpsForTurno(PERIOD_A, TURNO_B)).toEqual([]);
    });

    it("lists make-ups by status ordered by make-up date", async () => {
      const repo = await create();
      const late = buildMakeUp({ makeUpDate: "2026-10-21" });
      const soon = buildMakeUp({
        id: MAKEUP_B,
        date: "2026-10-12",
        makeUpDate: "2026-10-14",
      });
      await repo.insertMakeUp(late);
      await repo.insertMakeUp(soon);
      const at = new Date("2026-10-15T12:00:00.000Z");
      await repo.completeMakeUp(MAKEUP_B, { by: "owner@example.com", at });

      expect((await repo.listMakeUps("all")).map((m) => m.id)).toEqual([
        MAKEUP_B,
        MAKEUP_A,
      ]);
      expect((await repo.listMakeUps("pending")).map((m) => m.id)).toEqual([
        MAKEUP_A,
      ]);
      expect((await repo.listMakeUps("done")).map((m) => m.id)).toEqual([
        MAKEUP_B,
      ]);
    });

    it("completes a pending make-up once and keeps the first completion", async () => {
      const repo = await create();
      await repo.insertMakeUp(buildMakeUp());
      const first = new Date("2026-10-15T12:00:00.000Z");

      const done = await repo.completeMakeUp(MAKEUP_A, {
        by: "owner@example.com",
        at: first,
      });
      expect(done).toMatchObject({
        status: "done",
        doneBy: "owner@example.com",
        doneAt: first,
      });

      const again = await repo.completeMakeUp(MAKEUP_A, {
        by: "other@example.com",
        at: new Date("2026-10-16T12:00:00.000Z"),
      });
      expect(again).toEqual(done);
      expect(await repo.completeMakeUp(MAKEUP_B, { by: "x", at: first })).toBe(
        null,
      );
    });
  });
}
