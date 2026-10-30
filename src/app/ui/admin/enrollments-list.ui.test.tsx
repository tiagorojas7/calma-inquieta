import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentsList, type EnrollmentsListProps } from "./enrollments-list";

const props: EnrollmentsListProps = {
  rows: [
    {
      id: "o1",
      number: "CI-2026-0007",
      studentName: "Ana Pérez",
      workshopName: "Cerámica",
      month: "noviembre 2026",
      turno: "Lunes",
      status: "pending_confirmation",
      statusLabel: "Pendiente de confirmación",
      total: "$ 58.000",
      requestedOn: "31/10/2026",
    },
  ],
  filter: {
    estado: "pending_confirmation",
    mes: "",
    taller: "",
    q: "",
    page: 1,
  },
  workshops: [{ id: "w1", name: "Cerámica" }],
  hasNext: true,
};

describe("EnrollmentsList", () => {
  it("lists each order as a card with a link to its detail", async () => {
    const { container } = render(<EnrollmentsList {...props} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Inscripciones" }),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "Migas de pan" }),
      ).getByRole("link", { name: "Panel" }),
    ).toHaveAttribute("href", "/admin");
    const card = within(
      screen.getByRole("list", { name: "Inscripciones" }),
    ).getByRole("listitem");
    for (const text of [
      "CI-2026-0007",
      "Ana Pérez",
      "Cerámica · noviembre 2026 · Lunes",
      "$ 58.000",
      "Solicitado el 31/10/2026",
      "Pendiente de confirmación",
    ])
      expect(within(card).getByText(text)).toBeVisible();
    expect(
      within(card).getByRole("link", {
        name: "Ver detalle del pedido CI-2026-0007",
      }),
    ).toHaveAttribute("href", "/admin/inscripciones/o1");
    await expectNoAxeViolations(container);
  });

  it("also lists the orders as a table from lg, hidden below it", () => {
    render(<EnrollmentsList {...props} />);

    const list = screen.getByRole("list", { name: "Inscripciones" });
    const table = screen.getByRole("table", { name: "Inscripciones" });
    expect(list.closest(".lg\\:hidden")).not.toBeNull();
    expect(table.closest(".hidden.lg\\:block")).not.toBeNull();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Pedido",
      "Alumno",
      "Taller",
      "Mes",
      "Turno",
      "Estado",
      "Total",
      "Solicitado",
    ]);
    const row = within(table).getAllByRole("row")[1] as HTMLElement;
    expect(
      within(row).getByRole("link", { name: "CI-2026-0007" }),
    ).toHaveAttribute("href", "/admin/inscripciones/o1");
    for (const text of [
      "Ana Pérez",
      "Cerámica",
      "noviembre 2026",
      "Lunes",
      "Pendiente de confirmación",
      "$ 58.000",
      "31/10/2026",
    ])
      expect(within(row).getByText(text)).toBeInTheDocument();
  });

  it("keeps the filters behind a toggle and shows the active ones as chips", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, mes: "2026-11", taller: "w1", q: "ana" }}
      />,
    );

    const chips = screen.getByRole("list", { name: "Filtros activos" });
    expect(
      within(chips)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Estado: Pendiente de confirmación",
      "Mes: 2026-11",
      "Taller: Cerámica",
      "Búsqueda: ana",
    ]);
    expect(
      screen.getByRole("link", { name: "Quitar filtros" }),
    ).toHaveAttribute("href", "/admin/inscripciones");
    const toggle = screen.getByText("Filtros");
    expect(toggle.tagName).toBe("SUMMARY");
    expect(toggle.closest("details")).toContainElement(
      screen.getByRole("search", { hidden: true }),
    );
  });

  it("explains what each status needs next and counts the results", () => {
    render(<EnrollmentsList {...props} />);

    expect(screen.getByText("1 inscripción en esta página")).toBeVisible();
    const guide = screen
      .getByText("Qué hacer en cada estado")
      .closest("details") as HTMLElement;
    expect(
      within(guide).getByText(/Pendiente de confirmación:.*confirmá el cobro/),
    ).toBeInTheDocument();
  });

  it("offers a GET filter form that keeps the current values", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, q: "ana@", mes: "2026-11", taller: "w1" }}
      />,
    );

    const form = screen.getByRole("search", { hidden: true });
    expect(form).toHaveAttribute("method", "get");
    expect(within(form).getByLabelText("Buscar")).toHaveValue("ana@");
    expect(within(form).getByLabelText("Mes")).toHaveValue("2026-11");
    expect(within(form).getByLabelText("Taller")).toHaveValue("w1");
    expect(within(form).getByLabelText("Estado")).toHaveValue(
      "pending_confirmation",
    );
  });

  it("paginates with plain links that keep the filters", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, page: 2, q: "ana" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/admin/inscripciones?estado=pending_confirmation&q=ana&page=1",
    );
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute(
      "href",
      "/admin/inscripciones?estado=pending_confirmation&q=ana&page=3",
    );
  });

  it("shows an empty state when nothing matches", () => {
    render(<EnrollmentsList {...props} rows={[]} hasNext={false} />);

    expect(
      screen.getByText("No hay inscripciones para este filtro"),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
