import { describe, expect, it } from "vitest";
import type {
  StoredTurno,
  TurnoRepository,
} from "~/modules/workshops/application/turno-repository";

const turno = (overrides: Partial<StoredTurno> = {}): StoredTurno => ({
  id: "turno-a",
  workshopId: "workshop-a",
  label: "Mañana",
  labelKey: "mañana",
  weekday: 2,
  startsAt: "09:00",
  endsAt: "10:00",
  defaultCapacity: 8,
  active: true,
  ...overrides,
});

export function runTurnoRepositoryContract(
  create: () => Promise<TurnoRepository>,
): void {
  describe("TurnoRepository contract", () => {
    it("round-trips and returns null for an unknown turno", async () => {
      const repo = await create();
      await repo.insert(turno());
      expect(await repo.findById("missing")).toBeNull();
      expect(await repo.findById("turno-a")).toEqual(turno());
    });
    it("counts active rows and includes retired rows in normalized label uniqueness", async () => {
      const repo = await create();
      await repo.insert(turno({ active: false }));
      expect(await repo.countActiveForWorkshop("workshop-a")).toBe(0);
      expect(
        await repo.insert(
          turno({ id: "turno-b", label: "MAN\u0303ANA", labelKey: "mañana" }),
        ),
      ).toEqual({ ok: false, error: { kind: "label-conflict" } });
    });
    it("orders by weekday, start, then code-unit id", async () => {
      const repo = await create();
      for (const value of [
        turno({
          id: "z",
          label: "Z",
          labelKey: "z",
          weekday: 2,
          startsAt: "09:00",
        }),
        turno({
          id: "b",
          label: "B",
          labelKey: "b",
          weekday: 1,
          startsAt: "10:00",
        }),
        turno({
          id: "a",
          label: "A",
          labelKey: "a",
          weekday: 1,
          startsAt: "10:00",
        }),
        turno({
          id: "c",
          label: "C",
          labelKey: "c",
          weekday: 1,
          startsAt: "08:00",
        }),
      ])
        await repo.insert(value);
      expect(
        (await repo.listForWorkshop("workshop-a")).map((item) => item.id),
      ).toEqual(["c", "a", "b", "z"]);
    });
    it("reports typed conflicts for insert, update and reactivation races", async () => {
      const repo = await create();
      await repo.insert(turno({ id: "a", label: "Ñandú", labelKey: "ñandú" }));
      await repo.insert(
        turno({ id: "b", label: "Tarde", labelKey: "tarde", active: false }),
      );
      expect(
        await repo.update(
          turno({ id: "b", label: "ñANDÚ", labelKey: "ñandú", active: false }),
        ),
      ).toEqual({ ok: false, error: { kind: "label-conflict" } });
      expect(
        await repo.update(
          turno({ id: "b", label: "ÑANDÚ", labelKey: "ñandú", active: true }),
        ),
      ).toEqual({ ok: false, error: { kind: "label-conflict" } });
    });
    it("rejects unrelated duplicate ids and deletes only the requested stored turno", async () => {
      const repo = await create();
      await repo.insert(turno());
      await expect(
        repo.insert(turno({ label: "Otra", labelKey: "otra" })),
      ).rejects.toThrow();
      expect(await repo.delete("missing")).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
      expect(await repo.delete("turno-a")).toEqual({
        ok: true,
        value: undefined,
      });
    });
  });
}
