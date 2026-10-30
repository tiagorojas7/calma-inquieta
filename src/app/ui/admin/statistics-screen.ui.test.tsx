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
  teachers: [
    {
      key: "t1",
      cells: ["Ana Gómez", "De terceros", "30 %", "2", "$ 30.000", "$ 9.000"],
    },
  ],
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
    const occupancy = screen.getByRole("list", { name: "Ocupación" });
    const cards = within(occupancy).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const first = within(cards[0] as HTMLElement);
    expect(first.getByText("Cerámica")).toBeVisible();
    expect(
      ["Turno", "Cupos", "Inscriptas", "Libres", "Ocupación"].map(
        (label) => first.getByText(label).textContent,
      ),
    ).toEqual(["Turno", "Cupos", "Inscriptas", "Libres", "Ocupación"]);
    expect(cards[1]).toHaveTextContent("Total");
    expect(cards[1]).toHaveTextContent("50 %");
    expect(screen.getByRole("list", { name: "Conversión" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Alumnas" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Materiales" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("also shows each report as a table from lg, hidden below it", () => {
    render(<StatisticsScreen {...props} />);

    for (const name of [
      "Ocupación",
      "Conversión",
      "Alumnas",
      "Profesores",
      "Materiales",
    ]) {
      expect(
        screen.getByRole("list", { name }).closest(".lg\\:hidden"),
      ).not.toBeNull();
      expect(
        screen.getByRole("table", { name }).closest(".hidden.lg\\:block"),
      ).not.toBeNull();
    }
    const occupancy = screen.getByRole("table", { name: "Ocupación" });
    expect(
      within(occupancy)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Taller",
      "Turno",
      "Cupos",
      "Inscriptas",
      "Libres",
      "Ocupación",
    ]);
    for (const header of within(occupancy).getAllByRole("columnheader"))
      expect(header).toHaveAttribute("scope", "col");
    const rows = within(occupancy).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Cerámica");
    expect(rows[2]).toHaveTextContent("Total");
    expect(
      within(screen.getByRole("table", { name: "Profesores" }))
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toContain("Importe estimado a liquidar");
    expect(
      within(screen.getByRole("table", { name: "Alumnas" })).getAllByRole(
        "cell",
      ),
    ).toHaveLength(3);
  });

  it("shows the teachers table with the settlement column and the note about own teachers", () => {
    render(<StatisticsScreen {...props} />);

    const list = screen.getByRole("list", { name: "Profesores" });
    const card = within(list).getByRole("listitem");
    expect(card).toHaveTextContent("Ana Gómez");
    expect(within(card).getByText("Importe estimado a liquidar")).toBeVisible();
    expect(card).toHaveTextContent("$ 9.000");
    expect(
      screen.getByText(/modalidad propia no tienen porcentaje/),
    ).toBeVisible();
  });

  it("explains an indicator with no rows instead of drawing an empty table", () => {
    render(<StatisticsScreen {...props} />);

    expect(
      screen.queryByRole("list", { name: "Ingresos registrados" }),
    ).toBeNull();
    expect(
      screen.getAllByText("Todavía no hay datos para este mes").length,
    ).toBeGreaterThan(0);
  });

  it("shows breadcrumbs back to the panel", () => {
    render(<StatisticsScreen {...props} />);

    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(crumbs).getByRole("link", { name: "Panel" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("uses the shared page header without changing its query form", () => {
    render(<StatisticsScreen {...props} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "Volver al panel" }),
    ).toHaveAttribute("href", "/admin");
    expect(screen.getByText("Datos de octubre 2026.")).toBeVisible();
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
