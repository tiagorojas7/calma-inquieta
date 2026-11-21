import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { StudentsList, type StudentsListProps } from "./students-list";

const props: StudentsListProps = {
  rows: [
    {
      email: "ana@example.com",
      name: "Ana Pérez",
      active: true,
      current: "Cerámica · noviembre 2026",
      owes: "$ 58.000",
    },
    {
      email: "bea@example.com",
      name: "Bea Gómez",
      active: true,
      current: null,
      owes: null,
    },
  ],
  filter: { q: "", taller: "", estado: "", mostrar: "activas", page: 1 },
  workshops: [{ id: "w1", name: "Cerámica" }],
  statuses: [{ value: "paid", label: "Cobrado" }],
  hasNext: true,
};

describe("StudentsList", () => {
  it("opens with one big search and one big primary button to enroll", () => {
    render(<StudentsList {...props} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Alumnas" }),
    ).toBeInTheDocument();
    const search = screen.getByRole("searchbox", { name: "Buscar alumna" });
    expect(search).toHaveAttribute("name", "q");
    expect(search).toHaveAccessibleDescription("Nombre, email o teléfono");
    expect(search.closest("form")).toHaveAttribute("method", "get");
    expect(
      screen.getByRole("link", { name: "Inscribir alumna" }),
    ).toHaveAttribute("href", "/admin/inscripciones/nueva");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows one simple card per student: name, where she is, whether she owes, and Ver ficha", () => {
    render(<StudentsList {...props} />);

    const cards = within(
      screen.getByRole("list", { name: "Alumnas" }),
    ).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const ana = within(cards[0] as HTMLElement);
    expect(ana.getByText("Ana Pérez")).toBeInTheDocument();
    expect(ana.getByText("Cerámica · noviembre 2026")).toBeInTheDocument();
    expect(ana.getByText("Debe $ 58.000")).toBeInTheDocument();
    expect(
      ana.getByRole("link", { name: "Ver ficha de Ana Pérez" }),
    ).toHaveAttribute("href", "/admin/alumnas/ana%40example.com");
    const bea = within(cards[1] as HTMLElement);
    expect(bea.getByText("Sin inscripción este mes")).toBeInTheDocument();
    expect(bea.getByText("Al día")).toBeInTheDocument();
  });

  it("uses the width of a desktop screen: the cards sit in a responsive grid", () => {
    render(<StudentsList {...props} />);

    const list = screen.getByRole("list", { name: "Alumnas" });
    expect(list.className).toMatch(/lg:grid-cols-2/);
    expect(list.closest("section")?.className).not.toMatch(/max-w-3xl/);
  });

  it("marks an inactive student in words", () => {
    render(
      <StudentsList
        {...props}
        rows={[
          {
            email: "ana@example.com",
            name: "Ana Pérez",
            active: false,
            current: null,
            owes: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Inactiva")).toBeInTheDocument();
  });

  it("keeps the filters behind Filtrar, closed until one is active", () => {
    const { rerender } = render(<StudentsList {...props} />);
    const summary = screen.getByText("Filtrar", { selector: "summary" });
    expect(summary.closest("details")).not.toHaveAttribute("open");

    rerender(
      <StudentsList
        key="filtered"
        {...props}
        filter={{ ...props.filter, taller: "w1", mostrar: "todas" }}
      />,
    );
    expect(
      screen.getByText("Filtrar", { selector: "summary" }).closest("details"),
    ).toHaveAttribute("open");
    expect(screen.getByLabelText("Taller")).toHaveValue("w1");
    expect(screen.getByLabelText("Mostrar")).toHaveValue("todas");
  });

  it("says so when there is nobody to show", () => {
    render(<StudentsList {...props} rows={[]} hasNext={false} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "No hay alumnas para mostrar.",
    );
  });

  it("pages with plain links that keep the search", () => {
    render(
      <StudentsList
        {...props}
        filter={{ ...props.filter, q: "ana", page: 2 }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Alumnas" });
    expect(
      within(nav).getByRole("link", { name: "Anteriores" }),
    ).toHaveAttribute("href", "/admin/alumnas?q=ana&page=1");
    expect(
      within(nav).getByRole("link", { name: "Siguientes" }),
    ).toHaveAttribute("href", "/admin/alumnas?q=ana&page=3");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<StudentsList {...props} />);

    await expectNoAxeViolations(container);
  });

  it("leads the student card with her debt in the warning tone", () => {
    render(<StudentsList {...props} />);

    const studentCard = screen
      .getByRole("heading", { name: "Ana Pérez" })
      .closest("li");
    const summary = studentCard?.querySelector("p.text-2xl");
    expect(summary).toHaveTextContent("Debe $ 58.000");
    expect(summary).toHaveClass(
      "font-bold",
      "tabular-nums",
      "text-admin-warning-fg",
    );
  });
});
