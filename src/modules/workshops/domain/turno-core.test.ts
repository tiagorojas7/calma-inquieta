import { describe, expect, it } from "vitest";
import { compareTurnos, turnoLabelKey, validateTurnoCore } from "./turno-core";

describe("turno core", () => {
  it("trims and NFC-normalizes labels and derives a Spanish case-insensitive key", () => {
    const result = validateTurnoCore({
      label: "  Man\u0303ana  ",
      weekday: "2",
      startsAt: "09:00",
      endsAt: "10:30",
      defaultCapacity: "8",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        label: "Mañana",
        labelKey: "mañana",
        weekday: 2,
        startsAt: "09:00",
        endsAt: "10:30",
        defaultCapacity: 8,
      },
    });
    expect(turnoLabelKey("Ñandú")).toBe(turnoLabelKey("ñANDÚ"));
    expect(turnoLabelKey("Lucía")).toBe(turnoLabelKey("Lucía"));
  });

  it("aggregates label, weekday, time range, and capacity failures", () => {
    expect(
      validateTurnoCore({
        label: " ",
        weekday: "1.5",
        startsAt: "25:00",
        endsAt: "09:00",
        defaultCapacity: "0.5",
      }),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "label", code: "required" },
          { field: "weekday", code: "invalid-format" },
          { field: "timeRange", code: "invalid-format" },
          { field: "defaultCapacity", code: "invalid-format" },
        ],
      },
    });
    for (const draft of [
      {
        weekday: "0",
        startsAt: "09:00",
        endsAt: "10:00",
        defaultCapacity: "1",
        field: "weekday",
      },
      {
        weekday: "8",
        startsAt: "09:00",
        endsAt: "10:00",
        defaultCapacity: "1",
        field: "weekday",
      },
      {
        weekday: "1",
        startsAt: "10:00",
        endsAt: "10:00",
        defaultCapacity: "1",
        field: "timeRange",
      },
      {
        weekday: "1",
        startsAt: "10:00",
        endsAt: "09:59",
        defaultCapacity: "1",
        field: "timeRange",
      },
      {
        weekday: "1",
        startsAt: "09:00",
        endsAt: "10:00",
        defaultCapacity: "0",
        field: "defaultCapacity",
      },
      {
        weekday: "1",
        startsAt: "09:00",
        endsAt: "10:00",
        defaultCapacity: "501",
        field: "defaultCapacity",
      },
    ] as const)
      expect(validateTurnoCore({ label: "Tarde", ...draft })).toMatchObject({
        ok: false,
        error: { issues: [{ field: draft.field }] },
      });
  });

  it("enforces the label length and deterministic weekday, time, id order", () => {
    expect(
      validateTurnoCore({
        label: "x".repeat(41),
        weekday: "1",
        startsAt: "09:00",
        endsAt: "10:00",
        defaultCapacity: "1",
      }),
    ).toMatchObject({
      ok: false,
      error: { issues: [{ field: "label", code: "too-long" }] },
    });
    const turnos = [
      { id: "z", weekday: 2 as const, startsAt: "09:00" },
      { id: "b", weekday: 1 as const, startsAt: "10:00" },
      { id: "a", weekday: 1 as const, startsAt: "10:00" },
      { id: "c", weekday: 1 as const, startsAt: "08:00" },
    ];
    expect([...turnos].sort(compareTurnos).map((item) => item.id)).toEqual([
      "c",
      "a",
      "b",
      "z",
    ]);
  });
});
