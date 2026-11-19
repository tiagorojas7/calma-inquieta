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
    expect(screen.getByLabelText("Nombre")).toBeRequired();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("type", "tel");
    expect(
      screen.getByRole("button", { name: "Inscribir" }),
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
    expect(screen.getByLabelText("Nombre")).toHaveValue("Ana");
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
      "No hay talleres con el mes abierto.",
    );
    expect(screen.queryByRole("button", { name: "Inscribir" })).toBeNull();
  });

  describe('one form: materials behind the options and "Ya pagó"', () => {
    const one = [
      {
        materialId: "m-1",
        variantId: "v-1",
        name: "Arcilla blanca",
        label: "1 kg",
        unitPrice: 4000,
        priceLabel: "$ 4.000",
      },
    ];

    it('posts "Ya pagó" as the paid field, unchecked by default and remembered after a refusal', () => {
      const { rerender } = render(
        <EnrollmentNewForm
          values={values}
          errors={{}}
          options={options}
          cancelHref="/admin/alumnas"
        />,
      );
      const box = screen.getByRole("checkbox", { name: "Ya pagó" });
      expect(box).toHaveAttribute("name", "paid");
      expect(box).not.toBeChecked();

      rerender(
        <EnrollmentNewForm
          key="refused"
          values={values}
          errors={{}}
          options={options}
          paid
          cancelHref="/admin/alumnas"
        />,
      );
      expect(screen.getByRole("checkbox", { name: "Ya pagó" })).toBeChecked();
    });

    it("keeps the materials behind the options, closed until she chose some", () => {
      const { container, rerender } = render(
        <EnrollmentNewForm
          values={values}
          errors={{}}
          options={options}
          materials={one}
          cancelHref="/admin/alumnas"
        />,
      );
      const summary = screen.getByText("Agregar materiales", {
        selector: "summary",
      });
      expect(summary.closest("details")).not.toHaveAttribute("open");
      expect(container.querySelectorAll("form")).toHaveLength(1);

      rerender(
        <EnrollmentNewForm
          key="chosen"
          values={values}
          errors={{}}
          options={options}
          materials={one}
          lines={[{ materialId: "m-1", variantId: "v-1", quantity: "1" }]}
          cancelHref="/admin/alumnas"
        />,
      );
      expect(
        screen
          .getByText("Agregar materiales", { selector: "summary" })
          .closest("details"),
      ).toHaveAttribute("open");
    });
  });

  describe("materials", () => {
    const materials = [
      {
        materialId: "m-1",
        variantId: "v-1",
        name: "Arcilla blanca",
        label: "1 kg",
        unitPrice: 4000,
        priceLabel: "$ 4.000",
      },
      {
        materialId: "m-2",
        variantId: "v-2",
        name: "Pincel",
        label: "Número 4",
        unitPrice: 1500,
        priceLabel: "$ 1.500",
      },
    ];
    const postedOf = (container: HTMLElement) =>
      Object.fromEntries(
        new FormData(
          container.querySelector("form") as HTMLFormElement,
        ).entries(),
      );

    it("filters the catalog by text and posts the chosen variants with their quantities", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <EnrollmentNewForm
          values={{ ...values, offer: "ceramica|2026-11|t1", fee: "58000" }}
          errors={{}}
          options={options}
          materials={materials}
          cancelHref="/admin/inscripciones"
        />,
      );
      await user.type(screen.getByRole("searchbox"), "pince");
      expect(screen.getAllByRole("button", { name: /^Agregar/ })).toHaveLength(
        1,
      );
      await user.click(screen.getByRole("button", { name: /^Agregar Pincel/ }));
      const quantity = screen.getByRole("spinbutton", {
        name: /Pincel Número 4/,
      });
      await user.clear(quantity);
      await user.type(quantity, "3");
      expect(postedOf(container)).toMatchObject({
        offer: "ceramica|2026-11|t1",
        fee: "58000",
        "line:m-2:v-2": "3",
      });
      expect(screen.getByRole("group", { name: "Resumen" })).toHaveTextContent(
        "Total$ 62.500",
      );
    });

    it("follows the fee the owner types in the total", async () => {
      const user = userEvent.setup();
      render(
        <EnrollmentNewForm
          values={{ ...values, fee: "58000" }}
          errors={{}}
          options={options}
          materials={materials}
          lines={[{ materialId: "m-2", variantId: "v-2", quantity: "2" }]}
          cancelHref="/admin/inscripciones"
        />,
      );
      const fee = screen.getByLabelText("Cuota");
      await user.clear(fee);
      await user.type(fee, "0");
      expect(screen.getByRole("group", { name: "Resumen" })).toHaveTextContent(
        "Total$ 3.000",
      );
    });

    it("shows the materials error and the lines of a refused submit", async () => {
      const { container } = render(
        <EnrollmentNewForm
          values={{ ...values, fee: "58000" }}
          errors={{ materials: "Elegí hasta 30 materiales distintos." }}
          options={options}
          materials={materials}
          lines={[{ materialId: "m-1", variantId: "v-1", quantity: "0" }]}
          cancelHref="/admin/inscripciones"
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Elegí hasta 30 materiales distintos.",
      );
      expect(
        screen.getByRole("spinbutton", { name: /Arcilla blanca 1 kg/ }),
      ).toHaveValue(0);
      await expectNoAxeViolations(container);
    });

    it("posts no line when none was chosen, as before", () => {
      const { container } = render(
        <EnrollmentNewForm
          values={{ ...values, fee: "58000" }}
          errors={{}}
          options={options}
          materials={materials}
          cancelHref="/admin/inscripciones"
        />,
      );
      expect(
        Object.keys(postedOf(container)).filter((name) =>
          name.startsWith("line:"),
        ),
      ).toEqual([]);
    });
  });
});
