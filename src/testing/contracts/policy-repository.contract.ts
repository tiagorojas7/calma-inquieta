import { describe, expect, it } from "vitest";
import type { PolicyRepository, PolicyVersion } from "~/modules/policies";

const version = (overrides: Partial<PolicyVersion> = {}): PolicyVersion => ({
  id: "00000000-0000-4000-8000-0000000000a1",
  kind: "conditions",
  version: 1,
  body: "Primera versión.",
  publishedAt: new Date("2026-11-17T15:00:00Z"),
  publishedBy: "owner@example.com",
  ...overrides,
});

/** Behavior every policy repository implementation must share. */
export function runPolicyRepositoryContract(
  setup: () => Promise<PolicyRepository> | PolicyRepository,
): void {
  describe("PolicyRepository contract", () => {
    it("starts without a latest version for a kind that has none", async () => {
      const repository = await setup();
      await expect(repository.latest("conditions")).resolves.toBeNull();
      await expect(repository.list("privacy")).resolves.toEqual([]);
      await expect(repository.exists("conditions", 1)).resolves.toBe(false);
    });

    it("stores a version and reads it back as the latest", async () => {
      const repository = await setup();
      await expect(repository.insert(version())).resolves.toEqual({
        ok: true,
        value: version(),
      });
      await expect(repository.latest("conditions")).resolves.toEqual(version());
      await expect(repository.exists("conditions", 1)).resolves.toBe(true);
    });

    it("lists a kind newest first and keeps the kinds apart", async () => {
      const repository = await setup();
      await repository.insert(version());
      await repository.insert(
        version({
          id: "00000000-0000-4000-8000-0000000000a2",
          version: 2,
          body: "Segunda versión.",
          publishedAt: new Date("2026-11-18T15:00:00Z"),
        }),
      );
      await repository.insert(
        version({
          id: "00000000-0000-4000-8000-0000000000a3",
          kind: "privacy",
          body: "Privacidad.",
        }),
      );

      const conditions = await repository.list("conditions");
      expect(conditions.map((item) => item.version)).toEqual([2, 1]);
      expect((await repository.latest("conditions"))?.body).toBe(
        "Segunda versión.",
      );
      expect(
        (await repository.list("privacy")).map((item) => item.body),
      ).toEqual(["Privacidad."]);
      await expect(repository.exists("privacy", 2)).resolves.toBe(false);
    });

    it("refuses a number the kind already has and keeps the stored version", async () => {
      const repository = await setup();
      await repository.insert(version());

      await expect(
        repository.insert(
          version({
            id: "00000000-0000-4000-8000-0000000000a9",
            body: "Intento de pisarla.",
          }),
        ),
      ).resolves.toEqual({ ok: false, error: { kind: "version-taken" } });
      await expect(repository.latest("conditions")).resolves.toEqual(version());
      await expect(repository.list("conditions")).resolves.toHaveLength(1);
    });
  });
}
