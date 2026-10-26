import { describe, expect, it, vi } from "vitest";
import { err, Money, ok } from "~/modules/_shared";
import {
  createUnavailableAdminEnrollmentService,
  type AdminEnrollmentUseCases,
} from "~/modules/enrollments";
import type { MonthlyWorkshopsService } from "~/modules/workshops";
import { createUnavailableService } from "~/composition/unavailable-service";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { loader } from "./enrollments";

type List = AdminEnrollmentUseCases["list"];

const total = Money.fromCentavos(5_800_000);
if (!total.ok) throw new Error("invalid test money");

const item = {
  id: "o1",
  number: "CI-2026-0007",
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  period: "2026-11",
  turnoLabel: "Lunes",
  status: "pending_confirmation" as const,
  total: total.value,
  requestedOn: "2026-10-31",
};

function services(list: List) {
  return {
    enrollments: withOverrides(createUnavailableAdminEnrollmentService(), {
      list,
    }),
    monthlyWorkshops: withOverrides(
      createUnavailableService<MonthlyWorkshopsService>(),
      {
        list: () =>
          Promise.resolve(ok([{ id: "w1", name: "Cerámica" }] as never)),
      },
    ),
  };
}

function load(list: List, path = "/admin/inscripciones", admin = true) {
  return loader({
    request: getRequest(path),
    params: {},
    context: adminContext(services(list), { admin }),
  } as never);
}

describe("admin enrollments list route", () => {
  it("asks for the pending inbox by default and projects display rows", async () => {
    const list = vi
      .fn<List>()
      .mockResolvedValue(ok({ items: [item], page: 1, pageSize: 50 as const }));
    const result = await load(list);

    expect(list).toHaveBeenCalledWith(expect.anything(), {
      status: "pending_confirmation",
      page: 1,
    });
    expect(result.rows).toEqual([
      {
        id: "o1",
        number: "CI-2026-0007",
        studentName: "Ana Pérez",
        workshopName: "Cerámica",
        month: "noviembre 2026",
        turno: "Lunes",
        status: "pending_confirmation",
        statusLabel: "Pendiente de confirmación",
        total: "$ 58.000",
        requestedOn: "31/10/2026",
      },
    ]);
    expect(result.workshops).toEqual([{ id: "w1", name: "Cerámica" }]);
    expect(result.hasNext).toBe(false);
  });

  it("passes the filters through and offers the next page when the page is full", async () => {
    const full = Array.from({ length: 50 }, (_, index) => ({
      ...item,
      id: `o${String(index)}`,
    }));
    const list = vi
      .fn<List>()
      .mockResolvedValue(ok({ items: full, page: 2, pageSize: 50 as const }));
    const result = await load(
      list,
      "/admin/inscripciones?estado=paid&mes=2026-11&taller=7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50&q=ana%40&page=2",
    );

    expect(list).toHaveBeenCalledWith(expect.anything(), {
      status: "paid",
      period: "2026-11",
      workshopId: "7a1d2e3f-5b4c-4d6e-8f9a-0b1c2d3e4f50",
      text: "ana@",
      page: 2,
    });
    expect(result.hasNext).toBe(true);
    expect(result.filter.estado).toBe("paid");
  });

  it("returns no order data to a request that is not an admin", async () => {
    const list = vi.fn<List>();

    expect(
      await thrownStatus(() => load(list, "/admin/inscripciones", false)),
    ).toBe(403);
    expect(list).not.toHaveBeenCalled();
  });

  it.each([
    ["denied", 403],
    ["unavailable", 503],
  ] as const)("fails closed on %s", async (kind, status) => {
    const list = vi.fn<List>().mockResolvedValue(err({ kind }));

    expect(await thrownStatus(() => load(list))).toBe(status);
  });
});
