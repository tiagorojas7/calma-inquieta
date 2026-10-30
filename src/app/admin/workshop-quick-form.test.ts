import { describe, expect, it } from "vitest";
import {
  QUICK_TURNO_ROWS,
  deriveSummary,
  parseQuickWorkshop,
} from "./workshop-quick-form";

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const item of Array.isArray(value) ? value : [value])
      data.append(key, item);
  return data;
}

const BASE = {
  name: "Cerámica Creativa",
  description: "Un taller para empezar de cero.",
  teacherId: "t1",
  defaultFee: "12000",
  percentage: "",
};

const EMPTY_ROWS = {
  turnoWeekday: ["", "", "", "", ""],
  turnoStartsAt: ["", "", "", "", ""],
  turnoEndsAt: ["", "", "", "", ""],
  turnoCapacity: ["", "", "", "", ""],
};

describe("deriveSummary", () => {
  it("collapses whitespace and keeps a short description whole", () => {
    expect(deriveSummary("  Modelado\n y   torno ")).toBe("Modelado y torno");
  });

  it("cuts a long description at a word boundary within 200 characters", () => {
    const summary = deriveSummary("palabra ".repeat(60));
    expect(summary.length).toBeLessThanOrEqual(200);
    expect(summary.endsWith("…")).toBe(true);
    expect(summary).not.toMatch(/palab…$/);
  });
});

describe("parseQuickWorkshop", () => {
  it("builds a draft with a derived summary, a default technique and no slug", () => {
    const parsed = parseQuickWorkshop(form({ ...BASE, ...EMPTY_ROWS }));
    expect(parsed.draft).toMatchObject({
      name: "Cerámica Creativa",
      slug: "",
      summary: "Un taller para empezar de cero.",
      technique: "Taller",
      defaultFee: "12000",
      teacherId: "t1",
      images: [],
    });
  });

  it("keeps a typed summary and technique when the form carries them", () => {
    const parsed = parseQuickWorkshop(
      form({ ...BASE, ...EMPTY_ROWS, summary: "Mi frase", technique: "Torno" }),
    );
    expect(parsed.draft).toMatchObject({
      summary: "Mi frase",
      technique: "Torno",
    });
  });

  it("counts only the filled turno rows and labels them from day and start", () => {
    const parsed = parseQuickWorkshop(
      form({
        ...BASE,
        turnoWeekday: ["2", "", "5", "", ""],
        turnoStartsAt: ["10:00", "", "18:30", "", ""],
        turnoEndsAt: ["12:00", "", "20:30", "", ""],
        turnoCapacity: ["8", "", "6", "", ""],
      }),
    );
    expect(parsed.turnos).toEqual([
      {
        index: 0,
        draft: {
          label: "Martes 10:00",
          weekday: "2",
          startsAt: "10:00",
          endsAt: "12:00",
          defaultCapacity: "8",
        },
      },
      {
        index: 2,
        draft: {
          label: "Viernes 18:30",
          weekday: "5",
          startsAt: "18:30",
          endsAt: "20:30",
          defaultCapacity: "6",
        },
      },
    ]);
    expect(parsed.turnoErrors).toEqual({});
  });

  it("flags an incomplete row and an end before the start", () => {
    const parsed = parseQuickWorkshop(
      form({
        ...BASE,
        turnoWeekday: ["2", "3", "", "", ""],
        turnoStartsAt: ["10:00", "12:00", "", "", ""],
        turnoEndsAt: ["", "11:00", "", "", ""],
        turnoCapacity: ["8", "8", "", "", ""],
      }),
    );
    expect(Object.keys(parsed.turnoErrors)).toEqual(["0", "1"]);
    expect(parsed.turnoErrors[0]).toMatch(/Revisá este turno/);
  });

  it("flags a capacity outside 1 to 500 and a repeated day and time", () => {
    const parsed = parseQuickWorkshop(
      form({
        ...BASE,
        turnoWeekday: ["2", "2", "3", "", ""],
        turnoStartsAt: ["10:00", "10:00", "10:00", "", ""],
        turnoEndsAt: ["12:00", "12:00", "12:00", "", ""],
        turnoCapacity: ["8", "9", "501", "", ""],
      }),
    );
    expect(parsed.turnoErrors[1]).toBe(
      "Ya cargaste un turno con el mismo día y horario.",
    );
    expect(parsed.turnoErrors[2]).toMatch(/Revisá este turno/);
    expect(parsed.turnoErrors[0]).toBeUndefined();
  });

  it("collects the chosen materials and echoes every row for re-rendering", () => {
    const parsed = parseQuickWorkshop(
      form({ ...BASE, ...EMPTY_ROWS, materialIds: ["m1", "m2"] }),
    );
    expect(parsed.materialIds).toEqual(["m1", "m2"]);
    expect(parsed.values.rows).toHaveLength(QUICK_TURNO_ROWS);
    expect(parsed.values.materialIds).toEqual(["m1", "m2"]);
  });

  it("reads the submit intent, defaulting to a draft", () => {
    expect(
      parseQuickWorkshop(form({ ...BASE, intent: "publish" })).intent,
    ).toBe("publish");
    expect(parseQuickWorkshop(form({ ...BASE, intent: "draft" })).intent).toBe(
      "draft",
    );
    expect(parseQuickWorkshop(form({ ...BASE })).intent).toBe("draft");
  });
});
