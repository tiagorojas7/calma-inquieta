import {
  err,
  ok,
  type AdminFailure,
  type Clock,
  type FieldIssue,
  type NotFound,
  type Result,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  validateGallery,
  type ImageUseDraft,
  type MediaLookup,
} from "~/modules/media";
import {
  INTENSIVE_PROJECT_LIMITS,
  validateIntensiveProject,
} from "../domain/intensive-project-core";
import type {
  IntensiveProject,
  IntensiveProjectDraft,
  IntensiveProjectField,
} from "./contracts";
import type {
  IntensiveRepository,
  StoredIntensive,
  StoredIntensiveProject,
} from "./intensive-repository";
import type { IntensiveUseCases } from "./intensive-service";

type MaybeActor = AdminActor | null | undefined;
type ProjectUseCases = Pick<
  IntensiveUseCases,
  | "listProjects"
  | "addProject"
  | "updateProject"
  | "moveProject"
  | "deleteProject"
>;

export interface IntensiveProjectDeps {
  readonly repository: IntensiveRepository;
  readonly media: MediaLookup;
  readonly clock: Clock;
  readonly newId: () => string;
}

const notFound: NotFound = { kind: "not-found" };
const LIVE_STATUSES: readonly StoredIntensive["status"][] = [
  "published",
  "paused",
];

/**
 * Admin use cases for the selectable projects of an intensivo. Every call
 * checks the actor before any port call. A project belongs to one intensivo,
 * so each call names both ids and an id that belongs elsewhere is not found.
 */
export function createIntensiveProjectUseCases(
  deps: IntensiveProjectDeps,
): ProjectUseCases {
  const { repository, media, clock, newId } = deps;
  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: clock.now(),
  });

  async function readModels(
    stored: readonly StoredIntensiveProject[],
  ): Promise<readonly IntensiveProject[]> {
    const assetIds = [
      ...new Set(stored.flatMap((s) => (s.image ? [s.image.assetId] : []))),
    ];
    const assets = await media.findAssets(assetIds);
    return stored.map((s) => ({
      id: s.id,
      intensiveId: s.intensiveId,
      position: s.position,
      name: s.name,
      image: s.image
        ? {
            assetId: s.image.assetId,
            alt: s.image.alt,
            asset: assets.get(s.image.assetId) ?? null,
          }
        : null,
      price: s.price,
      deposit: s.deposit,
      audit: s.audit,
    }));
  }

  async function resolveImage(
    image: ImageUseDraft | null,
  ): Promise<
    Result<ImageUseDraft | null, readonly FieldIssue<IntensiveProjectField>[]>
  > {
    if (image === null) return ok(null);
    const trimmed = { assetId: image.assetId.trim(), alt: image.alt.trim() };
    if (trimmed.alt.length > INTENSIVE_PROJECT_LIMITS.alt)
      return err([{ field: "image", code: "too-long" }]);
    const checked = validateGallery(
      [trimmed],
      await media.findAssets([trimmed.assetId]),
    );
    if (checked.ok) return ok(trimmed);
    return err(
      checked.error.map((issue) => ({ field: "image", code: issue.code })),
    );
  }

  /** The validated fields of a draft, or every issue found in it. */
  async function resolveDraft(draft: IntensiveProjectDraft) {
    const core = validateIntensiveProject(draft);
    const image = await resolveImage(draft.image);
    const issues = [
      ...(core.ok ? [] : core.error.issues),
      ...(image.ok ? [] : image.error),
    ];
    if (!core.ok || !image.ok) return err({ kind: "invalid" as const, issues });
    return ok({ ...core.value, image: image.value });
  }

  async function withIntensivo(
    actor: MaybeActor,
    id: string,
  ): Promise<
    Result<
      { intensivo: StoredIntensive; admin: AdminActor },
      AdminFailure | NotFound
    >
  > {
    const authorized = requireAdminActor(actor);
    if (!authorized.ok) return authorized;
    const intensivo = await repository.findById(id);
    return intensivo
      ? ok({ intensivo, admin: authorized.value })
      : err(notFound);
  }

  return {
    async listProjects(actor, id) {
      const loaded = await withIntensivo(actor, id);
      if (!loaded.ok) return loaded;
      return ok(await readModels(await repository.listProjects(id)));
    },

    async addProject(actor, id, draft) {
      const loaded = await withIntensivo(actor, id);
      if (!loaded.ok) return loaded;
      const fields = await resolveDraft(draft);
      if (!fields.ok) return fields;
      const added = await repository.addProject({
        id: newId(),
        intensiveId: id,
        name: fields.value.name,
        image: fields.value.image,
        price: fields.value.price,
        deposit: fields.value.deposit,
        audit: stamp(loaded.value.admin),
      });
      if (!added.ok) return err(notFound);
      const [model] = await readModels([added.value]);
      if (!model) throw new Error("read model missing");
      return ok(model);
    },

    async updateProject(actor, id, projectId, draft) {
      const loaded = await withIntensivo(actor, id);
      if (!loaded.ok) return loaded;
      const current = await repository.findProject(id, projectId);
      if (!current) return err(notFound);
      const fields = await resolveDraft(draft);
      if (!fields.ok) return fields;
      const next: StoredIntensiveProject = {
        ...current,
        name: fields.value.name,
        image: fields.value.image,
        price: fields.value.price,
        deposit: fields.value.deposit,
        audit: stamp(loaded.value.admin),
      };
      const saved = await repository.updateProject(next);
      if (!saved.ok) return err(notFound);
      const [model] = await readModels([next]);
      if (!model) throw new Error("read model missing");
      return ok(model);
    },

    async moveProject(actor, id, projectId, direction) {
      const loaded = await withIntensivo(actor, id);
      if (!loaded.ok) return loaded;
      const outcome = await repository.moveProject(id, projectId, direction);
      return outcome === "not-found" ? err(notFound) : ok(undefined);
    },

    async deleteProject(actor, id, projectId) {
      const loaded = await withIntensivo(actor, id);
      if (!loaded.ok) return loaded;
      const projects = await repository.listProjects(id);
      if (!projects.some((project) => project.id === projectId))
        return err(notFound);
      // A published or paused workshop keeps at least one project to offer.
      if (
        projects.length === 1 &&
        LIVE_STATUSES.includes(loaded.value.intensivo.status)
      )
        return err({ kind: "rules-unmet", rules: ["last-project"] });
      const outcome = await repository.deleteProject(id, projectId);
      if (outcome === "not-found") return err(notFound);
      return outcome === "in-use"
        ? err({ kind: "rules-unmet", rules: ["in-use"] })
        : ok(undefined);
    },
  };
}
