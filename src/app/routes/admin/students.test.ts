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
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { studentsFixture } from "~/testing/admin/student-kit";
import { studentOrder } from "~/testing/fakes/student-builders";
import { loader } from "./students";

const WORKSHOP = "00000000-0000-4000-8000-000000000002";

async function load(
  path = "/admin/alumnas",
  admin = true,
  inactive: readonly string[] = [],
) {
  const { orders, activity, service } = studentsFixture();
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
  activity.enrolled(...orders.orders.map((order) => order.studentEmail));
  for (const email of inactive)
    await service.setActive(testAdminActor(), email, false);
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
  it("lists one card per person with her current workshop and month and what she owes, even across several orders", async () => {
    const result = await load();

    expect(result.rows.map((row) => row.email)).toEqual([
      "bea@example.com",
      "ana@example.com",
    ]);
    expect(result.rows[1]).toMatchObject({
      name: "Ana Pérez",
      current: "Acuarela · octubre 2026",
      owes: "$ 116.000",
    });
    expect(result.rows[0]).toMatchObject({
      current: "Cerámica inicial · octubre 2026",
      owes: "$ 58.000",
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

  it("owes nothing once everything is paid, and a cancelled order is never owed", async () => {
    const { orders, activity, service } = studentsFixture();
    orders.orders.push(
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
        status: "paid",
      }),
      studentOrder(2, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
        status: "cancelled",
      }),
    );
    activity.enrolled("ana@example.com");
    const result = await loader({
      request: getRequest("/admin/alumnas"),
      params: {},
      context: adminContext({ students: service }),
    } as never);

    expect(result.rows[0]).toMatchObject({ owes: null });
  });

  it("counts a pending material sale as owed, but shows it nowhere as a workshop", async () => {
    const { orders, activity, service } = studentsFixture();
    orders.orders.push(
      studentOrder(1, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
        status: "paid",
      }),
      studentOrder(3, {
        studentEmail: "ana@example.com",
        studentName: "Ana Pérez",
        kind: "material_sale",
        workshopName: "Venta",
      }),
    );
    activity.enrolled("ana@example.com");
    const result = await loader({
      request: getRequest("/admin/alumnas"),
      params: {},
      context: adminContext({ students: service }),
    } as never);

    expect(result.rows[0]).toMatchObject({
      current: "Cerámica inicial · octubre 2026",
      owes: "$ 58.000",
    });
  });

  it("shows each row's state and hides the inactive students by default", async () => {
    const byDefault = await load("/admin/alumnas", true, ["bea@example.com"]);

    expect(byDefault.rows.map((row) => [row.email, row.active])).toEqual([
      ["ana@example.com", true],
    ]);
    expect(byDefault.filter.mostrar).toBe("activas");
  });

  it("lists only the inactive or every student when asked", async () => {
    const inactive = await load("/admin/alumnas?mostrar=inactivas", true, [
      "bea@example.com",
    ]);
    const all = await load("/admin/alumnas?mostrar=todas", true, [
      "bea@example.com",
    ]);
    const unknown = await load("/admin/alumnas?mostrar=nope", true, [
      "bea@example.com",
    ]);

    expect(inactive.rows.map((row) => [row.email, row.active])).toEqual([
      ["bea@example.com", false],
    ]);
    expect(inactive.filter.mostrar).toBe("inactivas");
    expect(all.rows.map((row) => [row.email, row.active])).toEqual([
      ["bea@example.com", false],
      ["ana@example.com", true],
    ]);
    expect(unknown.rows.map((row) => row.email)).toEqual(["ana@example.com"]);
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
        setActive: unavailable,
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
