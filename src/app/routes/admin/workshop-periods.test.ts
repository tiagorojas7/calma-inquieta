import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { err, ok } from "~/modules/_shared";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
} from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
  workshopsFixture,
} from "~/testing/admin/route-kit";
import { seedWorkshop } from "~/testing/admin/workshop-seed";
import * as route from "./workshop-periods";

function context(
  periods: WorkshopPeriodsService,
  workshops: MonthlyWorkshopsService,
  admin = true,
) {
  return adminContext(
    { workshopPeriods: periods, monthlyWorkshops: workshops },
    { admin },
  );
}

function periodService(overrides: Partial<WorkshopPeriodsService>) {
  return withOverrides(
    createUnavailableService<WorkshopPeriodsService>(),
    overrides,
  );
}

describe("admin workshop periods route", () => {
  it("opens the submitted exact month and redirects to this list", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const openMonth = ((actor: unknown, workshopId: string, period: string) => {
      expect(actor).toBeTruthy();
      expect(workshopId).toBe(id);
      expect(period).toBe("2026-11");
      return Promise.resolve(ok({}));
    }) as WorkshopPeriodsService["openMonth"];
    const result = await route.action({
      request: postRequest(`/admin/talleres/${id}/periodos`, {
        intent: "open-month",
        period: "2026-11",
      }),
      params: { id },
      context: context(periodService({ openMonth }), fixture.service),
    } as never);
    expect(result).toMatchObject({
      status: 302,
      headers: expect.any(Headers),
    });
    expect((result as Response).headers.get("Location")).toBe(
      `/admin/talleres/${id}/periodos`,
    );
  });

  it("preserves invalid and conflicting months for native form feedback", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    const invalid = await route.action({
      request: postRequest(`/admin/talleres/${id}/periodos`, {
        intent: "open-month",
        period: "2026-13",
      }),
      params: { id },
      context: context(
        periodService({
          openMonth: () =>
            Promise.resolve(
              err({
                kind: "invalid",
                issues: [{ field: "period", code: "invalid-format" }],
              }),
            ),
        }),
        fixture.service,
      ),
    } as never);
    expect(invalid).toMatchObject({
      data: {
        values: { period: "2026-13" },
        errors: { period: "El formato no es válido. Revisalo." },
        formError: "Revisá el mes para abrir el período.",
      },
      init: { status: 422 },
    });
    const conflict = await route.action({
      request: postRequest(`/admin/talleres/${id}/periodos`, {
        intent: "open-month",
        period: "2026-11",
      }),
      params: { id },
      context: context(
        periodService({
          openMonth: () =>
            Promise.resolve(err({ kind: "period-exists", periodId: "p1" })),
        }),
        fixture.service,
      ),
    } as never);
    expect(conflict).toMatchObject({
      data: {
        values: { period: "2026-11" },
        errors: { period: "Ya existe un período para ese mes." },
        formError: "Revisá el mes para abrir el período.",
      },
      init: { status: 422 },
    });
  });

  it("authorizes before accessing the period service for a mutation", async () => {
    const periods = periodService({
      openMonth: () => {
        throw new Error("service must not be called");
      },
    });
    await expect(
      thrownStatus(() =>
        route.action({
          request: postRequest("/admin/talleres/w1/periodos", {
            intent: "open-month",
            period: "2026-11",
          }),
          params: { id: "w1" },
          context: context(periods, workshopsFixture().service, false),
        } as never),
      ),
    ).resolves.toBe(403);
  });

  it("authorizes before touching services and loads the period list", async () => {
    const fixture = workshopsFixture();
    const id = await seedWorkshop(fixture);
    let calls = 0;
    const periods = periodService({
      list: () => {
        calls += 1;
        return Promise.resolve(ok({ periods: [], suggestedNext: "2026-11" }));
      },
    });
    expect(
      await route.loader({
        request: getRequest(`/admin/talleres/${id}/periodos`),
        params: { id },
        context: context(periods, fixture.service),
      } as never),
    ).toMatchObject({ workshopId: id, periods: [] });
    expect(calls).toBe(1);
    await expect(
      thrownStatus(() =>
        route.loader({
          request: getRequest(`/admin/talleres/${id}/periodos`),
          params: { id },
          context: context(periods, fixture.service, false),
        } as never),
      ),
    ).resolves.toBe(403);
    expect(calls).toBe(1);
  });

  it("answers 404 for a missing workshop and 503 when periods are unavailable", async () => {
    const fixture = workshopsFixture();
    const unavailable = createUnavailableService<WorkshopPeriodsService>();
    expect(
      await thrownStatus(() =>
        route.loader({
          request: getRequest("/admin/talleres/nope/periodos"),
          params: { id: "nope" },
          context: context(unavailable, fixture.service),
        } as never),
      ),
    ).toBe(404);
    const id = await seedWorkshop(fixture);
    expect(
      await thrownStatus(() =>
        route.loader({
          request: getRequest(`/admin/talleres/${id}/periodos`),
          params: { id },
          context: context(unavailable, fixture.service),
        } as never),
      ),
    ).toBe(503);
  });
});
