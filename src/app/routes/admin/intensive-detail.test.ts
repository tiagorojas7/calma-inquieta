import { describe, expect, it, vi } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  IntensiveProjectMaterial,
  IntensiveStatus,
} from "~/modules/workshops";
import type { AppServices } from "~/composition/request-services";
import type { MaterialsService } from "~/modules/materials";
import { createUnavailableService } from "~/composition/unavailable-service";
import type { IntensivesService } from "~/modules/workshops";
import type { TeachersService } from "~/modules/teachers";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
  withOverrides,
} from "~/testing/admin/route-kit";
import { action, loader } from "./intensive-detail";

const money = (pesos: number) => {
  const parsed = Money.fromCentavos(pesos * 100);
  if (!parsed.ok) throw new Error("invalid fixture money");
  return parsed.value;
};
const image = {
  assetId: "img-1",
  alt: "Una taza",
  asset: { src: "/imagenes/taza.webp" },
};
const missingImage = { assetId: "img-missing", alt: "Una fuente", asset: null };
const intensive = {
  id: "i1",
  name: "Cerámica de sábado",
  slug: "ceramica-sabado",
  summary: "Un resumen",
  description: "Un detalle",
  eventDate: "2026-10-10",
  startsAt: "10:00",
  endsAt: "13:00",
  price: money(30000),
  deposit: money(10000),
  capacity: 12,
  minSeats: 4,
  policyText: "Traé delantal.",
  materialsIncluded: true,
  images: [image, missingImage],
  status: "draft" as const,
  assignment: {
    teacher: { id: "t-archived", name: "Ana", active: false },
    percentage: { basisPoints: 3550 },
  },
  audit: {
    updatedBy: "a@x.test",
    updatedAt: new Date("2026-10-10T03:30:00.000Z"),
  },
};
const fields = {
  name: "Cerámica editada",
  slug: "ceramica-editada",
  summary: "Otro resumen",
  description: "Otro detalle",
  teacherId: "t-archived",
  percentage: "35,5",
  eventDate: "2026-10-11",
  startsAt: "11:00",
  endsAt: "14:00",
  price: "35000",
  deposit: "12000",
  capacity: "15",
  minSeats: "5",
  policyText: "Otra política.",
  materialsIncluded: "on",
  galleryAssetId: "img-1",
  gallerySrc: "/imagenes/taza.webp",
  galleryAlt: "Una taza editada",
};

function context(
  options: {
    admin?: boolean;
    get?: IntensivesService["get"];
    update?: IntensivesService["update"];
    list?: TeachersService["list"];
    listProjects?: IntensivesService["listProjects"];
  } = {},
) {
  return adminContext(
    {
      intensives: withOverrides(createUnavailableService<IntensivesService>(), {
        ...(options.get ? { get: options.get } : {}),
        ...(options.update ? { update: options.update } : {}),
        listProjects:
          options.listProjects ??
          (() => Promise.resolve({ ok: true as const, value: [] })),
        listProjectMaterials: () =>
          Promise.resolve({ ok: true as const, value: [] }),
      }),
      materials: withOverrides(createUnavailableService<MaterialsService>(), {
        listSaleVariants: () =>
          Promise.resolve({ ok: true as const, value: [] }),
      }),
      teachers: withOverrides(
        createUnavailableService<TeachersService>(),
        options.list ? { list: options.list } : {},
      ),
    },
    options.admin === undefined ? {} : { admin: options.admin },
  );
}

function load(options = {}) {
  return loader({
    request: getRequest("/admin/intensivos/i1"),
    params: { id: "i1" },
    context: context(options),
  } as never);
}
function submit(options = {}) {
  return action({
    request: postRequest("/admin/intensivos/i1", { intent: "save", ...fields }),
    params: { id: "i1" },
    context: context(options),
  } as never);
}

function lifecycleContext(methods: Partial<IntensivesService>, admin = true) {
  return adminContext(
    {
      intensives: withOverrides(
        createUnavailableService<IntensivesService>(),
        methods,
      ),
      teachers: createUnavailableService<TeachersService>(),
    },
    { admin },
  );
}

function submitIntent(
  fields: Record<string, string>,
  methods: Partial<IntensivesService>,
  admin = true,
) {
  return action({
    request: postRequest("/admin/intensivos/i1", fields),
    params: { id: "i1" },
    context: lifecycleContext(methods, admin),
  } as never);
}

const project = {
  id: "p1",
  intensiveId: "i1",
  position: 0,
  name: "Taza de torno",
  image: {
    assetId: "img-1",
    alt: "Una taza",
    asset: { src: "/imagenes/taza.webp" },
  },
  price: money(45000),
  deposit: money(15000),
  audit: {
    updatedBy: "a@x.test",
    updatedAt: new Date("2026-10-10T03:30:00.000Z"),
  },
};
const plainProject = {
  id: "p2",
  intensiveId: "i1",
  position: 1,
  name: "Plato hondo",
  image: null,
  price: money(30000),
  deposit: money(10000),
  audit: project.audit,
};
const projectFields = {
  intent: "project-add",
  name: "Taza nueva",
  price: "45000",
  deposit: "15000",
  imageAssetId: "img-1",
  imageSrc: "/imagenes/taza.webp",
  imageAlt: "Una taza",
};

describe("admin intensive detail", () => {
  it("loads every form value, the real gallery source, audit in Córdoba time, and only active or assigned archived teachers", async () => {
    const get = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive }),
    );
    const list = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [
          {
            id: "t-active",
            name: "Beto",
            active: true,
            modality: "own" as const,
          },
          {
            id: "t-archived",
            name: "Ana",
            active: false,
            modality: "third_party" as const,
          },
          {
            id: "t-other",
            name: "Cora",
            active: false,
            modality: "own" as const,
          },
        ],
      }),
    );
    await expect(load({ get, list })).resolves.toMatchObject({
      id: "i1",
      values: {
        name: "Cerámica de sábado",
        slug: "ceramica-sabado",
        summary: "Un resumen",
        description: "Un detalle",
        teacherId: "t-archived",
        percentage: "35,5",
        eventDate: "2026-10-10",
        startsAt: "10:00",
        endsAt: "13:00",
        price: "30000",
        deposit: "10000",
        capacity: "12",
        minSeats: "4",
        policyText: "Traé delantal.",
        materialsIncluded: true,
        images: [
          { assetId: "img-1", src: "/imagenes/taza.webp", alt: "Una taza" },
          { assetId: "img-missing", alt: "Una fuente" },
        ],
      },
      teachers: [
        { id: "t-active", name: "Beto", modality: "own" },
        { id: "t-archived", name: "Ana (archivado)", modality: "third_party" },
      ],
      audit: { updatedBy: "a@x.test" },
    });
    const result = await load({ get, list });
    expect(result.audit.updatedAt).toContain("12:30");
    expect(result.audit.updatedAt).not.toContain("T03:30");
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
    );
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "all",
    );
  });

  it("denies loader and action before any service call, and maps absent or unavailable records", async () => {
    const get = vi.fn();
    const update = vi.fn();
    const list = vi.fn();
    await expect(
      thrownStatus(() => load({ admin: false, get, list })),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() => submit({ admin: false, update })),
    ).resolves.toBe(403);
    expect(get).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    await expect(
      thrownStatus(() =>
        load({
          get: vi.fn(() =>
            Promise.resolve({
              ok: false as const,
              error: { kind: "not-found" as const },
            }),
          ),
        }),
      ),
    ).resolves.toBe(404);
    await expect(thrownStatus(() => load())).resolves.toBe(503);
  });

  it("updates with the actor and id then redirects, while invalid responses preserve every value and gallery", async () => {
    const update = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive }),
    );
    const response = await submit({ update });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      {
        name: "Cerámica editada",
        slug: "ceramica-editada",
        summary: "Otro resumen",
        description: "Otro detalle",
        teacherId: "t-archived",
        percentage: "35,5",
        eventDate: "2026-10-11",
        startsAt: "11:00",
        endsAt: "14:00",
        price: "35000",
        deposit: "12000",
        capacity: "15",
        minSeats: "5",
        policyText: "Otra política.",
        materialsIncluded: true,
        images: [
          {
            assetId: "img-1",
            src: "/imagenes/taza.webp",
            alt: "Una taza editada",
          },
        ],
      },
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=saved",
    );
    const invalid = await submit({
      update: vi.fn(() =>
        Promise.resolve({
          ok: false as const,
          error: {
            kind: "invalid" as const,
            issues: [{ field: "name" as const, code: "required" as const }],
          },
        }),
      ),
    });
    expect(invalid).toMatchObject({
      init: { status: 422 },
      data: {
        values: {
          name: "Cerámica editada",
          slug: "ceramica-editada",
          summary: "Otro resumen",
          description: "Otro detalle",
          teacherId: "t-archived",
          percentage: "35,5",
          eventDate: "2026-10-11",
          startsAt: "11:00",
          endsAt: "14:00",
          price: "35000",
          deposit: "12000",
          capacity: "15",
          minSeats: "5",
          policyText: "Otra política.",
          materialsIncluded: true,
          images: [
            {
              assetId: "img-1",
              src: "/imagenes/taza.webp",
              alt: "Una taza editada",
            },
          ],
        },
        errors: { name: "Completá este campo." },
      },
    });
  });

  it("rejects unknown intents and denial before FormData or a service call", async () => {
    const publish = vi.fn();
    await expect(
      thrownStatus(() => submitIntent({ intent: "unknown" }, { publish })),
    ).resolves.toBe(400);
    expect(publish).not.toHaveBeenCalled();
    await expect(
      thrownStatus(() =>
        submitIntent({ intent: "publish" }, { publish }, false),
      ),
    ).resolves.toBe(403);
    expect(publish).not.toHaveBeenCalled();
  });

  it("calls every lifecycle service with actor and id, then redirects correctly", async () => {
    const changed = { ok: true as const, value: intensive };
    const codes = {
      publish: "published",
      pause: "paused",
      cancel: "cancelled",
      archive: "archived",
      restore: "restored",
    } as const;
    for (const intent of [
      "publish",
      "pause",
      "cancel",
      "archive",
      "restore",
    ] as const) {
      const method = vi.fn(() => Promise.resolve(changed));
      const response = await submitIntent({ intent }, { [intent]: method });
      expect(method).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@x.test" }),
        "i1",
      );
      expect((response as Response).headers.get("Location")).toBe(
        `/admin/intensivos/i1?ok=${codes[intent]}`,
      );
    }
    const remove = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: undefined }),
    );
    const response = await submitIntent(
      { intent: "delete" },
      { delete: remove },
    );
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos?ok=deleted",
    );
  });

  it("names every publish rule, transition status, and draft-only delete refusal", async () => {
    const refused = (from: IntensiveStatus, to: IntensiveStatus) =>
      Promise.resolve({
        ok: false as const,
        error: { kind: "transition-refused" as const, from, to },
      });
    await expect(
      submitIntent(
        { intent: "pause" },
        { pause: () => refused("draft", "paused") },
      ),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: { stateError: "No se puede pasar de Borrador a Pausado." },
    });
    await expect(
      submitIntent(
        { intent: "delete" },
        {
          delete: () =>
            Promise.resolve({
              ok: false as const,
              error: {
                kind: "rules-unmet" as const,
                rules: ["draft-only" as const],
              },
            }),
        },
      ),
    ).resolves.toMatchObject({
      data: { stateError: "Solo se puede eliminar un borrador." },
    });
  });

  it("reschedules only its three fields, preserves invalid posted values, and maps failures", async () => {
    const reschedule = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive as never }),
    );
    const response = await submitIntent(
      {
        intent: "reschedule",
        eventDate: "2026-12-12",
        startsAt: "09:00",
        endsAt: "12:00",
        name: "ignored",
      },
      { reschedule },
    );
    expect(reschedule).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      { eventDate: "2026-12-12", startsAt: "09:00", endsAt: "12:00" },
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=rescheduled",
    );
    await expect(
      submitIntent(
        {
          intent: "reschedule",
          eventDate: "",
          startsAt: "14:00",
          endsAt: "10:00",
        },
        {
          reschedule: () =>
            Promise.resolve({
              ok: false as const,
              error: {
                kind: "invalid" as const,
                issues: [
                  { field: "eventDate" as const, code: "required" as const },
                  {
                    field: "timeRange" as const,
                    code: "end-before-start" as const,
                  },
                ],
              },
            }),
        },
      ),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        reschedule: {
          values: { eventDate: "", startsAt: "14:00", endsAt: "10:00" },
          errors: {
            eventDate: "Completá este campo.",
            timeRange:
              "El horario de fin tiene que ser posterior al de inicio.",
          },
        },
      },
    });
    for (const [kind, status] of [
      ["denied", 403],
      ["not-found", 404],
      ["unavailable", 503],
    ] as const)
      await expect(
        thrownStatus(() =>
          submitIntent(
            { intent: "archive" },
            {
              archive: () =>
                Promise.resolve({ ok: false as const, error: { kind } }),
            },
          ),
        ),
      ).resolves.toBe(status);
  });

  it("names every unmet intensive publish rule in a form-level 422", async () => {
    const update: IntensivesService["update"] = () =>
      Promise.resolve({
        ok: false,
        error: {
          kind: "rules-unmet",
          rules: [
            "teacher",
            "percentage",
            "time-range",
            "future-start",
            "price",
            "deposit",
            "capacity",
            "min-seats",
          ],
        },
      });
    await expect(submit({ update })).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        formError:
          "No se puede guardar este workshop porque falta: un profesor asignado, el porcentaje acordado, un horario válido, una fecha futura, un precio, una seña válida, una capacidad válida, cupos mínimos válidos.",
      },
    });
  });

  it("loads the projects as cards with formatted money and prefilled forms", async () => {
    const get = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive }),
    );
    const list = vi.fn(() => Promise.resolve({ ok: true as const, value: [] }));
    const listProjects = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: [project, plainProject] as never,
      }),
    );

    const result = await load({ get, list, listProjects });

    expect(listProjects).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
    );
    expect(result.projects).toEqual([
      {
        id: "p1",
        name: "Taza de torno",
        amounts: { price: "$ 45.000", deposit: "$ 15.000" },
        image: { src: "/imagenes/taza.webp", alt: "Una taza" },
        values: {
          name: "Taza de torno",
          price: "45000",
          deposit: "15000",
          image: {
            assetId: "img-1",
            src: "/imagenes/taza.webp",
            alt: "Una taza",
          },
        },
        materials: [],
      },
      {
        id: "p2",
        name: "Plato hondo",
        amounts: { price: "$ 30.000", deposit: "$ 10.000" },
        image: null,
        values: {
          name: "Plato hondo",
          price: "30000",
          deposit: "10000",
          image: null,
        },
        materials: [],
      },
    ]);
  });

  it("maps a failed project listing like any other failed read", async () => {
    const get = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: intensive }),
    );
    const list = vi.fn(() => Promise.resolve({ ok: true as const, value: [] }));
    const listProjects = vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: { kind: "unavailable" as const },
      }),
    );

    await expect(
      thrownStatus(() => load({ get, list, listProjects })),
    ).resolves.toBe(503);
  });

  it("adds a project with the posted fields and returns to the projects section", async () => {
    const addProject = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: project as never }),
    );

    const response = await submitIntent(projectFields, { addProject });

    expect(addProject).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      {
        name: "Taza nueva",
        price: "45000",
        deposit: "15000",
        image: { assetId: "img-1", alt: "Una taza" },
      },
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=projectAdded#proyectos",
    );
  });

  it("keeps what was typed and words each issue when a project is refused", async () => {
    const refuse = (
      issues: {
        field: "name" | "deposit";
        code: "required" | "exceeds-price";
      }[],
    ) =>
      Promise.resolve({
        ok: false as const,
        error: { kind: "invalid" as const, issues },
      });

    const added = await submitIntent(
      { ...projectFields, name: "" },
      { addProject: () => refuse([{ field: "name", code: "required" }]) },
    );
    const saved = await submitIntent(
      { ...projectFields, intent: "project-save", projectId: "p2" },
      {
        updateProject: () =>
          refuse([{ field: "deposit", code: "exceeds-price" }]),
      },
    );

    expect(added).toMatchObject({
      init: { status: 422 },
      data: {
        projects: {
          target: "new",
          values: { name: "", price: "45000", deposit: "15000" },
          errors: { name: "Completá este campo." },
        },
      },
    });
    expect(saved).toMatchObject({
      init: { status: 422 },
      data: {
        projects: {
          target: "p2",
          errors: { deposit: "No puede superar el precio." },
        },
      },
    });
  });

  it("saves one project by id", async () => {
    const updateProject = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: project as never }),
    );

    const response = await submitIntent(
      { ...projectFields, intent: "project-save", projectId: "p2" },
      { updateProject },
    );

    expect(updateProject).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      "p2",
      expect.objectContaining({ name: "Taza nueva" }),
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=projectSaved#proyectos",
    );
  });

  it("moves a project up or down and refuses any other direction before a service call", async () => {
    const moveProject = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: undefined }),
    );

    const response = await submitIntent(
      { intent: "project-move", projectId: "p2", direction: "up" },
      { moveProject },
    );

    expect(moveProject).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      "p2",
      "up",
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=projectMoved#proyectos",
    );
    await expect(
      thrownStatus(() =>
        submitIntent(
          { intent: "project-move", projectId: "p2", direction: "left" },
          { moveProject },
        ),
      ),
    ).resolves.toBe(400);
    expect(moveProject).toHaveBeenCalledTimes(1);
  });

  it("deletes a project and explains a refusal in plain words", async () => {
    const deleteProject = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: undefined }),
    );

    const response = await submitIntent(
      { intent: "project-delete", projectId: "p2" },
      { deleteProject },
    );

    expect(deleteProject).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      "p2",
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=projectDeleted#proyectos",
    );
    const refuse = (rule: "in-use" | "last-project") =>
      submitIntent(
        { intent: "project-delete", projectId: "p2" },
        {
          deleteProject: () =>
            Promise.resolve({
              ok: false as const,
              error: { kind: "rules-unmet" as const, rules: [rule] },
            }),
        },
      );
    await expect(refuse("in-use")).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        projectError:
          "No se puede eliminar: ya hay solicitudes que eligieron este proyecto.",
      },
    });
    await expect(refuse("last-project")).resolves.toMatchObject({
      data: {
        projectError:
          "Un workshop publicado necesita al menos un proyecto. Agregá otro antes de eliminar este.",
      },
    });
  });

  it("denies every project action before a service call", async () => {
    const addProject = vi.fn();
    const deleteProject = vi.fn();

    await expect(
      thrownStatus(() => submitIntent(projectFields, { addProject }, false)),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() =>
        submitIntent(
          { intent: "project-delete", projectId: "p1" },
          { deleteProject },
          false,
        ),
      ),
    ).resolves.toBe(403);
    expect(addProject).not.toHaveBeenCalled();
    expect(deleteProject).not.toHaveBeenCalled();
  });
});

const V1 = "d0000000-0000-4000-8000-000000000001";
const catalog = [
  {
    materialId: "m1",
    variantId: V1,
    materialName: "Arcilla blanca",
    variantLabel: "5 kg",
    unitPrice: money(9000),
    keptInStudio: false,
  },
  {
    materialId: "m2",
    variantId: "v2",
    materialName: "Esmalte",
    variantLabel: "Celeste",
    unitPrice: money(4000),
    keptInStudio: false,
  },
];
const okMaterials = (variants = catalog) =>
  withOverrides(createUnavailableService<MaterialsService>(), {
    listSaleVariants: () =>
      Promise.resolve({ ok: true as const, value: variants }),
  });

function billContext(
  methods: Partial<IntensivesService>,
  extra: Partial<AppServices> = {},
  admin = true,
) {
  return adminContext(
    {
      intensives: withOverrides(
        createUnavailableService<IntensivesService>(),
        methods,
      ),
      teachers: createUnavailableService<TeachersService>(),
      materials: okMaterials(),
      ...extra,
    },
    { admin },
  );
}

function submitBill(
  fields: Record<string, string>,
  methods: Partial<IntensivesService>,
  extra: Partial<AppServices> = {},
  admin = true,
) {
  return action({
    request: postRequest("/admin/intensivos/i1", fields),
    params: { id: "i1" },
    context: billContext(methods, extra, admin),
  } as never);
}

describe("admin intensive detail: bill of materials", () => {
  const loadBill = (
    lines: readonly IntensiveProjectMaterial[],
    extra: Partial<AppServices> = {},
  ) =>
    loader({
      request: getRequest("/admin/intensivos/i1"),
      params: { id: "i1" },
      context: billContext(
        {
          get: () =>
            Promise.resolve({ ok: true as const, value: intensive as never }),
          listProjects: () =>
            Promise.resolve({
              ok: true as const,
              value: [project, plainProject] as never,
            }),
          listProjectMaterials: () =>
            Promise.resolve({ ok: true as const, value: lines }),
        },
        {
          teachers: withOverrides(createUnavailableService<TeachersService>(), {
            list: () => Promise.resolve({ ok: true as const, value: [] }),
          }),
          ...extra,
        },
      ),
    } as never);

  const stock = (levels: [string, number][]) => ({
    variantStock: {
      onHand: () => Promise.resolve(new Map(levels)),
    },
  });

  it("puts each project's lines on its card, named from the catalog with the units on hand, and offers the catalog to add", async () => {
    const result = await loadBill(
      [
        { projectId: "p1", variantId: V1, quantity: 2, position: 0 },
        { projectId: "p1", variantId: "v-gone", quantity: 1, position: 1 },
      ],
      stock([[V1, 7]]),
    );

    expect(result.projects[0]?.materials).toEqual([
      {
        variantId: V1,
        name: "Arcilla blanca",
        label: "5 kg",
        quantity: 2,
        onHand: 7,
      },
      {
        variantId: "v-gone",
        name: null,
        label: null,
        quantity: 1,
        onHand: null,
      },
    ]);
    expect(result.projects[1]?.materials).toEqual([]);
    expect(result.materialChoices).toEqual([
      { variantId: V1, name: "Arcilla blanca", label: "5 kg", onHand: 7 },
      { variantId: "v2", name: "Esmalte", label: "Celeste", onHand: 0 },
    ]);
  });

  it("still loads the screen, without stock, when the units on hand cannot be read", async () => {
    const result = await loadBill(
      [{ projectId: "p1", variantId: V1, quantity: 2, position: 0 }],
      { variantStock: { onHand: () => Promise.reject(new Error("db down")) } },
    );

    expect(result.projects[0]?.materials[0]).toMatchObject({
      name: "Arcilla blanca",
      onHand: null,
    });
  });

  it("maps a failed bill or catalog read like any other failed read", async () => {
    await expect(
      thrownStatus(() =>
        loader({
          request: getRequest("/admin/intensivos/i1"),
          params: { id: "i1" },
          context: billContext(
            {
              get: () =>
                Promise.resolve({
                  ok: true as const,
                  value: intensive as never,
                }),
              listProjects: () =>
                Promise.resolve({ ok: true as const, value: [] }),
              listProjectMaterials: () =>
                Promise.resolve({
                  ok: false as const,
                  error: { kind: "unavailable" as const },
                }),
            },
            {
              teachers: withOverrides(
                createUnavailableService<TeachersService>(),
                {
                  list: () => Promise.resolve({ ok: true as const, value: [] }),
                },
              ),
            },
          ),
        } as never),
      ),
    ).resolves.toBe(503);
  });

  it("adds a catalog variant with the typed quantity and returns to the projects section", async () => {
    const addProjectMaterial = vi.fn(() =>
      Promise.resolve({
        ok: true as const,
        value: { projectId: "p1", variantId: V1, quantity: 3, position: 0 },
      }),
    );

    const response = await submitBill(
      {
        intent: "project-material-add",
        projectId: "p1",
        variantId: V1,
        quantity: "3",
      },
      { addProjectMaterial },
    );

    expect(addProjectMaterial).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      "p1",
      { variantId: V1, quantity: "3" },
    );
    expect((response as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=materialAdded#proyectos",
    );
  });

  it("refuses a variant that is not in the catalog before saving anything", async () => {
    const addProjectMaterial = vi.fn();

    const response = await submitBill(
      {
        intent: "project-material-add",
        projectId: "p1",
        variantId: "d0000000-0000-4000-8000-0000000000ff",
        quantity: "1",
      },
      { addProjectMaterial },
    );

    expect(addProjectMaterial).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      init: { status: 422 },
      data: {
        projectMaterial: {
          projectId: "p1",
          message: "Ese material no está disponible en el catálogo.",
        },
      },
    });
  });

  it("words a refused quantity and a duplicated variant in plain terms", async () => {
    const add = (error: unknown) =>
      submitBill(
        {
          intent: "project-material-add",
          projectId: "p1",
          variantId: V1,
          quantity: "0",
        },
        {
          addProjectMaterial: () =>
            Promise.resolve({ ok: false as const, error }) as never,
        },
      );

    await expect(
      add({
        kind: "invalid",
        issues: [{ field: "quantity", code: "out-of-range" }],
      }),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        projectMaterial: {
          projectId: "p1",
          message: "La cantidad tiene que ser un número entero de 1 a 20.",
        },
      },
    });
    await expect(
      add({ kind: "rules-unmet", rules: ["duplicate-variant"] }),
    ).resolves.toMatchObject({
      init: { status: 422 },
      data: {
        projectMaterial: {
          projectId: "p1",
          message:
            "Ese material ya está en la lista de este proyecto. Cambiá su cantidad.",
        },
      },
    });
  });

  it("changes a quantity and removes a line, each returning to the projects section", async () => {
    const setProjectMaterialQuantity = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: undefined }),
    );
    const removeProjectMaterial = vi.fn(() =>
      Promise.resolve({ ok: true as const, value: undefined }),
    );
    const fieldsOf = (intent: string) => ({
      intent,
      projectId: "p1",
      variantId: V1,
      quantity: "9",
    });

    const saved = await submitBill(fieldsOf("project-material-set"), {
      setProjectMaterialQuantity,
    });
    const removed = await submitBill(fieldsOf("project-material-remove"), {
      removeProjectMaterial,
    });

    expect(setProjectMaterialQuantity).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      "p1",
      V1,
      "9",
    );
    expect(removeProjectMaterial).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@x.test" }),
      "i1",
      "p1",
      V1,
    );
    expect((saved as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=materialSaved#proyectos",
    );
    expect((removed as Response).headers.get("Location")).toBe(
      "/admin/intensivos/i1?ok=materialRemoved#proyectos",
    );
  });

  it("words a refused quantity change", async () => {
    const response = await submitBill(
      {
        intent: "project-material-set",
        projectId: "p1",
        variantId: V1,
        quantity: "abc",
      },
      {
        setProjectMaterialQuantity: () =>
          Promise.resolve({
            ok: false as const,
            error: {
              kind: "invalid" as const,
              issues: [{ field: "quantity" as const, code: "invalid-format" }],
            },
          }),
      },
    );

    expect(response).toMatchObject({
      init: { status: 422 },
      data: {
        projectMaterial: {
          projectId: "p1",
          message: "La cantidad tiene que ser un número entero de 1 a 20.",
        },
      },
    });
  });

  it("maps an unknown project or line to a thrown not-found", async () => {
    await expect(
      thrownStatus(() =>
        submitBill(
          {
            intent: "project-material-remove",
            projectId: "gone",
            variantId: V1,
          },
          {
            removeProjectMaterial: () =>
              Promise.resolve({
                ok: false as const,
                error: { kind: "not-found" as const },
              }),
          },
        ),
      ),
    ).resolves.toBe(404);
  });

  it("denies every bill action before a service call", async () => {
    const addProjectMaterial = vi.fn();
    const removeProjectMaterial = vi.fn();

    await expect(
      thrownStatus(() =>
        submitBill(
          {
            intent: "project-material-add",
            projectId: "p1",
            variantId: V1,
            quantity: "1",
          },
          { addProjectMaterial },
          {},
          false,
        ),
      ),
    ).resolves.toBe(403);
    await expect(
      thrownStatus(() =>
        submitBill(
          { intent: "project-material-remove", projectId: "p1", variantId: V1 },
          { removeProjectMaterial },
          {},
          false,
        ),
      ),
    ).resolves.toBe(403);
    expect(addProjectMaterial).not.toHaveBeenCalled();
    expect(removeProjectMaterial).not.toHaveBeenCalled();
  });
});
