import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryAttendanceRepository } from "~/testing/fakes/in-memory-attendance-repository";
import type { RosterStudent, ScheduledTurno } from "./attendance-ports";
import {
  createAttendanceService,
  createUnavailableAttendanceService,
} from "./attendance-service";

const PERIOD = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
const MONDAY = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
const WEDNESDAY = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
const now = new Date("2026-10-06T15:00:00Z");

const turno = (overrides: Partial<ScheduledTurno> = {}): ScheduledTurno => ({
  periodId: PERIOD,
  workshopId: "w1",
  workshopName: "Cerámica",
  period: "2026-10",
  turnoId: MONDAY,
  turnoLabel: "Lunes tarde",
  weekday: 1,
  startsAt: "18:00",
  endsAt: "20:00",
  ...overrides,
});

const ana: RosterStudent = {
  email: "ana@example.com",
  name: "Ana Pérez",
  orderNumber: "CI-2026-0001",
  feePaid: true,
};
const bea: RosterStudent = {
  email: "bea@example.com",
  name: "Bea Gómez",
  orderNumber: "CI-2026-0002",
  feePaid: true,
};
const caro: RosterStudent = {
  email: "caro@example.com",
  name: "Caro Díaz",
  orderNumber: "CI-2026-0003",
  feePaid: false,
};

function setup() {
  const turnos = [
    turno(),
    turno({ turnoId: WEDNESDAY, turnoLabel: "Miércoles mañana", weekday: 3 }),
  ];
  const roster = [ana, bea, caro];
  const repository = new InMemoryAttendanceRepository();
  const service = createAttendanceService({
    schedule: { listScheduledTurnos: () => Promise.resolve(turnos) },
    roster: { forTurno: () => Promise.resolve(roster) },
    repository,
    clock: fixedClock(now),
    newId: () => "makeup-1",
  });
  return { service, repository, actor: testAdminActor() };
}

describe("attendance service", () => {
  it("denies every call without an admin actor", async () => {
    const { service } = setup();
    const denied = { ok: false, error: { kind: "denied" } };
    await expect(service.listTurnos(null)).resolves.toEqual(denied);
    await expect(service.sessions(undefined, PERIOD, MONDAY)).resolves.toEqual(
      denied,
    );
    await expect(
      service.sheet(null, PERIOD, MONDAY, "2026-10-05"),
    ).resolves.toEqual(denied);
    await expect(
      service.recordSession(null, PERIOD, MONDAY, "2026-10-05", []),
    ).resolves.toEqual(denied);
    await expect(service.listMakeUps(null, "all")).resolves.toEqual(denied);
    await expect(service.completeMakeUp(null, "x")).resolves.toEqual(denied);
    await expect(service.studentSummary(null, "a@b.co")).resolves.toEqual(
      denied,
    );
  });

  it("lists the scheduled turnos", async () => {
    const { service, actor } = setup();
    const listed = await service.listTurnos(actor);
    expect(listed.ok && listed.value.map((t) => t.turnoLabel)).toEqual([
      "Lunes tarde",
      "Miércoles mañana",
    ]);
  });

  it("generates the sessions of a turno with their mark counts", async () => {
    const { service, actor } = setup();
    await service.recordSession(actor, PERIOD, MONDAY, "2026-10-05", [
      { email: "ana@example.com", status: "present" },
      { email: "bea@example.com", status: "absent" },
    ]);

    const result = await service.sessions(actor, PERIOD, MONDAY);

    expect(result.ok && result.value.sessions).toEqual([
      { date: "2026-10-05", marked: 2, present: 1, absent: 1 },
      { date: "2026-10-12", marked: 0, present: 0, absent: 0 },
      { date: "2026-10-19", marked: 0, present: 0, absent: 0 },
      { date: "2026-10-26", marked: 0, present: 0, absent: 0 },
    ]);
    expect(result.ok && result.value.turno.turnoLabel).toBe("Lunes tarde");
  });

  it("answers not found for an unknown turno", async () => {
    const { service, actor } = setup();
    await expect(
      service.sessions(actor, PERIOD, "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04"),
    ).resolves.toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it("shows the roster with fee state, marks and make-ups for a session", async () => {
    const { service, actor } = setup();
    await service.recordSession(actor, PERIOD, MONDAY, "2026-10-05", [
      { email: "ana@example.com", status: "absent" },
    ]);
    await service.scheduleMakeUp(actor, {
      email: "ana@example.com",
      periodId: PERIOD,
      turnoId: MONDAY,
      date: "2026-10-05",
      makeUpPeriodId: PERIOD,
      makeUpTurnoId: WEDNESDAY,
      makeUpDate: "2026-10-14",
    });

    const sheet = await service.sheet(actor, PERIOD, MONDAY, "2026-10-05");

    expect(sheet.ok && sheet.value.rows).toEqual([
      {
        email: "ana@example.com",
        name: "Ana Pérez",
        orderNumber: "CI-2026-0001",
        feePaid: true,
        status: "absent",
        makeUp: { id: "makeup-1", status: "pending" },
      },
      {
        email: "bea@example.com",
        name: "Bea Gómez",
        orderNumber: "CI-2026-0002",
        feePaid: true,
        status: null,
        makeUp: null,
      },
      {
        email: "caro@example.com",
        name: "Caro Díaz",
        orderNumber: "CI-2026-0003",
        feePaid: false,
        status: null,
        makeUp: null,
      },
    ]);
  });

  it("answers not found for a date that is not a session of the turno", async () => {
    const { service, actor } = setup();
    const missing = { ok: false, error: { kind: "not-found" } };
    await expect(
      service.sheet(actor, PERIOD, MONDAY, "2026-10-06"),
    ).resolves.toEqual(missing);
    await expect(
      service.recordSession(actor, PERIOD, MONDAY, "2026-11-02", []),
    ).resolves.toEqual(missing);
  });

  it("records a session in one go, replacing earlier marks and stamping the actor", async () => {
    const { service, repository, actor } = setup();
    await service.recordSession(actor, PERIOD, MONDAY, "2026-10-05", [
      { email: "ana@example.com", status: "absent" },
      { email: "bea@example.com", status: "present" },
    ]);
    const result = await service.recordSession(
      actor,
      PERIOD,
      MONDAY,
      "2026-10-05",
      [{ email: "ana@example.com", status: "present" }],
    );

    expect(result).toEqual({ ok: true, value: { recorded: 1 } });
    expect(repository.marks).toEqual([
      {
        periodId: PERIOD,
        turnoId: MONDAY,
        date: "2026-10-05",
        email: "ana@example.com",
        status: "present",
        markedBy: "owner@example.com",
        markedAt: now,
      },
    ]);
  });

  it("refuses marks for someone outside the paid roster", async () => {
    const { service, repository, actor } = setup();
    const invalid = {
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "marks", code: "unknown-reference" }],
      },
    };
    await expect(
      service.recordSession(actor, PERIOD, MONDAY, "2026-10-05", [
        { email: "caro@example.com", status: "present" },
      ]),
    ).resolves.toEqual(invalid);
    await expect(
      service.recordSession(actor, PERIOD, MONDAY, "2026-10-05", [
        { email: "otra@example.com", status: "present" },
      ]),
    ).resolves.toEqual(invalid);
    expect(repository.marks).toEqual([]);
  });

  describe("make-up classes", () => {
    const input = {
      email: "ana@example.com",
      periodId: PERIOD,
      turnoId: MONDAY,
      date: "2026-10-05",
      makeUpPeriodId: PERIOD,
      makeUpTurnoId: WEDNESDAY,
      makeUpDate: "2026-10-14",
    };

    async function withAbsence() {
      const context = setup();
      await context.service.recordSession(
        context.actor,
        PERIOD,
        MONDAY,
        "2026-10-05",
        [{ email: "ana@example.com", status: "absent" }],
      );
      return context;
    }

    it("schedules a pending make-up for a recorded absence", async () => {
      const { service, actor } = await withAbsence();

      const result = await service.scheduleMakeUp(actor, input);

      expect(result).toEqual({
        ok: true,
        value: {
          id: "makeup-1",
          email: "ana@example.com",
          studentName: "Ana Pérez",
          periodId: PERIOD,
          turnoId: MONDAY,
          date: "2026-10-05",
          makeUpPeriodId: PERIOD,
          makeUpTurnoId: WEDNESDAY,
          makeUpDate: "2026-10-14",
          status: "pending",
          createdBy: "owner@example.com",
          createdAt: now,
          doneBy: null,
          doneAt: null,
        },
      });
    });

    it("refuses a make-up when the student was not marked absent", async () => {
      const { service, actor } = setup();
      await service.recordSession(actor, PERIOD, MONDAY, "2026-10-05", [
        { email: "ana@example.com", status: "present" },
      ]);
      await expect(service.scheduleMakeUp(actor, input)).resolves.toEqual({
        ok: false,
        error: {
          kind: "invalid",
          issues: [{ field: "student", code: "not-selectable" }],
        },
      });
    });

    it("refuses a make-up date outside the weekday of the chosen turno", async () => {
      const { service, actor } = await withAbsence();
      await expect(
        service.scheduleMakeUp(actor, { ...input, makeUpDate: "2026-10-15" }),
      ).resolves.toEqual({
        ok: false,
        error: {
          kind: "invalid",
          issues: [{ field: "makeUpDate", code: "not-selectable" }],
        },
      });
    });

    it("refuses a make-up turno that is not scheduled", async () => {
      const { service, actor } = await withAbsence();
      await expect(
        service.scheduleMakeUp(actor, {
          ...input,
          makeUpTurnoId: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04",
        }),
      ).resolves.toEqual({
        ok: false,
        error: {
          kind: "invalid",
          issues: [{ field: "makeUpTurno", code: "unknown-reference" }],
        },
      });
    });

    it("refuses a second make-up for the same absence", async () => {
      const { service, actor } = await withAbsence();
      await service.scheduleMakeUp(actor, input);
      await expect(service.scheduleMakeUp(actor, input)).resolves.toEqual({
        ok: false,
        error: { kind: "make-up-exists" },
      });
    });

    it("lists make-ups by status with the activity names", async () => {
      const { service, actor } = await withAbsence();
      await service.scheduleMakeUp(actor, input);

      const pending = await service.listMakeUps(actor, "pending");
      const done = await service.listMakeUps(actor, "done");

      expect(pending.ok && pending.value).toMatchObject([
        {
          id: "makeup-1",
          workshopName: "Cerámica",
          turnoLabel: "Lunes tarde",
          makeUpWorkshopName: "Cerámica",
          makeUpTurnoLabel: "Miércoles mañana",
        },
      ]);
      expect(done).toEqual({ ok: true, value: [] });
    });

    it("completes a make-up, keeps completing idempotent and 404s unknown ids", async () => {
      const { service, actor } = await withAbsence();
      await service.scheduleMakeUp(actor, input);

      const done = await service.completeMakeUp(actor, "makeup-1");
      expect(done).toMatchObject({
        ok: true,
        value: { status: "done", doneBy: "owner@example.com", doneAt: now },
      });
      await expect(service.completeMakeUp(actor, "makeup-1")).resolves.toEqual(
        done,
      );
      await expect(service.completeMakeUp(actor, "nope")).resolves.toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
    });
  });

  it("summarizes a student's attendance across turnos", async () => {
    const { service, actor } = setup();
    await service.recordSession(actor, PERIOD, MONDAY, "2026-10-05", [
      { email: "ana@example.com", status: "absent" },
    ]);
    await service.recordSession(actor, PERIOD, MONDAY, "2026-10-12", [
      { email: "ana@example.com", status: "present" },
    ]);
    await service.scheduleMakeUp(actor, {
      email: "ana@example.com",
      periodId: PERIOD,
      turnoId: MONDAY,
      date: "2026-10-05",
      makeUpPeriodId: PERIOD,
      makeUpTurnoId: WEDNESDAY,
      makeUpDate: "2026-10-14",
    });

    await expect(
      service.studentSummary(actor, "Ana@Example.com "),
    ).resolves.toEqual({
      ok: true,
      value: { present: 1, absent: 1, makeUpsPending: 1, makeUpsDone: 0 },
    });
  });

  it("fails closed as unavailable once authorized", async () => {
    const service = createUnavailableAttendanceService();
    const unavailable = { ok: false, error: { kind: "unavailable" } };
    await expect(service.listTurnos(testAdminActor())).resolves.toEqual(
      unavailable,
    );
    await expect(service.listTurnos(null)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });
});
