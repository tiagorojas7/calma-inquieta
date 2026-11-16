import { describe, expect, it } from "vitest";
import type { ScheduledTurno } from "~/modules/attendance";
import {
  ATT_MONDAY,
  ATT_PERIOD,
  ATT_TURNOS,
  ATT_UNKNOWN,
  attendanceFixture,
} from "~/testing/admin/attendance-kit";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { action, loader } from "./attendance-sheet";

const DATE = "2026-10-05";
const path = (date = DATE) =>
  `/admin/asistencia/${ATT_PERIOD}/${ATT_MONDAY}/${date}`;

function setup(options: Parameters<typeof attendanceFixture>[0] = {}) {
  const fixture = attendanceFixture(options);
  const context = adminContext({ attendance: fixture.service });
  const params = (date = DATE) => ({
    periodId: ATT_PERIOD,
    turnoId: ATT_MONDAY,
    date,
  });
  return {
    ...fixture,
    context,
    load: (date = DATE, url = path(date)) =>
      loader({
        request: getRequest(url),
        params: params(date),
        context,
      } as never),
    save: (fields: Record<string, string>, date = DATE) =>
      action({
        request: postRequest(path(date), fields),
        params: params(date),
        context,
      } as never),
  };
}

describe("admin attendance sheet route", () => {
  it("shows the roster with fee state and no marks yet", async () => {
    const { load } = setup();

    const result = await load();

    expect(result.heading).toBe("Lunes 05/10/2026");
    expect(
      result.rows.map((row) => [row.name, row.feePaid, row.status]),
    ).toEqual([
      ["Ana Pérez", true, null],
      ["Bea Gómez", true, null],
      ["Caro Díaz", false, null],
    ]);
    expect(result.feedback).toBeNull();
  });

  it("answers 404 for ids, dates and turnos that do not exist", async () => {
    const { context } = setup();
    const run = (periodId: string, turnoId: string, date: string) => () =>
      loader({
        request: getRequest(path(date)),
        params: { periodId, turnoId, date },
        context,
      } as never);
    expect(await thrownStatus(run("x", ATT_MONDAY, DATE))).toBe(404);
    expect(await thrownStatus(run(ATT_PERIOD, ATT_UNKNOWN, DATE))).toBe(404);
    expect(await thrownStatus(run(ATT_PERIOD, ATT_MONDAY, "2026-13-40"))).toBe(
      404,
    );
    expect(await thrownStatus(run(ATT_PERIOD, ATT_MONDAY, "2026-10-06"))).toBe(
      404,
    );
  });

  it("records every mark with one post and redirects back to the sheet", async () => {
    const { save, load, repository } = setup();

    const response = (await save({
      intent: "save",
      "status:ana@example.com": "present",
      "status:bea@example.com": "absent",
    })) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${path()}?ok=saved`);
    expect(repository.marks.map((m) => [m.email, m.status])).toEqual([
      ["ana@example.com", "present"],
      ["bea@example.com", "absent"],
    ]);
    const after = await load(DATE, `${path()}?ok=saved`);
    expect(after.feedback).toBe("saved");
    expect(after.rows.map((row) => row.status)).toEqual([
      "present",
      "absent",
      null,
    ]);
  });

  it("records the mark of a student whose fee is pending", async () => {
    const { save, repository } = setup();

    const response = (await save({
      intent: "save",
      "status:caro@example.com": "absent",
    })) as Response;

    expect(response.status).toBe(302);
    expect(repository.marks.map((m) => [m.email, m.status])).toEqual([
      ["caro@example.com", "absent"],
    ]);
  });

  it("answers 422 with a message when a mark is for someone outside the roster", async () => {
    const { save, repository } = setup();

    const result = (await save({
      intent: "save",
      "status:otra@example.com": "present",
    })) as { data: { error: string }; init: { status: number } };

    expect(result.init.status).toBe(422);
    expect(result.data.error).toBe(
      "No pudimos guardar la asistencia. Revisá los datos e intentá de nuevo.",
    );
    expect(repository.marks).toEqual([]);
  });

  it("rejects an unknown intent, a bad date and a missing admin", async () => {
    const { save } = setup();
    expect(await thrownStatus(() => save({ intent: "nope" }))).toBe(400);
    expect(await thrownStatus(() => save({ intent: "save" }, "bad"))).toBe(404);
    const denied = adminContext(
      { attendance: attendanceFixture().service },
      { admin: false },
    );
    expect(
      await thrownStatus(() =>
        action({
          request: postRequest(path(), { intent: "save" }),
          params: { periodId: ATT_PERIOD, turnoId: ATT_MONDAY, date: DATE },
          context: denied,
        } as never),
      ),
    ).toBe(403);
  });
});

describe("admin attendance sheet make-up classes", () => {
  const WED = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
  const makeUp = (overrides: Record<string, string> = {}) => ({
    intent: "makeup",
    email: "ana@example.com",
    makeUpTurno: `${ATT_PERIOD}:${WED}`,
    makeUpDate: "2026-10-14",
    ...overrides,
  });

  async function withAbsence() {
    const context = setup();
    await context.save({
      intent: "save",
      "status:ana@example.com": "absent",
    });
    return context;
  }

  const otherWorkshop: ScheduledTurno = {
    ...(ATT_TURNOS[1] as ScheduledTurno),
    workshopId: "w2",
    workshopName: "Acuarela",
    turnoId: "5e4d3c2b-1a09-4f8e-9d7c-6b5a4f3e2d10",
    turnoLabel: "Jueves tarde",
    weekday: 4,
  };

  it("offers only the other turnos of the same workshop as make-up choices", async () => {
    const { load } = setup({ turnos: [...ATT_TURNOS, otherWorkshop] });
    const result = await load();
    expect(result.makeUpTurnos.map((option) => option.label)).toEqual([
      "Cerámica, Miércoles mañana (octubre 2026)",
    ]);
  });

  it("answers 422 for a make-up in the own turno or in another workshop", async () => {
    const { save, repository } = setup({
      turnos: [...ATT_TURNOS, otherWorkshop],
    });
    await save({ intent: "save", "status:ana@example.com": "absent" });
    const rejected = async (turno: string, date: string) =>
      (
        (await save(
          makeUp({ makeUpTurno: `${ATT_PERIOD}:${turno}`, makeUpDate: date }),
        )) as { data: { makeUp: { errors: Record<string, string> } } }
      ).data.makeUp.errors;

    expect(await rejected(ATT_MONDAY, "2026-10-12")).toEqual({
      makeUpTurno: "Elegí otro turno del mismo taller.",
    });
    expect(await rejected(otherWorkshop.turnoId, "2026-10-15")).toEqual({
      makeUpTurno: "Elegí otro turno del mismo taller.",
    });
    expect(repository.makeUps.size).toBe(0);
  });

  it("answers 422 for a make-up date outside the month of the turno", async () => {
    const { save, repository } = await withAbsence();
    const result = (await save(makeUp({ makeUpDate: "2026-11-04" }))) as {
      data: { makeUp: { errors: Record<string, string> } };
    };
    expect(result.data.makeUp.errors).toEqual({
      makeUpDate:
        "Elegí una fecha dentro del mes del turno, en su día de la semana.",
    });
    expect(repository.makeUps.size).toBe(0);
  });

  it("schedules the make-up and warns when the make-up turno is full", async () => {
    const { save, load, repository } = setup({ wednesdayCapacity: 3 });
    await save({ intent: "save", "status:ana@example.com": "absent" });

    const response = (await save(makeUp())) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${path()}?ok=makeup-full`);
    expect(repository.makeUps.size).toBe(1);
    const after = await load(DATE, `${path()}?ok=makeup-full`);
    expect(after.feedback).toBe("makeup-full");
    expect(after.makeUpFullWarning).toBe(
      "La recuperación quedó programada, pero ese turno ya no tiene lugares libres ese día.",
    );
  });

  it("answers 422 when an absence with a make-up is turned into a presence", async () => {
    const { save, repository } = await withAbsence();
    await save(makeUp());

    const result = (await save({
      intent: "save",
      "status:ana@example.com": "present",
    })) as { data: { error: string }; init: { status: number } };

    expect(result.init.status).toBe(422);
    expect(result.data.error).toBe(
      "Una alumna con una recuperación programada no puede pasar a presente. Resolvé primero la recuperación.",
    );
    expect(repository.marks.map((m) => m.status)).toEqual(["absent"]);
  });

  it("schedules a pending make-up for an absent student and shows it", async () => {
    const { save, load, repository } = await withAbsence();

    const response = (await save(makeUp())) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${path()}?ok=makeup-scheduled`,
    );
    expect([...repository.makeUps.values()]).toMatchObject([
      {
        email: "ana@example.com",
        date: DATE,
        makeUpTurnoId: WED,
        makeUpDate: "2026-10-14",
        status: "pending",
        createdBy: "a@x.test",
      },
    ]);
    const after = await load();
    expect(after.rows[0]?.makeUp).toEqual({
      status: "pending",
      label: "Recuperación pendiente",
    });
  });

  it("answers 422 with the field error and keeps what was typed", async () => {
    const { save, repository } = await withAbsence();

    const result = (await save(makeUp({ makeUpDate: "2026-10-15" }))) as {
      data: { makeUp: { errors: Record<string, string>; values: object } };
      init: { status: number };
    };

    expect(result.init.status).toBe(422);
    expect(result.data.makeUp.errors).toEqual({
      makeUpDate:
        "Elegí una fecha dentro del mes del turno, en su día de la semana.",
    });
    expect(result.data.makeUp.values).toEqual({
      makeUpTurno: `${ATT_PERIOD}:${WED}`,
      makeUpDate: "2026-10-15",
    });
    expect(repository.makeUps.size).toBe(0);
  });

  it("answers 422 for a turno choice that is not a turno reference", async () => {
    const { save } = await withAbsence();
    const result = (await save(makeUp({ makeUpTurno: "nope" }))) as {
      data: { makeUp: { errors: Record<string, string> } };
    };
    expect(result.data.makeUp.errors).toEqual({
      makeUpTurno: "Elegí un turno de la lista.",
    });
  });

  it("answers 422 for a student who was not marked absent", async () => {
    const { save } = setup();
    const result = (await save(makeUp())) as {
      data: { makeUp: { errors: Record<string, string> } };
    };
    expect(result.data.makeUp.errors).toEqual({
      student:
        "Solo se puede programar la recuperación de una alumna marcada como ausente.",
    });
  });

  it("answers 422 with the used-make-up message once the make-up was missed", async () => {
    const { save, service, repository } = await withAbsence();
    await save(makeUp());
    const actor = { kind: "admin-actor" as const, email: "a@x.test" };
    await service.markMakeUpMissed(
      actor,
      [...repository.makeUps.keys()][0] ?? "",
    );

    const result = (await save(makeUp())) as {
      data: { makeUp: { formError: string } };
    };

    expect(result.data.makeUp.formError).toBe(
      "La recuperación de esta ausencia ya se usó. Una ausencia tiene una sola recuperación.",
    );
    expect(repository.makeUps.size).toBe(1);
  });

  it("answers 422 when the absence already has a make-up", async () => {
    const { save } = await withAbsence();
    await save(makeUp());
    const result = (await save(makeUp())) as {
      data: { makeUp: { formError: string } };
    };
    expect(result.data.makeUp.formError).toBe(
      "Esta ausencia ya tiene una recuperación programada.",
    );
  });
});
