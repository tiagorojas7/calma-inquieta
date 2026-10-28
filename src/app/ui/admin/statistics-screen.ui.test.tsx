import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  StatisticsScreen,
  type StatisticsScreenProps,
} from "./statistics-screen";

const props: StatisticsScreenProps = {
  period: "2026-10",
  periodLabel: "octubre 2026",
  occupancy: [
    {
      key: "a",
      cells: ["Cerámica", "Martes", "6", "3", "3", "50 %"],
    },
    { key: "total", cells: ["Total", "", "6", "3", "3", "50 %"], total: true },
  ],
  conversion: [{ key: "a", cells: ["Cerámica", "8", "2", "2", "4", "25 %"] }],
  income: [],
  students: ["8", "2", "25 %"],
  materials: [
    {
      key: "m",
      cells: ["Cobrado", "Cerámica", "Taza", "Arcilla SA", "1", "2", "$ 4.000"],
    },
  ],
};

describe("StatisticsScreen", () => {
  it("shows one labelled table per indicator, the totals row and the month", async () => {
    const { container } = render(<StatisticsScreen {...props} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Estadísticas" }),
    ).toBeVisible();
    expect(screen.getByText("Datos de octubre 2026.")).toBeVisible();
    const occupancy = screen.getByRole("table", { name: "Ocupación" });
    expect(
      within(occupancy)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual([
      "Taller",
      "Turno",
      "Cupos",
      "Inscriptas",
      "Libres",
      "Ocupación",
    ]);
    expect(
      within(occupancy).getByRole("row", { name: /Total/ }),
    ).toHaveTextContent("50 %");
    expect(screen.getByRole("table", { name: "Conversión" })).toBeVisible();
    expect(screen.getByRole("table", { name: "Alumnas" })).toBeVisible();
    expect(screen.getByRole("table", { name: "Materiales" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("explains an indicator with no rows instead of drawing an empty table", () => {
    render(<StatisticsScreen {...props} />);

    expect(
      screen.queryByRole("table", { name: "Ingresos registrados" }),
    ).toBeNull();
    expect(
      screen.getAllByText("Todavía no hay datos para este mes").length,
    ).toBeGreaterThan(0);
  });

  it("filters the month with a GET form and links back with plain anchors", () => {
    render(<StatisticsScreen {...props} />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/estadisticas");
    expect(screen.getByLabelText("Mes")).toHaveValue("2026-10");
    expect(
      screen.getByRole("link", { name: "Volver al panel" }),
    ).toHaveAttribute("href", "/admin");
  });
});
