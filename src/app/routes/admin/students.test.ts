import { describe, expect, it } from "vitest";
import { err, ok } from "~/modules/_shared";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { studentsFixture } from "~/testing/admin/student-kit";
import { studentOrder } from "~/testing/fakes/student-builders";
import { loader } from "./students";

const WORKSHOP = "00000000-0000-4000-8000-000000000002";

function load(path = "/admin/alumnas", admin = true) {
  const { orders, service } = studentsFixture();
  orders.orders.push(
    studentOrder(1, {
      studentEmail: "ana@example.com",
      studentName: "Ana Pérez",
      workshopId: WORKSHOP,
    }),
    studentOrder(2, {
      studentEmail: "ANA@example.com",
      studentName: "Ana Pérez",
      workshopId: "00000000-0000-4000-8000-000000000009",
      workshopName: "Acuarela",
    }),
    studentOrder(3, { studentEmail: "bea@example.com", studentName: "Bea" }),
  );
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext(
      {
        students: service,
        monthlyWorkshops: withOverrides(
          createUnavailableService<MonthlyWorkshopsService>(),
          {
            list: () =>
              Promise.resolve(
                ok([{ id: WORKSHOP, name: "Cerámica inicial" }] as never),
              ),
          },
        ),
      },
      { admin },
    ),
  } as never);
}

describe("admin students list route", () => {
  it("lists one row per person with her workshops, even across several orders", async () => {
    const result = await load();

    expect(result.rows.map((row) => row.email)).toEqual([
      "bea@example.com",
      "ana@example.com",
    ]);
    expect(result.rows[1]).toMatchObject({
      name: "Ana Pérez",
      workshops: "Acuarela, Cerámica inicial",
      orders: 2,
      lastRequest: "03/10/2026",
    });
    expect(result.workshops).toEqual([
      { id: WORKSHOP, name: "Cerámica inicial" },
    ]);
    expect(result.statuses[0]).toEqual({
      value: "pending_confirmation",
      label: "Pendiente de confirmación",
    });
    expect(result.hasNext).toBe(false);
  });

  it("searches and filters by workshop from the query string", async () => {
    const byText = await load("/admin/alumnas?q=bea%40");
    expect(byText.rows.map((row) => row.email)).toEqual(["bea@example.com"]);

    const byWorkshop = await load(`/admin/alumnas?taller=${WORKSHOP}`);
    expect(byWorkshop.rows.map((row) => row.email)).toEqual([
      "ana@example.com",
    ]);
    expect(byWorkshop.filter.taller).toBe(WORKSHOP);
  });

  it("ignores an unknown status and a malformed workshop instead of failing", async () => {
    const result = await load("/admin/alumnas?estado=nope&taller=zzz");
    expect(result.rows).toHaveLength(2);
    expect(result.filter).toMatchObject({ estado: "", taller: "" });
  });

  it("returns no student data to a request that is not an admin", async () => {
    expect(await thrownStatus(() => load("/admin/alumnas", false))).toBe(403);
  });

  it("fails closed when the service is unavailable", async () => {
    const unavailable = () =>
      Promise.resolve(err({ kind: "unavailable" as const }));
    const context = adminContext({
      students: {
        list: unavailable,
        detail: unavailable,
        saveNote: unavailable,
      },
    });
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/alumnas"),
          params: {},
          context,
        } as never),
      ),
    ).toBe(503);
  });
});
