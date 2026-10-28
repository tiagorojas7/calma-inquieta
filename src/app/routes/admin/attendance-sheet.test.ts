import { describe, expect, it } from "vitest";
import {
  ATT_MONDAY,
  ATT_PERIOD,
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

function setup() {
  const fixture = attendanceFixture();
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
    expect(result.saved).toBe(false);
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
    expect(response.headers.get("Location")).toBe(`${path()}?guardado=1`);
    expect(repository.marks.map((m) => [m.email, m.status])).toEqual([
      ["ana@example.com", "present"],
      ["bea@example.com", "absent"],
    ]);
    const after = await load(DATE, `${path()}?guardado=1`);
    expect(after.saved).toBe(true);
    expect(after.rows.map((row) => row.status)).toEqual([
      "present",
      "absent",
      null,
    ]);
  });

  it("answers 422 with a message when a mark is for someone outside the paid roster", async () => {
    const { save, repository } = setup();

    const result = (await save({
      intent: "save",
      "status:caro@example.com": "present",
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
