import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type {
  MonthlyWorkshopRepository,
  StoredMonthlyWorkshop,
} from "~/modules/workshops/application/monthly-workshop-repository";
/** Media assets the gallery fixtures refer to; real databases must seed them. */
export const WORKSHOP_ASSET_1 = "00000000-0000-4000-8000-0000000000a1";
export const WORKSHOP_ASSET_2 = "00000000-0000-4000-8000-0000000000a2";
const parsedFee = Money.fromCentavos(123400);
if (!parsedFee.ok) throw new Error("fixture");
const fee = parsedFee.value;
const workshop = (
  overrides: Partial<StoredMonthlyWorkshop> = {},
): StoredMonthlyWorkshop => ({
  id: "00000000-0000-4000-8000-000000000001",
  slug: "ceramica",
  name: "Cerámica Ñandú",
  summary: "Resumen",
  description: "Descripción",
  technique: "Torno",
  defaultFee: fee,
  teacherId: "00000000-0000-4000-8000-000000000099",
  percentage: null,
  images: [],
  status: "draft",
  audit: {
    updatedBy: "admin@example.com",
    updatedAt: new Date("2026-01-01T00:00:00.123Z"),
  },
  ...overrides,
});
export function runMonthlyWorkshopRepositoryContract(
  create: () => Promise<MonthlyWorkshopRepository>,
): void {
  describe("MonthlyWorkshopRepository contract", () => {
    it("round-trips exact money, percentage and audit", async () => {
      const repo = await create();
      const value = workshop({ percentage: { basisPoints: 3550 } });
      expect((await repo.insert(value)).ok).toBe(true);
      const found = await repo.findById(value.id);
      expect(found?.defaultFee.toCentavos()).toBe(123400);
      expect(found).toMatchObject({
        percentage: { basisPoints: 3550 },
        audit: value.audit,
      });
    });
    it("returns a typed slug conflict including archived rows", async () => {
      const repo = await create();
      await repo.insert(workshop({ status: "archived" }));
      expect(
        await repo.insert(
          workshop({ id: "00000000-0000-4000-8000-000000000002" }),
        ),
      ).toEqual({ ok: false, error: { kind: "slug-conflict" } });
    });
    it("rejects unrelated unique violations instead of mapping them to a slug conflict", async () => {
      const repo = await create();
      await repo.insert(workshop());
      await expect(repo.insert(workshop({ slug: "other" }))).rejects.toThrow();
    });
    it("round-trips the gallery in position order", async () => {
      const repo = await create();
      const images = [
        { assetId: WORKSHOP_ASSET_2, alt: "Segunda" },
        { assetId: WORKSHOP_ASSET_1, alt: "Primera" },
      ];
      const value = workshop({ images });
      await repo.insert(value);

      expect((await repo.findById(value.id))?.images).toEqual(images);
      expect((await repo.findBySlug(value.slug))?.images).toEqual(images);
      expect((await repo.list(["draft"]))[0]?.images).toEqual(images);
    });

    it("replaces the whole gallery on update, including with none", async () => {
      const repo = await create();
      const value = workshop({
        images: [{ assetId: WORKSHOP_ASSET_1, alt: "Primera" }],
      });
      await repo.insert(value);
      const replaced = {
        ...value,
        images: [{ assetId: WORKSHOP_ASSET_2, alt: "Otra" }],
      };
      expect((await repo.update(replaced)).ok).toBe(true);
      expect((await repo.findById(value.id))?.images).toEqual(replaced.images);

      expect((await repo.update({ ...value, images: [] })).ok).toBe(true);
      expect((await repo.findById(value.id))?.images).toEqual([]);
    });

    it("returns not-found when updating a missing workshop", async () => {
      const repo = await create();

      expect(await repo.update(workshop())).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
    });

    it("round-trips nullable assignments and exact replacements", async () => {
      const repo = await create();
      const initial = workshop({ percentage: { basisPoints: 3550 } });
      const replacement = workshop({
        teacherId: null,
        percentage: null,
        defaultFee: fee,
        audit: {
          updatedBy: "other-admin@example.com",
          updatedAt: new Date("2026-02-03T04:05:06.789Z"),
        },
      });
      await repo.insert(initial);

      expect(await repo.update(replacement)).toEqual({
        ok: true,
        value: undefined,
      });
      expect(await repo.findById(replacement.id)).toMatchObject({
        teacherId: null,
        percentage: null,
        defaultFee: fee,
        audit: replacement.audit,
      });
    });

    it("orders names by code units, independently of database collation", async () => {
      const repo = await create();
      await repo.insert(workshop({ name: "Ñandú", slug: "nandu" }));
      await repo.insert(
        workshop({
          id: "00000000-0000-4000-8000-000000000002",
          name: "Álamo",
          slug: "alamo",
        }),
      );
      await repo.insert(
        workshop({
          id: "00000000-0000-4000-8000-000000000003",
          name: "Zeta",
          slug: "zeta",
        }),
      );
      await repo.insert(
        workshop({
          id: "00000000-0000-4000-8000-000000000004",
          name: "Zeta",
          slug: "zeta-dos",
        }),
      );
      expect(
        (await repo.list(["draft"])).map((item) => [item.name, item.id]),
      ).toEqual([
        ["Zeta", "00000000-0000-4000-8000-000000000003"],
        ["Zeta", "00000000-0000-4000-8000-000000000004"],
        ["Álamo", "00000000-0000-4000-8000-000000000002"],
        ["Ñandú", "00000000-0000-4000-8000-000000000001"],
      ]);
    });
  });
}
