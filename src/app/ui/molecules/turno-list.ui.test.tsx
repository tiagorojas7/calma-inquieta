import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { TurnoList } from "./turno-list";

describe("TurnoList", () => {
  it("renders weekday, time range and duration for each turno", async () => {
    const { container } = render(
      <TurnoList
        items={[
          {
            key: "a",
            weekday: "Lunes",
            timeRange: "10:00 a 12:00 h",
            duration: "2 horas",
          },
          { key: "b", weekday: "Jueves", timeRange: "18:00 a 19:30 h" },
        ]}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByText("Lunes")).toBeVisible();
    expect(first.getByText("10:00 a 12:00 h")).toBeVisible();
    expect(first.getByText("2 horas")).toBeVisible();
    const second = within(rows[1] as HTMLElement);
    expect(second.getByText("Jueves")).toBeVisible();
    expect(second.queryByText("2 horas")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("renders the seats indicator without digits next to lugares", async () => {
    const { container } = render(
      <TurnoList
        items={[
          {
            key: "a",
            weekday: "Martes",
            timeRange: "09:00 a 11:00 h",
            seats: "Cupo limitado",
          },
        ]}
      />,
    );
    expect(screen.getByText("Cupo limitado")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\d+\s*lugares/u);
    await expectNoAxeViolations(container);
  });

  it("renders the optional inquiry link", async () => {
    const { container } = render(
      <TurnoList
        items={[
          {
            key: "a",
            weekday: "Martes",
            timeRange: "09:00 a 11:00 h",
            inquiry: { href: "https://wa.me/549351", label: "Consultar" },
          },
          { key: "b", weekday: "Viernes", timeRange: "09:00 a 11:00 h" },
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Consultar/u })).toHaveAttribute(
      "href",
      "https://wa.me/549351",
    );
    await expectNoAxeViolations(container);
  });
});
