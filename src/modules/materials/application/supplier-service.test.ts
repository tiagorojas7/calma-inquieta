import { describe, expect, it } from "vitest";
import { advancingClock } from "~/testing/fakes/fixed-clock";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import type { Supplier } from "./contracts";
import { SupplierNameConflictError } from "./supplier-repository";
import { createSuppliersService } from "./supplier-service";

const START = new Date("2026-10-15T12:00:00.000Z");
const owner = testAdminActor("owner@example.com");
const other = testAdminActor("other@example.com");
const draft = (overrides = {}) => ({
  name: "Casa Pincel",
  phone: "",
  email: "",
  notes: "",
  ...overrides,
});

function setup() {
  const suppliers = new Map<string, Supplier>();
  const repository = {
    insert: async (supplier: Supplier) => {
      if (suppliers.has(supplier.id)) throw new Error("duplicate id");
      if (supplier.active && (await repository.findActiveByName(supplier.name)))
        throw new Error("duplicate name");
      suppliers.set(supplier.id, supplier);
    },
    update: async (supplier: Supplier) => {
      if (!suppliers.has(supplier.id)) return false;
      const holder = await repository.findActiveByName(supplier.name);
      if (supplier.active && holder && holder.id !== supplier.id)
        throw new Error("duplicate name");
      suppliers.set(supplier.id, supplier);
      return true;
    },
    findById: (id: string) => Promise.resolve(suppliers.get(id) ?? null),
    findActiveByName: (name: string) =>
      Promise.resolve(
        [...suppliers.values()].find(
          (supplier) =>
            supplier.active &&
            supplier.name.trim().normalize("NFC").toLocaleLowerCase("es") ===
              name.trim().normalize("NFC").toLocaleLowerCase("es"),
        ) ?? null,
      ),
    list: (filter: "active" | "archived" | "all") =>
      Promise.resolve(
        [...suppliers.values()]
          .filter(
            (supplier) =>
              filter === "all" || supplier.active === (filter === "active"),
          )
          .sort(
            (a, b) =>
              a.name
                .trim()
                .toLocaleLowerCase("es")
                .localeCompare(b.name.trim().toLocaleLowerCase("es")) ||
              a.id.localeCompare(b.id),
          ),
      ),
  };
  const clock = advancingClock(START);
  let counter = 0;
  const service = createSuppliersService({
    repository,
    clock,
    newId: () => `id-${String(++counter)}`,
  });
  return { suppliers, repository, clock, service };
}

function valueOf<T>(result: { ok: boolean; value?: T }): T {
  if (!result.ok || result.value === undefined) throw new Error("expected ok");
  return result.value;
}

describe("supplier service", () => {
  it.each([null, undefined])(
    "denies every method for %s without repository calls",
    async (actor) => {
      const { repository, service } = setup();
      const calls: string[] = [];
      for (const method of [
        "insert",
        "update",
        "findById",
        "findActiveByName",
        "list",
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
      expect(await service.list(actor)).toEqual(denied);
      expect(await service.get(actor, "id")).toEqual(denied);
      expect(await service.create(actor, draft())).toEqual(denied);
      expect(await service.update(actor, "id", draft())).toEqual(denied);
      expect(await service.archive(actor, "id")).toEqual(denied);
      expect(await service.reactivate(actor, "id")).toEqual(denied);
      expect(calls).toEqual([]);
    },
  );

  it("creates an active audited supplier and rejects a case-insensitive duplicate", async () => {
    const { suppliers, service } = setup();
    const created = await service.create(owner, draft());
    expect(created).toEqual({
      ok: true,
      value: {
        id: "id-1",
        name: "Casa Pincel",
        phone: null,
        email: null,
        notes: null,
        active: true,
        audit: { updatedBy: owner.email, updatedAt: START },
      },
    });
    expect(await service.create(owner, draft({ name: "casa pincel" }))).toEqual(
      {
        ok: false,
        error: {
          kind: "invalid",
          issues: [{ field: "name", code: "duplicate" }],
        },
      },
    );
    expect(suppliers.size).toBe(1);
  });

  it("reports all draft validation issues", async () => {
    const { service } = setup();
    expect(
      await service.create(owner, draft({ name: "", email: "x" })),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "name", code: "required" },
          { field: "email", code: "invalid-format" },
        ],
      },
    });
  });

  it("updates, detects duplicate active names, and reports unknown ids", async () => {
    const { clock, service } = setup();
    const first = valueOf(await service.create(owner, draft()));
    const second = valueOf(
      await service.create(owner, draft({ name: "Beto" })),
    );
    expect(await service.update(owner, "unknown", draft())).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
    expect(await service.update(owner, second.id, draft())).toMatchObject({
      ok: false,
      error: { issues: [{ field: "name", code: "duplicate" }] },
    });
    clock.advance(1);
    expect(
      await service.update(other, first.id, draft({ name: "CASA PINCEL" })),
    ).toMatchObject({
      ok: true,
      value: {
        name: "CASA PINCEL",
        audit: {
          updatedBy: other.email,
          updatedAt: new Date(START.getTime() + 1),
        },
      },
    });
  });

  it("archives idempotently and keeps archived suppliers readable", async () => {
    const { clock, service } = setup();
    const created = valueOf(await service.create(owner, draft()));
    clock.advance(1);
    const archived = valueOf(await service.archive(other, created.id));
    expect(archived.active).toBe(false);
    expect(await service.get(owner, created.id)).toEqual({
      ok: true,
      value: archived,
    });
    clock.advance(1);
    expect(await service.archive(owner, created.id)).toEqual({
      ok: true,
      value: archived,
    });
    expect(await service.archive(owner, "unknown")).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("reactivates unless another active supplier takes its name", async () => {
    const { service } = setup();
    const first = valueOf(await service.create(owner, draft()));
    await service.archive(owner, first.id);
    expect(await service.reactivate(other, first.id)).toMatchObject({
      ok: true,
      value: { active: true },
    });
    expect(await service.reactivate(other, first.id)).toMatchObject({
      ok: true,
      value: { active: true },
    });
    await service.archive(owner, first.id);
    await service.create(owner, draft());
    expect(await service.reactivate(owner, first.id)).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "name", code: "duplicate" }],
      },
    });
  });

  it("filters lists and orders by name key then id", async () => {
    const { service } = setup();
    const beto = valueOf(await service.create(owner, draft({ name: "Beto" })));
    await service.create(owner, draft({ name: "Ana" }));
    const carla = valueOf(
      await service.create(owner, draft({ name: "Carla" })),
    );
    await service.archive(owner, carla.id);
    const names = async (filter?: { active?: boolean }) =>
      valueOf(await service.list(owner, filter)).map(
        (supplier) => supplier.name,
      );
    expect(await names({ active: true })).toEqual(["Ana", "Beto"]);
    expect(await names({ active: false })).toEqual(["Carla"]);
    expect(await names()).toEqual(["Ana", "Beto", "Carla"]);
    expect(beto.active).toBe(true);
  });

  it("translates duplicate-name write races for create, update, and reactivate", async () => {
    const expected = {
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "name", code: "duplicate" }],
      },
    };

    const created = setup();
    created.repository.findActiveByName = () => Promise.resolve(null);
    created.repository.insert = () =>
      Promise.reject(new SupplierNameConflictError());
    expect(await created.service.create(owner, draft())).toEqual(expected);

    const updated = setup();
    updated.suppliers.set("id", {
      id: "id",
      name: "Anterior",
      phone: null,
      email: null,
      notes: null,
      active: true,
      audit: { updatedBy: owner.email, updatedAt: START },
    });
    updated.repository.findActiveByName = () => Promise.resolve(null);
    updated.repository.update = () =>
      Promise.reject(new SupplierNameConflictError());
    expect(await updated.service.update(owner, "id", draft())).toEqual(
      expected,
    );

    const reactivated = setup();
    reactivated.suppliers.set("id", {
      id: "id",
      name: "Casa Pincel",
      phone: null,
      email: null,
      notes: null,
      active: false,
      audit: { updatedBy: owner.email, updatedAt: START },
    });
    reactivated.repository.findActiveByName = () => Promise.resolve(null);
    reactivated.repository.update = () =>
      Promise.reject(new SupplierNameConflictError());
    expect(await reactivated.service.reactivate(owner, "id")).toEqual(expected);
  });
});
