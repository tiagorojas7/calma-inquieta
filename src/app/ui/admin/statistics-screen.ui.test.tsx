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
  previousHref: "/admin/estadisticas?mes=2026-09",
  nextHref: "/admin/estadisticas?mes=2026-11",
  downloadHref: "/admin/estadisticas/planilla?mes=2026-10",
  figures: [
    { key: "collected", label: "Cobrado", value: "$ 96.000", tone: "income" },
    {
      key: "teachers",
      label: "A pagar a profesoras",
      value: "$ 12.000",
      tone: "expense",
    },
    {
      key: "materials",
      label: "Costo de materiales",
      value: "$ 6.000",
      tone: "expense",
    },
    {
      key: "profit",
      label: "Ganancia del estudio",
      value: "$ 78.000",
      highlight: true,
      tone: "income",
    },
    { key: "students", label: "Alumnas activas", value: "10", tone: "people" },
    {
      key: "occupancy",
      label: "Ocupación",
      value: "39 %",
      detail: "9 de 23 lugares",
      tone: "people",
    },
  ],
  activities: [
    {
      key: "a",
      cells: [
        "Cerámica",
        "4",
        "10",
        "$ 46.000",
        "Ana Gómez · de terceros",
        "$ 12.000",
        "$ 6.000",
        "$ 28.000",
      ],
    },
    {
      key: "total",
      cells: [
        "Total",
        "4",
        "10",
        "$ 46.000",
        "",
        "$ 12.000",
        "$ 6.000",
        "$ 28.000",
      ],
      total: true,
    },
  ],
  teachers: [
    {
      key: "t1",
      cells: ["Ana Gómez", "de terceros", "Cerámica", "$ 12.000"],
    },
    { key: "t2", cells: ["Lola Paz", "propia", "Acuarela", "—"] },
  ],
  materials: [
    { key: "s1", cells: ["Arcilla SA", "3", "4", "$ 6.000", "$ 6.000"] },
  ],
  materialsNote: "Materiales: se cobran al costo, no suman ganancia.",
  students: [
    { key: "new", cells: ["Nuevas", "6"] },
    { key: "returning", cells: ["Que ya venían de otro mes", "4"] },
  ],
  materialsRecord: [
    {
      key: "o1-0",
      cells: [
        "Ana Pérez",
        "Cerámica · Lunes 18:00",
        "Arcilla Grande",
        "2",
        "Papelería Sur",
        "$ 25.000",
        "Por pedir",
      ],
    },
    {
      key: "total",
      cells: ["Total", "", "", "2", "", "$ 25.000", ""],
      total: true,
    },
  ],
  materialsRecordHref: "/admin/estadisticas/materiales?mes=2026-10",
};

describe("StatisticsScreen", () => {
  it("shows the month, the six figures and the profit highlighted", async () => {
    const { container } = render(<StatisticsScreen {...props} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Estadísticas" }),
    ).toBeVisible();
    const figures = within(
      screen.getByRole("list", { name: "octubre 2026" }),
    ).getAllByRole("listitem");
    expect(figures.map((item) => item.textContent)).toEqual([
      "Cobrado$ 96.000",
      "A pagar a profesoras$ 12.000",
      "Costo de materiales$ 6.000",
      "Ganancia del estudio$ 78.000",
      "Alumnas activas10",
      "Ocupación39 %9 de 23 lugares",
    ]);
    await expectNoAxeViolations(container);
  });

  it("colours each figure by what it means", () => {
    render(
      <StatisticsScreen
        {...props}
        figures={[
          { key: "in", label: "Entra", value: "$ 1", tone: "income" },
          { key: "out", label: "Sale", value: "$ 2", tone: "expense" },
          { key: "who", label: "Personas", value: "37", tone: "people" },
        ]}
      />,
    );

    expect(screen.getByText("$ 1")).toHaveClass("text-status-green-fg");
    expect(screen.getByText("$ 2")).toHaveClass("text-status-orange-fg");
    expect(screen.getByText("37")).toHaveClass("text-status-blue-fg");
  });

  it("fills the profit figure with the colour of its result", () => {
    const profit = {
      key: "profit",
      label: "Ganancia del estudio",
      highlight: true,
    };
    const { rerender } = render(
      <StatisticsScreen
        {...props}
        figures={[{ ...profit, value: "$ 9", tone: "income" }]}
      />,
    );
    expect(screen.getByText("$ 9").closest("li")).toHaveClass(
      "bg-status-green-bg",
    );

    rerender(
      <StatisticsScreen
        {...props}
        figures={[{ ...profit, value: "$ -9", tone: "expense" }]}
      />,
    );
    expect(screen.getByText("$ -9").closest("li")).toHaveClass(
      "bg-status-orange-bg",
    );
  });

  it("reads the four money figures as one row and the people as another", () => {
    render(<StatisticsScreen {...props} />);

    const list = screen.getByRole("list", { name: "octubre 2026" });
    expect(list).toHaveClass("lg:grid-cols-4");
    expect(within(list).getByText("Alumnas activas").closest("li")).toHaveClass(
      "lg:col-span-2",
    );
    expect(within(list).getByText("Ocupación").closest("li")).toHaveClass(
      "lg:col-span-2",
    );
    expect(within(list).getByText("Cobrado").closest("li")).not.toHaveClass(
      "lg:col-span-2",
    );
  });

  it("gives the sections real titles, above the size of the table text", () => {
    render(<StatisticsScreen {...props} />);

    for (const name of ["Por taller y workshop", "Registro de materiales"]) {
      expect(screen.getByRole("heading", { level: 2, name })).not.toHaveClass(
        "text-h3",
      );
    }
  });

  it("tells money in from money out in the main table", () => {
    render(<StatisticsScreen {...props} />);

    const table = screen.getByRole("table", { name: "Por taller y workshop" });
    const cells = within(within(table).getAllByRole("row")[1] as HTMLElement)
      .getAllByRole("cell")
      .map((cell) => cell.firstElementChild);

    expect(cells[0]).toHaveClass("font-semibold", "text-ink-900");
    expect(cells[3]).toHaveClass("text-status-green-fg");
    expect(cells[5]).toHaveClass("text-status-orange-fg");
    expect(cells[6]).toHaveClass("text-status-orange-fg");
    expect(cells[7]).toHaveClass("text-status-green-fg", "font-semibold");
  });

  it("marks a loss in the money-in columns as money out", () => {
    render(
      <StatisticsScreen
        {...props}
        activities={[
          {
            key: "a",
            cells: ["Cerámica", "1", "2", "$ 5", "", "$ 7", "$ 0", "$ -2"],
          },
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Por taller y workshop" });
    expect(within(table).getByText("$ -2")).toHaveClass(
      "text-status-orange-fg",
    );
  });

  it("does not colour a cell with nothing to settle", () => {
    render(
      <StatisticsScreen
        {...props}
        activities={[
          {
            key: "a",
            cells: ["Cerámica", "1", "2", "$ 5", "", "—", "$ 0", "$ 5"],
          },
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Por taller y workshop" });
    expect(within(table).getByText("—")).not.toHaveClass(
      "text-status-orange-fg",
    );
  });

  it("sets the totals row apart from the rows above it", () => {
    render(<StatisticsScreen {...props} />);

    const table = screen.getByRole("table", { name: "Por taller y workshop" });
    const rows = within(table).getAllByRole("row");

    expect(rows[2]).toHaveClass("bg-sand-100");
    expect(rows[1]).not.toHaveClass("bg-sand-100");
  });

  it("carries the same colours to the cards below lg", () => {
    render(<StatisticsScreen {...props} />);

    const list = screen.getByRole("list", { name: "Por taller y workshop" });
    const [card] = within(list).getAllByRole("listitem");

    expect(within(card as HTMLElement).getByText("$ 46.000")).toHaveClass(
      "text-status-green-fg",
    );
  });

  it("keeps each subtitle against its title", () => {
    render(<StatisticsScreen {...props} />);

    const title = screen.getByRole("heading", {
      level: 2,
      name: "Por taller y workshop",
    });

    expect(title.parentElement).toHaveTextContent(
      "Cada taller y workshop con movimiento en el mes.",
    );
    expect(title.parentElement).toHaveClass("gap-1");
  });

  it("does not set a closed table above the open sections", () => {
    const { container } = render(<StatisticsScreen {...props} />);

    for (const summary of container.querySelectorAll("summary")) {
      expect(summary).toHaveClass("text-2xl");
      expect(summary).not.toHaveClass("text-h3");
    }
  });

  it("shows that the closed tables open", () => {
    const { container } = render(<StatisticsScreen {...props} />);

    for (const summary of container.querySelectorAll("summary")) {
      expect(summary.querySelector("svg")).toHaveClass("group-open:rotate-90");
    }
  });

  it("moves between months with plain links and keeps the month form", () => {
    render(<StatisticsScreen {...props} />);

    expect(screen.getByRole("link", { name: /Mes anterior/ })).toHaveAttribute(
      "href",
      "/admin/estadisticas?mes=2026-09",
    );
    expect(screen.getByRole("link", { name: /Mes siguiente/ })).toHaveAttribute(
      "href",
      "/admin/estadisticas?mes=2026-11",
    );
    expect(screen.getByLabelText("Mes")).toHaveValue("2026-10");
    expect(
      screen
        .getByRole("button", { name: "Ver mes" })
        .closest("[data-title-sheet]"),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Ver mes" })).toBeVisible();
  });

  it("offers the spreadsheet as a plain download link", () => {
    render(<StatisticsScreen {...props} />);

    expect(
      screen.getByRole("link", { name: "Descargar planilla" }),
    ).toHaveAttribute("href", "/admin/estadisticas/planilla?mes=2026-10");
  });

  it("shows the main table from lg with the spreadsheet columns and a bold totals row", () => {
    render(<StatisticsScreen {...props} />);

    const table = screen.getByRole("table", { name: "Por taller y workshop" });
    expect(table.closest(".hidden.lg\\:block")).not.toBeNull();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Taller o workshop",
      "Inscriptas",
      "Lugares",
      "Cobrado",
      "Profesora",
      "A pagar a la profesora",
      "Materiales",
      "Ganancia",
    ]);
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Ana Gómez · de terceros");
    expect(rows[2]).toHaveTextContent("Total");
    expect(rows[2]?.querySelectorAll("strong").length).toBeGreaterThan(0);
  });

  it("shows the same rows as cards below lg", () => {
    render(<StatisticsScreen {...props} />);

    const list = screen.getByRole("list", { name: "Por taller y workshop" });
    expect(list.closest(".lg\\:hidden")).not.toBeNull();
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Cerámica");
    expect(cards[0]).toHaveTextContent("$ 28.000");
  });

  it("keeps the secondary tables closed until opened", () => {
    const { container } = render(<StatisticsScreen {...props} />);

    const sections = container.querySelectorAll("details");
    expect(
      [...sections].map((item) => item.querySelector("summary")?.textContent),
    ).toEqual(["Profesoras", "Materiales", "Alumnas"]);
    for (const section of sections) expect(section).not.toHaveAttribute("open");
  });

  it("shows an own teacher as not settled and says materials are charged at cost", () => {
    render(<StatisticsScreen {...props} />);

    const table = screen.getByRole("table", { name: "Profesoras" });
    expect(within(table).getAllByRole("row")[2]).toHaveTextContent("—");
    expect(
      screen.getByText("Materiales: se cobran al costo, no suman ganancia."),
    ).toBeTruthy();
  });

  it("explains a month without activity instead of drawing an empty table", () => {
    render(<StatisticsScreen {...props} activities={[]} teachers={[]} />);

    expect(
      screen.queryByRole("table", { name: "Por taller y workshop" }),
    ).toBeNull();
    expect(
      screen.getAllByText("Todavía no hay datos para este mes").length,
    ).toBeGreaterThan(0);
  });

  it("keeps a visible record of every material ordered, with its download", () => {
    render(<StatisticsScreen {...props} />);

    const record = screen
      .getByRole("heading", { name: "Registro de materiales" })
      .closest("section") as HTMLElement;
    const table = within(record).getByRole("table", {
      name: "Registro de materiales",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual([
      "Alumna",
      "Taller y turno",
      "Material",
      "Cantidad",
      "Proveedor",
      "Monto",
      "Estado",
    ]);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Ana Pérez");
    expect(record.closest("details")).toBeNull();
    expect(
      within(record).getByRole("link", { name: "Descargar registro" }),
    ).toHaveAttribute("href", "/admin/estadisticas/materiales?mes=2026-10");
  });

  it("says so when no material was ordered in the month", () => {
    render(<StatisticsScreen {...props} materialsRecord={[]} />);

    const record = screen
      .getByRole("heading", { name: "Registro de materiales" })
      .closest("section") as HTMLElement;
    expect(record).toHaveTextContent("No hay materiales pedidos este mes.");
    expect(within(record).queryByRole("table")).toBeNull();
    expect(within(record).queryByRole("link")).toBeNull();
  });
});
