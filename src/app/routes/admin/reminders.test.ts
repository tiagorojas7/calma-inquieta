import { describe, expect, it } from "vitest";
import { ok } from "~/modules/_shared";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { remindersFixture } from "~/testing/admin/reminder-kit";
import { studentOrder } from "~/testing/fakes/student-builders";
import { loader } from "./reminders";

const WORKSHOP = "00000000-0000-4000-8000-000000000002";

function load(
  path = "/admin/recordatorios",
  admin = true,
  extra: Parameters<typeof adminContext>[0] = {},
) {
  const { orders, service } = remindersFixture();
  orders.push(
    studentOrder(1, {
      studentName: "Ana Pérez",
      studentEmail: "ana@example.com",
      studentPhoneDigits: "5493511234567",
      workshopId: WORKSHOP,
    }),
    studentOrder(2, {
      studentName: "Bea Gómez",
      studentEmail: "bea@example.com",
      studentPhoneDigits: "123",
      status: "paid",
      period: "2026-11",
    }),
  );
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext(
      {
        ...extra,
        reminders: service,
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

describe("admin reminders route", () => {
  it("tells whether automatic emails are on", async () => {
    expect((await load()).emailEnabled).toBe(false);
    expect(
      (await load("/admin/recordatorios", true, { emailEnabled: true }))
        .emailEnabled,
    ).toBe(true);
  });

  it("shows the form and the filter options without preparing anything", async () => {
    const result = await load();

    expect(result.result).toBeNull();
    expect(result.kinds.map((k) => k.value)).toEqual([
      "class",
      "fee",
      "materials",
      "intensive",
      "notice",
    ]);
    expect(result.workshops).toEqual([
      { id: WORKSHOP, name: "Cerámica inicial" },
    ]);
    expect(result.periods).toEqual([
      { value: "2026-11", label: "noviembre 2026" },
      { value: "2026-10", label: "octubre 2026" },
    ]);
    expect(result.turnos).toEqual(["Martes 18:00 a 20:00"]);
    expect(result.statuses.map((s) => s.value)).toContain(
      "pending_confirmation",
    );
  });

  it("prepares the pending fee reminder with a link only for a valid phone", async () => {
    const result = await load("/admin/recordatorios?mensaje=fee&estado=paid");
    expect(result.result?.recipients).toMatchObject([
      { name: "Bea Gómez", link: null },
    ]);

    const pending = await load("/admin/recordatorios?mensaje=fee");
    expect(pending.result?.recipients).toHaveLength(1);
    const [ana] = pending.result?.recipients ?? [];
    expect(ana?.key).toContain("ana@example.com");
    expect(ana?.name).toBe("Ana Pérez");
    expect(ana?.link).toMatch(/^https:\/\/wa\.me\/5493511234567\?text=/);
    expect(pending.result?.preview).toContain("octubre");
  });

  it("reports an invalid template next to its field and prepares nothing", async () => {
    const result = await load("/admin/recordatorios?mensaje=intensive");

    expect(result.result).toBeNull();
    expect(result.errors).toEqual({
      cuando: "Escribí cuándo es.",
      actividad: "Escribí el nombre del workshop.",
    });
  });

  it("denies a request without an admin actor", async () => {
    expect(await thrownStatus(() => load("/admin/recordatorios", false))).toBe(
      403,
    );
  });
});
