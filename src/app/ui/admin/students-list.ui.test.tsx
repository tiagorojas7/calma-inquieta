import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { StudentsList, type StudentsListProps } from "./students-list";

const props: StudentsListProps = {
  rows: [
    {
      email: "ana@example.com",
      name: "Ana Pérez",
      phone: "5493515550000",
      workshops: "Cerámica, Acuarela",
      orders: 2,
      lastRequest: "31/10/2026",
    },
  ],
  filter: { q: "", taller: "", estado: "", page: 1 },
  workshops: [{ id: "w1", name: "Cerámica" }],
  statuses: [{ value: "paid", label: "Cobrado" }],
  hasNext: true,
};

describe("StudentsList", () => {
  it("shows breadcrumbs and a result count", () => {
    render(<StudentsList {...props} />);

    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(crumbs).getByRole("link", { name: "Panel" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByText("1 alumna")).toBeVisible();
  });

  it("keeps the filters closed until one is active", () => {
    const { rerender } = render(<StudentsList {...props} />);
    const summary = screen.getByText("Buscar y filtrar");
    expect(summary.closest("details")).not.toHaveAttribute("open");

    rerender(
      <StudentsList
        {...props}
        filter={{ q: "ana", taller: "", estado: "", page: 1 }}
      />,
    );
    expect(
      screen.getByText("Buscar y filtrar").closest("details"),
    ).toHaveAttribute("open");
  });

  it("lists one row per student with a plain link to her page", async () => {
    const { container } = render(<StudentsList {...props} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Alumnas" }),
    ).toBeVisible();
    const row = within(screen.getByRole("list", { name: "Alumnas" })).getByRole(
      "listitem",
    );
    expect(
      within(row).getByRole("link", { name: "Ana Pérez" }),
    ).toHaveAttribute("href", "/admin/alumnas/ana%40example.com");
    for (const cell of [
      "ana@example.com",
      "5493515550000",
      "Cerámica, Acuarela",
      "2",
      "31/10/2026",
    ])
      expect(within(row).getByText(cell)).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("also lists the students as a table from lg, hidden below it", () => {
    render(<StudentsList {...props} />);

    const list = screen.getByRole("list", { name: "Alumnas" });
    const table = screen.getByRole("table", { name: "Alumnas" });
    expect(list.closest(".lg\\:hidden")).not.toBeNull();
    expect(table.closest(".hidden.lg\\:block")).not.toBeNull();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Alumna",
      "Email",
      "Teléfono",
      "Talleres",
      "Pedidos",
      "Última solicitud",
    ]);
    const row = within(table).getAllByRole("row")[1] as HTMLElement;
    expect(
      within(row).getByRole("link", { name: "Ana Pérez" }),
    ).toHaveAttribute("href", "/admin/alumnas/ana%40example.com");
    for (const cell of [
      "ana@example.com",
      "5493515550000",
      "Cerámica, Acuarela",
      "2",
      "31/10/2026",
    ])
      expect(within(row).getByText(cell)).toBeInTheDocument();
  });

  it("offers a GET search form with the activity filters and keeps the values", () => {
    render(
      <StudentsList
        {...props}
        filter={{ q: "ana", taller: "w1", estado: "paid", page: 1 }}
      />,
    );

    const form = screen.getByRole("search", { name: "Filtrar alumnas" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/alumnas");
    expect(within(form).getByLabelText("Buscar")).toHaveValue("ana");
    expect(within(form).getByLabelText("Taller")).toHaveValue("w1");
    expect(within(form).getByLabelText("Estado de la inscripción")).toHaveValue(
      "paid",
    );
  });

  it("links the next and previous pages keeping the filter", () => {
    render(
      <StudentsList
        {...props}
        filter={{ q: "ana", taller: "", estado: "", page: 2 }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Paginación" });
    expect(
      within(nav).getByRole("link", { name: "Siguiente" }),
    ).toHaveAttribute("href", "/admin/alumnas?q=ana&page=3");
    expect(within(nav).getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/admin/alumnas?q=ana&page=1",
    );
  });

  it("shows the empty state when nothing matches", () => {
    render(<StudentsList {...props} rows={[]} hasNext={false} />);

    expect(screen.getByText("No hay alumnas para este filtro")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver todas" })).toHaveAttribute(
      "href",
      "/admin/alumnas",
    );
  });
});
