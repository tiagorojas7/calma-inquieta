import { describe, expect, it } from "vitest";
import {
  compareTurnos,
  turnoDisplayName,
  turnoLabelKey,
  validateTurnoCore,
} from "./turno-core";

describe("turno core", () => {
  it("generates the label from weekday and time range, ignoring any typed label", () => {
    const result = validateTurnoCore({
      label: "  Mañana  ",
      weekday: "2",
      startsAt: "18:00",
      endsAt: "20:00",
      defaultCapacity: "8",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        label: "Martes 18:00 a 20:00",
        labelKey: "martes 18:00 a 20:00",
        weekday: 2,
        startsAt: "18:00",
        endsAt: "20:00",
        defaultCapacity: 8,
      },
    });
    expect(turnoDisplayName(7, "09:00", "10:30")).toBe("Domingo 09:00 a 10:30");
  });

  it("keeps a Spanish case-insensitive label key", () => {
    expect(turnoLabelKey("Ñandú")).toBe(turnoLabelKey("ñANDÚ"));
    expect(turnoLabelKey("Lucía")).toBe(turnoLabelKey("Lucía"));
  });

  it("aggregates weekday, time range, and capacity failures", () => {
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

  it("orders by deterministic weekday, time, id", () => {
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
