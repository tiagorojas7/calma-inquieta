import { describe, expect, it } from "vitest";
import {
  ATT_MONDAY,
  ATT_PERIOD,
  ATT_WEDNESDAY,
  attendanceFixture,
} from "~/testing/admin/attendance-kit";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { action, loader } from "./attendance-make-ups";

const PATH = "/admin/asistencia/recuperaciones";

async function setup() {
  const fixture = attendanceFixture();
  const actor = { kind: "admin-actor" as const, email: "a@x.test" };
  await fixture.service.recordSession(
    actor,
    ATT_PERIOD,
    ATT_MONDAY,
    "2026-10-05",
    [
      { email: "ana@example.com", status: "absent" },
      { email: "bea@example.com", status: "absent" },
    ],
  );
  for (const [email, makeUpDate] of [
    ["ana@example.com", "2026-10-14"],
    ["bea@example.com", "2026-10-21"],
  ] as const)
    await fixture.service.scheduleMakeUp(actor, {
      email,
      periodId: ATT_PERIOD,
      turnoId: ATT_MONDAY,
      date: "2026-10-05",
      makeUpPeriodId: ATT_PERIOD,
      makeUpTurnoId: ATT_WEDNESDAY,
      makeUpDate,
    });
  const context = adminContext({ attendance: fixture.service });
  return {
    ...fixture,
    context,
    load: () =>
      loader({
        request: getRequest(PATH),
        params: {},
        context,
      } as never),
    post: (fields: Record<string, string>, ctx = context) =>
      action({
        request: postRequest(PATH, fields),
        params: {},
        context: ctx,
      } as never),
  };
}

describe("admin attendance make-ups route", () => {
  it("lists pending make-ups by date, with the classes involved", async () => {
    const { load } = await setup();

    const result = await load();

    expect(result.pending.map((row) => [row.student, row.makeUp])).toEqual([
      ["Ana Pérez", "Cerámica, Miércoles mañana · Miércoles 14/10/2026"],
      ["Bea Gómez", "Cerámica, Miércoles mañana · Miércoles 21/10/2026"],
    ]);
    expect(result.pending[0]?.absence).toBe(
      "Cerámica, Lunes tarde · Lunes 05/10/2026",
    );
    expect(result.done).toEqual([]);
  });

  it("marks a make-up as done and moves it to the done list", async () => {
    const { post, load, repository } = await setup();
    const id = [...repository.makeUps.keys()][0] ?? "";

    const response = await post({ intent: "complete", id });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${PATH}?ok=completed`);
    const result = await load();
    expect(result.feedback).toBeNull();
    expect(result.pending).toHaveLength(1);
    expect(result.done.map((row) => row.student)).toEqual(["Ana Pérez"]);
    expect(result.done[0]?.doneNote).toBe(
      "Realizada el 06/10/2026 12:00 (a@x.test)",
    );
  });

  it("comes back to the same make-up when the form says where it was", async () => {
    const { post, repository } = await setup();
    const id = [...repository.makeUps.keys()][0] ?? "";

    const response = await post({
      intent: "complete",
      id,
      returnTo: PATH,
      anchor: `recuperacion-${id}`,
    });

    expect(response.headers.get("Location")).toBe(
      `${PATH}?ok=completed#recuperacion-${id}`,
    );
  });

  it("marks a make-up as missed and moves it to the missed list", async () => {
    const { post, load, repository } = await setup();
    const id = [...repository.makeUps.keys()][0] ?? "";

    const response = await post({ intent: "missed", id });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${PATH}?ok=missed`);
    const result = await load();
    expect(result.pending.map((row) => row.student)).toEqual(["Bea Gómez"]);
    expect(result.done).toEqual([]);
    expect(result.missed.map((row) => row.student)).toEqual(["Ana Pérez"]);
    expect(result.missed[0]?.doneNote).toBe(
      "No vino. Lo marcó a@x.test el 06/10/2026 12:00",
    );
  });

  it("refuses to change a done or missed make-up and says it is closed", async () => {
    const { post, load, repository } = await setup();
    const [first = "", second = ""] = [...repository.makeUps.keys()];
    await post({ intent: "complete", id: first });
    await post({ intent: "missed", id: second });

    const missedDone = await post({ intent: "missed", id: first });
    const doneMissed = await post({ intent: "complete", id: second });

    expect(missedDone.headers.get("Location")).toBe(`${PATH}?ok=closed`);
    expect(doneMissed.headers.get("Location")).toBe(`${PATH}?ok=closed`);
    const result = await load();
    expect(result.done.map((row) => row.student)).toEqual(["Ana Pérez"]);
    expect(result.missed.map((row) => row.student)).toEqual(["Bea Gómez"]);
    const closed = await loader({
      request: getRequest(`${PATH}?ok=closed`),
      params: {},
      context: adminContext({ attendance: attendanceFixture().service }),
    } as never);
    expect(closed.feedback).toBe("closed");
  });

  it("answers 400 for an unknown intent and 404 for a bad or unknown id", async () => {
    const { post } = await setup();
    expect(await thrownStatus(() => post({ intent: "nope" }))).toBe(400);
    expect(
      await thrownStatus(() => post({ intent: "complete", id: "x" })),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post({
          intent: "complete",
          id: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04",
        }),
      ),
    ).toBe(404);
  });

  it("refuses a request without an admin actor", async () => {
    const { post, repository } = await setup();
    const denied = adminContext(
      { attendance: attendanceFixture().service },
      { admin: false },
    );
    const id = [...repository.makeUps.keys()][0] ?? "";
    expect(
      await thrownStatus(() => post({ intent: "complete", id }, denied)),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest(PATH),
          params: {},
          context: denied,
        } as never),
      ),
    ).toBe(403);
  });
});
