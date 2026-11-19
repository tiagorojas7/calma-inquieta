import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SupplierForm } from "./supplier-form";

const values = { name: "", phone: "", email: "", notes: "" };

describe("SupplierForm", () => {
  it("keeps optional notes behind more options and opens them for an error", () => {
    const props = {
      values,
      submitLabel: "Guardar",
      cancelHref: "/admin/proveedores",
    };
    const { rerender } = render(<SupplierForm {...props} errors={{}} />);
    expect(screen.getByLabelText("Nombre")).toBeVisible();
    const more = screen.getByText("Más opciones").closest("details");
    expect(more).not.toHaveAttribute("open");
    expect(more).toContainElement(screen.getByLabelText("Notas"));

    rerender(
      <SupplierForm {...props} errors={{ notes: "Revisá las notas." }} />,
    );
    expect(screen.getByText("Más opciones").closest("details")).toHaveAttribute(
      "open",
    );
  });
});
