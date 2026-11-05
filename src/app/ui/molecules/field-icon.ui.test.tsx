import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { Icon } from "../atoms/icons";
import { SelectField, TextAreaField, TextField } from "../admin/form-fields";
import { PublicSelectField, PublicTextField } from "./public-fields";

const iconOf = (control: HTMLElement) =>
  control.parentElement?.querySelector("[data-field-icon]") ?? null;

describe("field icons", () => {
  it("draws the new person, phone and note icons", () => {
    for (const name of ["user", "phone", "note"] as const) {
      const { container, unmount } = render(<Icon name={name} />);

      expect(container.querySelector("svg path")).not.toBeNull();
      unmount();
    }
  });

  it("puts a decorative icon at the start of a text field and makes room for it", async () => {
    const { container } = render(
      <TextField label="Teléfono" name="phone" icon="phone" />,
    );
    const input = screen.getByLabelText("Teléfono");
    const icon = iconOf(input);

    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("pointer-events-none", "absolute", "left-3");
    expect(input).toHaveClass("pl-11");
    expect(input.parentElement).toHaveClass("relative");
    // The label alone names the field: the icon adds nothing to it.
    expect(screen.getByRole("textbox", { name: "Teléfono" })).toBe(input);
    await expectNoAxeViolations(container);
  });

  it("leaves a field without an icon exactly as it was", () => {
    render(<TextField label="Nombre" name="name" />);
    const input = screen.getByLabelText("Nombre");

    expect(iconOf(input)).toBeNull();
    expect(input).not.toHaveClass("pl-11");
    expect(input.parentElement).not.toHaveClass("relative");
  });

  it("aligns the icon of a multi-line field with its first line", () => {
    render(<TextAreaField label="Notas" name="notes" icon="note" />);
    const area = screen.getByLabelText("Notas");

    expect(iconOf(area)).toHaveClass("top-3");
    expect(area).toHaveClass("pl-11");
  });

  it("centres the icon of a single-line field", () => {
    render(<TextField label="Email" name="email" icon="mail" />);

    expect(iconOf(screen.getByLabelText("Email"))).toHaveClass(
      "top-1/2",
      "-translate-y-1/2",
    );
  });

  it("works on the admin select and on the public fields too", () => {
    render(
      <>
        <SelectField
          label="Turno"
          name="turno"
          icon="clock"
          options={[{ value: "a", label: "A" }]}
        />
        <PublicTextField id="pub" label="Email público" icon="mail" />
        <PublicSelectField
          id="pubsel"
          label="Turno público"
          icon="calendar"
          options={[{ value: "a", label: "A" }]}
        />
      </>,
    );

    for (const label of ["Turno", "Email público", "Turno público"]) {
      const control = screen.getByLabelText(label);
      expect(iconOf(control), label).not.toBeNull();
      expect(control, label).toHaveClass("pl-11");
    }
  });
});
