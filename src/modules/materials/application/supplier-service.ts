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
import { validateSupplierDraft } from "../domain/supplier-core";
import type {
  Supplier,
  SupplierDraft,
  SupplierField,
  SuppliersService,
} from "./contracts";
import {
  SupplierNameConflictError,
  type SupplierRepository,
} from "./supplier-repository";

type MaybeActor = AdminActor | null | undefined;

/** The service contract, accepting an absent actor so it can be denied. */
export type SupplierUseCases = {
  [K in keyof SuppliersService]: SuppliersService[K] extends (
    actor: AdminActor,
    ...rest: infer Rest
  ) => infer Return
    ? (actor: MaybeActor, ...rest: Rest) => Return
    : never;
};

export interface SupplierServiceDeps {
  readonly repository: SupplierRepository;
  readonly clock: Clock;
  readonly newId?: () => string;
}

const duplicateName: FieldIssue<"name"> = { field: "name", code: "duplicate" };
const notFound: NotFound = { kind: "not-found" };

/** Admin use cases for suppliers. */
export function createSuppliersService(
  deps: SupplierServiceDeps,
): SupplierUseCases {
  const { repository, clock } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());

  const stamp = (actor: AdminActor) => ({
    updatedBy: actor.email,
    updatedAt: clock.now(),
  });

  async function isNameTaken(name: string, selfId: string): Promise<boolean> {
    const holder = await repository.findActiveByName(name);
    return holder !== null && holder.id !== selfId;
  }

  async function loadForToggle(
    actor: MaybeActor,
    id: string,
  ): Promise<
    Result<{ supplier: Supplier; actor: AdminActor }, AdminFailure | NotFound>
  > {
    const authorized = requireAdminActor(actor);
    if (!authorized.ok) return authorized;
    const supplier = await repository.findById(id);
    if (!supplier) return err(notFound);
    return ok({ supplier, actor: authorized.value });
  }

  async function save(
    supplier: Supplier,
    active: boolean,
    actor: AdminActor,
  ): Promise<Supplier> {
    const next: Supplier = { ...supplier, active, audit: stamp(actor) };
    await repository.update(next);
    return next;
  }

  return {
    async list(actor, filter) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const repositoryFilter =
        filter?.active === undefined
          ? "all"
          : filter.active
            ? "active"
            : "archived";
      return ok(await repository.list(repositoryFilter));
    },

    async get(actor, id) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const found = await repository.findById(id);
      return found ? ok(found) : err(notFound);
    },

    async create(actor, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const issues = await draftIssues(draft, null);
      if (issues.length > 0) return err({ kind: "invalid", issues });
      const valid = validateSupplierDraft(draft);
      if (!valid.ok) return valid;
      const supplier: Supplier = {
        id: newId(),
        ...valid.value,
        active: true,
        audit: stamp(authorized.value),
      };
      try {
        await repository.insert(supplier);
      } catch (error) {
        if (error instanceof SupplierNameConflictError)
          return err({ kind: "invalid", issues: [duplicateName] });
        throw error;
      }
      return ok(supplier);
    },

    async update(actor, id, draft) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const current = await repository.findById(id);
      if (!current) return err(notFound);
      const issues = await draftIssues(draft, current);
      if (issues.length > 0) return err({ kind: "invalid", issues });
      const valid = validateSupplierDraft(draft);
      if (!valid.ok) return valid;
      const next: Supplier = {
        ...current,
        ...valid.value,
        audit: stamp(authorized.value),
      };
      try {
        await repository.update(next);
      } catch (error) {
        if (error instanceof SupplierNameConflictError)
          return err({ kind: "invalid", issues: [duplicateName] });
        throw error;
      }
      return ok(next);
    },

    async archive(actor, id) {
      const loaded = await loadForToggle(actor, id);
      if (!loaded.ok) return loaded;
      const { supplier, actor: admin } = loaded.value;
      if (!supplier.active) return ok(supplier);
      return ok(await save(supplier, false, admin));
    },

    async reactivate(actor, id) {
      const loaded = await loadForToggle(actor, id);
      if (!loaded.ok) return loaded;
      const { supplier, actor: admin } = loaded.value;
      if (supplier.active) return ok(supplier);
      if (await isNameTaken(supplier.name, supplier.id))
        return err({ kind: "invalid", issues: [duplicateName] });
      try {
        return ok(await save(supplier, true, admin));
      } catch (error) {
        if (error instanceof SupplierNameConflictError)
          return err({ kind: "invalid", issues: [duplicateName] });
        throw error;
      }
    },
  };

  /** Validation issues, plus a duplicate-name issue for an active record. */
  async function draftIssues(
    draft: SupplierDraft,
    existing: Supplier | null,
  ): Promise<readonly FieldIssue<SupplierField>[]> {
    const valid = validateSupplierDraft(draft);
    const issues = valid.ok ? [] : [...valid.error.issues];
    const name = draft.name.trim();
    const willBeActive = existing ? existing.active : true;
    if (
      name !== "" &&
      willBeActive &&
      (await isNameTaken(name, existing?.id ?? ""))
    )
      issues.push(duplicateName);
    return issues;
  }
}
