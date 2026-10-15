import { describe, expect, it } from "vitest";
import type { Supplier } from "~/modules/materials";
import {
  SupplierNameConflictError,
  type SupplierRepository,
} from "~/modules/materials";

export const ID_A = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const ID_B = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
export const ID_C = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
export const ID_UNKNOWN = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04";

export function buildStoredSupplier(
  overrides: Partial<Supplier> = {},
): Supplier {
  return {
    id: ID_A,
    name: "Lucía Pérez",
    phone: "+54 351 555-0101",
    email: "lucia@example.com",
    notes: "Ceramics supplies",
    active: true,
    audit: {
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-10-15T12:00:00.000Z"),
    },
    ...overrides,
  };
}

/** Behavior every SupplierRepository implementation must satisfy. */
export function runSupplierRepositoryContract(
  create: () => Promise<SupplierRepository>,
): void {
  describe("SupplierRepository contract", () => {
    it("round-trips every field, including nulls and the audit", async () => {
      const repo = await create();
      const full = buildStoredSupplier();
      const minimal = buildStoredSupplier({
        id: ID_B,
        name: "Cami",
        phone: null,
        email: null,
        notes: null,
        active: false,
      });
      await repo.insert(full);
      await repo.insert(minimal);

      expect(await repo.findById(ID_A)).toEqual(full);
      expect(await repo.findById(ID_B)).toEqual(minimal);
    });

    it("returns null for an unknown id", async () => {
      const repo = await create();

      expect(await repo.findById(ID_UNKNOWN)).toBeNull();
    });

    it("filters active and archived suppliers in normalized name order", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier({ id: ID_A, name: "beto" }));
      await repo.insert(buildStoredSupplier({ id: ID_B, name: "Ana" }));
      await repo.insert(
        buildStoredSupplier({ id: ID_C, name: "Carla", active: false }),
      );

      const names = async (filter: "active" | "archived" | "all") =>
        (await repo.list(filter)).map((supplier) => supplier.name);

      expect(await names("active")).toEqual(["Ana", "beto"]);
      expect(await names("archived")).toEqual(["Carla"]);
      expect(await names("all")).toEqual(["Ana", "beto", "Carla"]);
    });

    it("orders non-ASCII normalized names independently of locale collation", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier({ id: ID_A, name: "Ñandú" }));
      await repo.insert(buildStoredSupplier({ id: ID_B, name: "Álvaro" }));

      expect(
        (await repo.list("active")).map((supplier) => supplier.name),
      ).toEqual(["Álvaro", "Ñandú"]);
    });

    it("orders equal names by id", async () => {
      const repo = await create();
      await repo.insert(
        buildStoredSupplier({ id: ID_B, name: "Ana", active: false }),
      );
      await repo.insert(
        buildStoredSupplier({ id: ID_A, name: "Ana", active: false }),
      );

      expect((await repo.list("all")).map((supplier) => supplier.id)).toEqual([
        ID_A,
        ID_B,
      ]);
    });

    it("finds an active supplier by name ignoring case and ignores archived", async () => {
      const repo = await create();
      const supplier = buildStoredSupplier();
      await repo.insert(supplier);
      await repo.insert(
        buildStoredSupplier({ id: ID_B, name: "Archived", active: false }),
      );

      expect(await repo.findActiveByName("LUCÍA PÉREZ")).toEqual(supplier);
      expect(await repo.findActiveByName("Archived")).toBeNull();
      expect(await repo.findActiveByName("Otra")).toBeNull();
    });

    it("rejects a second insert with the same id", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier());

      await expect(
        repo.insert(buildStoredSupplier({ name: "Otra" })),
      ).rejects.toThrow();
    });

    it.each([
      ["Ñandú", "ÑANDÚ"],
      ["Lucía", "LUCÍA"],
    ])("rejects %s and %s as one active name", async (first, second) => {
      const repo = await create();
      await repo.insert(buildStoredSupplier({ id: ID_A, name: first }));

      await expect(
        repo.insert(buildStoredSupplier({ id: ID_B, name: second })),
      ).rejects.toBeInstanceOf(SupplierNameConflictError);
    });

    it("treats names that differ by an accent as different", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier({ id: ID_A, name: "Lucia" }));

      await repo.insert(buildStoredSupplier({ id: ID_B, name: "Lucía" }));

      expect(await repo.list("active")).toHaveLength(2);
    });

    it("allows the same name when the other supplier is archived", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier({ active: false }));

      await repo.insert(buildStoredSupplier({ id: ID_B }));

      expect(
        (await repo.list("all")).map((supplier) => supplier.id).sort(),
      ).toEqual([ID_A, ID_B].sort());
    });

    it("updates every field and reports whether the id existed", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier());
      const changed = buildStoredSupplier({
        name: "Lucía P.",
        phone: null,
        email: null,
        notes: null,
        audit: {
          updatedBy: "other@example.com",
          updatedAt: new Date("2026-10-16T08:30:00.000Z"),
        },
      });

      expect(await repo.update(changed)).toBe(true);
      expect(await repo.findById(ID_A)).toEqual(changed);
      expect(await repo.update(buildStoredSupplier({ id: ID_UNKNOWN }))).toBe(
        false,
      );
    });

    it("rejects an update that renames onto another active name", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier({ id: ID_A, name: "Ana" }));
      await repo.insert(buildStoredSupplier({ id: ID_B, name: "Beto" }));

      await expect(
        repo.update(buildStoredSupplier({ id: ID_B, name: "ANA" })),
      ).rejects.toBeInstanceOf(SupplierNameConflictError);
    });

    it("rejects reactivating onto a name an active supplier now holds", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier({ id: ID_A, active: false }));
      await repo.insert(buildStoredSupplier({ id: ID_B }));

      await expect(
        repo.update(buildStoredSupplier({ id: ID_A, active: true })),
      ).rejects.toBeInstanceOf(SupplierNameConflictError);
    });

    it("frees the name when a supplier is archived", async () => {
      const repo = await create();
      await repo.insert(buildStoredSupplier());
      await repo.update(buildStoredSupplier({ active: false }));

      await repo.insert(buildStoredSupplier({ id: ID_B }));

      expect(
        (await repo.list("active")).map((supplier) => supplier.id),
      ).toEqual([ID_B]);
    });
  });
}
