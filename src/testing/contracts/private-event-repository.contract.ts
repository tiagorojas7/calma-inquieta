import { describe, expect, it } from "vitest";
import type {
  PrivateEventRepository,
  StoredPrivateEvent,
} from "~/modules/private-events";

export const EVENT_A = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const EVENT_B = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";
export const EVENT_C = "2f8e5b6a-4d0c-4c3b-8e8f-6a1b3c5d7e03";
export const EVENT_UNKNOWN = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c04";

export function buildStoredPrivateEvent(
  overrides: Partial<StoredPrivateEvent> = {},
): StoredPrivateEvent {
  return {
    id: EVENT_A,
    fullName: "Ana Pérez",
    phoneDigits: "5493515550101",
    email: "ana@example.com",
    desiredDate: "2026-12-05",
    place: "Casa en Nueva Córdoba",
    participants: 12,
    notes: "Cumpleaños",
    status: "nueva",
    createdAt: new Date("2026-10-20T12:00:00.000Z"),
    statusChangedBy: null,
    statusChangedAt: null,
    ...overrides,
  };
}

/** Behavior every PrivateEventRepository implementation must satisfy. */
export function runPrivateEventRepositoryContract(
  create: () => Promise<PrivateEventRepository>,
): void {
  describe("PrivateEventRepository contract", () => {
    it("round-trips every field, including nulls", async () => {
      const repo = await create();
      const full = buildStoredPrivateEvent();
      const minimal = buildStoredPrivateEvent({
        id: EVENT_B,
        email: null,
        notes: null,
      });
      await repo.insert(full);
      await repo.insert(minimal);

      expect(await repo.findById(EVENT_A)).toEqual(full);
      expect(await repo.findById(EVENT_B)).toEqual(minimal);
    });

    it("returns null for an unknown id", async () => {
      const repo = await create();

      expect(await repo.findById(EVENT_UNKNOWN)).toBeNull();
    });

    it("rejects a duplicate id", async () => {
      const repo = await create();
      await repo.insert(buildStoredPrivateEvent());

      await expect(repo.insert(buildStoredPrivateEvent())).rejects.toThrow();
    });

    it("lists newest first and filters by status", async () => {
      const repo = await create();
      await repo.insert(
        buildStoredPrivateEvent({
          id: EVENT_A,
          createdAt: new Date("2026-10-20T12:00:00.000Z"),
        }),
      );
      await repo.insert(
        buildStoredPrivateEvent({
          id: EVENT_B,
          status: "contactada",
          createdAt: new Date("2026-10-22T12:00:00.000Z"),
        }),
      );
      await repo.insert(
        buildStoredPrivateEvent({
          id: EVENT_C,
          createdAt: new Date("2026-10-21T12:00:00.000Z"),
        }),
      );

      expect((await repo.list("all")).map((r) => r.id)).toEqual([
        EVENT_B,
        EVENT_C,
        EVENT_A,
      ]);
      expect((await repo.list("nueva")).map((r) => r.id)).toEqual([
        EVENT_C,
        EVENT_A,
      ]);
      expect(await repo.list("cerrada")).toEqual([]);
    });

    it("sets the status with who and when, and returns the stored row", async () => {
      const repo = await create();
      await repo.insert(buildStoredPrivateEvent());
      const at = new Date("2026-10-25T09:30:00.000Z");

      const updated = await repo.setStatus(EVENT_A, "contactada", {
        by: "admin@example.com",
        at,
      });

      const expected = buildStoredPrivateEvent({
        status: "contactada",
        statusChangedBy: "admin@example.com",
        statusChangedAt: at,
      });
      expect(updated).toEqual(expected);
      expect(await repo.findById(EVENT_A)).toEqual(expected);
    });

    it("returns null when the status of an unknown id changes", async () => {
      const repo = await create();

      expect(
        await repo.setStatus(EVENT_UNKNOWN, "cerrada", {
          by: "admin@example.com",
          at: new Date("2026-10-25T09:30:00.000Z"),
        }),
      ).toBeNull();
    });
  });
}
