import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnrollmentPage } from "~/app/ui/templates/enrollment-page";

describe("EnrollmentPage", () => {
  it("renders the public offer, student form and hidden honeypot", () => {
    const { container } = render(
      <EnrollmentPage
        state="open"
        offer={{
          workshopName: "Cerámica inicial",
          period: "Noviembre 2026",
          fee: "$ 58.000",
          materialsRequired: true,
          turnos: [{ id: "turno-1", label: "Martes · 18:00 a 20:00 h" }],
        }}
        values={{ fullName: "", email: "", phone: "", turnoId: "" }}
        errors={{}}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Cerámica inicial" }),
    ).toBeVisible();
    expect(screen.getByText("Noviembre 2026")).toBeVisible();
    expect(screen.getByText("Materiales requeridos")).toBeVisible();
    expect(screen.getByLabelText("Nombre completo")).toBeRequired();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Teléfono argentino")).toHaveAttribute(
      "type",
      "tel",
    );
    expect(screen.getByLabelText(/Acepto la política/u)).toHaveAttribute(
      "type",
      "checkbox",
    );
    expect(container.querySelector('input[name="honeypot"]')).toHaveClass(
      "sr-only",
    );
  });

  it("shows all named errors and retains submitted values", () => {
    render(
      <EnrollmentPage
        state="open"
        offer={{
          workshopName: "Cerámica",
          period: "Noviembre",
          fee: "$ 58.000",
          materialsRequired: false,
          turnos: [{ id: "a", label: "Martes" }],
        }}
        values={{ fullName: "Ana", email: "mal", phone: "123", turnoId: "a" }}
        errors={{
          fullName: "Ingresá tu nombre completo.",
          email: "Ingresá un email válido.",
          phone: "Ingresá un teléfono argentino válido.",
          policy: "Tenés que aceptar la política de privacidad.",
        }}
      />,
    );
    for (const message of [
      "Ingresá tu nombre completo.",
      "Ingresá un email válido.",
      "Ingresá un teléfono argentino válido.",
      "Tenés que aceptar la política de privacidad.",
    ])
      expect(screen.getByText(message)).toBeVisible();
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana");
  });

  it("continues a valid student draft to the materials step", () => {
    const onContinueToMaterials = vi.fn();
    render(
      <EnrollmentPage
        errors={{}}
        needsMaterials
        offer={{
          workshopName: "Cerámica",
          period: "2026-11",
          fee: "$ 58.000",
          materialsRequired: true,
          turnos: [{ id: "a", label: "Martes" }],
        }}
        onContinueToMaterials={onContinueToMaterials}
        state="open"
        values={{
          fullName: "Ana",
          email: "ana@example.test",
          phone: "3515550000",
          turnoId: "a",
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Elegir materiales" }));
    expect(onContinueToMaterials).toHaveBeenCalledOnce();
  });

  it("shows paused enrollment with no form or unsupported contact path", () => {
    const { container } = render(<EnrollmentPage state="paused" />);
    expect(screen.getByText("Inscripciones pausadas")).toBeVisible();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
