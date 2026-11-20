import { describe, expect, it, vi } from "vitest";
import { Money, ok } from "~/modules/_shared";
import { createUnavailableService } from "~/composition/unavailable-service";
import {
  createUnavailableAdminEnrollmentService,
  createUnavailableSupplierConsolidationService,
  type AdminEnrollmentUseCases,
  type SupplierConsolidationUseCases,
} from "~/modules/enrollments";
import type { MaterialsService, SuppliersService } from "~/modules/materials";
import {
  adminContext,
  getRequest,
  ORIGIN,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import {
  MATERIAL_SUPPLIER_ID,
  materialsFixture,
} from "~/testing/admin/material-kit";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { action, loader } from "./materials";

const actor = testAdminActor();

const draft = (
  name: string,
  category: string,
  price = "1000",
  keptInStudio = false,
) => ({
  name,
  description: "Para pintar",
  category,
  supplierId: MATERIAL_SUPPLIER_ID,
  available: true,
  keptInStudio,
  image: null,
  variants: [{ label: "Única", price, available: true, swatch: "" }],
});

const emptyConsolidation = {
  period: "2026-11",
  suppliers: [],
  grandTotal: Money.zero(),
  pendingOrders: 0,
};

async function seeded() {
  const fixture = await materialsFixture();
  const { service, stock } = fixture;
  const bastidor = await service.create(
    actor,
    draft("Bastidor", "Bastidores", "2500", true),
  );
  const pincel = await service.create(
    actor,
    draft("Pincel plano", "Pinceles", "1000", true),
  );
  const retired = await service.create(actor, draft("Esponja", "Pinceles"));
  const cinta = await service.create(actor, draft("Cinta", "Papelería"));
  if (!bastidor.ok || !pincel.ok || !retired.ok || !cinta.ok)
    throw new Error("seed failed");
  await service.deactivate(actor, retired.value.id);
  const variantOf = (material: typeof bastidor.value) => {
    const [variant] = material.variants;
    if (!variant) throw new Error("no variant");
    return variant.id;
  };
  stock.levels.set(variantOf(bastidor.value), 4);
  return {
    fixture,
    bastidor: bastidor.value,
    pincel: pincel.value,
    retired: retired.value,
    cinta: cinta.value,
    variantOf,
  };
}

type Env = Awaited<ReturnType<typeof seeded>>;

function services(
  env: Env,
  extra: {
    consolidation?: Partial<SupplierConsolidationUseCases>;
    enrollments?: Partial<AdminEnrollmentUseCases>;
  } = {},
) {
  return {
    materials: env.fixture.service,
    suppliers: env.fixture.suppliersService,
    consolidation: withOverrides(
      createUnavailableSupplierConsolidationService(),
      {
        consolidate: (_actor, period) =>
          Promise.resolve(ok({ ...emptyConsolidation, period })),
        deliveries: () => Promise.resolve(ok([])),
        ...extra.consolidation,
      },
    ),
    enrollments: withOverrides(
      createUnavailableAdminEnrollmentService(),
      extra.enrollments ?? {},
    ),
  };
}

function load(env: Env, query = "", options: { admin?: boolean } = {}) {
  return loader({
    request: getRequest(`/admin/materiales${query}`),
    params: {},
    context: adminContext(services(env), options),
  } as never);
}

function submit(
  env: Env,
  fields: Record<string, string>,
  options: {
    admin?: boolean;
    headers?: Record<string, string>;
    extra?: Parameters<typeof services>[1];
  } = {},
) {
  return action({
    request: postRequest(
      "/admin/materiales",
      fields,
      options.headers ?? { Origin: ORIGIN },
    ),
    params: {},
    context: adminContext(services(env, options.extra), {
      ...(options.admin === undefined ? {} : { admin: options.admin }),
    }),
  } as never);
}

describe("materials screen loader: En el estudio and Catálogo", () => {
  it("lists in the studio only the kept materials by name, with Hay N or Se acabó", async () => {
    const env = await seeded();
    const result = await load(env, "?mes=2026-11");
    expect(result.studio.map((card) => card.name)).toEqual([
      "Bastidor",
      "Pincel plano",
    ]);
    expect(result.studio[0]).toMatchObject({
      price: "$ 2.500",
      state: "hay",
      onHand: 4,
      anchor: `material-${env.bastidor.id}`,
    });
    expect(result.studio[1]).toMatchObject({ state: "sin", onHand: 0 });
    expect(result.estado).toBe("activos");
  });

  it("shows nothing of the catalog until the owner searches, and counts every active material", async () => {
    const env = await seeded();
    const result = await load(env, "?mes=2026-11");
    expect(result.catalog).toEqual({ rows: [], found: 0, total: 3 });
    expect(result.query).toBe("");
  });

  it("searches the whole catalog, kept or not, with the yes or no on each row", async () => {
    const env = await seeded();
    const found = await load(env, "?q=cinta");
    expect(found.query).toBe("cinta");
    expect(found.catalog.rows).toEqual([
      {
        id: env.cinta.id,
        anchor: `catalogo-${env.cinta.id}`,
        name: "Cinta",
        kept: false,
      },
    ]);
    const kept = await load(env, "?q=plano");
    expect(kept.catalog.rows.map((row) => [row.name, row.kept])).toEqual([
      ["Pincel plano", true],
    ]);
  });

  it("ignores the old stock filter", async () => {
    const env = await seeded();
    const result = await load(env, "?stock=sin");
    expect(result.studio).toHaveLength(2);
    expect(result.returnTo).not.toContain("stock");
  });

  it("lists the archived materials on request, none of them in the studio", async () => {
    const env = await seeded();
    const result = await load(env, "?estado=inactivos&q=espon");
    expect(result.estado).toBe("inactivos");
    expect(result.studio).toEqual([]);
    expect(result.catalog.rows.map((row) => row.name)).toEqual(["Esponja"]);
  });

  it("carries only the view in the address the forms come back to", async () => {
    const env = await seeded();
    const result = await load(
      env,
      "?q=pincel&mes=2026-10&ok=arrived&n=3&nuevo=x",
    );
    expect(result.returnTo).toBe("/admin/materiales?q=pincel&mes=2026-10");
    expect((await load(env, "?mes=2026-11")).returnTo).toBe(
      "/admin/materiales?mes=2026-11",
    );
  });

  it("says what was saved: a new material by name, only if it is listed", async () => {
    const env = await seeded();
    const created = await load(
      env,
      `?ok=created&nuevo=${env.pincel.id}&mes=2026-11`,
    );
    expect(created.saved).toBe("Pincel plano");
    expect(created.highlightId).toBe(env.pincel.id);
    const stranger = await load(env, "?ok=created&nuevo=nope");
    expect(stranger.saved).toBeNull();
    expect(stranger.highlightId).toBeUndefined();
  });

  it("says which material the studio now keeps, or no longer keeps, and highlights it", async () => {
    const env = await seeded();
    const kept = await load(env, `?ok=kept&nuevo=${env.cinta.id}&q=cinta`);
    expect(kept.saved).toBe("Cinta, lo tenemos en el estudio");
    expect(kept.highlightId).toBe(env.cinta.id);
    const unkept = await load(env, `?ok=unkept&nuevo=${env.cinta.id}`);
    expect(unkept.saved).toBe("Cinta, se pide al vender");
    expect((await load(env, "?ok=kept&nuevo=nope")).saved).toBeNull();
  });

  it("says how many units arrived, only for a sensible count", async () => {
    const env = await seeded();
    expect((await load(env, "?ok=arrived&n=5")).saved).toBe(
      "llegaron 5 unidades",
    );
    expect((await load(env, "?ok=arrived&n=1")).saved).toBe("llegó 1 unidad");
    expect((await load(env, "?ok=arrived&n=-2")).saved).toBeNull();
    expect((await load(env, "?ok=arrived")).saved).toBeNull();
    expect((await load(env, "?ok=whatever&n=5")).saved).toBeNull();
  });

  it("answers 403 to a non-admin and 503 when the services are unavailable", async () => {
    const env = await seeded();
    expect(await thrownStatus(() => load(env, "", { admin: false }))).toBe(403);
    expect(
      await thrownStatus(() =>
        loader({
          request: getRequest("/admin/materiales"),
          params: {},
          context: adminContext({
            materials: createUnavailableService<MaterialsService>(),
            suppliers: createUnavailableService<SuppliersService>(),
          }),
        } as never),
      ),
    ).toBe(503);
  });
});

describe("materials screen loader: Para pedir and Para entregar", () => {
  it("brings the chosen month's suppliers and deliveries, and the current month by default", async () => {
    const env = await seeded();
    const consolidate = vi.fn(() => Promise.resolve(ok(emptyConsolidation)));
    const result = await loader({
      request: getRequest("/admin/materiales?mes=2026-10"),
      params: {},
      context: adminContext(services(env, { consolidation: { consolidate } })),
    } as never);
    expect(consolidate).toHaveBeenCalledWith(expect.anything(), "2026-10");
    await loader({
      request: getRequest("/admin/materiales"),
      params: {},
      context: adminContext(services(env, { consolidation: { consolidate } })),
    } as never);
    expect(consolidate).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.stringMatching(/^\d{4}-\d{2}$/),
    );
    expect(result).toMatchObject({
      period: "2026-11",
      suppliers: [],
      toDeliver: [],
      delivered: [],
      pendingOrders: 0,
    });
  });
});

describe("materials screen action: Llegaron", () => {
  it("adds the units with the reason Llegaron and stays on the same card", async () => {
    const env = await seeded();
    const variantId = env.variantOf(env.pincel);
    const result = (await submit(env, {
      intent: "arrived",
      materialId: env.pincel.id,
      variantId,
      units: "6",
      returnTo: "/admin/materiales?stock=sin&mes=2026-11",
      anchor: `material-${env.pincel.id}`,
    })) as Response;
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe(
      `/admin/materiales?stock=sin&mes=2026-11&ok=arrived&n=6#material-${env.pincel.id}`,
    );
    expect(env.fixture.stock.levels.get(variantId)).toBe(6);
    expect(env.fixture.stock.adjustments).toMatchObject([
      { variantId, delta: 6, reason: "Llegaron", by: "a@x.test" },
    ]);
  });

  it("adds to what was already there", async () => {
    const env = await seeded();
    const variantId = env.variantOf(env.bastidor);
    await submit(env, {
      intent: "arrived",
      materialId: env.bastidor.id,
      variantId,
      units: "3",
    });
    expect(env.fixture.stock.levels.get(variantId)).toBe(7);
  });

  it("falls back to the screen when no return address came", async () => {
    const env = await seeded();
    const result = (await submit(env, {
      intent: "arrived",
      materialId: env.bastidor.id,
      variantId: env.variantOf(env.bastidor),
      units: "1",
    })) as Response;
    expect(result.headers.get("Location")).toMatch(
      /^\/admin\/materiales\?ok=arrived&n=1#material-/,
    );
  });

  it.each(["", "0", "-3", "+2", "1.5", "abc", "100001"])(
    "refuses %j, shows it on the card and changes nothing",
    async (units) => {
      const env = await seeded();
      const variantId = env.variantOf(env.bastidor);
      const result = (await submit(env, {
        intent: "arrived",
        materialId: env.bastidor.id,
        variantId,
        units,
      })) as {
        data: { arrivedError: { anchor: string; message: string } };
        init: { status: number };
      };
      expect(result.init.status).toBe(422);
      expect(result.data.arrivedError.anchor).toBe(
        `material-${env.bastidor.id}`,
      );
      expect(result.data.arrivedError.message).not.toBe("");
      expect(env.fixture.stock.levels.get(variantId)).toBe(4);
      expect(env.fixture.stock.adjustments).toEqual([]);
    },
  );

  it("answers 404 for a variant of another material and 403 to a non-admin", async () => {
    const env = await seeded();
    expect(
      await thrownStatus(() =>
        submit(env, {
          intent: "arrived",
          materialId: env.pincel.id,
          variantId: env.variantOf(env.bastidor),
          units: "2",
        }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        submit(
          env,
          {
            intent: "arrived",
            materialId: env.pincel.id,
            variantId: env.variantOf(env.pincel),
            units: "2",
          },
          { admin: false },
        ),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(
          env,
          {
            intent: "arrived",
            materialId: env.pincel.id,
            variantId: env.variantOf(env.pincel),
            units: "2",
          },
          { headers: { Origin: "https://evil.example" } },
        ),
      ),
    ).toBe(403);
    expect(env.fixture.stock.adjustments).toEqual([]);
  });

  it("does not go back to a page outside the panel", async () => {
    const env = await seeded();
    const result = (await submit(env, {
      intent: "arrived",
      materialId: env.bastidor.id,
      variantId: env.variantOf(env.bastidor),
      units: "1",
      returnTo: "https://evil.example/x",
    })) as Response;
    expect(result.headers.get("Location")).toMatch(/^\/admin\/materiales\?/);
  });
});

describe("materials screen action: Lo tenemos en el estudio", () => {
  it("marks a material as kept and stays on its row, naming it", async () => {
    const env = await seeded();
    const result = (await submit(env, {
      intent: "set-kept",
      materialId: env.cinta.id,
      kept: "1",
      returnTo: "/admin/materiales?q=cinta&mes=2026-11",
      anchor: `catalogo-${env.cinta.id}`,
    })) as Response;
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe(
      `/admin/materiales?q=cinta&mes=2026-11&ok=kept&nuevo=${env.cinta.id}#catalogo-${env.cinta.id}`,
    );
    const stored = await env.fixture.repository.findById(env.cinta.id);
    expect(stored).toMatchObject({
      keptInStudio: true,
      name: "Cinta",
      active: true,
    });
    expect(stored?.audit.updatedBy).toBe("a@x.test");
    expect(env.fixture.stock.adjustments).toEqual([]);
  });

  it("marks it as not kept the same way", async () => {
    const env = await seeded();
    const result = (await submit(env, {
      intent: "set-kept",
      materialId: env.bastidor.id,
      kept: "0",
      returnTo: "/admin/materiales?q=bast&mes=2026-11",
      anchor: `catalogo-${env.bastidor.id}`,
    })) as Response;
    expect(result.headers.get("Location")).toBe(
      `/admin/materiales?q=bast&mes=2026-11&ok=unkept&nuevo=${env.bastidor.id}#catalogo-${env.bastidor.id}`,
    );
    expect(
      (await env.fixture.repository.findById(env.bastidor.id))?.keptInStudio,
    ).toBe(false);
  });

  it("answers 404 for an unknown material, 403 to a non-admin, and changes nothing", async () => {
    const env = await seeded();
    expect(
      await thrownStatus(() =>
        submit(env, {
          intent: "set-kept",
          materialId: "99999999-9999-4999-8999-999999999999",
          kept: "1",
        }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        submit(
          env,
          { intent: "set-kept", materialId: env.cinta.id, kept: "1" },
          { admin: false },
        ),
      ),
    ).toBe(403);
    expect(
      (await env.fixture.repository.findById(env.cinta.id))?.keptInStudio,
    ).toBe(false);
  });
});

describe("materials screen action: ordering and handing over", () => {
  const order = "0b8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";

  it("marks one supplier requested, monthly orders and workshop lines together, and stays on its card", async () => {
    const env = await seeded();
    const workshop = "7a8f5c1e-4d3a-4f6b-9a7e-1c2d3e4f5a6b";
    const bulk = vi.fn<AdminEnrollmentUseCases["markMaterialsRequestedBulk"]>(
      () => Promise.resolve([{ orderId: order, result: ok(undefined) }]),
    );
    const markWorkshop = vi.fn<
      SupplierConsolidationUseCases["markWorkshopOrdered"]
    >(() => Promise.resolve(ok({ count: 2 })));
    const result = (await submit(
      env,
      {
        intent: "mark-supplier-requested",
        mes: "2026-11",
        supplierId: MATERIAL_SUPPLIER_ID,
        orderId: order,
        workshopId: workshop,
        returnTo: "/admin/materiales?mes=2026-11",
        anchor: `pedir-${MATERIAL_SUPPLIER_ID}`,
      },
      {
        extra: {
          enrollments: { markMaterialsRequestedBulk: bulk },
          consolidation: { markWorkshopOrdered: markWorkshop },
        },
      },
    )) as Response;
    expect(bulk).toHaveBeenCalledWith(expect.anything(), [order]);
    expect(markWorkshop).toHaveBeenCalledWith(
      expect.anything(),
      workshop,
      MATERIAL_SUPPLIER_ID,
    );
    expect(result.headers.get("Location")).toBe(
      `/admin/materiales?mes=2026-11&ok=requested&n=3#pedir-${MATERIAL_SUPPLIER_ID}`,
    );
  });

  it("marks the chosen deliveries and stays on its card", async () => {
    const env = await seeded();
    const received = vi.fn<
      AdminEnrollmentUseCases["markMaterialsReceivedBulk"]
    >(() => Promise.resolve([{ orderId: order, result: ok(undefined) }]));
    const result = (await submit(
      env,
      {
        intent: "mark-received",
        orderId: order,
        returnTo: "/admin/materiales?mes=2026-11",
        anchor: `entregar-${order}`,
      },
      { extra: { enrollments: { markMaterialsReceivedBulk: received } } },
    )) as Response;
    expect(received).toHaveBeenCalledWith(expect.anything(), [order]);
    expect(result.headers.get("Location")).toBe(
      `/admin/materiales?mes=2026-11&ok=received&n=1#entregar-${order}`,
    );
  });

  it("answers 400 to an unknown intent", async () => {
    const env = await seeded();
    expect(await thrownStatus(() => submit(env, { intent: "borrar" }))).toBe(
      400,
    );
  });
});
