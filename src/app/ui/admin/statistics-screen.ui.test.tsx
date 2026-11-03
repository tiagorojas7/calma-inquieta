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
    { key: "collected", label: "Cobrado", value: "$ 96.000" },
    { key: "teachers", label: "A pagar a profesoras", value: "$ 12.000" },
    { key: "materials", label: "Costo de materiales", value: "$ 6.000" },
    {
      key: "profit",
      label: "Ganancia del estudio",
      value: "$ 78.000",
      highlight: true,
    },
    { key: "students", label: "Alumnas activas", value: "10" },
    {
      key: "occupancy",
      label: "Ocupación",
      value: "39 %",
      detail: "9 de 23 lugares",
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

    const table = screen.getByRole("table", { name: "Por taller e intensivo" });
    expect(table.closest(".hidden.lg\\:block")).not.toBeNull();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Taller o intensivo",
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

    const list = screen.getByRole("list", { name: "Por taller e intensivo" });
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
      screen.queryByRole("table", { name: "Por taller e intensivo" }),
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
