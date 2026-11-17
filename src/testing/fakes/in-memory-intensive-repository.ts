import { err, ok, type NotFound, type Result } from "~/modules/_shared";
import type { IntensiveStatus } from "~/modules/workshops";
import type {
  DeleteDraftOutcome,
  DeleteProjectOutcome,
  IntensiveRepository,
  MoveProjectOutcome,
  NewIntensiveProject,
  ProjectDirection,
  SlugConflict,
  StoredIntensive,
  StoredIntensiveProject,
} from "~/modules/workshops/application/intensive-repository";

const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/** Intensivos in memory, enforcing the same constraints as the database. */
export class InMemoryIntensiveRepository implements IntensiveRepository {
  readonly items = new Map<string, StoredIntensive>();
  readonly projects = new Map<string, StoredIntensiveProject>();
  /** Projects a seat request points at; deleting one is refused. */
  readonly referencedProjects = new Set<string>();

  private slugTakenByAnother(candidate: StoredIntensive): boolean {
    return [...this.items.values()].some(
      (stored) => stored.id !== candidate.id && stored.slug === candidate.slug,
    );
  }

  insert(
    intensive: StoredIntensive,
    firstProject?: NewIntensiveProject,
  ): Promise<Result<void, SlugConflict>> {
    if (this.items.has(intensive.id))
      return Promise.reject(new Error("intensive already exists"));
    if (this.slugTakenByAnother(intensive))
      return Promise.resolve(err({ kind: "slug-conflict" }));
    this.items.set(intensive.id, intensive);
    if (firstProject)
      this.projects.set(firstProject.id, { ...firstProject, position: 0 });
    return Promise.resolve(ok(undefined));
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
    for (const project of this.ordered(id)) this.projects.delete(project.id);
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
    return Promise.resolve("deleted");
  }
}
