import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import type { IntensiveStatus } from "~/modules/workshops";
import type {
  IntensiveRepository,
  StoredIntensive,
} from "~/modules/workshops/application/intensive-repository";

export const ID_A = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const ID_B = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
export const ID_C = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
export const ID_UNKNOWN = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04";
export const TEACHER_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b01";
export const ASSET_1 = "a1b2c3d4-0000-4000-8000-000000000001";
export const ASSET_2 = "a1b2c3d4-0000-4000-8000-000000000002";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
};

export function buildStoredIntensive(
  overrides: Partial<StoredIntensive> = {},
): StoredIntensive {
  return {
    id: ID_A,
    slug: "ceramica-fin-de-semana",
    name: "Cerámica de fin de semana",
    summary: "Un día de torno",
    description: "Descripción larga",
    teacherId: TEACHER_ID,
    percentage: { basisPoints: 3333 },
    eventDate: "2026-11-07",
    startsAt: "09:30",
    endsAt: "18:00",
    price: pesos(30000),
    deposit: pesos(10000),
    capacity: 8,
    minSeats: 4,
    policyText: "Cancelación hasta 48 horas antes.",
    materialsIncluded: true,
    images: [
      { assetId: ASSET_1, alt: "Torno" },
      { assetId: ASSET_2, alt: "Piezas" },
    ],
    status: "draft",
    audit: {
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-10-14T12:00:00.123Z"),
    },
    ...overrides,
  };
}

/** Money hides its field from toEqual: compare centavos explicitly. */
export const plainIntensive = (i: StoredIntensive | null) =>
  i && { ...i, price: i.price.toCentavos(), deposit: i.deposit.toCentavos() };

/**
 * Behavior every IntensiveRepository implementation must satisfy.
 *
 * List order: event date descending, start time descending, then id
 * ascending, compared by code unit. Names never take part, so the order is
 * the same whatever the database collation.
 */
export function runIntensiveRepositoryContract(
  create: () => Promise<IntensiveRepository>,
): void {
  describe("IntensiveRepository contract", () => {
    it("round-trips every field: exact money, basis points, gallery order, audit milliseconds", async () => {
      const repo = await create();
      const full = buildStoredIntensive({
        name: "Ñandú & Árbol: ¡cerámica!",
        price: pesos(123_456_789),
      });
      const bare = buildStoredIntensive({
        id: ID_B,
        slug: "otro",
        teacherId: null,
        percentage: null,
        policyText: "",
        materialsIncluded: false,
        images: [],
        status: "archived",
      });
      expect((await repo.insert(full)).ok).toBe(true);
      expect((await repo.insert(bare)).ok).toBe(true);

      expect(plainIntensive(await repo.findById(ID_A))).toEqual(
        plainIntensive(full),
      );
      expect(plainIntensive(await repo.findById(ID_B))).toEqual(
        plainIntensive(bare),
      );
      expect((await repo.findById(ID_A))?.price.toCentavos()).toBe(
        12_345_678_900,
      );
    });

    it("stores 0 and 10000 basis points exactly", async () => {
      const repo = await create();
      await repo.insert(
        buildStoredIntensive({ percentage: { basisPoints: 0 } }),
      );
      await repo.insert(
        buildStoredIntensive({
          id: ID_B,
          slug: "otro",
          percentage: { basisPoints: 10000 },
        }),
      );

      expect((await repo.findById(ID_A))?.percentage).toEqual({
        basisPoints: 0,
      });
      expect((await repo.findById(ID_B))?.percentage).toEqual({
        basisPoints: 10000,
      });
    });

    it("stores no cancellation-deadline field", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive());

      expect(Object.keys((await repo.findById(ID_A)) ?? {}).sort()).toEqual([
        "audit",
        "capacity",
        "deposit",
        "description",
        "endsAt",
        "eventDate",
        "id",
        "images",
        "materialsIncluded",
        "minSeats",
        "name",
        "percentage",
        "policyText",
        "price",
        "slug",
        "startsAt",
        "status",
        "summary",
        "teacherId",
      ]);
    });

    it("returns null for an unknown id and an unknown slug", async () => {
      const repo = await create();

      expect(await repo.findById(ID_UNKNOWN)).toBeNull();
      expect(await repo.findBySlug("nope")).toBeNull();
    });

    it("finds by exact slug whatever the status, never by a prefix", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive({ status: "archived" }));

      expect((await repo.findBySlug("ceramica-fin-de-semana"))?.id).toBe(ID_A);
      expect(await repo.findBySlug("ceramica")).toBeNull();
    });

    it("rejects a second insert with the same id", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive());

      await expect(
        repo.insert(buildStoredIntensive({ slug: "otro" })),
      ).rejects.toThrow();
    });

    it("reports a slug conflict as a typed result, archived holders included", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive({ status: "archived" }));

      const result = await repo.insert(buildStoredIntensive({ id: ID_B }));

      expect(result).toEqual({ ok: false, error: { kind: "slug-conflict" } });
      expect(await repo.findById(ID_B)).toBeNull();
    });

    it("updates every field, replaces the gallery in order and reports an unknown id", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive());
      const changed = buildStoredIntensive({
        slug: "nuevo",
        name: "Nuevo",
        summary: "Otro resumen",
        description: "Otra descripción",
        teacherId: null,
        percentage: null,
        eventDate: "2026-12-05",
        startsAt: "10:00",
        endsAt: "12:30",
        price: pesos(45000),
        deposit: pesos(45000),
        capacity: 20,
        minSeats: 20,
        policyText: "",
        materialsIncluded: false,
        images: [{ assetId: ASSET_2, alt: "Solo una" }],
        status: "published",
        audit: {
          updatedBy: "otra@example.com",
          updatedAt: new Date("2026-10-15T08:30:00.000Z"),
        },
      });

      expect(await repo.update(changed)).toEqual({
        ok: true,
        value: undefined,
      });
      expect(plainIntensive(await repo.findById(ID_A))).toEqual(
        plainIntensive(changed),
      );
      expect(
        await repo.update(buildStoredIntensive({ id: ID_UNKNOWN, slug: "x" })),
      ).toEqual({ ok: false, error: { kind: "not-found" } });
    });

    it("reorders and clears the gallery on update", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive());
      const reordered = [
        { assetId: ASSET_2, alt: "Piezas" },
        { assetId: ASSET_1, alt: "Torno" },
      ];

      await repo.update(buildStoredIntensive({ images: reordered }));
      expect((await repo.findById(ID_A))?.images).toEqual(reordered);

      await repo.update(buildStoredIntensive({ images: [] }));
      expect((await repo.findById(ID_A))?.images).toEqual([]);
    });

    it("accepts an update that keeps its own slug", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive());

      expect(
        (await repo.update(buildStoredIntensive({ name: "Otro" }))).ok,
      ).toBe(true);
    });

    it("reports a slug conflict on update and leaves the record unchanged", async () => {
      const repo = await create();
      await repo.insert(buildStoredIntensive({ id: ID_A, slug: "uno" }));
      await repo.insert(buildStoredIntensive({ id: ID_B, slug: "dos" }));

      const result = await repo.update(
        buildStoredIntensive({ id: ID_B, slug: "uno", name: "Cambiado" }),
      );

      expect(result).toEqual({ ok: false, error: { kind: "slug-conflict" } });
      expect(await repo.findById(ID_B)).toMatchObject({
        slug: "dos",
        name: "Cerámica de fin de semana",
      });
    });

    describe("list", () => {
      const seed = async (
        repo: IntensiveRepository,
        rows: readonly [string, string, string, string, IntensiveStatus][],
      ) => {
        for (const [id, slug, eventDate, startsAt, status] of rows)
          await repo.insert(
            buildStoredIntensive({ id, slug, eventDate, startsAt, status }),
          );
      };
      const ids = async (
        repo: IntensiveRepository,
        statuses: readonly IntensiveStatus[],
      ) => (await repo.list(statuses)).map((i) => i.id);

      it("filters by the given statuses and returns nothing for none", async () => {
        const repo = await create();
        await seed(repo, [
          [ID_A, "a", "2026-11-01", "10:00", "draft"],
          [ID_B, "b", "2026-11-01", "11:00", "published"],
          [ID_C, "c", "2026-11-01", "12:00", "archived"],
        ]);

        expect(await ids(repo, ["published", "draft"])).toEqual([ID_B, ID_A]);
        expect(await ids(repo, ["archived"])).toEqual([ID_C]);
        expect(await ids(repo, [])).toEqual([]);
      });

      it("orders by event date descending, then start time descending, then id", async () => {
        const repo = await create();
        await seed(repo, [
          [ID_A, "a", "2026-11-01", "10:00", "draft"],
          [ID_B, "b", "2026-12-01", "09:00", "draft"],
          [ID_C, "c", "2026-11-01", "15:30", "draft"],
          [ID_UNKNOWN, "d", "2026-11-01", "10:00", "draft"],
        ]);

        // 12-01 first; on 11-01 the 15:30 start, then the two 10:00 starts by id.
        expect(await ids(repo, ["draft"])).toEqual([
          ID_B,
          ID_C,
          ID_A,
          ID_UNKNOWN,
        ]);
      });

      it("never lets names, accented or not, change the order", async () => {
        const repo = await create();
        await repo.insert(
          buildStoredIntensive({ id: ID_A, slug: "a", name: "Zeta" }),
        );
        await repo.insert(
          buildStoredIntensive({ id: ID_B, slug: "b", name: "Álamo" }),
        );
        await repo.insert(
          buildStoredIntensive({ id: ID_C, slug: "c", name: "Ñandú" }),
        );

        // Same date and time: ids only (0b6f..., 2f8e..., 7c9d...).
        expect(await ids(repo, ["draft"])).toEqual([ID_A, ID_C, ID_B]);
      });

      it("does not depend on insertion order", async () => {
        const repo = await create();
        await seed(repo, [
          [ID_A, "a", "2026-11-01", "10:00", "draft"],
          [ID_C, "c", "2026-11-03", "10:00", "draft"],
          [ID_B, "b", "2026-11-02", "10:00", "draft"],
        ]);

        expect(await ids(repo, ["draft"])).toEqual([ID_C, ID_B, ID_A]);
      });
    });

    describe("deleteDraft", () => {
      it("deletes a draft and frees its slug", async () => {
        const repo = await create();
        await repo.insert(buildStoredIntensive());

        expect(await repo.deleteDraft(ID_A)).toBe("deleted");
        expect(await repo.findById(ID_A)).toBeNull();
        expect(await repo.insert(buildStoredIntensive({ id: ID_B }))).toEqual({
          ok: true,
          value: undefined,
        });
      });

      it.each(["published", "paused", "cancelled", "archived"] as const)(
        "refuses a %s intensivo and keeps it",
        async (status) => {
          const repo = await create();
          await repo.insert(buildStoredIntensive({ status }));

          expect(await repo.deleteDraft(ID_A)).toBe("not-draft");
          expect((await repo.findById(ID_A))?.status).toBe(status);
        },
      );

      it("reports an unknown id", async () => {
        const repo = await create();

        expect(await repo.deleteDraft(ID_UNKNOWN)).toBe("not-found");
      });
    });
  });
}
