import { describe, expect, it } from "vitest";
import {
  WEEKDAY_OPTIONS,
  formatTimeRange,
  parseEditingTurno,
  parseTurnoDraft,
  parseTurnoId,
  parseTurnoIntent,
  turnoFormValues,
  weekdayName,
} from "./turno-form-data";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseTurnoDraft", () => {
  it("reads label, weekday, time range and capacity as trimmed text", () => {
    expect(
      parseTurnoDraft(
        form({
          label: " Mañana ",
          weekday: "2",
          startsAt: "10:00 ",
          endsAt: " 12:00",
          defaultCapacity: " 8 ",
        }),
      ),
    ).toEqual({
      label: "Mañana",
      weekday: "2",
      startsAt: "10:00",
      endsAt: "12:00",
      defaultCapacity: "8",
    });
  });

  it("turns missing and file fields into empty text so the service can reject them", () => {
    const data = form({ label: "Tarde" });
    data.set("endsAt", new File(["x"], "x.txt"));
    expect(parseTurnoDraft(data)).toEqual({
      label: "Tarde",
      weekday: "",
      startsAt: "",
      endsAt: "",
      defaultCapacity: "",
    });
  });

  it("does not interpret a weekday or a capacity, a bad one reaches the service", () => {
    const draft = parseTurnoDraft(
      form({ weekday: "9", defaultCapacity: "0", startsAt: "12:00" }),
    );
    expect(draft.weekday).toBe("9");
    expect(draft.defaultCapacity).toBe("0");
    expect(draft.startsAt).toBe("12:00");
  });
});

describe("parseTurnoIntent and parseTurnoId", () => {
  it("accepts only the known intents", () => {
    for (const intent of ["save", "retire", "reactivate", "delete"] as const)
      expect(parseTurnoIntent(form({ intent }))).toBe(intent);
    expect(parseTurnoIntent(form({ intent: "publish" }))).toBeNull();
    expect(parseTurnoIntent(form({}))).toBeNull();
  });

  it("reads the turno id, empty when absent", () => {
    expect(parseTurnoId(form({ turnoId: "t9" }))).toBe("t9");
    expect(parseTurnoId(form({}))).toBe("");
  });
});

describe("parseEditingTurno", () => {
  it("reads ?editar= and is null without a value", () => {
    expect(parseEditingTurno(new URL("https://x.test/a?editar=t3"))).toBe("t3");
    expect(parseEditingTurno(new URL("https://x.test/a?editar="))).toBeNull();
    expect(parseEditingTurno(new URL("https://x.test/a"))).toBeNull();
  });
});

describe("display helpers", () => {
  it("names the seven weekdays from Monday, in Spanish", () => {
    expect(WEEKDAY_OPTIONS.map((option) => option.value)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
    expect(weekdayName(1)).toBe("Lunes");
    expect(weekdayName(2)).toBe("Martes");
    expect(weekdayName(3)).toBe("Miércoles");
    expect(weekdayName(7)).toBe("Domingo");
  });

  it("formats a time range and the stored turno as form values", () => {
    expect(formatTimeRange("10:00", "12:00")).toBe("10:00 a 12:00");
    expect(
      turnoFormValues({
        id: "t1",
        label: "Mañana",
        weekday: 2,
        startsAt: "10:00",
        endsAt: "12:00",
        defaultCapacity: 8,
        active: true,
        usedByPeriods: false,
      }),
    ).toEqual({
      label: "Mañana",
      weekday: "2",
      startsAt: "10:00",
      endsAt: "12:00",
      defaultCapacity: "8",
    });
  });
});
