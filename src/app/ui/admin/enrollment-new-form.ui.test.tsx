import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentNewForm } from "./enrollment-new-form";

const options = [
  { value: "ceramica|2026-11|t1", label: "Cerámica · noviembre 2026 · Lunes" },
  { value: "ceramica|2026-11|t2", label: "Cerámica · noviembre 2026 · Martes" },
];
const values = { offer: "", fullName: "", email: "", phone: "" };

describe("EnrollmentNewForm", () => {
  it("is a native post form with the four required fields and no .data client form", async () => {
    const { container } = render(
      <EnrollmentNewForm
        values={values}
        errors={{}}
        options={options}
        cancelHref="/admin/inscripciones"
      />,
    );
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "post");
    const select = screen.getByLabelText("Taller, mes y turno");
    expect(within(select).getAllByRole("option")).toHaveLength(3);
    expect(screen.getByLabelText("Nombre completo")).toBeRequired();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("type", "tel");
    expect(
      screen.getByRole("button", { name: "Crear inscripción" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/inscripciones",
    );
    await expectNoAxeViolations(container);
  });

  it("keeps typed values and shows field and form errors", async () => {
    const { container } = render(
      <EnrollmentNewForm
        values={{
          offer: "ceramica|2026-11|t2",
          fullName: "Ana",
          email: "mal",
          phone: "",
        }}
        errors={{
          email: "Ingresá un email válido.",
          phone: "Completá este campo.",
        }}
        formError="El turno está completo. Elegí otro turno."
        options={options}
        cancelHref="/admin/inscripciones"
      />,
    );
    expect(
      screen.getByText("El turno está completo. Elegí otro turno."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Taller, mes y turno")).toHaveValue(
      "ceramica|2026-11|t2",
    );
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Ingresá un email válido.",
    );
    await expectNoAxeViolations(container);
  });

  it("explains when no workshop accepts enrollments and offers no submit", () => {
    render(
      <EnrollmentNewForm
        values={values}
        errors={{}}
        options={[]}
        cancelHref="/admin/inscripciones"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "No hay talleres con inscripciones abiertas.",
    );
    expect(
      screen.queryByRole("button", { name: "Crear inscripción" }),
    ).toBeNull();
  });
});
