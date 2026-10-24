import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
} from "~/modules/workshops";
import { ok } from "~/modules/_shared";
import {
  adminContext,
  getRequest,
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
  it("exposes only the list loader", () => {
    expect(route).not.toHaveProperty("action");
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
