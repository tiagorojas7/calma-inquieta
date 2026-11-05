import { afterEach, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import {
  dateBadgeParts,
  formatDuration,
  formatEventDate,
  formatPesos,
  formatTimeRange,
  weekdayName,
} from "./format";

function pesos(centavos: number): Money {
  const result = Money.fromCentavos(centavos);
  if (!result.ok) {
    throw new Error("invalid test amount");
  }
  return result.value;
}

const normalizeSpaces = (text: string) => text.replaceAll(" ", " ");

describe("formatPesos", () => {
  it("groups thousands with dots and puts a no-break space after the sign", () => {
    expect(formatPesos(pesos(5_800_000))).toBe("$ 58.000");
    expect(normalizeSpaces(formatPesos(pesos(5_800_000)))).toBe("$ 58.000");
    expect(normalizeSpaces(formatPesos(pesos(4_500_000)))).toBe("$ 45.000");
  });

  it("groups every three digits, including millions", () => {
    expect(normalizeSpaces(formatPesos(pesos(123_456_700)))).toBe(
      "$ 1.234.567",
    );
    expect(normalizeSpaces(formatPesos(pesos(50_000)))).toBe("$ 500");
    expect(normalizeSpaces(formatPesos(Money.zero()))).toBe("$ 0");
  });

  it("shows centavos only when they are not zero", () => {
    expect(normalizeSpaces(formatPesos(pesos(5_800_050)))).toBe("$ 58.000,50");
    expect(normalizeSpaces(formatPesos(pesos(5_800_005)))).toBe("$ 58.000,05");
    expect(normalizeSpaces(formatPesos(pesos(5_800_000)))).not.toContain(",");
  });
});

describe("formatTimeRange", () => {
  it("joins both times with 'a' and ends with 'h'", () => {
    expect(formatTimeRange("10:00", "12:00")).toBe("10:00 a 12:00 h");
    expect(formatTimeRange("18:30", "20:15")).toBe("18:30 a 20:15 h");
  });

  it("drops the seconds the database adds to a stored time", () => {
    expect(formatTimeRange("14:00:00", "17:00:00")).toBe("14:00 a 17:00 h");
  });
});

describe("formatDuration", () => {
  it("writes whole hours in words", () => {
    expect(formatDuration(120)).toBe("2 horas");
    expect(formatDuration(60)).toBe("1 hora");
  });

  it("writes mixed and short durations with abbreviations", () => {
    expect(formatDuration(150)).toBe("2 h 30 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(90)).toBe("1 h 30 min");
  });
});

describe("weekdayName", () => {
  it("maps 1..7 from Lunes to Domingo", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(weekdayName)).toEqual([
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ]);
  });
});

describe("formatEventDate", () => {
  it("names the weekday, day and month from the date string", () => {
    expect(formatEventDate("2026-11-14")).toBe("Sábado 14 de noviembre");
    expect(formatEventDate("2027-01-03")).toBe("Domingo 3 de enero");
    expect(formatEventDate("2028-02-29")).toBe("Martes 29 de febrero");
  });
});

describe("dateBadgeParts", () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = original;
    }
  });

  it("returns the preformatted badge parts", () => {
    expect(dateBadgeParts("2026-11-14")).toEqual({
      dateTime: "2026-11-14",
      weekday: "sáb",
      day: "14",
      month: "nov",
      label: "sábado 14 de noviembre de 2026",
    });
    expect(dateBadgeParts("2027-01-03")).toEqual({
      dateTime: "2027-01-03",
      weekday: "dom",
      day: "3",
      month: "ene",
      label: "domingo 3 de enero de 2027",
    });
  });

  it("is identical under UTC and a UTC-03:00 zone", () => {
    process.env.TZ = "UTC";
    const utc = dateBadgeParts("2026-11-14");
    process.env.TZ = "America/Argentina/Cordoba";
    const cordoba = dateBadgeParts("2026-11-14");
    expect(cordoba).toEqual(utc);
    expect(cordoba.weekday).toBe("sáb");
  });
});
