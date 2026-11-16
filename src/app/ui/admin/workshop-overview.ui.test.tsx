import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkshopOverview } from "./workshop-overview";

const base = {
  summary: "Inscripciones abiertas",
  open: true,
  next: null,
  months: [],
  turnosHref: "/admin/talleres/w1/turnos",
  monthsHref: "/admin/talleres/w1/meses",
};

describe("WorkshopOverview turnos", () => {
  it("shows a generated turno name once, not as its own schedule", () => {
    render(
      <WorkshopOverview
        {...base}
        turnos={[
          {
            id: "t1",
            label: "Martes 10:00 a 12:00",
            when: "Martes 10:00 a 12:00",
            capacity: 8,
          },
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      /^Martes 10:00 a 12:00 · Cupos 8$/,
    );
  });

  it("keeps an older typed name before its schedule", () => {
    render(
      <WorkshopOverview
        {...base}
        turnos={[
          {
            id: "t1",
            label: "Mañana",
            when: "Martes 10:00 a 12:00",
            capacity: 8,
          },
        ]}
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      /^Mañana: Martes 10:00 a 12:00 · Cupos 8$/,
    );
  });
});
