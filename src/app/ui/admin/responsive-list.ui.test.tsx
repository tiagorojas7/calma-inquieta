import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResponsiveList } from "./responsive-list";

interface Row {
  readonly id: string;
  readonly name: string;
}

const columns = [
  {
    key: "name",
    header: "Nombre",
    cell: (row: Row) => <a href={`/x/${row.id}`}>{row.name}</a>,
  },
  { key: "id", header: "Código", cell: (row: Row) => row.id },
] as const;

const empty = {
  title: "Todavía no hay filas",
  message: "Cargá la primera.",
  action: { href: "/x/nuevo", label: "Nueva fila" },
};

function renderList(rows: readonly Row[]) {
  return render(
    <ResponsiveList
      label="Filas"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      card={(row) => <p>{row.name}</p>}
      empty={empty}
    />,
  );
}

describe("ResponsiveList", () => {
  it("renders cards below lg and a table from lg, each visible only at its breakpoint", () => {
    renderList([{ id: "a1", name: "Ana" }]);

    const list = screen.getByRole("list", { name: "Filas" });
    const table = screen.getByRole("table", { name: "Filas" });
    expect(list.closest(".lg\\:hidden")).not.toBeNull();
    expect(list.closest(".hidden")).toBeNull();
    const tableWrapper = table.closest(".hidden.lg\\:block");
    expect(tableWrapper).not.toBeNull();
    expect(tableWrapper?.classList.contains("lg:hidden")).toBe(false);
  });

  it("gives the table column headers with scope and a link in the first column", () => {
    renderList([{ id: "a1", name: "Ana" }]);

    const table = screen.getByRole("table", { name: "Filas" });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Nombre",
      "Código",
    ]);
    for (const header of headers)
      expect(header).toHaveAttribute("scope", "col");
    const firstRow = within(table).getAllByRole("row")[1];
    expect(
      within(firstRow as HTMLElement)
        .getAllByRole("cell")[0]
        ?.querySelector("a"),
    ).toHaveAttribute("href", "/x/a1");
    expect(
      within(screen.getByRole("list", { name: "Filas" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);
  });

  it("shows the empty state once, with no list or table", () => {
    renderList([]);

    expect(screen.getAllByText("Todavía no hay filas")).toHaveLength(1);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
