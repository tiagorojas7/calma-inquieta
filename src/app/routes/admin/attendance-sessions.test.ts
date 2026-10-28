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
  thrownStatus,
} from "~/testing/admin/route-kit";
import { loader } from "./attendance-sessions";

const load = (periodId: string, turnoId: string, admin = true) => {
  const { service } = attendanceFixture();
  return loader({
    request: getRequest(`/admin/asistencia/${periodId}/${turnoId}`),
    params: { periodId, turnoId },
    context: adminContext({ attendance: service }, { admin }),
  } as never);
};

describe("admin attendance sessions route", () => {
  it("shows the generated class dates of the turno", async () => {
    const result = await load(ATT_PERIOD, ATT_MONDAY);

    expect(result.heading).toBe("Cerámica, Lunes tarde");
    expect(result.rows.map((row) => row.date)).toEqual([
      "Lunes 05/10/2026",
      "Lunes 12/10/2026",
      "Lunes 19/10/2026",
      "Lunes 26/10/2026",
    ]);
  });

  it("answers 404 for a bad or unknown id and 403 without an admin", async () => {
    expect(await thrownStatus(() => load("x", ATT_MONDAY))).toBe(404);
    expect(await thrownStatus(() => load(ATT_PERIOD, ATT_UNKNOWN))).toBe(404);
    expect(await thrownStatus(() => load(ATT_PERIOD, ATT_MONDAY, false))).toBe(
      403,
    );
  });
});
