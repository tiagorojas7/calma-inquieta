import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentPage } from "./enrollment-page";

const offer = {
  workshopName: "Cerámica inicial",
  period: "2026-11",
  periodLabel: "noviembre 2026",
  fee: "$ 40.000",
  materialsRequired: true,
  turnos: [{ id: "t1", label: "Lunes 18:00" }],
};
const values = { fullName: "", email: "", phone: "", turnoId: "" };

function setup(errors: Record<string, string> = {}, materialsRequired = true) {
  return render(
    <MemoryRouter>
      <EnrollmentPage
        state="open"
        offer={{ ...offer, materialsRequired }}
        values={values}
        errors={errors}
        backHref="/talleres/ceramica"
      />
    </MemoryRouter>,
  );
}

describe("EnrollmentPage form (EN01-EN05)", () => {
  it("orients the visitor with a step indicator and a back link", () => {
    setup();
    expect(screen.getByText("Paso 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver/ })).toHaveAttribute(
      "href",
      "/talleres/ceramica",
    );
  });

  it("marks name, email, phone and turno with their own icons", () => {
    setup();
    const glyphs = [
      "Nombre completo",
      "Email",
      "Teléfono argentino",
      "Turno",
    ].map((label) => {
      const icon = screen
        .getByLabelText(label)
        .parentElement?.querySelector("[data-field-icon]");
      expect(icon, label).not.toBeNull();
      return icon?.innerHTML;
    });

    expect(new Set(glyphs).size).toBe(4);
  });

  it("counts two steps when materials are not required", () => {
    setup({}, false);
    expect(screen.getByText("Paso 1 de 2")).toBeInTheDocument();
  });

  it("adds autofill tokens, input modes and a phone hint", () => {
    setup();
    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute(
      "autocomplete",
      "name",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    const phone = screen.getByLabelText("Teléfono argentino");
    expect(phone).toHaveAttribute("autocomplete", "tel");
    expect(phone).toHaveAttribute("inputmode", "tel");
    expect(phone).toHaveAccessibleDescription(/código de área/i);
  });

  it("summarises failures, links to the fields and wires inline errors", async () => {
    const { container } = setup({
      fullName: "Ingresá tu nombre.",
      policy: "Aceptá la política.",
    });
    const summary = screen.getByRole("alert");
    expect(summary).toHaveFocus();
    expect(
      within(summary).getByRole("link", { name: "Ingresá tu nombre." }),
    ).toHaveAttribute("href", "#fullName");
    const name = screen.getByLabelText("Nombre completo");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Ingresá tu nombre.");
    expect(screen.getByLabelText(/Acepto la política/u)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    fireEvent.click(
      within(summary).getByRole("link", { name: "Aceptá la política." }),
    );
    await expectNoAxeViolations(container);
  });

  it("keeps the privacy consent copy exactly as before (EN06 stays out)", () => {
    setup();
    expect(
      screen.getByText("Acepto la política de privacidad."),
    ).toBeInTheDocument();
  });
});
