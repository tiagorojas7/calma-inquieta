import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  CheckboxField,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-fields";

describe("TextField", () => {
  it("binds the label and the hint to the input", async () => {
    const { container } = render(
      <TextField label="Nombre" name="name" hint="Como se verá en el sitio." />,
    );
    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveAttribute("name", "name");
    expect(input).toHaveAccessibleDescription("Como se verá en el sitio.");
    expect(input).not.toHaveAttribute("aria-invalid");
    await expectNoAxeViolations(container);
  });

  it("announces the error, links it and keeps the entered value", async () => {
    const { container } = render(
      <TextField
        label="Nombre"
        name="name"
        hint="Ayuda"
        error="Ingresá un nombre."
        defaultValue="Ana"
      />,
    );
    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveValue("Ana");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Ayuda Ingresá un nombre.");
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresá un nombre.");
    await expectNoAxeViolations(container);
  });

  it("accepts typing", async () => {
    render(<TextField label="Nombre" name="name" />);
    await userEvent.type(screen.getByLabelText("Nombre"), "Beto");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Beto");
  });
});

describe("TextAreaField", () => {
  it("renders a labelled textarea with its error", async () => {
    const { container } = render(
      <TextAreaField label="Resumen" name="summary" error="Es muy largo." />,
    );
    const area = screen.getByLabelText("Resumen");
    expect(area.tagName).toBe("TEXTAREA");
    expect(area).toHaveAccessibleDescription("Es muy largo.");
    await expectNoAxeViolations(container);
  });
});

describe("SelectField", () => {
  it("renders the options and keeps the selected one", async () => {
    const { container } = render(
      <SelectField
        label="Profesor"
        name="teacher"
        defaultValue="b"
        options={[
          { value: "a", label: "Ana" },
          { value: "b", label: "Beto" },
        ]}
        error="Elegí un profesor."
      />,
    );
    const select = screen.getByLabelText("Profesor");
    expect(select).toHaveValue("b");
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(select).toHaveAccessibleDescription("Elegí un profesor.");
    await expectNoAxeViolations(container);
  });
});

describe("CheckboxField", () => {
  it("renders a labelled checkbox", async () => {
    const { container } = render(
      <CheckboxField label="Disponible" name="available" defaultChecked />,
    );
    expect(screen.getByRole("checkbox", { name: "Disponible" })).toBeChecked();
    await expectNoAxeViolations(container);
  });
});

describe("FormError", () => {
  it("announces a form-level error and renders nothing without one", async () => {
    const { container, rerender } = render(
      <FormError message="No pudimos guardar. Probá de nuevo." />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos guardar. Probá de nuevo.",
    );
    await expectNoAxeViolations(container);
    rerender(<FormError message={undefined} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
