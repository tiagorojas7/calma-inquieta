import { describe, expect, it } from "vitest";
import type { MediaLookup } from "~/modules/media";
import { createTeacherLookup } from "~/modules/teachers";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { buildMediaAsset, buildTeacher } from "~/testing/fakes/admin-builders";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { InMemoryIntensiveRepository } from "~/testing/fakes/in-memory-intensive-repository";
import { InMemoryTeacherRepository } from "~/testing/fakes/in-memory-teacher-repository";
import type {
  IntensiveProject,
  IntensiveProjectDraft,
  NewIntensiveWorkshopDraft,
} from "./contracts";
import { createIntensivesService } from "./intensive-service";

const START = new Date("2026-10-14T12:00:00.000Z");
const owner = testAdminActor("owner@example.com");
const other = testAdminActor("other@example.com");

const draft = (
  overrides: Partial<NewIntensiveWorkshopDraft> = {},
): NewIntensiveWorkshopDraft => ({
  name: "Cerámica de fin de semana",
  slug: "",
  summary: "Un día de torno",
  description: "Descripción larga",
  teacherId: "t-own",
  percentage: "",
  eventDate: "2026-11-07",
  startsAt: "10:00",
  endsAt: "18:00",
  firstProject: {
    name: "Primer proyecto",
    price: "30000",
    deposit: "10000",
    description: "",
  },
  capacity: "8",
  minSeats: "4",
  policyText: "Cancelación hasta 48 horas antes.",
  materialsIncluded: false,
  images: [],
  ...overrides,
});

const projectDraft = (
  overrides: Partial<IntensiveProjectDraft> = {},
): IntensiveProjectDraft => ({
  name: "Taza de torno",
  price: "45000",
  deposit: "15000",
  description: "",
  image: null,
  ...overrides,
});

function setup() {
  const repository = new InMemoryIntensiveRepository();
  const teacherRepository = new InMemoryTeacherRepository();
  teacherRepository.teachers.set(
    "t-own",
    buildTeacher({ id: "t-own", name: "Cami", modality: "own" }),
  );
  const assets = new Map(
    ["a1", "a2"].map((id) => [id, buildMediaAsset({ id })]),
  );
  const media: MediaLookup = {
    findAssets: (ids) =>
      Promise.resolve(
        new Map(
          ids.flatMap((id) => {
            const asset = assets.get(id);
            return asset ? [[id, asset] as const] : [];
          }),
        ),
      ),
  };
  let counter = 0;
  const service = createIntensivesService({
    repository,
    teachers: createTeacherLookup(teacherRepository),
    media,
    clock: advancingClock(START),
    newId: () => `id-${String(++counter)}`,
  });
  return { repository, service };
}

function valueOf<T>(result: { ok: boolean; value?: T }): T {
  if (!result.ok || result.value === undefined)
    throw new Error("expected an ok result");
  return result.value;
}

/** Plain view of a project: Money hides its field from toEqual. */
const plain = (project: IntensiveProject) => ({
  ...project,
  price: project.price.toCentavos(),
  deposit: project.deposit.toCentavos(),
});

async function workshop(overrides: Partial<NewIntensiveWorkshopDraft> = {}) {
  const ctx = setup();
  const created = valueOf(await ctx.service.create(owner, draft(overrides)));
  return { ...ctx, id: created.id };
}

const namesOf = async (
  service: ReturnType<typeof setup>["service"],
  id: string,
) => valueOf(await service.listProjects(owner, id)).map((p) => p.name);

describe("a new intensivo", () => {
  it("starts with the one project the owner typed, with its own description", async () => {
    const { service, id } = await workshop({
      firstProject: {
        name: "Taza de torno",
        price: "45000",
        deposit: "15000",
        description: "  Tu primera taza.  ",
      },
    });

    const projects = valueOf(await service.listProjects(owner, id));

    expect(projects.map(plain)).toEqual([
      {
        id: "id-2",
        intensiveId: id,
        position: 0,
        name: "Taza de torno",
        description: "Tu primera taza.",
        image: null,
        price: 4_500_000,
        deposit: 1_500_000,
        audit: { updatedBy: "owner@example.com", updatedAt: START },
      },
    ]);
  });

  it("stores no project when the intensivo itself is refused", async () => {
    const { repository, service } = setup();

    const result = await service.create(owner, draft({ name: "" }));

    expect(result.ok).toBe(false);
    expect(repository.projects.size).toBe(0);
  });

  it("stores nothing when the first project is refused", async () => {
    const { repository, service } = setup();

    const result = await service.create(
      owner,
      draft({
        firstProject: {
          name: "",
          price: "1",
          deposit: "1",
          description: "",
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(repository.items.size).toBe(0);
    expect(repository.projects.size).toBe(0);
  });
});

describe("existing intensivo flows", () => {
  it("still creates, edits and publishes, keeping the price the first project set", async () => {
    const { service, id } = await workshop();

    const edited = valueOf(
      await service.update(owner, id, {
        ...draft(),
        capacity: "10",
      }),
    );
    const published = valueOf(await service.publish(owner, id));

    expect(edited.price.toCentavos()).toBe(3_000_000);
    expect(edited.deposit.toCentavos()).toBe(1_000_000);
    expect(published.status).toBe("published");
    expect(published.capacity).toBe(10);
  });
});

describe("listProjects", () => {
  it("returns the projects in order with their image resolved", async () => {
    const { service, id } = await workshop();
    valueOf(
      await service.addProject(
        owner,
        id,
        projectDraft({
          name: "Con foto",
          image: { assetId: "a1", alt: "  Una taza  " },
        }),
      ),
    );

    const projects = valueOf(await service.listProjects(owner, id));

    expect(projects.map((p) => p.name)).toEqual([
      "Primer proyecto",
      "Con foto",
    ]);
    expect(projects[1]?.image).toEqual({
      assetId: "a1",
      alt: "Una taza",
      asset: buildMediaAsset({ id: "a1" }),
    });
  });

  it("reports an unknown intensivo", async () => {
    const { service } = setup();

    expect(await service.listProjects(owner, "nope")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("addProject", () => {
  it("appends an audited project with exact money and the trimmed name", async () => {
    const { service, id } = await workshop();

    const added = valueOf(
      await service.addProject(
        other,
        id,
        projectDraft({ name: "  Plato hondo  " }),
      ),
    );

    expect(plain(added)).toEqual({
      id: "id-3",
      intensiveId: id,
      position: 1,
      name: "Plato hondo",
      description: null,
      image: null,
      price: 4_500_000,
      deposit: 1_500_000,
      audit: { updatedBy: "other@example.com", updatedAt: START },
    });
  });

  it("keeps a trimmed description and reads it back", async () => {
    const { service, id } = await workshop();

    const added = valueOf(
      await service.addProject(
        owner,
        id,
        projectDraft({ description: "  Un plato para compartir.  " }),
      ),
    );

    expect(added.description).toBe("Un plato para compartir.");
    const listed = valueOf(await service.listProjects(owner, id));
    expect(listed[1]?.description).toBe("Un plato para compartir.");
  });

  it("refuses a description over 600 characters and stores nothing", async () => {
    const { repository, service, id } = await workshop();

    const result = await service.addProject(
      owner,
      id,
      projectDraft({ description: "d".repeat(601) }),
    );

    expect(result).toMatchObject({
      error: { issues: [{ field: "description", code: "too-long" }] },
    });
    expect(repository.projects.size).toBe(1);
  });

  it("names every invalid field and stores nothing", async () => {
    const { repository, service, id } = await workshop();

    const result = await service.addProject(
      owner,
      id,
      projectDraft({
        name: "",
        price: "1000",
        deposit: "2000",
        image: { assetId: "ghost", alt: "x" },
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "name", code: "required" },
          { field: "deposit", code: "exceeds-price" },
          { field: "image", code: "unknown-reference" },
        ],
      },
    });
    expect(repository.projects.size).toBe(1);
  });

  it("requires alt text for an image and caps it at 200 characters", async () => {
    const { service, id } = await workshop();

    const blank = await service.addProject(
      owner,
      id,
      projectDraft({ image: { assetId: "a1", alt: "   " } }),
    );
    const long = await service.addProject(
      owner,
      id,
      projectDraft({ image: { assetId: "a1", alt: "x".repeat(201) } }),
    );

    expect(blank).toMatchObject({
      error: { issues: [{ field: "image", code: "required" }] },
    });
    expect(long).toMatchObject({
      error: { issues: [{ field: "image", code: "too-long" }] },
    });
  });

  it("reports an unknown intensivo", async () => {
    const { service } = setup();

    expect(await service.addProject(owner, "nope", projectDraft())).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("updateProject", () => {
  it("changes name, image, price and deposit, keeps the position and refreshes the audit", async () => {
    const { service, id } = await workshop();
    const second = valueOf(await service.addProject(owner, id, projectDraft()));

    const updated = valueOf(
      await service.updateProject(
        other,
        id,
        second.id,
        projectDraft({
          name: "Renombrado",
          price: "60000",
          deposit: "20000",
          image: { assetId: "a2", alt: "Foto" },
        }),
      ),
    );

    expect(plain(updated)).toMatchObject({
      id: second.id,
      position: 1,
      name: "Renombrado",
      price: 6_000_000,
      deposit: 2_000_000,
      image: { assetId: "a2", alt: "Foto" },
      audit: { updatedBy: "other@example.com" },
    });
    expect(await namesOf(service, id)).toEqual([
      "Primer proyecto",
      "Renombrado",
    ]);
  });

  it("changes and clears the description", async () => {
    const { service, id } = await workshop();
    const second = valueOf(
      await service.addProject(
        owner,
        id,
        projectDraft({ description: "Antes" }),
      ),
    );

    const changed = valueOf(
      await service.updateProject(
        owner,
        id,
        second.id,
        projectDraft({ description: "Después" }),
      ),
    );
    const cleared = valueOf(
      await service.updateProject(owner, id, second.id, projectDraft()),
    );

    expect(changed.description).toBe("Después");
    expect(cleared.description).toBeNull();
  });

  it("can drop the image again", async () => {
    const { service, id } = await workshop();
    const second = valueOf(
      await service.addProject(
        owner,
        id,
        projectDraft({ image: { assetId: "a1", alt: "Foto" } }),
      ),
    );

    const updated = valueOf(
      await service.updateProject(owner, id, second.id, projectDraft()),
    );

    expect(updated.image).toBeNull();
  });

  it("refuses invalid fields without changing the project", async () => {
    const { service, id } = await workshop();
    const second = valueOf(await service.addProject(owner, id, projectDraft()));

    const result = await service.updateProject(
      owner,
      id,
      second.id,
      projectDraft({ name: "n".repeat(81), deposit: "0" }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "name", code: "too-long" },
          { field: "deposit", code: "out-of-range" },
        ],
      },
    });
    expect(await namesOf(service, id)).toEqual([
      "Primer proyecto",
      "Taza de torno",
    ]);
  });

  it("reports an unknown project or one of another intensivo", async () => {
    const { service, id } = await workshop();

    expect(
      await service.updateProject(owner, id, "ghost", projectDraft()),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
    expect(
      await service.updateProject(owner, "nope", "id-2", projectDraft()),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
  });
});

describe("moveProject", () => {
  async function three() {
    const ctx = await workshop();
    valueOf(
      await ctx.service.addProject(owner, ctx.id, projectDraft({ name: "B" })),
    );
    valueOf(
      await ctx.service.addProject(owner, ctx.id, projectDraft({ name: "C" })),
    );
    return ctx;
  }

  it("moves a project down and up one place", async () => {
    const { service, id } = await three();
    const first = valueOf(await service.listProjects(owner, id))[0];
    if (!first) throw new Error("missing project");

    expect(await service.moveProject(owner, id, first.id, "down")).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await namesOf(service, id)).toEqual(["B", "Primer proyecto", "C"]);
    await service.moveProject(owner, id, first.id, "up");
    expect(await namesOf(service, id)).toEqual(["Primer proyecto", "B", "C"]);
  });

  it("leaves the order alone at an edge and reports an unknown project", async () => {
    const { service, id } = await three();
    const first = valueOf(await service.listProjects(owner, id))[0];
    if (!first) throw new Error("missing project");

    expect((await service.moveProject(owner, id, first.id, "up")).ok).toBe(
      true,
    );
    expect(await namesOf(service, id)).toEqual(["Primer proyecto", "B", "C"]);
    expect(await service.moveProject(owner, id, "ghost", "down")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("deleteProject", () => {
  it("deletes a project nobody asked for and keeps the others in order", async () => {
    const { service, id } = await workshop();
    const second = valueOf(await service.addProject(owner, id, projectDraft()));

    expect(await service.deleteProject(owner, id, second.id)).toEqual({
      ok: true,
      value: undefined,
    });

    expect(await namesOf(service, id)).toEqual(["Primer proyecto"]);
  });

  it("refuses while a request still points at the project", async () => {
    const { repository, service, id } = await workshop();
    const second = valueOf(await service.addProject(owner, id, projectDraft()));
    repository.referencedProjects.add(second.id);

    expect(await service.deleteProject(owner, id, second.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["in-use"] },
    });

    expect(await namesOf(service, id)).toHaveLength(2);
  });

  it("refuses to delete the last project of a published or paused intensivo", async () => {
    const { service, id } = await workshop();
    const [only] = valueOf(await service.listProjects(owner, id));
    if (!only) throw new Error("missing project");
    valueOf(await service.publish(owner, id));

    expect(await service.deleteProject(owner, id, only.id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["last-project"] },
    });
    valueOf(await service.pause(owner, id));
    expect(await service.deleteProject(owner, id, only.id)).toMatchObject({
      ok: false,
      error: { rules: ["last-project"] },
    });
  });

  it("lets a draft lose its only project", async () => {
    const { service, id } = await workshop();
    const [only] = valueOf(await service.listProjects(owner, id));
    if (!only) throw new Error("missing project");

    expect((await service.deleteProject(owner, id, only.id)).ok).toBe(true);
    expect(await namesOf(service, id)).toEqual([]);
  });

  it("reports an unknown project", async () => {
    const { service, id } = await workshop();

    expect(await service.deleteProject(owner, id, "ghost")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("publishing needs a project", () => {
  it("refuses to publish a draft without projects and names the rule", async () => {
    const { repository, service, id } = await workshop();
    const [only] = valueOf(await service.listProjects(owner, id));
    if (!only) throw new Error("missing project");
    await service.deleteProject(owner, id, only.id);

    expect(await service.publish(owner, id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["projects"] },
    });
    expect(repository.items.get(id)?.status).toBe("draft");
  });

  it("publishes again once a project is added", async () => {
    const { service, id } = await workshop();
    const [only] = valueOf(await service.listProjects(owner, id));
    if (!only) throw new Error("missing project");
    await service.deleteProject(owner, id, only.id);
    valueOf(await service.addProject(owner, id, projectDraft()));

    expect(valueOf(await service.publish(owner, id)).status).toBe("published");
  });

  it("lists the project rule after the others that fail", async () => {
    const { repository, service, id } = await workshop({
      teacherId: "",
      percentage: "",
    });
    repository.projects.clear();

    expect(await service.publish(owner, id)).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["teacher", "projects"] },
    });
  });

  it("keeps a live intensivo editable only while it has a project", async () => {
    const { repository, service, id } = await workshop();
    valueOf(await service.publish(owner, id));
    repository.projects.clear();

    expect(await service.update(owner, id, draft())).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["projects"] },
    });
  });
});

describe("absent actor", () => {
  it.each([null, undefined])(
    "denies every project use case for %s without touching a port",
    async (actor) => {
      const { repository, service } = setup();
      const calls: string[] = [];
      for (const method of [
        "listProjects",
        "findProject",
        "addProject",
        "updateProject",
        "moveProject",
        "deleteProject",
        "findById",
      ] as const) {
        const original = repository[method].bind(repository) as (
          ...args: never[]
        ) => unknown;
        Object.assign(repository, {
          [method]: (...args: never[]) => {
            calls.push(method);
            return original(...args);
          },
        });
      }
      const denied = { ok: false, error: { kind: "denied" } };

      expect(await service.listProjects(actor, "id-1")).toEqual(denied);
      expect(await service.addProject(actor, "id-1", projectDraft())).toEqual(
        denied,
      );
      expect(
        await service.updateProject(actor, "id-1", "p", projectDraft()),
      ).toEqual(denied);
      expect(await service.moveProject(actor, "id-1", "p", "up")).toEqual(
        denied,
      );
      expect(await service.deleteProject(actor, "id-1", "p")).toEqual(denied);
      expect(calls).toEqual([]);
    },
  );
});

const VARIANT_A = "d0000000-0000-4000-8000-00000000000a";
const VARIANT_B = "d0000000-0000-4000-8000-00000000000b";

async function withProject() {
  const ctx = await workshop();
  const [project] = valueOf(await ctx.service.listProjects(owner, ctx.id));
  if (!project) throw new Error("missing project");
  return { ...ctx, projectId: project.id };
}

const linesOf = async (
  service: ReturnType<typeof setup>["service"],
  id: string,
) =>
  valueOf(await service.listProjectMaterials(owner, id)).map(
    (line) => [line.projectId, line.variantId, line.quantity] as const,
  );

describe("project bill of materials", () => {
  it("adds a variant with a quantity per participant and lists it", async () => {
    const { service, id, projectId } = await withProject();

    const added = await service.addProjectMaterial(owner, id, projectId, {
      variantId: VARIANT_A,
      quantity: " 3 ",
    });

    expect(added).toEqual({
      ok: true,
      value: { projectId, variantId: VARIANT_A, quantity: 3, position: 0 },
    });
    expect(await linesOf(service, id)).toEqual([[projectId, VARIANT_A, 3]]);
  });

  it.each(["", "0", "21", "1,5", "dos"])(
    "refuses the quantity %j and stores nothing",
    async (quantity) => {
      const { service, id, projectId } = await withProject();

      const refused = await service.addProjectMaterial(owner, id, projectId, {
        variantId: VARIANT_A,
        quantity,
      });

      expect(refused.ok).toBe(false);
      if (!refused.ok)
        expect(refused.error).toMatchObject({
          kind: "invalid",
          issues: [{ field: "quantity" }],
        });
      expect(await linesOf(service, id)).toEqual([]);
    },
  );

  it("refuses a variant id that is not a catalog id", async () => {
    const { service, id, projectId } = await withProject();

    expect(
      await service.addProjectMaterial(owner, id, projectId, {
        variantId: "nope",
        quantity: "1",
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "variantId", code: "unknown-reference" }],
      },
    });
    expect(await linesOf(service, id)).toEqual([]);
  });

  it("refuses a variant already on the project, keeping its quantity", async () => {
    const { service, id, projectId } = await withProject();
    await service.addProjectMaterial(owner, id, projectId, {
      variantId: VARIANT_A,
      quantity: "2",
    });

    const again = await service.addProjectMaterial(owner, id, projectId, {
      variantId: VARIANT_A,
      quantity: "5",
    });

    expect(again).toEqual({
      ok: false,
      error: { kind: "rules-unmet", rules: ["duplicate-variant"] },
    });
    expect(await linesOf(service, id)).toEqual([[projectId, VARIANT_A, 2]]);
  });

  it("changes a quantity, validating it, and removes a line", async () => {
    const { service, id, projectId } = await withProject();
    await service.addProjectMaterial(owner, id, projectId, {
      variantId: VARIANT_A,
      quantity: "2",
    });
    await service.addProjectMaterial(owner, id, projectId, {
      variantId: VARIANT_B,
      quantity: "1",
    });

    expect(
      await service.setProjectMaterialQuantity(
        owner,
        id,
        projectId,
        VARIANT_A,
        "9",
      ),
    ).toEqual({ ok: true, value: undefined });
    expect(
      await service.setProjectMaterialQuantity(
        owner,
        id,
        projectId,
        VARIANT_A,
        "0",
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "quantity", code: "out-of-range" }],
      },
    });
    expect(await linesOf(service, id)).toEqual([
      [projectId, VARIANT_A, 9],
      [projectId, VARIANT_B, 1],
    ]);

    expect(
      await service.removeProjectMaterial(owner, id, projectId, VARIANT_A),
    ).toEqual({ ok: true, value: undefined });
    expect(await linesOf(service, id)).toEqual([[projectId, VARIANT_B, 1]]);
  });

  it("reports an unknown intensivo, project or line as not found", async () => {
    const { service, id, projectId } = await withProject();
    const notFound = { ok: false, error: { kind: "not-found" } };
    const line = { variantId: VARIANT_A, quantity: "1" };

    expect(await service.listProjectMaterials(owner, "missing")).toEqual(
      notFound,
    );
    expect(
      await service.addProjectMaterial(owner, id, "missing", line),
    ).toEqual(notFound);
    expect(
      await service.addProjectMaterial(owner, "missing", projectId, line),
    ).toEqual(notFound);
    expect(
      await service.setProjectMaterialQuantity(
        owner,
        id,
        projectId,
        VARIANT_A,
        "2",
      ),
    ).toEqual(notFound);
    expect(
      await service.removeProjectMaterial(owner, id, projectId, VARIANT_A),
    ).toEqual(notFound);
  });

  it("keeps each project list apart and untouched while projects are edited, moved or deleted", async () => {
    const { service, id, projectId } = await withProject();
    const second = valueOf(await service.addProject(owner, id, projectDraft()));
    await service.addProjectMaterial(owner, id, projectId, {
      variantId: VARIANT_A,
      quantity: "2",
    });
    await service.addProjectMaterial(owner, id, second.id, {
      variantId: VARIANT_A,
      quantity: "4",
    });

    // Existing project administration keeps working around the bill.
    valueOf(
      await service.updateProject(
        owner,
        id,
        projectId,
        projectDraft({ name: "Plato" }),
      ),
    );
    expect((await service.moveProject(owner, id, second.id, "up")).ok).toBe(
      true,
    );
    expect(await namesOf(service, id)).toEqual(["Taza de torno", "Plato"]);
    expect(await linesOf(service, id)).toEqual([
      [second.id, VARIANT_A, 4],
      [projectId, VARIANT_A, 2],
    ]);

    expect((await service.deleteProject(owner, id, second.id)).ok).toBe(true);
    expect(await linesOf(service, id)).toEqual([[projectId, VARIANT_A, 2]]);
  });

  it.each([null, undefined])(
    "denies every bill use case for %s without touching a port",
    async (actor) => {
      const { repository, service } = setup();
      const calls: string[] = [];
      for (const method of [
        "findById",
        "listProjectMaterials",
        "addProjectMaterial",
        "setProjectMaterialQuantity",
        "removeProjectMaterial",
      ] as const) {
        const original = repository[method].bind(repository) as (
          ...args: never[]
        ) => unknown;
        Object.assign(repository, {
          [method]: (...args: never[]) => {
            calls.push(method);
            return original(...args);
          },
        });
      }
      const denied = { ok: false, error: { kind: "denied" } };
      const line = { variantId: VARIANT_A, quantity: "1" };

      expect(await service.listProjectMaterials(actor, "id-1")).toEqual(denied);
      expect(
        await service.addProjectMaterial(actor, "id-1", "p", line),
      ).toEqual(denied);
      expect(
        await service.setProjectMaterialQuantity(
          actor,
          "id-1",
          "p",
          VARIANT_A,
          "2",
        ),
      ).toEqual(denied);
      expect(
        await service.removeProjectMaterial(actor, "id-1", "p", VARIANT_A),
      ).toEqual(denied);
      expect(calls).toEqual([]);
    },
  );
});
