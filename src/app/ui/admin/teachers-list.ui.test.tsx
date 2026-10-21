import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { TeachersList } from "./teachers-list";

const rows = [
  { id: "t1", name: "Ana Gómez", modality: "own", active: true },
  { id: "t2", name: "Beto Ruiz", modality: "third_party", active: false },
] as const;

function renderList(props: Partial<Parameters<typeof TeachersList>[0]> = {}) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <TeachersList rows={rows} filter="todos" {...props} />,
    },
  ]);
  return render(<Stub />);
}

describe("TeachersList", () => {
  it("lists name, modality and state with a link to each edit page", async () => {
    const { container } = renderList();
    const table = await screen.findByRole("table", { name: "Profesores" });
    const ana = within(table).getByRole("link", { name: "Ana Gómez" });
    expect(ana).toHaveAttribute("href", "/admin/profesores/t1");
    expect(within(table).getByText("Propia")).toBeVisible();
    expect(within(table).getByText("De terceros")).toBeVisible();
    expect(within(table).getByText("Activo")).toBeVisible();
    expect(within(table).getByText("Archivado")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("offers the new-teacher link and the three filters as plain links", async () => {
    renderList();
    expect(
      await screen.findByRole("link", { name: "Nuevo profesor" }),
    ).toHaveAttribute("href", "/admin/profesores/nuevo");
    const filters = screen.getByRole("navigation", {
      name: "Mostrar profesores",
    });
    const links = within(filters).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/profesores?estado=activos",
      "/admin/profesores?estado=archivados",
      "/admin/profesores?estado=todos",
    ]);
    expect(
      within(filters).getByRole("link", { name: "Todos" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows the empty state with a link to create the first teacher", async () => {
    renderList({ rows: [], filter: "activos" });
    expect(
      await screen.findByRole("heading", {
        name: "Todavía no hay profesores",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getAllByRole("link", { name: "Nuevo profesor" }).at(-1),
    ).toHaveAttribute("href", "/admin/profesores/nuevo");
  });
});
