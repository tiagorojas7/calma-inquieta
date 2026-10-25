import { describe, expect, it } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { err, ok } from "~/modules/_shared";
import type { WorkshopPeriodsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { buildWorkshopPeriod } from "~/testing/fakes/admin-builders";
import * as route from "./workshop-period-detail";

const period = buildWorkshopPeriod({
  workshopId: "w1",
  period: "2026-11",
  turnos: [
    {
      turnoId: "t1",
      label: "Mañana",
      weekday: 1,
      startsAt: "10:00",
      endsAt: "12:00",
      turnoActive: true,
      capacity: 8,
    },
  ],
  materials: [{ id: "m1", name: "Arcilla", active: false, available: false }],
  snapshot: {
    teacher: { id: "teacher-1", name: "Cami", active: true },
    modality: "third_party",
    percentage: { basisPoints: 3500 },
  },
});

function service(overrides: Partial<WorkshopPeriodsService>) {
  return withOverrides(
    createUnavailableService<WorkshopPeriodsService>(),
    overrides,
  );
}

function load(
  periods: WorkshopPeriodsService,
  periodKey = "2026-11",
  admin = true,
) {
  return route.loader({
    request: getRequest(`/admin/talleres/w1/periodos/${periodKey}`),
    params: { id: "w1", period: periodKey },
    context: adminContext({ workshopPeriods: periods }, { admin }),
  } as never);
}

describe("admin workshop period detail", () => {
  it("loads a valid period with immutable image and material summaries", async () => {
    const loaded = await load(
      service({ get: () => Promise.resolve(ok(period)) }),
    );
    expect(loaded).toMatchObject({
      period: "2026-11",
      values: { fee: "1", capacities: [{ turnoId: "t1", capacity: "8" }] },
      materials: [{ name: "Arcilla", active: false, available: false }],
      snapshot: { teacherName: "Cami", percentage: "35" },
    });
  });

  it("validates the period before get and maps missing and unavailable failures", async () => {
    let calls = 0;
    const periods = service({
      get: () => {
        calls += 1;
        return Promise.resolve(err({ kind: "not-found" }));
      },
    });
    expect(await thrownStatus(() => load(periods, "nope"))).toBe(404);
    expect(calls).toBe(0);
    expect(await thrownStatus(() => load(periods))).toBe(404);
    expect(
      await thrownStatus(() =>
        load(
          service({
            get: () => Promise.resolve(err({ kind: "unavailable" })),
          }),
        ),
      ),
    ).toBe(503);
  });

  it("denies a non-admin before accessing the service", async () => {
    let calls = 0;
    expect(
      await thrownStatus(() =>
        load(
          service({
            get: () => {
              calls += 1;
              return Promise.resolve(ok(period));
            },
          }),
          "2026-11",
          false,
        ),
      ),
    ).toBe(403);
    expect(calls).toBe(0);
  });

  it("exports no mutation action", () => {
    expect("action" in route).toBe(false);
  });
});
