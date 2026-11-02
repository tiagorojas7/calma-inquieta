import { describe, expect, it, vi } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { err, ok } from "~/modules/_shared";
import type { MaterialsService } from "~/modules/materials";
import type {
  MonthlyWorkshopsService,
  WorkshopPeriodsService,
} from "~/modules/workshops";
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
function materials(overrides: Partial<MaterialsService> = {}) {
  return withOverrides(createUnavailableService<MaterialsService>(), overrides);
}
const selectable = {
  id: "m2",
  name: "Esmalte",
  category: "Esmaltes",
  hasImage: false,
  supplierName: "Proveedor",
  variantCount: 1,
  active: true,
  available: true,
};
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
  materialService = materials({
    listSelectable: () => Promise.resolve(ok([])),
  }),
) {
  return {
    request,
    params: { id: "w1", period },
    context: adminContext(
      {
        workshopPeriods: periods,
        materials: materialService,
        monthlyWorkshops: withOverrides(
          createUnavailableService<MonthlyWorkshopsService>(),
          {
            get: () => Promise.resolve(ok({ name: "Cerámica Creativa" })),
          } as unknown as Partial<MonthlyWorkshopsService>,
        ),
      },
      { admin },
    ),
  } as never;
}
function load(
  periods: WorkshopPeriodsService,
  periodKey = "2026-11",
  materialService?: MaterialsService,
) {
  const request = getRequest(`/admin/talleres/w1/periodos/${periodKey}`);
  return route.loader(args(periods, request, true, periodKey, materialService));
}
function submit(
  periods: WorkshopPeriodsService,
  fields: Record<string, string | readonly string[]>,
  admin = true,
) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    const items: readonly string[] =
      typeof value === "string" ? [value] : value;
    for (const item of items) form.append(name, item);
  }
  return route.action(
    args(
      periods,
      new Request(`https://panel.example.test${path}`, {
        method: "POST",
        headers: { Origin: "https://panel.example.test" },
        body: form,
      }),
      admin,
    ),
  );
}

describe("admin workshop period detail", () => {
  it("authorizes first, then loads selectable and historical material options without duplicates", async () => {
    const listSelectable = vi.fn(() => Promise.resolve(ok([selectable])));
    const loaded = await load(
      service({
        get: () => Promise.resolve(ok({ ...period, status: "draft" })),
      }),
      "2026-11",
      materials({ listSelectable }),
    );
    expect(listSelectable).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
    );
    expect(loaded).toMatchObject({
      period: "2026-11",
      status: "draft",
      values: {
        fee: "1",
        capacities: [{ turnoId: "t1", capacity: "8" }],
        materialIds: ["m1"],
      },
      materialOptions: [
        { id: "m2", name: "Esmalte", historical: false },
        {
          id: "m1",
          name: "Arcilla",
          active: false,
          available: false,
          historical: true,
        },
      ],
      materials: [{ name: "Arcilla", active: false, available: false }],
      snapshot: { teacherName: "Cami", percentage: "35" },
    });
  });

  it("keeps a closed historical period readable without the current materials service", async () => {
    const listSelectable = vi.fn(() =>
      Promise.resolve(err({ kind: "unavailable" as const })),
    );
    const loaded = await load(
      service({
        get: () => Promise.resolve(ok({ ...period, status: "closed" })),
      }),
      "2026-11",
      materials({ listSelectable }),
    );
    expect(loaded).toMatchObject({
      status: "closed",
      materialOptions: [{ id: "m1", historical: true }],
    });
    expect(listSelectable).not.toHaveBeenCalled();
  });

  it("maps selectable-material failures and denies non-admins before either service", async () => {
    const listSelectable = vi.fn(() =>
      Promise.resolve(err({ kind: "unavailable" as const })),
    );
    expect(
      await thrownStatus(() =>
        load(service({ get: found }), "2026-11", materials({ listSelectable })),
      ),
    ).toBe(503);
    const get = vi.fn(found);
    const deniedSelectable = vi.fn(() => Promise.resolve(ok([])));
    expect(
      await thrownStatus(() =>
        route.loader(
          args(
            service({ get }),
            getRequest(path),
            false,
            "2026-11",
            materials({ listSelectable: deniedSelectable }),
          ),
        ),
      ),
    ).toBe(403);
    expect(get).not.toHaveBeenCalled();
    expect(deniedSelectable).not.toHaveBeenCalled();
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

  it("updates editable fields with submitted material selections", async () => {
    const update = vi.fn(() => Promise.resolve(ok(period)));
    const response = await submit(service({ get: found, update }), {
      intent: "save",
      fee: "42000",
      materialsRequired: "on",
      projectTitle: "Tazas",
      projectDescription: "Esmaltes",
      "capacity-t1": "9",
      snapshotPercentage: "35",
      materialIds: ["m2", "m3"],
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "period-1",
      expect.objectContaining({
        fee: "42000",
        capacities: [{ turnoId: "t1", capacity: "9" }],
        materialIds: ["m2", "m3"],
      }),
    );
    expect((response as Response).headers.get("Location")).toBe(
      `${path}?ok=saved`,
    );
  });

  it("runs only known lifecycle intents and redirects each success", async () => {
    const publish = vi.fn(() => Promise.resolve(ok(period)));
    const close = vi.fn(() => Promise.resolve(ok(period)));
    const remove = vi.fn(() => Promise.resolve(ok(undefined)));
    const periods = service({
      get: () => Promise.resolve(ok(period)),
      publish,
      close,
      delete: remove,
    });
    const published = (await submit(periods, {
      intent: "publish",
    })) as Response;
    expect(published.headers.get("Location")).toBe(`${path}?ok=published`);
    expect(publish).toHaveBeenCalledWith(expect.anything(), "period-1");
    const closed = (await submit(periods, { intent: "close" })) as Response;
    expect(closed.headers.get("Location")).toBe(`${path}?ok=closed`);
    expect(close).toHaveBeenCalledWith(expect.anything(), "period-1");
    const deleted = (await submit(periods, { intent: "delete" })) as Response;
    expect(remove).toHaveBeenCalledWith(expect.anything(), "period-1");
    expect(deleted.headers.get("Location")).toBe("/admin/talleres/w1/periodos");
    expect(
      await thrownStatus(() => submit(periods, { intent: "open-month" })),
    ).toBe(400);
    expect(await thrownStatus(() => submit(periods, {}))).toBe(400);
  });

  it("maps refused lifecycle transitions to a form error", async () => {
    const result = await submit(
      service({
        get: () => Promise.resolve(ok(period)),
        publish: () =>
          Promise.resolve(
            err({ kind: "transition-refused", from: "draft", to: "open" }),
          ),
      }),
      { intent: "publish" },
    );
    expect(result).toMatchObject({
      init: { status: 422 },
      data: { stateError: "No se puede pasar de Borrador a Abierto." },
    });
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
      submit(
        rejecting({
          kind: "invalid",
          issues: [{ field: "materialIds", code: "not-selectable" }],
        }),
        { intent: "save", materialIds: ["m1", "m2"] },
      ),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        values: { materialIds: ["m1", "m2"] },
        errors: { materialIds: "Esa opción no se puede elegir. Elegí otra." },
      },
    });
    await expect(
      submit(
        rejecting({
          kind: "invalid",
          issues: [{ field: "materialIds", code: "duplicate" }],
        }),
        { intent: "save", materialIds: ["m1", "m1"] },
      ),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        errors: { materialIds: "No repitas materiales en el período." },
      },
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
