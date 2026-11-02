import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  PeriodMaterialsPicker,
  type PeriodMaterialOption,
} from "./workshop-period-materials";

const option = (
  id: string,
  name: string,
  category: string,
): PeriodMaterialOption => ({
  id,
  name,
  category,
  active: true,
  available: true,
  historical: false,
});
const OPTIONS = [
  option("m1", "Canasto rectangular", "Canastos"),
  option("m2", "Canasto redondo", "Canastos"),
  option("m3", "Acrílico", "Pinturas"),
  { ...option("m4", "Viejo", ""), historical: true },
];

function renderPicker(selectedIds: readonly string[] = []) {
  return render(
    <form>
      <PeriodMaterialsPicker options={OPTIONS} selectedIds={selectedIds} />
    </form>,
  );
}

const checked = (container: HTMLElement) =>
  [
    ...container.querySelectorAll<HTMLInputElement>(
      'input[name="materialIds"]:checked',
    ),
  ].map((input) => input.value);

describe("PeriodMaterialsPicker", () => {
  it("groups materials by category and keeps unknown categories last", () => {
    renderPicker();
    const groups = screen
      .getAllByRole("group")
      .filter((group) => group.hasAttribute("aria-label"));
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
      "Categoría Canastos",
      "Categoría Pinturas",
      "Categoría Otros materiales",
    ]);
    expect(
      within(groups[0] as HTMLElement).getAllByRole("checkbox"),
    ).toHaveLength(2);
  });

  it("selects every material of one category and then clears it", () => {
    const { container } = renderPicker(["m3"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Elegir todos: Canastos" }),
    );
    expect(checked(container)).toEqual(["m1", "m2", "m3"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar todos: Canastos" }),
    );
    expect(checked(container)).toEqual(["m3"]);
  });

  it("selects and clears every material with the global button, respecting the search", () => {
    const { container } = renderPicker(["m4"]);
    fireEvent.click(screen.getByRole("button", { name: "Elegir todos" }));
    expect(checked(container)).toEqual(["m1", "m2", "m3", "m4"]);
    fireEvent.click(screen.getByRole("button", { name: "Quitar todos" }));
    expect(checked(container)).toEqual([]);

    fireEvent.change(screen.getByLabelText("Buscar material"), {
      target: { value: "canasto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Elegir todos" }));
    expect(checked(container)).toEqual(["m1", "m2"]);
  });

  it("filters by name without accents and leaves hidden choices in the form", () => {
    const { container } = renderPicker(["m3"]);
    fireEvent.change(screen.getByLabelText("Buscar material"), {
      target: { value: "acrilico" },
    });
    expect(screen.getByLabelText("Acrílico")).toBeVisible();
    expect(screen.getByLabelText("Canasto redondo")).not.toBeVisible();
    expect(checked(container)).toEqual(["m3"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar todos: Pinturas" }),
    );
    expect(checked(container)).toEqual([]);
  });

  it("selects only the matching rows of a filtered category", () => {
    const { container } = renderPicker();
    fireEvent.change(screen.getByLabelText("Buscar material"), {
      target: { value: "redondo" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Elegir todos: Canastos" }),
    );
    expect(checked(container)).toEqual(["m2"]);
  });

  it("says so when nothing matches and has no accessibility violations", async () => {
    const { container } = renderPicker();
    await expectNoAxeViolations(container);
    fireEvent.change(screen.getByLabelText("Buscar material"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("Ningún material coincide con la búsqueda."),
    ).toBeVisible();
  });
});
