import { describe, expect, it } from "vitest";
import type { Teacher } from "~/modules/teachers";
import type { TeacherRepository } from "~/modules/teachers/application/teacher-repository";

export const ID_A = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const ID_B = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
export const ID_C = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
export const ID_UNKNOWN = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04";

export function buildStoredTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: ID_A,
    name: "Lucía Pérez",
    bioLine: "Ceramista",
    phone: "+54 351 555-0101",
    email: "lucia@example.com",
    modality: "third_party",
    active: true,
    audit: {
      updatedBy: "admin@example.com",
      updatedAt: new Date("2026-10-14T12:00:00.000Z"),
    },
    ...overrides,
  };
}

/** Behavior every TeacherRepository implementation must satisfy. */
export function runTeacherRepositoryContract(
  create: () => Promise<TeacherRepository>,
): void {
  describe("TeacherRepository contract", () => {
    it("round-trips every field, including nulls and the audit", async () => {
      const repo = await create();
      const full = buildStoredTeacher();
      const minimal = buildStoredTeacher({
        id: ID_B,
        name: "Cami",
        phone: null,
        email: null,
        modality: "own",
        active: false,
      });
      await repo.insert(full);
      await repo.insert(minimal);

      expect(await repo.findById(ID_A)).toEqual(full);
      expect(await repo.findById(ID_B)).toEqual(minimal);
    });

    it("stores no percentage", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher());

      const stored = await repo.findById(ID_A);
      expect(Object.keys(stored ?? {}).sort()).toEqual([
        "active",
        "audit",
        "bioLine",
        "email",
        "id",
        "modality",
        "name",
        "phone",
      ]);
    });

    it("returns null for an unknown id", async () => {
      const repo = await create();

      expect(await repo.findById(ID_UNKNOWN)).toBeNull();
    });

    it("finds only the requested known ids", async () => {
      const repo = await create();
      const a = buildStoredTeacher({ id: ID_A });
      const b = buildStoredTeacher({ id: ID_B, name: "Cami" });
      await repo.insert(a);
      await repo.insert(b);

      const found = await repo.findByIds([ID_B, ID_UNKNOWN]);

      expect([...found.keys()]).toEqual([ID_B]);
      expect(found.get(ID_B)).toEqual(b);
      expect((await repo.findByIds([])).size).toBe(0);
    });

    it("keeps an archived teacher readable by id", async () => {
      const repo = await create();
      const archived = buildStoredTeacher({ active: false });
      await repo.insert(archived);

      expect((await repo.findByIds([ID_A])).get(ID_A)).toEqual(archived);
    });

    it("filters by active and archived and orders by name", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher({ id: ID_A, name: "beto" }));
      await repo.insert(buildStoredTeacher({ id: ID_B, name: "Ana" }));
      await repo.insert(
        buildStoredTeacher({ id: ID_C, name: "Carla", active: false }),
      );

      const names = async (filter: "active" | "archived" | "all") =>
        (await repo.list(filter)).map((teacher) => teacher.name);

      expect(await names("active")).toEqual(["Ana", "beto"]);
      expect(await names("archived")).toEqual(["Carla"]);
      expect(await names("all")).toEqual(["Ana", "beto", "Carla"]);
    });

    it("orders equal names by id", async () => {
      const repo = await create();
      await repo.insert(
        buildStoredTeacher({ id: ID_B, name: "Ana", active: false }),
      );
      await repo.insert(
        buildStoredTeacher({ id: ID_A, name: "Ana", active: false }),
      );

      expect((await repo.list("all")).map((t) => t.id)).toEqual([ID_A, ID_B]);
    });

    it("finds an active teacher by name ignoring case", async () => {
      const repo = await create();
      const teacher = buildStoredTeacher();
      await repo.insert(teacher);

      expect(await repo.findActiveByName("LUCÍA PÉREZ")).toEqual(teacher);
      expect(await repo.findActiveByName("Otra")).toBeNull();
    });

    it("does not find an archived teacher by name", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher({ active: false }));

      expect(await repo.findActiveByName("Lucía Pérez")).toBeNull();
    });

    it("rejects a second insert with the same id", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher());

      await expect(
        repo.insert(buildStoredTeacher({ name: "Otra" })),
      ).rejects.toThrow();
    });

    it("rejects a second active teacher whose name differs only by case", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher());

      await expect(
        repo.insert(buildStoredTeacher({ id: ID_B, name: "lucía pérez" })),
      ).rejects.toThrow();
    });

    it.each([
      ["Lucía", "LUCÍA"],
      ["Ñandú", "ÑANDÚ"],
    ])("rejects %s and %s as one active name", async (first, second) => {
      const repo = await create();
      await repo.insert(buildStoredTeacher({ id: ID_A, name: first }));

      await expect(
        repo.insert(buildStoredTeacher({ id: ID_B, name: second })),
      ).rejects.toThrow();
    });

    it("treats names that differ by an accent as different", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher({ id: ID_A, name: "Lucia" }));

      await repo.insert(buildStoredTeacher({ id: ID_B, name: "Lucía" }));

      expect(await repo.list("active")).toHaveLength(2);
    });

    it("allows the same name when the other teacher is archived", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher({ active: false }));

      await repo.insert(buildStoredTeacher({ id: ID_B }));

      expect((await repo.list("all")).map((t) => t.id).sort()).toEqual(
        [ID_A, ID_B].sort(),
      );
    });

    it("updates every field and reports whether the id existed", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher());
      const changed = buildStoredTeacher({
        name: "Lucía P.",
        bioLine: "Nueva bio",
        phone: null,
        email: null,
        modality: "own",
        audit: {
          updatedBy: "otra@example.com",
          updatedAt: new Date("2026-10-15T08:30:00.000Z"),
        },
      });

      expect(await repo.update(changed)).toBe(true);
      expect(await repo.findById(ID_A)).toEqual(changed);
      expect(await repo.update(buildStoredTeacher({ id: ID_UNKNOWN }))).toBe(
        false,
      );
    });

    it("rejects an update that renames onto another active name", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher({ id: ID_A, name: "Ana" }));
      await repo.insert(buildStoredTeacher({ id: ID_B, name: "Beto" }));

      await expect(
        repo.update(buildStoredTeacher({ id: ID_B, name: "ANA" })),
      ).rejects.toThrow();
    });

    it("rejects reactivating onto a name an active teacher now holds", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher({ id: ID_A, active: false }));
      await repo.insert(buildStoredTeacher({ id: ID_B }));

      await expect(
        repo.update(buildStoredTeacher({ id: ID_A, active: true })),
      ).rejects.toThrow();
    });

    it("frees the name when a teacher is archived", async () => {
      const repo = await create();
      await repo.insert(buildStoredTeacher());
      await repo.update(buildStoredTeacher({ active: false }));

      await repo.insert(buildStoredTeacher({ id: ID_B }));

      expect((await repo.list("active")).map((t) => t.id)).toEqual([ID_B]);
    });
  });
}
