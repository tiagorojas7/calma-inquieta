import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  IntensiveRepository,
  NewIntensiveProject,
  StoredIntensiveProject,
  StoredProjectMaterial,
} from "~/modules/workshops/application/intensive-repository";
import {
  ASSET_1,
  buildStoredIntensive,
  ID_A,
  ID_B,
  ID_UNKNOWN,
} from "./intensive-repository.contract";

export const PROJECT_1 = "c0000000-0000-4000-8000-000000000001";
export const PROJECT_2 = "c0000000-0000-4000-8000-000000000002";
export const PROJECT_3 = "c0000000-0000-4000-8000-000000000003";
export const PROJECT_OTHER = "c0000000-0000-4000-8000-0000000000b1";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
};

export function buildNewProject(
  overrides: Partial<NewIntensiveProject> = {},
): NewIntensiveProject {
  return {
    id: PROJECT_1,
    intensiveId: ID_A,
    name: "Taza de torno",
    description: null,
    image: null,
    price: pesos(30000),
    deposit: pesos(10000),
    audit: {
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-11-02T12:00:00.123Z"),
    },
    ...overrides,
  };
}

/** Money hides its field from toEqual: compare centavos explicitly. */
export const plainProject = (project: StoredIntensiveProject | null) =>
  project && {
    ...project,
    price: project.price.toCentavos(),
    deposit: project.deposit.toCentavos(),
  };

export interface ProjectContractHarness {
  readonly repo: IntensiveRepository;
  /** Makes a seat request point at the project, as the public flow will. */
  reference(intensiveId: string, projectId: string): Promise<void>;
}

const names = (projects: readonly StoredIntensiveProject[]) =>
  projects.map((project) => project.name);

/**
 * Behavior every IntensiveRepository implementation must satisfy for the
 * projects of an intensivo: order, append, edit, reorder and guarded delete.
 */
export function runIntensiveProjectContract(
  create: () => Promise<ProjectContractHarness>,
): void {
  async function withProjects(count: number) {
    const harness = await create();
    await harness.repo.insert(buildStoredIntensive());
    const ids = [PROJECT_1, PROJECT_2, PROJECT_3];
    for (let index = 0; index < count; index += 1)
      await harness.repo.addProject(
        buildNewProject({
          id: ids[index] ?? PROJECT_3,
          name: `P${String(index + 1)}`,
        }),
      );
    return harness;
  }

  describe("IntensiveRepository project contract", () => {
    it("inserts the first project with the intensivo at position 0 and round-trips every field", async () => {
      const { repo } = await create();
      const first = buildNewProject({
        name: "Ñandú & Árbol: ¡taza!",
        description: "Una taza hecha en torno, con esmalte a elección.",
        image: { assetId: ASSET_1, alt: "Una taza" },
        price: pesos(123_456_789),
        deposit: pesos(100),
      });

      const inserted = await repo.insert(buildStoredIntensive(), first);

      expect(inserted.ok).toBe(true);
      const projects = await repo.listProjects(ID_A);
      expect(projects.map(plainProject)).toEqual([
        plainProject({ ...first, position: 0 }),
      ]);
      expect(projects[0]?.price.toCentavos()).toBe(12_345_678_900);
      expect(plainProject(await repo.findProject(ID_A, PROJECT_1))).toEqual(
        plainProject({ ...first, position: 0 }),
      );
    });

    it("inserts an intensivo without projects and writes nothing on a slug conflict", async () => {
      const { repo } = await create();
      await repo.insert(buildStoredIntensive());

      expect(await repo.listProjects(ID_A)).toEqual([]);

      const conflict = await repo.insert(
        buildStoredIntensive({ id: ID_B }),
        buildNewProject({ id: PROJECT_2, intensiveId: ID_B }),
      );
      expect(conflict.ok).toBe(false);
      expect(await repo.listProjects(ID_B)).toEqual([]);
      expect(await repo.findProject(ID_B, PROJECT_2)).toBeNull();
    });

    describe("inserting a workshop with all its projects", () => {
      const V1 = "e0000000-0000-4000-8000-000000000001";
      const V2 = "e0000000-0000-4000-8000-000000000002";
      const everything = () => [
        buildNewProject({
          id: PROJECT_1,
          name: "Taza",
          image: { assetId: ASSET_1, alt: "Una taza" },
          materials: [
            { variantId: V1, quantity: 2 },
            { variantId: V2, quantity: 20 },
          ],
        }),
        buildNewProject({ id: PROJECT_2, name: "Plato" }),
        buildNewProject({
          id: PROJECT_3,
          name: "Cuenco",
          description: "Un cuenco hondo.",
          materials: [{ variantId: V1, quantity: 1 }],
        }),
      ];
      const bill = async (repo: IntensiveRepository) =>
        (await repo.listProjectMaterials(ID_A)).map((line) => [
          line.projectId,
          line.variantId,
          line.quantity,
          line.position,
        ]);
      const nothingStored = async (repo: IntensiveRepository) => {
        expect(await repo.findById(ID_A)).toBeNull();
        expect(await repo.listProjects(ID_A)).toEqual([]);
        expect(await bill(repo)).toEqual([]);
      };

      it("stores every project in order, with its image and its bill, in the order given", async () => {
        const { repo } = await create();

        const inserted = await repo.insert(
          buildStoredIntensive(),
          everything(),
        );

        expect(inserted.ok).toBe(true);
        const projects = await repo.listProjects(ID_A);
        expect(projects.map((project) => project.name)).toEqual([
          "Taza",
          "Plato",
          "Cuenco",
        ]);
        expect(projects.map((project) => project.position)).toEqual([0, 1, 2]);
        expect(projects[0]?.image).toEqual({
          assetId: ASSET_1,
          alt: "Una taza",
        });
        expect(projects[2]?.description).toBe("Un cuenco hondo.");
        expect(await bill(repo)).toEqual([
          [PROJECT_1, V1, 2, 0],
          [PROJECT_1, V2, 20, 1],
          [PROJECT_3, V1, 1, 0],
        ]);
      });

      it("stores nothing when a later project's bill has a quantity the database refuses", async () => {
        const { repo } = await create();
        const projects = everything();
        projects[2] = buildNewProject({
          id: PROJECT_3,
          materials: [{ variantId: V1, quantity: 21 }],
        });

        await expect(
          repo.insert(buildStoredIntensive(), projects),
        ).rejects.toThrow();

        await nothingStored(repo);
      });

      it("stores nothing when a later project cannot be stored", async () => {
        const { repo } = await create();
        const projects = everything();
        projects[2] = buildNewProject({ id: PROJECT_1, name: "Repetido" });

        await expect(
          repo.insert(buildStoredIntensive(), projects),
        ).rejects.toThrow();

        await nothingStored(repo);
      });

      it("stores nothing when one bill repeats a variant", async () => {
        const { repo } = await create();
        const projects = [
          buildNewProject({
            materials: [
              { variantId: V1, quantity: 1 },
              { variantId: V1, quantity: 2 },
            ],
          }),
        ];

        await expect(
          repo.insert(buildStoredIntensive(), projects),
        ).rejects.toThrow();

        await nothingStored(repo);
      });

      it("allows the same variant on different projects", async () => {
        const { repo } = await create();

        await repo.insert(buildStoredIntensive(), everything());

        expect(
          (await bill(repo)).filter((line) => line[1] === V1),
        ).toHaveLength(2);
      });

      it("writes no project and no bill on a slug conflict", async () => {
        const { repo } = await create();
        await repo.insert(buildStoredIntensive());

        const conflict = await repo.insert(
          buildStoredIntensive({ id: ID_B }),
          everything().map((project) => ({ ...project, intensiveId: ID_B })),
        );

        expect(conflict.ok).toBe(false);
        expect(await repo.listProjects(ID_B)).toEqual([]);
        expect(await repo.listProjectMaterials(ID_B)).toEqual([]);
      });

      it("still takes one project on its own", async () => {
        const { repo } = await create();

        await repo.insert(buildStoredIntensive(), buildNewProject());

        expect(await repo.listProjects(ID_A)).toHaveLength(1);
      });
    });

    it("appends projects in order, assigning increasing positions", async () => {
      const { repo } = await withProjects(3);

      const projects = await repo.listProjects(ID_A);

      expect(names(projects)).toEqual(["P1", "P2", "P3"]);
      expect(projects.map((project) => project.position)).toEqual([0, 1, 2]);
    });

    it("keeps the projects of one intensivo apart from another's", async () => {
      const { repo } = await withProjects(2);
      await repo.insert(
        buildStoredIntensive({ id: ID_B, slug: "otro" }),
        buildNewProject({
          id: PROJECT_OTHER,
          intensiveId: ID_B,
          name: "De otro",
        }),
      );

      expect(names(await repo.listProjects(ID_A))).toEqual(["P1", "P2"]);
      expect(names(await repo.listProjects(ID_B))).toEqual(["De otro"]);
      expect(await repo.findProject(ID_A, PROJECT_OTHER)).toBeNull();
    });

    it("reports an append to an unknown intensivo", async () => {
      const { repo } = await create();

      const result = await repo.addProject(
        buildNewProject({ intensiveId: ID_UNKNOWN }),
      );

      expect(result).toEqual({ ok: false, error: { kind: "not-found" } });
    });

    it("changes and clears the description, and keeps the longest allowed one", async () => {
      const { repo } = await withProjects(1);
      const current = await repo.findProject(ID_A, PROJECT_1);
      if (!current) throw new Error("missing project");

      await repo.updateProject({ ...current, description: "d".repeat(600) });
      expect((await repo.findProject(ID_A, PROJECT_1))?.description).toBe(
        "d".repeat(600),
      );

      await repo.updateProject({ ...current, description: null });
      expect((await repo.findProject(ID_A, PROJECT_1))?.description).toBeNull();
    });

    it("updates name, image, price, deposit and audit but not the position", async () => {
      const { repo } = await withProjects(2);
      const current = await repo.findProject(ID_A, PROJECT_2);
      if (!current) throw new Error("missing project");
      const changed: StoredIntensiveProject = {
        ...current,
        name: "Renombrado",
        image: { assetId: ASSET_1, alt: "Foto" },
        price: pesos(45000),
        deposit: pesos(15000),
        audit: {
          updatedBy: "otra@example.com",
          updatedAt: new Date("2026-11-03T09:30:00.456Z"),
        },
      };

      const result = await repo.updateProject(changed);

      expect(result.ok).toBe(true);
      expect(plainProject(await repo.findProject(ID_A, PROJECT_2))).toEqual(
        plainProject(changed),
      );
      expect(names(await repo.listProjects(ID_A))).toEqual([
        "P1",
        "Renombrado",
      ]);
    });

    it("can remove the image of a project", async () => {
      const { repo } = await create();
      await repo.insert(
        buildStoredIntensive(),
        buildNewProject({ image: { assetId: ASSET_1, alt: "Foto" } }),
      );
      const current = await repo.findProject(ID_A, PROJECT_1);
      if (!current) throw new Error("missing project");

      await repo.updateProject({ ...current, image: null });

      expect((await repo.findProject(ID_A, PROJECT_1))?.image).toBeNull();
    });

    it("reports an update of an unknown project or one of another intensivo", async () => {
      const { repo } = await withProjects(1);
      const current = await repo.findProject(ID_A, PROJECT_1);
      if (!current) throw new Error("missing project");

      const unknown = await repo.updateProject({ ...current, id: PROJECT_3 });
      const foreign = await repo.updateProject({
        ...current,
        intensiveId: ID_B,
      });

      expect(unknown).toEqual({ ok: false, error: { kind: "not-found" } });
      expect(foreign).toEqual({ ok: false, error: { kind: "not-found" } });
    });

    it("moves a project down and up by swapping with its neighbour", async () => {
      const { repo } = await withProjects(3);

      expect(await repo.moveProject(ID_A, PROJECT_1, "down")).toBe("moved");
      expect(names(await repo.listProjects(ID_A))).toEqual(["P2", "P1", "P3"]);

      expect(await repo.moveProject(ID_A, PROJECT_3, "up")).toBe("moved");
      expect(names(await repo.listProjects(ID_A))).toEqual(["P2", "P3", "P1"]);
    });

    it("leaves the order alone at either edge and for an unknown project", async () => {
      const { repo } = await withProjects(3);

      expect(await repo.moveProject(ID_A, PROJECT_1, "up")).toBe("at-edge");
      expect(await repo.moveProject(ID_A, PROJECT_3, "down")).toBe("at-edge");
      expect(await repo.moveProject(ID_A, PROJECT_OTHER, "down")).toBe(
        "not-found",
      );
      expect(names(await repo.listProjects(ID_A))).toEqual(["P1", "P2", "P3"]);
    });

    it("keeps moving correctly after a project in the middle was deleted", async () => {
      const { repo } = await withProjects(3);
      expect(await repo.deleteProject(ID_A, PROJECT_2)).toBe("deleted");

      expect(await repo.moveProject(ID_A, PROJECT_3, "up")).toBe("moved");
      expect(names(await repo.listProjects(ID_A))).toEqual(["P3", "P1"]);
      const added = await repo.addProject(
        buildNewProject({ id: PROJECT_2, name: "P4" }),
      );
      expect(added.ok).toBe(true);
      expect(names(await repo.listProjects(ID_A))).toEqual(["P3", "P1", "P4"]);
    });

    it("deletes a project that no request points at, keeping the rest in order", async () => {
      const { repo } = await withProjects(3);

      expect(await repo.deleteProject(ID_A, PROJECT_1)).toBe("deleted");

      expect(names(await repo.listProjects(ID_A))).toEqual(["P2", "P3"]);
      expect(await repo.findProject(ID_A, PROJECT_1)).toBeNull();
    });

    it("refuses to delete a project that a request points at", async () => {
      const harness = await withProjects(2);
      await harness.reference(ID_A, PROJECT_1);

      expect(await harness.repo.deleteProject(ID_A, PROJECT_1)).toBe("in-use");

      expect(names(await harness.repo.listProjects(ID_A))).toEqual([
        "P1",
        "P2",
      ]);
      expect(await harness.repo.deleteProject(ID_A, PROJECT_2)).toBe("deleted");
    });

    it("reports a delete of an unknown project or one of another intensivo", async () => {
      const { repo } = await withProjects(1);
      await repo.insert(
        buildStoredIntensive({ id: ID_B, slug: "otro" }),
        buildNewProject({ id: PROJECT_OTHER, intensiveId: ID_B }),
      );

      expect(await repo.deleteProject(ID_A, PROJECT_3)).toBe("not-found");
      expect(await repo.deleteProject(ID_A, PROJECT_OTHER)).toBe("not-found");
      expect(await repo.findProject(ID_B, PROJECT_OTHER)).not.toBeNull();
    });

    it("removes the projects with a deleted draft", async () => {
      const { repo } = await withProjects(2);

      expect(await repo.deleteDraft(ID_A)).toBe("deleted");

      expect(await repo.listProjects(ID_A)).toEqual([]);
      expect(await repo.findProject(ID_A, PROJECT_1)).toBeNull();
    });

    describe("bill of materials", () => {
      const VARIANT_1 = "d0000000-0000-4000-8000-000000000001";
      const VARIANT_2 = "d0000000-0000-4000-8000-000000000002";
      const VARIANT_3 = "d0000000-0000-4000-8000-000000000003";
      const line = (
        projectId: string,
        variantId: string,
        quantity: number,
        intensiveId = ID_A,
      ) => ({ intensiveId, projectId, variantId, quantity });
      const summary = (lines: readonly StoredProjectMaterial[]) =>
        lines.map((l) => [l.projectId, l.variantId, l.quantity]);
      const notFound = { ok: false, error: { kind: "not-found" } };

      it("starts empty and appends lines in the order they were added, listed by project order", async () => {
        const { repo } = await withProjects(2);
        expect(await repo.listProjectMaterials(ID_A)).toEqual([]);

        const first = await repo.addProjectMaterial(
          line(PROJECT_2, VARIANT_1, 2),
        );
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_2, 1));
        await repo.addProjectMaterial(line(PROJECT_2, VARIANT_3, 20));

        expect(first).toEqual({
          ok: true,
          value: {
            projectId: PROJECT_2,
            variantId: VARIANT_1,
            quantity: 2,
            position: 0,
          },
        });
        const listed = await repo.listProjectMaterials(ID_A);
        expect(summary(listed)).toEqual([
          [PROJECT_1, VARIANT_2, 1],
          [PROJECT_2, VARIANT_1, 2],
          [PROJECT_2, VARIANT_3, 20],
        ]);
        expect(listed.map((l) => l.position)).toEqual([0, 0, 1]);
      });

      it("refuses a variant already on the project and leaves its line untouched, but allows it on another project", async () => {
        const { repo } = await withProjects(2);
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 3));

        const again = await repo.addProjectMaterial(
          line(PROJECT_1, VARIANT_1, 9),
        );
        const other = await repo.addProjectMaterial(
          line(PROJECT_2, VARIANT_1, 9),
        );

        expect(again).toEqual({
          ok: false,
          error: { kind: "duplicate-variant" },
        });
        expect(other.ok).toBe(true);
        expect(summary(await repo.listProjectMaterials(ID_A))).toEqual([
          [PROJECT_1, VARIANT_1, 3],
          [PROJECT_2, VARIANT_1, 9],
        ]);
      });

      it("lets only one of two concurrent adds of the same variant through", async () => {
        const { repo } = await withProjects(1);

        const results = await Promise.all([
          repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 1)),
          repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 2)),
        ]);

        expect(results.filter((r) => r.ok)).toHaveLength(1);
        expect(await repo.listProjectMaterials(ID_A)).toHaveLength(1);
      });

      it("assigns distinct positions to concurrent adds of different variants", async () => {
        const { repo } = await withProjects(1);

        const results = await Promise.all([
          repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 1)),
          repo.addProjectMaterial(line(PROJECT_1, VARIANT_2, 1)),
          repo.addProjectMaterial(line(PROJECT_1, VARIANT_3, 1)),
        ]);

        expect(results.every((r) => r.ok)).toBe(true);
        const positions = (await repo.listProjectMaterials(ID_A)).map(
          (l) => l.position,
        );
        expect(positions).toEqual([0, 1, 2]);
      });

      it("treats a project that is unknown or belongs to another intensivo as not found, writing nothing", async () => {
        const { repo } = await withProjects(1);
        await repo.insert(
          buildStoredIntensive({ id: ID_B, slug: "otro" }),
          buildNewProject({ id: PROJECT_OTHER, intensiveId: ID_B }),
        );

        expect(
          await repo.addProjectMaterial(line(PROJECT_OTHER, VARIANT_1, 1)),
        ).toEqual(notFound);
        expect(
          await repo.addProjectMaterial(line(PROJECT_3, VARIANT_1, 1)),
        ).toEqual(notFound);
        expect(
          await repo.addProjectMaterial(
            line(PROJECT_1, VARIANT_1, 1, ID_UNKNOWN),
          ),
        ).toEqual(notFound);

        expect(await repo.listProjectMaterials(ID_A)).toEqual([]);
        expect(await repo.listProjectMaterials(ID_B)).toEqual([]);
      });

      it("changes the quantity of one line only, keeping its position", async () => {
        const { repo } = await withProjects(2);
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 1));
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_2, 2));
        await repo.addProjectMaterial(line(PROJECT_2, VARIANT_1, 3));

        const changed = await repo.setProjectMaterialQuantity(
          ID_A,
          PROJECT_1,
          VARIANT_1,
          7,
        );

        expect(changed).toEqual({ ok: true, value: undefined });
        const listed = await repo.listProjectMaterials(ID_A);
        expect(summary(listed)).toEqual([
          [PROJECT_1, VARIANT_1, 7],
          [PROJECT_1, VARIANT_2, 2],
          [PROJECT_2, VARIANT_1, 3],
        ]);
        expect(listed.map((l) => l.position)).toEqual([0, 1, 0]);
      });

      it("reports a quantity change of a missing line, or one reached through the wrong intensivo, as not found", async () => {
        const { repo } = await withProjects(1);
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 1));

        expect(
          await repo.setProjectMaterialQuantity(ID_A, PROJECT_1, VARIANT_2, 5),
        ).toEqual(notFound);
        expect(
          await repo.setProjectMaterialQuantity(ID_B, PROJECT_1, VARIANT_1, 5),
        ).toEqual(notFound);
        expect(
          await repo.setProjectMaterialQuantity(ID_A, PROJECT_3, VARIANT_1, 5),
        ).toEqual(notFound);

        expect(summary(await repo.listProjectMaterials(ID_A))).toEqual([
          [PROJECT_1, VARIANT_1, 1],
        ]);
      });

      it("removes one line, keeps the order of the rest and appends later lines after them", async () => {
        const { repo } = await withProjects(1);
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 1));
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_2, 2));

        expect(
          await repo.removeProjectMaterial(ID_A, PROJECT_1, VARIANT_1),
        ).toEqual({ ok: true, value: undefined });
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_3, 3));

        expect(summary(await repo.listProjectMaterials(ID_A))).toEqual([
          [PROJECT_1, VARIANT_2, 2],
          [PROJECT_1, VARIANT_3, 3],
        ]);
        // The removed variant may be added again.
        expect(
          (await repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 4))).ok,
        ).toBe(true);
      });

      it("reports a removal of a missing line, or one reached through the wrong intensivo, as not found", async () => {
        const { repo } = await withProjects(1);
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 1));

        expect(
          await repo.removeProjectMaterial(ID_A, PROJECT_1, VARIANT_2),
        ).toEqual(notFound);
        expect(
          await repo.removeProjectMaterial(ID_B, PROJECT_1, VARIANT_1),
        ).toEqual(notFound);

        expect(await repo.listProjectMaterials(ID_A)).toHaveLength(1);
      });

      it("drops a project's lines with the project and a draft's lines with the draft", async () => {
        const { repo } = await withProjects(2);
        await repo.addProjectMaterial(line(PROJECT_1, VARIANT_1, 1));
        await repo.addProjectMaterial(line(PROJECT_2, VARIANT_2, 2));

        await repo.deleteProject(ID_A, PROJECT_1);

        expect(summary(await repo.listProjectMaterials(ID_A))).toEqual([
          [PROJECT_2, VARIANT_2, 2],
        ]);
        await repo.deleteDraft(ID_A);
        expect(await repo.listProjectMaterials(ID_A)).toEqual([]);
      });
    });
  });
}
