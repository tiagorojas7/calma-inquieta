import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentNewForm } from "./enrollment-new-form";

const options = [
  {
    value: "ceramica|2026-11|t1",
    label: "Cerámica · noviembre 2026 · Lunes",
    fee: "58000",
  },
  {
    value: "tejido|2026-11|t2",
    label: "Tejido · noviembre 2026 · Martes",
    fee: "42000",
  },
];
const values = { offer: "", fullName: "", email: "", phone: "", fee: "" };

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

  it("starts with the fee of the chosen month and follows the offer until the owner types one", async () => {
    const user = userEvent.setup();
    render(
      <EnrollmentNewForm
        values={values}
        errors={{}}
        options={options}
        cancelHref="/admin/inscripciones"
      />,
    );
    const fee = screen.getByLabelText("Cuota");
    expect(fee).toHaveAttribute("name", "fee");
    expect(fee).toBeRequired();
    expect(fee).toHaveValue("");
    const select = screen.getByLabelText("Taller, mes y turno");
    await user.selectOptions(select, "ceramica|2026-11|t1");
    expect(fee).toHaveValue("58000");
    await user.selectOptions(select, "tejido|2026-11|t2");
    expect(fee).toHaveValue("42000");
    await user.clear(fee);
    await user.type(fee, "0");
    await user.selectOptions(select, "ceramica|2026-11|t1");
    expect(fee).toHaveValue("0");
  });

  it("shows the fee that was submitted, even when it is not the period fee", () => {
    render(
      <EnrollmentNewForm
        values={{ ...values, offer: "ceramica|2026-11|t1", fee: "0" }}
        errors={{ fee: "Completá este campo." }}
        options={options}
        cancelHref="/admin/inscripciones"
      />,
    );
    const fee = screen.getByLabelText("Cuota");
    expect(fee).toHaveValue("0");
    expect(fee).toHaveAccessibleDescription(/Completá este campo\./);
  });

  it("keeps typed values and shows field and form errors", async () => {
    const { container } = render(
      <EnrollmentNewForm
        values={{
          offer: "tejido|2026-11|t2",
          fullName: "Ana",
          email: "mal",
          phone: "",
          fee: "58000",
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
      "tejido|2026-11|t2",
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
