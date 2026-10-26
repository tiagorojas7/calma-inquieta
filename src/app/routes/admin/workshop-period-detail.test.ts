import { describe, expect, it, vi } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { err, ok } from "~/modules/_shared";
import type { WorkshopPeriodsService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
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
const found = () => Promise.resolve(ok(period));
type UpdateError = Extract<
  Awaited<ReturnType<WorkshopPeriodsService["update"]>>,
  { ok: false }
>["error"];
const rejecting = (error: UpdateError) =>
  service({ get: found, update: () => Promise.resolve(err(error)) });

const path = "/admin/talleres/w1/periodos/2026-11";
function args(
  periods: WorkshopPeriodsService,
  request: Request,
  admin = true,
  period = "2026-11",
) {
  return {
    request,
    params: { id: "w1", period },
    context: adminContext({ workshopPeriods: periods }, { admin }),
  } as never;
}
function load(periods: WorkshopPeriodsService, periodKey = "2026-11") {
  const request = getRequest(`/admin/talleres/w1/periodos/${periodKey}`);
  return route.loader(args(periods, request, true, periodKey));
}
function submit(
  periods: WorkshopPeriodsService,
  fields: Record<string, string>,
  admin = true,
) {
  return route.action(args(periods, postRequest(path, fields), admin));
}

describe("admin workshop period detail", () => {
  it("loads a valid period with immutable image and material summaries", async () => {
    const loaded = await load(service({ get: found }));
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
    const periods = service({
      get: () => {
        calls += 1;
        return Promise.resolve(ok(period));
      },
    });
    expect(
      await thrownStatus(() =>
        route.loader(args(periods, getRequest(path), false)),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() => submit(periods, { intent: "save" }, false)),
    ).toBe(403);
    expect(calls).toBe(0);
  });

  it("updates editable fields while preserving historical selections", async () => {
    const update = vi.fn(() => Promise.resolve(ok(period)));
    const response = await submit(service({ get: found, update }), {
      intent: "save",
      fee: "42000",
      materialsRequired: "on",
      projectTitle: "Tazas",
      projectDescription: "Esmaltes",
      "capacity-t1": "9",
      snapshotPercentage: "35",
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "period-1",
      expect.objectContaining({
        fee: "42000",
        capacities: [{ turnoId: "t1", capacity: "9" }],
        materialIds: ["m1"],
      }),
    );
    expect((response as Response).headers.get("Location")).toBe(path);
  });

  it("preserves rejected values and maps closed periods", async () => {
    const invalid = rejecting({
      kind: "invalid",
      issues: [{ field: "fee", code: "required" }],
    });
    await expect(
      submit(invalid, { intent: "save", fee: "" }),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: { values: { fee: "" }, errors: { fee: "Completá este campo." } },
    });
    await expect(
      submit(rejecting({ kind: "period-closed" }), { intent: "save" }),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: { formError: "Este período está cerrado y no se puede editar." },
    });
    const capacity = submit(rejecting({ kind: "capacity-below-confirmed" }), {
      intent: "save",
    });
    await expect(capacity).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        errors: {
          capacities: "No bajes el cupo debajo de los lugares confirmados.",
        },
      },
    });
  });
});
