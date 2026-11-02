import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  MaterialNameConflictError,
  MaterialVariantLabelConflictError,
  type MaterialFilter,
  type MaterialRepository,
} from "~/modules/materials";
import type { Material, MaterialVariant } from "~/modules/materials";
import { buildSupplier } from "~/testing/fakes/admin-builders";

export const MATERIAL_A = "00000000-0000-4000-8000-000000000101";
export const MATERIAL_B = "00000000-0000-4000-8000-000000000102";
export const MATERIAL_C = "00000000-0000-4000-8000-000000000103";
export const MATERIAL_UNKNOWN = "00000000-0000-4000-8000-000000000199";
export const MATERIAL_SUPPLIER_ID = "00000000-0000-4000-8000-000000000301";
export const MATERIAL_ASSET_ID = "00000000-0000-4000-8000-000000000401";

function money(pesos: number): Money {
  const value = Money.fromCentavos(pesos * 100);
  if (!value.ok) throw new Error("invalid contract money");
  return value.value;
}

export function buildStoredVariant(
  overrides: Partial<MaterialVariant> = {},
): MaterialVariant {
  return {
    id: "00000000-0000-4000-8000-000000000201",
    label: "Única",
    price: money(1000),
    available: true,
    used: false,
    position: 0,
    swatch: null,
    ...overrides,
  };
}

export function buildStoredMaterial(
  overrides: Partial<Material> = {},
): Material {
  const id = overrides.id ?? MATERIAL_A;
  return {
    id,
    name: "Ámbar",
    description: "Material de prueba",
    category: "Arcillas",
    supplier: buildSupplier({ id: MATERIAL_SUPPLIER_ID }),
    available: true,
    active: true,
    image: {
      assetId: MATERIAL_ASSET_ID,
      alt: "Arcilla ámbar",
      asset: null,
    },
    variants: [buildStoredVariant({ id })],
    audit: {
      updatedBy: "owner@example.com",
      updatedAt: new Date("2026-10-20T12:00:00.000Z"),
    },
    ...overrides,
  };
}

export interface MaterialRepositoryContractHarness {
  readonly repository: MaterialRepository;
}

export function runMaterialRepositoryContract(
  create: () => Promise<MaterialRepositoryContractHarness>,
): void {
  describe("MaterialRepository contract", () => {
    it("round-trips every root, supplier, image, variant, and audit field immutably", async () => {
      const { repository } = await create();
      const material = buildStoredMaterial({
        variants: [
          buildStoredVariant({ swatch: "#aabbcc" }),
          buildStoredVariant({
            id: "00000000-0000-4000-8000-000000000202",
            label: "Grande",
            price: money(2500),
            available: false,
            position: 1,
          }),
        ],
      });
      await repository.insert(material);

      const first = await repository.findById(material.id);
      const second = await repository.findById(material.id);
      expect(first).toEqual(material);
      expect(second).toEqual(material);
      expect(first).not.toBe(material);
      expect(first?.supplier).not.toBe(material.supplier);
      expect(first?.variants).not.toBe(material.variants);
      expect(first?.variants[0]).not.toBe(material.variants[0]);
      expect(first?.audit.updatedAt).not.toBe(material.audit.updatedAt);
    });

    it("returns null for an unknown id and finds known ids only", async () => {
      const { repository } = await create();
      const first = buildStoredMaterial();
      const second = buildStoredMaterial({ id: MATERIAL_B, name: "Beto" });
      await repository.insert(first);
      await repository.insert(second);

      expect(await repository.findById(MATERIAL_UNKNOWN)).toBeNull();
      expect(
        await repository.findByIds([MATERIAL_B, MATERIAL_UNKNOWN, MATERIAL_A]),
      ).toEqual(
        new Map([
          [MATERIAL_B, second],
          [MATERIAL_A, first],
        ]),
      );
    });

    it("filters with AND semantics and orders by normalized name then id", async () => {
      const { repository } = await create();
      const supplierB = buildSupplier({
        id: "00000000-0000-4000-8000-000000000302",
        name: "Other",
      });
      await repository.insert(
        buildStoredMaterial({
          id: MATERIAL_A,
          name: "Ñandú",
          category: "Hilos",
        }),
      );
      await repository.insert(
        buildStoredMaterial({
          id: MATERIAL_B,
          name: "Álvaro",
          category: "Hilos",
        }),
      );
      await repository.insert(
        buildStoredMaterial({
          id: MATERIAL_C,
          name: "Beto",
          category: "Arcillas",
          supplier: supplierB,
          active: false,
        }),
      );

      const ids = async (filter: MaterialFilter) =>
        (await repository.list(filter)).map((material) => material.id);
      expect(await ids({ state: "active" })).toEqual([MATERIAL_B, MATERIAL_A]);
      expect(await ids({ state: "inactive" })).toEqual([MATERIAL_C]);
      expect(await ids({ state: "all", category: " hIlOs " })).toEqual([
        MATERIAL_B,
        MATERIAL_A,
      ]);
      expect(
        await ids({
          state: "all",
          supplierId: supplierB.id,
          category: "Hilos",
        }),
      ).toEqual([]);
    });

    it("enforces active material-name uniqueness and frees archived names", async () => {
      const { repository } = await create();
      await repository.insert(buildStoredMaterial({ name: "Ñandú" }));

      await expect(
        repository.insert(
          buildStoredMaterial({ id: MATERIAL_B, name: "ÑANDÚ" }),
        ),
      ).rejects.toBeInstanceOf(MaterialNameConflictError);

      await repository.update(
        buildStoredMaterial({ id: MATERIAL_A, name: "Ñandú", active: false }),
      );
      await expect(
        repository.insert(
          buildStoredMaterial({ id: MATERIAL_B, name: "ÑANDÚ" }),
        ),
      ).resolves.toBeUndefined();
      await expect(
        repository.update(
          buildStoredMaterial({ id: MATERIAL_A, name: "ñandú", active: true }),
        ),
      ).rejects.toBeInstanceOf(MaterialNameConflictError);
    });

    it("finds active names by the same normalized key", async () => {
      const { repository } = await create();
      const active = buildStoredMaterial({ name: "Ámbar" });
      await repository.insert(active);
      await repository.insert(
        buildStoredMaterial({
          id: MATERIAL_B,
          name: "Archived",
          active: false,
        }),
      );

      expect(await repository.findActiveByName(" A\u0301MBAR ")).toEqual(
        active,
      );
      expect(await repository.findActiveByName("Archived")).toBeNull();
    });

    it("rejects duplicate ids and duplicate normalized variant labels", async () => {
      const { repository } = await create();
      await repository.insert(buildStoredMaterial());
      await expect(
        repository.insert(buildStoredMaterial({ name: "Other" })),
      ).rejects.toThrow();

      await expect(
        repository.insert(
          buildStoredMaterial({
            id: MATERIAL_B,
            name: "Other",
            variants: [
              buildStoredVariant({ label: "Ámbar" }),
              buildStoredVariant({
                id: "00000000-0000-4000-8000-000000000202",
                label: "A\u0301MBAR",
                position: 1,
              }),
            ],
          }),
        ),
      ).rejects.toBeInstanceOf(MaterialVariantLabelConflictError);
    });

    it("replaces the complete variant list and reports unknown updates", async () => {
      const { repository } = await create();
      await repository.insert(
        buildStoredMaterial({
          variants: [
            buildStoredVariant({ label: "Old" }),
            buildStoredVariant({
              id: "00000000-0000-4000-8000-000000000202",
              label: "Removed",
              position: 1,
            }),
          ],
        }),
      );
      const replacement = buildStoredMaterial({
        description: "Changed",
        variants: [buildStoredVariant({ label: "New", price: money(9999) })],
      });

      expect(await repository.update(replacement)).toBe(true);
      expect(await repository.findById(MATERIAL_A)).toEqual(replacement);
      expect(
        await repository.update(buildStoredMaterial({ id: MATERIAL_UNKNOWN })),
      ).toBe(false);
    });

    it("stores a variant without a price and reads it back as null", async () => {
      const { repository } = await create();
      const material = buildStoredMaterial({
        variants: [
          buildStoredVariant({ label: "Con precio" }),
          buildStoredVariant({
            id: "00000000-0000-4000-8000-000000000203",
            label: "Consultar",
            price: null,
            position: 1,
          }),
        ],
      });
      await repository.insert(material);

      const stored = await repository.findById(MATERIAL_A);
      expect(stored?.variants.map((variant) => variant.price)).toEqual([
        material.variants[0]?.price,
        null,
      ]);
    });

    it("rolls back root and variants when a child constraint fails", async () => {
      const { repository } = await create();
      const original = buildStoredMaterial();
      await repository.insert(original);
      const duplicateVariantId = "00000000-0000-4000-8000-000000000299";

      await expect(
        repository.update(
          buildStoredMaterial({
            description: "Must roll back",
            variants: [
              buildStoredVariant({
                id: duplicateVariantId,
                label: "First",
              }),
              buildStoredVariant({
                id: duplicateVariantId,
                label: "Second",
                position: 1,
              }),
            ],
          }),
        ),
      ).rejects.toThrow();
      expect(await repository.findById(MATERIAL_A)).toEqual(original);
    });
  });
}
