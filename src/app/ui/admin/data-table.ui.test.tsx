import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { DataTable } from "./data-table";

interface Teacher {
  readonly id: string;
  readonly name: string;
}

const columns = [
  { key: "name", header: "Nombre", cell: (row: Teacher) => row.name },
  { key: "id", header: "Código", cell: (row: Teacher) => row.id },
] as const;

const empty = {
  title: "Todavía no hay profesores",
  message: "Cargá el primero.",
  action: { href: "/admin/profesores/nuevo", label: "Nuevo profesor" },
};

function renderTable(rows: readonly Teacher[]) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <DataTable
          caption="Profesores"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={empty}
        />
      ),
    },
  ]);
  return render(<Stub />);
}

describe("DataTable", () => {
  it("renders a captioned table with column headers and one row per record", async () => {
    const { container } = renderTable([
      { id: "a1", name: "Ana" },
      { id: "b2", name: "Beto" },
    ]);
    const table = await screen.findByRole("table", { name: "Profesores" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Nombre", "Código"]);
    expect(within(table).getAllByRole("columnheader")[0]).toHaveAttribute(
      "scope",
      "col",
    );
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByRole("cell", { name: "Beto" })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("keeps the table inside a focusable, labelled scroll region", async () => {
    renderTable([{ id: "a1", name: "Ana" }]);
    const region = await screen.findByRole("region", { name: "Profesores" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(within(region).getByRole("table")).toBeInTheDocument();
  });

  it("shows the empty state instead of a table when there are no rows", async () => {
    const { container } = renderTable([]);
    expect(
      await screen.findByRole("link", { name: "Nuevo profesor" }),
    ).toHaveAttribute("href", "/admin/profesores/nuevo");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
