import { describe, expect, it } from "vitest";
import {
  monthName,
  workshopReadiness,
  type ReadinessInput,
} from "./workshop-readiness";

const base: ReadinessInput = {
  workshopId: "w1",
  status: "draft",
  activeTurnos: 0,
  month: "2026-10",
  period: null,
};

const published: ReadinessInput = {
  ...base,
  status: "published",
  activeTurnos: 1,
};

const periodOf = (
  overrides: Partial<NonNullable<ReadinessInput["period"]>>,
): NonNullable<ReadinessInput["period"]> => ({
  status: "draft",
  totalCapacity: 8,
  materialsRequired: false,
  materialsCount: 0,
  ...overrides,
});

describe("workshopReadiness", () => {
  it("names months in Spanish", () => {
    expect(monthName("2026-10")).toBe("octubre");
    expect(monthName("2027-01")).toBe("enero");
  });

  it("starts at the shift step for a new draft workshop", () => {
    const result = workshopReadiness(base);
    expect(result.complete).toBe(false);
    expect(result.next).toMatchObject({
      key: "shift",
      href: "/admin/talleres/w1/turnos",
    });
    expect(
      result.steps.map((step) => `${step.key}:${String(step.done)}`),
    ).toEqual([
      "shift:false",
      "publish:false",
      "month:false",
      "seats:false",
      "materials:false",
      "open:false",
    ]);
  });

  it("asks to publish once a shift exists", () => {
    expect(workshopReadiness({ ...base, activeTurnos: 2 }).next).toMatchObject({
      key: "publish",
      href: "/admin/talleres/w1#estado",
    });
  });

  it("asks to open the current month by name once published", () => {
    expect(workshopReadiness(published).next).toMatchObject({
      key: "month",
      cta: "Abrir inscripciones de octubre",
      href: "/admin/talleres/w1/periodos",
    });
  });

  it("points seats and materials at the month detail", () => {
    const seats = workshopReadiness({
      ...published,
      period: periodOf({ totalCapacity: 0 }),
    });
    expect(seats.next).toMatchObject({
      key: "seats",
      href: "/admin/talleres/w1/periodos/2026-10",
    });
    const materials = workshopReadiness({
      ...published,
      period: periodOf({ materialsRequired: true }),
    });
    expect(materials.next?.key).toBe("materials");
  });

  it("treats materials as done when not required or unknown", () => {
    expect(
      workshopReadiness({ ...published, period: periodOf({}) }).next?.key,
    ).toBe("open");
    expect(
      workshopReadiness({
        ...published,
        period: periodOf({ materialsRequired: true, materialsCount: null }),
      }).next?.key,
    ).toBe("open");
  });

  it("is complete when the published workshop has an open month", () => {
    const result = workshopReadiness({
      ...published,
      period: periodOf({ status: "open" }),
    });
    expect(result.complete).toBe(true);
    expect(result.next).toBeNull();
    expect(result.summary).toBe("Inscripciones abiertas para octubre");
  });

  it("summarizes the blocker in plain language", () => {
    expect(workshopReadiness(base).summary).toBe(
      "Falta agregar un turno activo",
    );
    expect(workshopReadiness(published).summary).toBe("Falta abrir octubre");
  });

  it("does not report a closed month as accepting enrollments", () => {
    const result = workshopReadiness({
      ...published,
      period: periodOf({ status: "closed" }),
    });
    expect(result.complete).toBe(false);
    expect(result.next?.key).toBe("open");
  });
});
