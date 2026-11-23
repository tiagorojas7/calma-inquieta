import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import type { IntensiveStatus } from "~/modules/workshops";
import type {
  DeleteDraftOutcome,
  DeleteProjectOutcome,
  DuplicateVariant,
  IntensiveRepository,
  MoveProjectOutcome,
  NewIntensiveProject,
  NewProjectMaterial,
  NewWorkshopProject,
  ProjectDirection,
  SlugConflict,
  StoredIntensive,
  StoredIntensiveProject,
  StoredProjectMaterial,
} from "~/modules/workshops/application/intensive-repository";

const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/** Intensivos in memory, enforcing the same constraints as the database. */
export class InMemoryIntensiveRepository implements IntensiveRepository {
  readonly items = new Map<string, StoredIntensive>();
  readonly projects = new Map<string, StoredIntensiveProject>();
  /** Bill of materials lines, by project id, in the order they were added. */
  readonly materials = new Map<string, StoredProjectMaterial[]>();
  /** Projects a seat request points at; deleting one is refused. */
  readonly referencedProjects = new Set<string>();

  private slugTakenByAnother(candidate: StoredIntensive): boolean {
    return [...this.items.values()].some(
      (stored) => stored.id !== candidate.id && stored.slug === candidate.slug,
    );
  }

  insert(
    intensive: StoredIntensive,
    projects?: NewWorkshopProject | readonly NewWorkshopProject[],
  ): Promise<Result<void, SlugConflict>> {
    if (this.items.has(intensive.id))
      return Promise.reject(new Error("intensive already exists"));
    if (this.slugTakenByAnother(intensive))
      return Promise.resolve(err({ kind: "slug-conflict" }));
    const given = projects === undefined ? [] : [projects].flat();
    // Everything is checked before anything is stored, like a rolled-back transaction.
    const refusal = this.refusalOf(given);
    if (refusal) return Promise.reject(new Error(refusal));
    this.items.set(intensive.id, intensive);
    given.forEach((project, position) => {
      const { materials = [], ...fields } = project;
      this.projects.set(project.id, { ...fields, position });
      if (materials.length > 0)
        this.materials.set(
          project.id,
          materials.map((line, at) => ({
            projectId: project.id,
            variantId: line.variantId,
            quantity: line.quantity,
            position: at,
          })),
        );
    });
    return Promise.resolve(ok(undefined));
  }

  /** What the database would refuse in a batch of new projects, or null. */
  private refusalOf(given: readonly NewWorkshopProject[]): string | null {
    const ids = new Set<string>();
    for (const project of given) {
      if (ids.has(project.id) || this.projects.has(project.id))
        return "project already exists";
      ids.add(project.id);
      const variants = new Set<string>();
      for (const line of project.materials ?? []) {
        if (line.quantity < 1 || line.quantity > 20)
          return "bill quantity out of range";
        if (variants.has(line.variantId)) return "variant repeated in a bill";
        variants.add(line.variantId);
      }
    }
    return null;
  }

  update(
    intensive: StoredIntensive,
  ): Promise<Result<void, SlugConflict | NotFound>> {
    if (!this.items.has(intensive.id))
      return Promise.resolve(err({ kind: "not-found" }));
    if (this.slugTakenByAnother(intensive))
      return Promise.resolve(err({ kind: "slug-conflict" }));
    this.items.set(intensive.id, intensive);
    return Promise.resolve(ok(undefined));
  }

  findById(id: string): Promise<StoredIntensive | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findBySlug(slug: string): Promise<StoredIntensive | null> {
    const match = [...this.items.values()].find(
      (stored) => stored.slug === slug,
    );
    return Promise.resolve(match ?? null);
  }

  list(
    statuses: readonly IntensiveStatus[],
  ): Promise<readonly StoredIntensive[]> {
    const selected = [...this.items.values()].filter((stored) =>
      statuses.includes(stored.status),
    );
    selected.sort(
      (a, b) =>
        compareText(b.eventDate, a.eventDate) ||
        compareText(b.startsAt, a.startsAt) ||
        compareText(a.id, b.id),
    );
    return Promise.resolve(selected);
  }

  deleteDraft(id: string): Promise<DeleteDraftOutcome> {
    const stored = this.items.get(id);
    if (!stored) return Promise.resolve("not-found");
    if (stored.status !== "draft") return Promise.resolve("not-draft");
    this.items.delete(id);
    for (const project of this.ordered(id)) {
      this.projects.delete(project.id);
      this.materials.delete(project.id);
    }
    return Promise.resolve("deleted");
  }

  private ordered(intensiveId: string): StoredIntensiveProject[] {
    return [...this.projects.values()]
      .filter((project) => project.intensiveId === intensiveId)
      .sort((a, b) => a.position - b.position);
  }

  listProjects(
    intensiveId: string,
  ): Promise<readonly StoredIntensiveProject[]> {
    return Promise.resolve(this.ordered(intensiveId));
  }

  findProject(
    intensiveId: string,
    projectId: string,
  ): Promise<StoredIntensiveProject | null> {
    const project = this.projects.get(projectId);
    return Promise.resolve(
      project?.intensiveId === intensiveId ? project : null,
    );
  }

  addProject(
    project: NewIntensiveProject,
  ): Promise<Result<StoredIntensiveProject, NotFound>> {
    if (!this.items.has(project.intensiveId))
      return Promise.resolve(err({ kind: "not-found" }));
    if (this.projects.has(project.id))
      return Promise.reject(new Error("project already exists"));
    const last = this.ordered(project.intensiveId).at(-1);
    const stored = { ...project, position: last ? last.position + 1 : 0 };
    this.projects.set(stored.id, stored);
    return Promise.resolve(ok(stored));
  }

  updateProject(
    project: StoredIntensiveProject,
  ): Promise<Result<void, NotFound>> {
    const current = this.projects.get(project.id);
    if (current?.intensiveId !== project.intensiveId)
      return Promise.resolve(err({ kind: "not-found" }));
    this.projects.set(project.id, { ...project, position: current.position });
    return Promise.resolve(ok(undefined));
  }

  moveProject(
    intensiveId: string,
    projectId: string,
    direction: ProjectDirection,
  ): Promise<MoveProjectOutcome> {
    const ordered = this.ordered(intensiveId);
    const index = ordered.findIndex((project) => project.id === projectId);
    if (index === -1) return Promise.resolve("not-found");
    const neighbour = ordered[direction === "up" ? index - 1 : index + 1];
    const moving = ordered[index];
    if (!neighbour || !moving) return Promise.resolve("at-edge");
    this.projects.set(moving.id, { ...moving, position: neighbour.position });
    this.projects.set(neighbour.id, {
      ...neighbour,
      position: moving.position,
    });
    return Promise.resolve("moved");
  }

  deleteProject(
    intensiveId: string,
    projectId: string,
  ): Promise<DeleteProjectOutcome> {
    if (this.projects.get(projectId)?.intensiveId !== intensiveId)
      return Promise.resolve("not-found");
    if (this.referencedProjects.has(projectId))
      return Promise.resolve("in-use");
    this.projects.delete(projectId);
    this.materials.delete(projectId);
    return Promise.resolve("deleted");
  }

  listProjectMaterials(
    intensiveId: string,
  ): Promise<readonly StoredProjectMaterial[]> {
    return Promise.resolve(
      this.ordered(intensiveId).flatMap(
        (project) => this.materials.get(project.id) ?? [],
      ),
    );
  }

  addProjectMaterial(
    line: NewProjectMaterial,
  ): Promise<Result<StoredProjectMaterial, NotFound | DuplicateVariant>> {
    if (this.projects.get(line.projectId)?.intensiveId !== line.intensiveId)
      return Promise.resolve(err({ kind: "not-found" }));
    const lines = this.materials.get(line.projectId) ?? [];
    if (lines.some((existing) => existing.variantId === line.variantId))
      return Promise.resolve(err({ kind: "duplicate-variant" }));
    const stored: StoredProjectMaterial = {
      projectId: line.projectId,
      variantId: line.variantId,
      quantity: line.quantity,
      position: (lines.at(-1)?.position ?? -1) + 1,
    };
    this.materials.set(line.projectId, [...lines, stored]);
    return Promise.resolve(ok(stored));
  }

  setProjectMaterialQuantity(
    intensiveId: string,
    projectId: string,
    variantId: string,
    quantity: number,
  ): Promise<Result<void, NotFound>> {
    const lines = this.materials.get(projectId) ?? [];
    const index = lines.findIndex((line) => line.variantId === variantId);
    const current = lines[index];
    if (
      this.projects.get(projectId)?.intensiveId !== intensiveId ||
      current === undefined
    )
      return Promise.resolve(err({ kind: "not-found" }));
    this.materials.set(
      projectId,
      lines.map((line, at) => (at === index ? { ...current, quantity } : line)),
    );
    return Promise.resolve(ok(undefined));
  }

  removeProjectMaterial(
    intensiveId: string,
    projectId: string,
    variantId: string,
  ): Promise<Result<void, NotFound>> {
    const lines = this.materials.get(projectId) ?? [];
    if (
      this.projects.get(projectId)?.intensiveId !== intensiveId ||
      !lines.some((line) => line.variantId === variantId)
    )
      return Promise.resolve(err({ kind: "not-found" }));
    this.materials.set(
      projectId,
      lines.filter((line) => line.variantId !== variantId),
    );
    return Promise.resolve(ok(undefined));
  }
}
