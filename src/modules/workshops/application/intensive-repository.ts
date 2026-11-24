import type { Audit, Money, NotFound, Result } from "~/modules/_shared";
import type { ImageUseDraft } from "~/modules/media";
import type { IntensiveStatus, Percentage } from "./contracts";

/**
 * An intensivo as persisted: references instead of joined read models. The
 * service resolves the teacher and the images; the gallery is stored in
 * position order (the cover first).
 */
export interface StoredIntensive {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly description: string;
  readonly teacherId: string | null;
  /** Null unless a third-party teacher is assigned. */
  readonly percentage: Percentage | null;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly images: readonly ImageUseDraft[];
  readonly status: IntensiveStatus;
  readonly audit: Audit;
}

/**
 * A selectable project of an intensivo as persisted. Projects share the
 * workshop's schedule and capacity; `position` is their display order.
 */
export interface StoredIntensiveProject {
  readonly id: string;
  readonly intensiveId: string;
  readonly position: number;
  readonly name: string;
  /** The cover picked from the media library, with its alt text. */
  readonly image: ImageUseDraft | null;
  readonly price: Money;
  readonly deposit: Money;
  readonly audit: Audit;
}

/** A project to append: the repository assigns its position. */
export type NewIntensiveProject = Omit<StoredIntensiveProject, "position">;

export type ProjectDirection = "up" | "down";
export type MoveProjectOutcome = "moved" | "at-edge" | "not-found";
/** `in-use`: a seat request still points at the project. */
export type DeleteProjectOutcome = "deleted" | "in-use" | "not-found";

/**
 * One line of a project's bill of materials: units of a catalog variant per
 * participant. The variant id is a plain reference to the materials catalog
 * (no foreign key); `position` is the order the lines were added in.
 */
export interface StoredProjectMaterial {
  readonly projectId: string;
  readonly variantId: string;
  readonly quantity: number;
  readonly position: number;
}

/** A bill line to append: the repository assigns its position. */
export interface NewProjectMaterial {
  readonly intensiveId: string;
  readonly projectId: string;
  readonly variantId: string;
  readonly quantity: number;
}

/** The variant is already on that project's list. */
export interface DuplicateVariant {
  readonly kind: "duplicate-variant";
}

/** The slug is already taken by another intensivo, archived ones included. */
export interface SlugConflict {
  readonly kind: "slug-conflict";
}

export type DeleteDraftOutcome = "deleted" | "not-draft" | "not-found";

/**
 * Persistence port for intensivos. Uniqueness is typed, not thrown: an
 * adapter returns a slug conflict (Postgres: SQLSTATE 23505 on the slug
 * index) so the service can map a lost race to the same result as its
 * pre-check. A duplicate id is a defect and rejects.
 */
export interface IntensiveRepository {
  /**
   * Inserts the intensivo and, in the same write, its first project at
   * position 0 when one is given.
   */
  insert(
    intensive: StoredIntensive,
    firstProject?: NewIntensiveProject,
  ): Promise<Result<void, SlugConflict>>;
  /** Replaces every field, the gallery included, in one atomic write. */
  update(
    intensive: StoredIntensive,
  ): Promise<Result<void, SlugConflict | NotFound>>;
  findById(id: string): Promise<StoredIntensive | null>;
  /** Exact match, whatever the status. */
  findBySlug(slug: string): Promise<StoredIntensive | null>;
  /**
   * Intensivos in any of the given statuses (none: empty). Order: event date
   * descending, start time descending, then id ascending. Names are not part
   * of the order, so it never depends on a collation; ids compare by code
   * unit (an adapter must use a byte-wise collation or a uuid column).
   */
  list(
    statuses: readonly IntensiveStatus[],
  ): Promise<readonly StoredIntensive[]>;
  /** Deletes only a draft, atomically with the status check; its projects go with it. */
  deleteDraft(id: string): Promise<DeleteDraftOutcome>;
  /** The projects of an intensivo in position order (none: empty). */
  listProjects(intensiveId: string): Promise<readonly StoredIntensiveProject[]>;
  /** A project of that intensivo; one that belongs to another is not found. */
  findProject(
    intensiveId: string,
    projectId: string,
  ): Promise<StoredIntensiveProject | null>;
  /** Appends after the last project, assigning its position atomically. */
  addProject(
    project: NewIntensiveProject,
  ): Promise<Result<StoredIntensiveProject, NotFound>>;
  /** Replaces name, image, price, deposit and audit; the position stays. */
  updateProject(
    project: StoredIntensiveProject,
  ): Promise<Result<void, NotFound>>;
  /** Swaps with the neighbour above or below, atomically. */
  moveProject(
    intensiveId: string,
    projectId: string,
    direction: ProjectDirection,
  ): Promise<MoveProjectOutcome>;
  /**
   * Deletes a project unless a seat request still points at it, atomically
   * with that check. Remaining projects keep their relative order.
   */
  deleteProject(
    intensiveId: string,
    projectId: string,
  ): Promise<DeleteProjectOutcome>;
  /**
   * Every bill line of the intensivo's projects: by project position, then by
   * the order the lines were added (none: empty).
   */
  listProjectMaterials(
    intensiveId: string,
  ): Promise<readonly StoredProjectMaterial[]>;
  /**
   * Appends a line after the project's last one. A variant already on the
   * project is refused, atomically with the check; a project of another
   * intensivo is not found.
   */
  addProjectMaterial(
    line: NewProjectMaterial,
  ): Promise<Result<StoredProjectMaterial, NotFound | DuplicateVariant>>;
  /** Changes the quantity of an existing line; the position stays. */
  setProjectMaterialQuantity(
    intensiveId: string,
    projectId: string,
    variantId: string,
    quantity: number,
  ): Promise<Result<void, NotFound>>;
  /** Removes a line; the other lines keep their order. */
  removeProjectMaterial(
    intensiveId: string,
    projectId: string,
    variantId: string,
  ): Promise<Result<void, NotFound>>;
}
