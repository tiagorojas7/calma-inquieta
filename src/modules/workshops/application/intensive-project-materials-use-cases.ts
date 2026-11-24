import { err, ok, type NotFound } from "~/modules/_shared";
import { requireAdminActor } from "~/modules/admin-access";
import {
  validateProjectMaterial,
  validateProjectMaterialQuantity,
} from "../domain/intensive-project-material-core";
import type { IntensiveRepository } from "./intensive-repository";
import type { IntensiveUseCases } from "./intensive-service";

type MaterialUseCases = Pick<
  IntensiveUseCases,
  | "listProjectMaterials"
  | "addProjectMaterial"
  | "setProjectMaterialQuantity"
  | "removeProjectMaterial"
>;

const notFound: NotFound = { kind: "not-found" };

/**
 * Admin use cases for the bill of materials of a project: one list of
 * catalog variants per project, each with a whole quantity per participant.
 * Every call checks the actor before any port call. A variant may appear once
 * per project; whether it still exists in the catalog is the delivery
 * layer's check, because the workshops module never reads the catalog.
 */
export function createIntensiveProjectMaterialsUseCases(deps: {
  readonly repository: IntensiveRepository;
}): MaterialUseCases {
  const { repository } = deps;

  return {
    async listProjectMaterials(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      if (!(await repository.findById(id))) return err(notFound);
      return ok(await repository.listProjectMaterials(id));
    },

    async addProjectMaterial(actor, id, projectId, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const valid = validateProjectMaterial(draft);
      if (!valid.ok) return valid;
      const added = await repository.addProjectMaterial({
        intensiveId: id,
        projectId,
        ...valid.value,
      });
      if (added.ok) return added;
      return added.error.kind === "not-found"
        ? err(notFound)
        : err({ kind: "rules-unmet", rules: ["duplicate-variant"] });
    },

    async setProjectMaterialQuantity(actor, id, projectId, variantId, text) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const quantity = validateProjectMaterialQuantity(text);
      if (!quantity.ok) return quantity;
      const saved = await repository.setProjectMaterialQuantity(
        id,
        projectId,
        variantId,
        quantity.value,
      );
      return saved.ok ? saved : err(notFound);
    },

    async removeProjectMaterial(actor, id, projectId, variantId) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const removed = await repository.removeProjectMaterial(
        id,
        projectId,
        variantId,
      );
      return removed.ok ? removed : err(notFound);
    },
  };
}
