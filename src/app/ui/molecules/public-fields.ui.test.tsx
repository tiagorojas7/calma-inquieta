import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  PublicCheckboxField,
  PublicSelectField,
  PublicTextField,
} from "./public-fields";

describe("public fields (EN02, EN03)", () => {
  it("uses the caller's stable id for label, control and messages", () => {
    render(
      <PublicTextField
        id="email"
        label="Email"
        hint="Usamos tu email para avisarte."
        error="Ingresá un email válido."
        name="email"
      />,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "email-hint email-error");
    expect(document.getElementById("email-error")).toHaveTextContent(
      "Ingresá un email válido.",
    );
  });

  it("does not announce each inline error on its own (the summary does)", () => {
    render(<PublicTextField id="a" label="A" error="Mal." name="a" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("gives text, select and checkbox a 44 px control with 16 px text", () => {
    render(
      <>
        <PublicTextField id="t" label="T" name="t" />
        <PublicSelectField
          id="s"
          label="S"
          name="s"
          options={[{ value: "", label: "Elegí" }]}
        />
        <PublicCheckboxField id="c" label="C" name="c" />
      </>,
    );
    for (const control of [
      screen.getByLabelText("T"),
      screen.getByLabelText("S"),
    ]) {
      expect(control.className).toContain("min-h-11");
      expect(control.className).toContain("text-base");
    }
    const checkbox = screen.getByLabelText("C");
    expect(checkbox.className).toContain("size-6");
    expect(checkbox.closest("label")?.className).toContain("min-h-11");
  });

  it("links the checkbox to its error and has no axe violations", async () => {
    const { container } = render(
      <PublicCheckboxField id="policy" label="Acepto" error="Obligatorio." />,
    );
    expect(screen.getByLabelText("Acepto")).toHaveAttribute(
      "aria-describedby",
      "policy-error",
    );
    await expectNoAxeViolations(container);
  });
});
