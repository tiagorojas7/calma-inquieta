import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnrollmentPage } from "~/app/ui/templates/enrollment-page";

describe("EnrollmentPage", () => {
  it("renders the public offer, student form and hidden honeypot", () => {
    const { container } = render(
      <EnrollmentPage
        state="open"
        offer={{
          workshopName: "Cerámica inicial",
          period: "2026-11",
          periodLabel: "noviembre 2026",
          fee: "$ 58.000",
          turnos: [{ id: "turno-1", label: "Martes · 18:00 a 20:00 h" }],
        }}
        values={{ fullName: "", email: "", phone: "", turnoId: "" }}
        errors={{}}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Cerámica inicial" }),
    ).toBeVisible();
    expect(screen.getByText("noviembre 2026")).toBeVisible();
    expect(screen.queryByText("Materiales requeridos")).toBeNull();
    expect(screen.getByText("Paso 1 de 2")).toBeVisible();
    expect(screen.getByLabelText("Nombre completo")).toBeRequired();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Teléfono argentino")).toHaveAttribute(
      "type",
      "tel",
    );
    expect(
      screen.getByLabelText(
        "Leí y acepto las condiciones y la política de privacidad",
      ),
    ).toHaveAttribute("type", "checkbox");
    expect(screen.queryByLabelText(/^Acepto la política/u)).toBeNull();
    expect(container.querySelector('input[name="honeypot"]')).toHaveClass(
      "sr-only",
    );
  });

  it("links both documents and posts the versions it showed", () => {
    const { container } = render(
      <EnrollmentPage
        state="open"
        offer={{
          workshopName: "Cerámica",
          period: "2026-11",
          periodLabel: "noviembre 2026",
          fee: "$ 58.000",
          turnos: [{ id: "a", label: "Martes" }],
        }}
        policies={{ conditionsVersion: 4, privacyVersion: 2 }}
        values={{ fullName: "", email: "", phone: "", turnoId: "" }}
        errors={{}}
      />,
    );
    expect(
      screen.getByRole("link", { name: "las condiciones" }),
    ).toHaveAttribute("href", "/condiciones");
    expect(
      screen.getByRole("link", { name: "la política de privacidad" }),
    ).toHaveAttribute("href", "/privacidad");
    expect(
      container.querySelector('input[name="conditionsVersion"]'),
    ).toHaveValue("4");
    expect(container.querySelector('input[name="privacyVersion"]')).toHaveValue(
      "2",
    );
  });

  it("posts no versions when they could not be read, but still shows the checkbox", () => {
    const { container } = render(
      <EnrollmentPage
        state="open"
        offer={{
          workshopName: "Cerámica",
          period: "2026-11",
          periodLabel: "noviembre 2026",
          fee: "$ 58.000",
          turnos: [{ id: "a", label: "Martes" }],
        }}
        policies={null}
        values={{ fullName: "", email: "", phone: "", turnoId: "" }}
        errors={{}}
      />,
    );
    expect(
      container.querySelector('input[name="conditionsVersion"]'),
    ).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: /Leí y acepto/u }),
    ).toBeVisible();
  });

  it("shows the month in words and labels the fee, and posts the raw period", () => {
    const { container } = render(
      <EnrollmentPage
        state="open"
        offer={{
          workshopName: "Cerámica",
          period: "2026-11",
          periodLabel: "noviembre 2026",
          fee: "$ 58.000",
          turnos: [{ id: "a", label: "Martes" }],
        }}
        values={{ fullName: "", email: "", phone: "", turnoId: "" }}
        errors={{}}
      />,
    );

    expect(screen.getByText("noviembre 2026")).toHaveClass(
      "font-display",
      "italic",
    );
    expect(screen.queryByText("2026-11")).toBeNull();
    expect(screen.getByText("Cuota: $ 58.000")).toHaveClass(
      "font-semibold",
      "tabular-nums",
    );
    expect(container.querySelector('input[name="period"]')).toHaveValue(
      "2026-11",
    );
  });

  it("shows all named errors and retains submitted values", () => {
    render(
      <EnrollmentPage
        state="open"
        offer={{
          workshopName: "Cerámica",
          period: "2026-11",
          periodLabel: "noviembre 2026",
          fee: "$ 58.000",
          turnos: [{ id: "a", label: "Martes" }],
        }}
        values={{ fullName: "Ana", email: "mal", phone: "123", turnoId: "a" }}
        errors={{
          fullName: "Ingresá tu nombre completo.",
          email: "Ingresá un email válido.",
          phone: "Ingresá un teléfono argentino válido.",
          policy:
            "Tenés que aceptar las condiciones y la política de privacidad.",
        }}
      />,
    );
    for (const message of [
      "Ingresá tu nombre completo.",
      "Ingresá un email válido.",
      "Ingresá un teléfono argentino válido.",
      "Tenés que aceptar las condiciones y la política de privacidad.",
    ])
      expect(screen.getAllByText(message)).toHaveLength(2);
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana");
  });

  it("shows paused enrollment with no form or unsupported contact path", () => {
    const { container } = render(<EnrollmentPage state="paused" />);
    expect(screen.getByText("Inscripciones pausadas")).toBeVisible();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
