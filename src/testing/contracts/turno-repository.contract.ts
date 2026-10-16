import { describe, expect, it } from "vitest";
import type {
  StoredTurno,
  TurnoRepository,
} from "~/modules/workshops/application/turno-repository";

const turno = (overrides: Partial<StoredTurno> = {}): StoredTurno => ({
  id: "00000000-0000-4000-8000-000000000010",
  workshopId: "00000000-0000-4000-8000-000000000001",
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
      expect(
        await repo.findById("00000000-0000-4000-8000-000000000099"),
      ).toBeNull();
      expect(
        await repo.findById("00000000-0000-4000-8000-000000000010"),
      ).toEqual(turno());
    });
    it("counts active rows and includes retired rows in normalized label uniqueness", async () => {
      const repo = await create();
      await repo.insert(turno({ active: false }));
      expect(
        await repo.countActiveForWorkshop(
          "00000000-0000-4000-8000-000000000001",
        ),
      ).toBe(0);
      expect(
        await repo.insert(
          turno({
            id: "00000000-0000-4000-8000-000000000011",
            label: "MAN\u0303ANA",
            labelKey: "mañana",
          }),
        ),
      ).toEqual({ ok: false, error: { kind: "label-conflict" } });
    });
    it("orders by weekday, start, then code-unit id", async () => {
      const repo = await create();
      for (const value of [
        turno({
          id: "00000000-0000-4000-8000-000000000099",
          label: "Z",
          labelKey: "z",
          weekday: 2,
          startsAt: "09:00",
        }),
        turno({
          id: "00000000-0000-4000-8000-000000000020",
          label: "B",
          labelKey: "b",
          weekday: 1,
          startsAt: "10:00",
          endsAt: "11:00",
        }),
        turno({
          id: "00000000-0000-4000-8000-000000000019",
          label: "A",
          labelKey: "a",
          weekday: 1,
          startsAt: "10:00",
          endsAt: "11:00",
        }),
        turno({
          id: "00000000-0000-4000-8000-000000000018",
          label: "C",
          labelKey: "c",
          weekday: 1,
          startsAt: "08:00",
        }),
      ])
        await repo.insert(value);
      expect(
        (
          await repo.listForWorkshop("00000000-0000-4000-8000-000000000001")
        ).map((item) => item.id),
      ).toEqual([
        "00000000-0000-4000-8000-000000000018",
        "00000000-0000-4000-8000-000000000019",
        "00000000-0000-4000-8000-000000000020",
        "00000000-0000-4000-8000-000000000099",
      ]);
    });
    it("reports typed conflicts for insert, update and reactivation races", async () => {
      const repo = await create();
      await repo.insert(
        turno({
          id: "00000000-0000-4000-8000-000000000030",
          label: "Ñandú",
          labelKey: "ñandú",
        }),
      );
      await repo.insert(
        turno({
          id: "00000000-0000-4000-8000-000000000031",
          label: "Tarde",
          labelKey: "tarde",
          active: false,
        }),
      );
      expect(
        await repo.update(
          turno({
            id: "00000000-0000-4000-8000-000000000031",
            label: "ñANDÚ",
            labelKey: "ñandú",
            active: false,
          }),
        ),
      ).toEqual({ ok: false, error: { kind: "label-conflict" } });
      expect(
        await repo.update(
          turno({
            id: "00000000-0000-4000-8000-000000000031",
            label: "ÑANDÚ",
            labelKey: "ñandú",
            active: true,
          }),
        ),
      ).toEqual({ ok: false, error: { kind: "label-conflict" } });
    });
    it("rejects unrelated duplicate ids and deletes only the requested stored turno", async () => {
      const repo = await create();
      await repo.insert(turno());
      await expect(
        repo.insert(turno({ label: "Otra", labelKey: "otra" })),
      ).rejects.toThrow();
      expect(await repo.delete("00000000-0000-4000-8000-000000000099")).toEqual(
        {
          ok: false,
          error: { kind: "not-found" },
        },
      );
      expect(await repo.delete("00000000-0000-4000-8000-000000000010")).toEqual(
        {
          ok: true,
          value: undefined,
        },
      );
    });
  });
}
