import { describe, expect, it } from "vitest";
import { attendanceFixture } from "~/testing/admin/attendance-kit";
import {
  adminContext,
  getRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { loader } from "./attendance";

const load = (path: string, admin = true) => {
  const { service } = attendanceFixture();
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext({ attendance: service }, { admin }),
  } as never);
};

describe("admin attendance index route", () => {
  it("lists the month turnos with a link to their classes", async () => {
    const result = await load("/admin/asistencia");

    expect(result.filter).toEqual({ mes: "2026-10", taller: "" });
    expect(result.months).toEqual([
      { value: "2026-10", label: "octubre 2026" },
    ]);
    expect(result.rows.map((row) => [row.turno, row.sessions])).toEqual([
      ["Lunes tarde", 4],
      ["Miércoles mañana", 4],
    ]);
    expect(result.rows[0]?.href).toBe(
      "/admin/asistencia/0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01/7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02",
    );
  });

  it("filters by month and workshop from the query string", async () => {
    const none = await load("/admin/asistencia?taller=nope&mes=1999-01");
    expect(none.filter).toEqual({ mes: "2026-10", taller: "" });
    const byWorkshop = await load("/admin/asistencia?taller=w1");
    expect(byWorkshop.rows).toHaveLength(2);
  });

  it("refuses a request without an admin actor", async () => {
    expect(await thrownStatus(() => load("/admin/asistencia", false))).toBe(
      403,
    );
  });
});
