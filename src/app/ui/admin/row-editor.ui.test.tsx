import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { RowEditor } from "./row-editor";

interface Variant {
  readonly id: string;
  readonly label: string;
}

const rows: readonly Variant[] = [
  { id: "a", label: "Rojo" },
  { id: "b", label: "Azul" },
  { id: "c", label: "Verde" },
];

function setup(props: { rows?: readonly Variant[]; max?: number } = {}) {
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  const onMove = vi.fn();
  const view = render(
    <RowEditor
      legend="Variantes"
      addLabel="Agregar variante"
      rows={props.rows ?? rows}
      rowKey={(row) => row.id}
      renderRow={(row) => <span>{row.label}</span>}
      onAdd={onAdd}
      onRemove={onRemove}
      onMove={onMove}
      {...(props.max === undefined ? {} : { max: props.max })}
    />,
  );
  return { ...view, onAdd, onRemove, onMove };
}

describe("RowEditor", () => {
  it("groups the rows under a legend and renders each one", async () => {
    const { container } = setup();
    const group = screen.getByRole("group", { name: "Variantes" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Azul")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("reports the index to remove and to move", async () => {
    const { onRemove, onMove } = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar fila 2" }),
    );
    expect(onRemove).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "Subir fila 2" }));
    expect(onMove).toHaveBeenCalledWith(1, -1);
    await userEvent.click(screen.getByRole("button", { name: "Bajar fila 2" }));
    expect(onMove).toHaveBeenCalledWith(1, 1);
  });

  it("cannot move the first row up or the last row down", () => {
    setup();
    expect(screen.getByRole("button", { name: "Subir fila 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar fila 3" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar fila 1" })).toBeEnabled();
  });

  it("adds a row until the maximum is reached", async () => {
    const { onAdd, rerender } = setup({ max: 4 });
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar variante" }),
    );
    expect(onAdd).toHaveBeenCalledTimes(1);
    rerender(
      <RowEditor
        legend="Variantes"
        addLabel="Agregar variante"
        rows={[...rows, { id: "d", label: "Gris" }]}
        rowKey={(row) => row.id}
        renderRow={(row) => <span>{row.label}</span>}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onMove={vi.fn()}
        max={4}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Agregar variante" }),
    ).toBeDisabled();
  });

  it("is axe clean with no rows", async () => {
    const { container } = setup({ rows: [] });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    await expectNoAxeViolations(container);
  });
});
