import { describe, expect, it, vi } from "vitest";
import { createUnavailableService } from "~/composition/unavailable-service";
import { Money } from "~/modules/_shared";
import type { MaterialsService } from "~/modules/materials";
import type { TeachersService } from "~/modules/teachers";
import type { IntensivesService } from "~/modules/workshops";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./intensive-new";

const FIELDS = {
  name: "Cerámica de sábado",
  slug: "",
  summary: "Un resumen",
  description: "Un detalle",
  teacherId: "t1",
  percentage: "35,5",
  eventDate: "2026-10-10",
  startsAt: "10:00",
  endsAt: "13:00",
  project0Name: "Taza de torno",
  project0Price: "30000",
  project0Deposit: "10000",
  project0Description: "Tu primera taza.",
  capacity: "12",
  minSeats: "4",
  policyText: "Traé delantal.",
  materialsIncluded: "on",
  galleryAssetId: ["img-1", "img-2"],
  galleryAlt: ["Una taza", "Una mesa"],
};

function formFields(fields = FIELDS) {
  const data = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value])
      data.append(key, item);
  }
  return data;
}

const pesos = (amount: number) => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
};
const VARIANTS = [
  {
    materialId: "m1",
    variantId: "v-arcilla",
    materialName: "Arcilla blanca",
    variantLabel: "5 kg",
    unitPrice: pesos(9000),
    keptInStudio: true,
  },
  {
    materialId: "m2",
    variantId: "v-esmalte",
    materialName: "Esmalte",
    variantLabel: "Celeste",
    unitPrice: pesos(4000),
    keptInStudio: false,
  },
];
const catalog = (variants: readonly (typeof VARIANTS)[number][] = VARIANTS) =>
  withOverrides(createUnavailableService<MaterialsService>(), {
    listSaleVariants: () =>
      Promise.resolve({ ok: true as const, value: variants }),
  });

function context(
  intensives: IntensivesService,
  teachers: TeachersService,
  admin = true,
  extra: Partial<Parameters<typeof adminContext>[0]> = {},
) {
  return adminContext(
    {
      intensives,
      teachers,
      materials: catalog(),
      variantStock: {
        onHand: () => Promise.resolve(new Map([["v-arcilla", 7]])),
      },
      ...extra,
    },
    { admin },
  );
}

describe("admin intensive create", () => {
  it("offers only active teachers", async () => {
    const list = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [
          { id: "t1", name: "Ana", active: true, modality: "own" },
          { id: "t2", name: "Beto", active: false, modality: "third_party" },
        ],
      }),
    );
    const teachers = withOverrides(
      createUnavailableService<TeachersService>(),
      {
        list: list as unknown as TeachersService["list"],
      },
    );
    const result = await loader({
      request: getRequest("/admin/intensivos/nuevo"),
      params: {},
      context: context(createUnavailableService<IntensivesService>(), teachers),
    } as never);
    expect(result.teachers).toEqual([
      { id: "t1", name: "Ana", modality: "own" },
    ]);
    expect(result.materialChoices).toEqual([
      {
        variantId: "v-arcilla",
        name: "Arcilla blanca",
        label: "5 kg",
        onHand: 7,
        keptInStudio: true,
      },
      {
        variantId: "v-esmalte",
        name: "Esmalte",
        label: "Celeste",
        onHand: 0,
        keptInStudio: false,
      },
    ]);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "active",
    );
  });

  function post(fields: Record<string, string | string[]>) {
    return new Request("https://panel.example.test/admin/intensivos/nuevo", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://panel.example.test",
      },
      body: formFields(fields as typeof FIELDS),
    });
  }
  const created = (id = "i1") =>
    Promise.resolve({ ok: true as const, value: { id } });

  it("creates with a derived slug and defaults, publishes, and redirects to the detail", async () => {
    const create = vi.fn(() =>
      created(),
    ) as unknown as IntensivesService["create"];
    const publish = vi.fn(() =>
      created(),
    ) as unknown as IntensivesService["publish"];
    const result = await action({
      request: post({
        ...FIELDS,
        intent: "publish",
        summary: "",
        minSeats: "",
        policyText: "",
      }),
      params: {},
      context: context(
        withOverrides(createUnavailableService<IntensivesService>(), {
          create,
          publish,
        }),
        createUnavailableService<TeachersService>(),
      ),
    } as never);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      expect.objectContaining({
        name: "Cerámica de sábado",
        slug: "ceramica-de-sabado",
        summary: "Un detalle",
        minSeats: "1",
        policyText: "La seña asegura el lugar en el workshop.",
        materialsIncluded: true,
        images: [
          { assetId: "img-1", alt: "Una taza" },
          { assetId: "img-2", alt: "Una mesa" },
        ],
        projects: [
          {
            name: "Taza de torno",
            price: "30000",
            deposit: "10000",
            description: "Tu primera taza.",
            image: null,
            materials: [],
          },
        ],
      }),
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
    );
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=published",
    );
  });

  it("saves a draft without publishing and redirects to the detail", async () => {
    const create = vi.fn(() =>
      created("i9"),
    ) as unknown as IntensivesService["create"];
    const publish = vi.fn();
    const result = await action({
      request: post({ ...FIELDS, intent: "draft" }),
      params: {},
      context: context(
        withOverrides(createUnavailableService<IntensivesService>(), {
          create,
          publish,
        }),
        createUnavailableService<TeachersService>(),
      ),
    } as never);
    expect(publish).not.toHaveBeenCalled();
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i9?ok=created",
    );
  });

  it("redirects to the detail with what is missing when publishing is refused", async () => {
    const publish = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: {
          kind: "rules-unmet" as const,
          rules: ["teacher", "future-start"],
        },
      }),
    ) as unknown as IntensivesService["publish"];
    const result = await action({
      request: post({ ...FIELDS, intent: "publish" }),
      params: {},
      context: context(
        withOverrides(createUnavailableService<IntensivesService>(), {
          create: (() => created()) as unknown as IntensivesService["create"],
          publish,
        }),
        createUnavailableService<TeachersService>(),
      ),
    } as never);
    expect((result as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?falta=teacher,future-start",
    );
  });

  it("keeps every typed block and puts each project error on its own field on a 422", async () => {
    const create = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: {
          kind: "invalid" as const,
          issues: [
            { field: "project1Name", code: "required" as const },
            { field: "project1Deposit", code: "exceeds-price" as const },
          ],
        },
      }),
    ) as unknown as IntensivesService["create"];

    const result = await action({
      request: post({
        ...FIELDS,
        project1Name: "",
        project1Price: "1000",
        project1Deposit: "2000",
        project1ImageAssetId: "img-9",
        project1ImageSrc: "/imagenes/img-9.webp",
        project1ImageAlt: "Un plato",
        project1MaterialVariant0: "v-arcilla",
        project1MaterialQuantity0: "4",
      }),
      params: {},
      context: context(
        withOverrides(createUnavailableService<IntensivesService>(), {
          create,
        }),
        createUnavailableService<TeachersService>(),
      ),
    } as never);

    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        projects: [
          { name: "Taza de torno", price: "30000", deposit: "10000" },
          {
            name: "",
            price: "1000",
            deposit: "2000",
            image: {
              assetId: "img-9",
              src: "/imagenes/img-9.webp",
              alt: "Un plato",
            },
            materials: [{ variantId: "v-arcilla", quantity: "4" }],
          },
        ],
        errors: {
          project1Name: "Completá este campo.",
          project1Deposit: "No puede superar el precio.",
        },
      },
    });
    const errors = (result as { data: { errors: Record<string, string> } }).data
      .errors;
    expect(Object.keys(errors).sort()).toEqual([
      "project1Deposit",
      "project1Name",
    ]);
  });

  describe("the bill of materials of each project", () => {
    const withBill = {
      ...FIELDS,
      project1Name: "Plato",
      project1Price: "20000",
      project1Deposit: "5000",
      project0MaterialVariant0: "v-arcilla",
      project0MaterialQuantity0: "2",
      project1MaterialVariant0: "v-esmalte",
      project1MaterialQuantity0: "1",
    };

    it("creates the workshop with every project and its bill when all variants are in the catalog", async () => {
      const create = vi.fn(() =>
        created(),
      ) as unknown as IntensivesService["create"];

      const result = await action({
        request: post({ ...withBill, intent: "draft" }),
        params: {},
        context: context(
          withOverrides(createUnavailableService<IntensivesService>(), {
            create,
          }),
          createUnavailableService<TeachersService>(),
        ),
      } as never);

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          projects: [
            expect.objectContaining({
              name: "Taza de torno",
              materials: [{ variantId: "v-arcilla", quantity: "2" }],
            }),
            expect.objectContaining({
              name: "Plato",
              materials: [{ variantId: "v-esmalte", quantity: "1" }],
            }),
          ],
        }),
      );
      expect((result as Response).headers.get("Location")).toBe(
        "/admin/intensivos/i1?ok=created",
      );
    });

    it("stores nothing and shows the form again when a variant left the catalog", async () => {
      const create = vi.fn();

      const result = await action({
        request: post({ ...withBill, intent: "publish" }),
        params: {},
        context: context(
          withOverrides(createUnavailableService<IntensivesService>(), {
            create: create as IntensivesService["create"],
          }),
          createUnavailableService<TeachersService>(),
          true,
          { materials: catalog([VARIANTS[0] as (typeof VARIANTS)[number]]) },
        ),
      } as never);

      expect(create).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        init: { status: 422 },
        data: {
          errors: {
            project1MaterialVariant0:
              "Ese material no está disponible en el catálogo.",
          },
          projects: [
            { materials: [{ variantId: "v-arcilla", quantity: "2" }] },
            { name: "Plato" },
          ],
          values: { name: "Cerámica de sábado" },
        },
      });
    });

    it("shows no stock rather than a zero when the stock cannot be read", async () => {
      const result = await loader({
        request: getRequest("/admin/intensivos/nuevo"),
        params: {},
        context: context(
          createUnavailableService<IntensivesService>(),
          withOverrides(createUnavailableService<TeachersService>(), {
            list: () =>
              Promise.resolve({
                ok: true as const,
                value: [],
              }),
          }),
          true,
          {
            variantStock: {
              onHand: () => Promise.reject(new Error("db down")),
            },
          },
        ),
      } as never);

      expect(result.materialChoices.map((choice) => choice.onHand)).toEqual([
        null,
        null,
      ]);
    });

    it("reports an unavailable catalog instead of creating", async () => {
      const create = vi.fn();

      await expect(
        thrownStatus(() =>
          action({
            request: post({ ...withBill, intent: "draft" }),
            params: {},
            context: context(
              withOverrides(createUnavailableService<IntensivesService>(), {
                create: create as IntensivesService["create"],
              }),
              createUnavailableService<TeachersService>(),
              true,
              { materials: createUnavailableService<MaterialsService>() },
            ),
          } as never),
        ),
      ).resolves.toBe(503);
      expect(create).not.toHaveBeenCalled();
    });
  });

  it("keeps every posted field and gallery image on a 422", async () => {
    const create = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: {
          kind: "invalid" as const,
          issues: [{ field: "name", code: "required" as const }],
        },
      }),
    ) as unknown as IntensivesService["create"];
    const result = await action({
      request: new Request(
        "https://panel.example.test/admin/intensivos/nuevo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://panel.example.test",
          },
          body: formFields({ ...FIELDS, name: "  " }),
        },
      ),
      params: {},
      context: context(
        withOverrides(createUnavailableService<IntensivesService>(), {
          create,
        }),
        createUnavailableService<TeachersService>(),
      ),
    } as never);
    expect(result).toMatchObject({
      init: { status: 422 },
      data: {
        values: {
          name: "  ",
          images: [
            { assetId: "img-1", alt: "Una taza" },
            { assetId: "img-2", alt: "Una mesa" },
          ],
        },
      },
    });
  });

  it("denies both loader and action before any service call", async () => {
    const list = vi.fn();
    const create = vi.fn();
    const teachers = withOverrides(
      createUnavailableService<TeachersService>(),
      {
        list: list as TeachersService["list"],
      },
    );
    const intensives = withOverrides(
      createUnavailableService<IntensivesService>(),
      {
        create: create as IntensivesService["create"],
      },
    );
    await expect(
      thrownStatus(() =>
        loader({
          request: getRequest("/admin/intensivos/nuevo"),
          params: {},
          context: context(intensives, teachers, false),
        } as never),
      ),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() =>
        action({
          request: postRequest("/admin/intensivos/nuevo", { name: "" }),
          params: {},
          context: context(intensives, teachers, false),
        } as never),
      ),
    ).resolves.toBe(403);
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("reports an unavailable intensive service", async () => {
    await expect(
      thrownStatus(() =>
        action({
          request: postRequest("/admin/intensivos/nuevo", { name: "" }),
          params: {},
          context: context(
            createUnavailableService<IntensivesService>(),
            createUnavailableService<TeachersService>(),
          ),
        } as never),
      ),
    ).resolves.toBe(503);
  });
});
