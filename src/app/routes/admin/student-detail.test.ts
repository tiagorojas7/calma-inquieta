import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  ATT_MONDAY,
  ATT_PERIOD,
  ATT_WEDNESDAY,
  attendanceFixture,
} from "~/testing/admin/attendance-kit";
import { studentsFixture } from "~/testing/admin/student-kit";
import { studentOrder } from "~/testing/fakes/student-builders";
import { action, loader } from "./student-detail";

function setup() {
  const fixture = studentsFixture();
  fixture.orders.orders.push(
    studentOrder(1, {
      studentEmail: "ana@example.com",
      studentName: "Ana Pérez",
      status: "paid",
      paidAt: new Date("2026-10-05T15:00:00Z"),
    }),
    studentOrder(2, {
      studentEmail: "ana@example.com",
      studentName: "Ana Pérez",
      workshopName: "Acuarela",
      status: "cancelled",
    }),
  );
  const context = adminContext({ students: fixture.service });
  return { ...fixture, context };
}

const path = (email: string) => `/admin/alumnas/${encodeURIComponent(email)}`;
const loadArgs = (context: unknown, email: string) =>
  ({ request: getRequest(path(email)), params: { email }, context }) as never;
const actionArgs = (context: unknown, email: string, note: string) =>
  ({
    request: postRequest(path(email), { note }),
    params: { email },
    context,
  }) as never;

describe("admin student detail route", () => {
  it("shows the data, the active workshops, the order and payment history and the note", async () => {
    const { context, notes } = setup();
    notes.notes.set("ana@example.com", {
      email: "ana@example.com",
      text: "Zurda.",
      updatedBy: "owner@example.com",
      updatedAt: new Date("2026-10-31T15:30:00Z"),
    });

    const result = await loader(loadArgs(context, "Ana@Example.com"));

    expect(result).toMatchObject({
      name: "Ana Pérez",
      email: "ana@example.com",
      note: {
        text: "Zurda.",
        meta: "Actualizadas por owner@example.com el 31/10/2026 12:30.",
      },
    });
    expect(result.activities).toEqual([
      {
        workshop: "Cerámica inicial",
        month: "octubre 2026",
        turno: "Martes 18:00 a 20:00",
        status: "paid",
        statusLabel: "Cobrado",
      },
    ]);
    expect(
      result.orders.map((o) => [o.number, o.statusLabel, o.paidOn]),
    ).toEqual([
      ["CI-2026-0002", "Cancelado", null],
      ["CI-2026-0001", "Cobrado", "05/10/2026"],
    ]);
    expect(result.orders[0]).toMatchObject({ total: "$ 58.000" });
  });

  it("answers 404 for an unknown student and for a path that is not an email", async () => {
    const { context } = setup();
    expect(
      await thrownStatus(() => loader(loadArgs(context, "no@example.com"))),
    ).toBe(404);
    expect(
      await thrownStatus(() => loader(loadArgs(context, "not-an-email"))),
    ).toBe(404);
  });

  it("returns nothing to a request that is not an admin", async () => {
    const { service } = studentsFixture();
    const context = adminContext({ students: service }, { admin: false });
    expect(
      await thrownStatus(() => loader(loadArgs(context, "ana@example.com"))),
    ).toBe(403);
  });

  it("saves the note and redirects back to the student", async () => {
    const { context, notes } = setup();

    const response = await action(
      actionArgs(context, "ana@example.com", " Viene con su hermana "),
    );

    expect(response).toBeInstanceOf(Response);
    const redirect = response as Response;
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("Location")).toBe(
      "/admin/alumnas/ana%40example.com",
    );
    expect(notes.notes.get("ana@example.com")).toMatchObject({
      text: "Viene con su hermana",
      updatedBy: "a@x.test",
    });
  });

  it("answers 422 with the typed text when the note is too long", async () => {
    const { context, notes } = setup();
    const long = "x".repeat(2001);

    const result = await action(actionArgs(context, "ana@example.com", long));

    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        error: "Las observaciones no pueden pasar los 2000 caracteres.",
        value: long,
      },
    });
    expect(notes.notes.size).toBe(0);
  });

  it("answers 404 for an unknown student and 400 without a note", async () => {
    const { context } = setup();
    expect(
      await thrownStatus(() =>
        action(actionArgs(context, "no@example.com", "x")),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        action({
          request: postRequest(path("ana@example.com"), {}),
          params: { email: "ana@example.com" },
          context,
        } as never),
      ),
    ).toBe(400);
  });
});

describe("admin student detail attendance summary", () => {
  const actor = { kind: "admin-actor" as const, email: "a@x.test" };

  it("counts presences, absences and make-ups across her classes", async () => {
    const base = studentsFixture();
    base.orders.orders.push(
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
      }),
    );
    const attendance = attendanceFixture();
    const sessions = [
      ["2026-10-05", "absent"],
      ["2026-10-12", "present"],
      ["2026-10-19", "present"],
    ] as const;
    for (const [date, status] of sessions)
      await attendance.service.recordSession(
        actor,
        ATT_PERIOD,
        ATT_MONDAY,
        date,
        [{ email: "ana@example.com", status }],
      );
    await attendance.service.scheduleMakeUp(actor, {
      email: "ana@example.com",
      periodId: ATT_PERIOD,
      turnoId: ATT_MONDAY,
      date: "2026-10-05",
      makeUpPeriodId: ATT_PERIOD,
      makeUpTurnoId: ATT_WEDNESDAY,
      makeUpDate: "2026-10-14",
    });
    const context = adminContext({
      students: base.service,
      attendance: attendance.service,
    });

    const result = await loader(loadArgs(context, "ana@example.com"));

    expect(result.attendance).toEqual({
      present: "2",
      absent: "1",
      makeUpsPending: "1",
      makeUpsDone: "0",
    });
  });

  it("leaves the summary out when attendance is unavailable", async () => {
    const { context } = setup();
    const result = await loader(loadArgs(context, "ana@example.com"));
    expect(result.attendance).toBeNull();
  });
});
