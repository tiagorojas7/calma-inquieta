import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  EnrollmentConsolidation,
  type EnrollmentConsolidationProps,
} from "./enrollment-consolidation";

const base: EnrollmentConsolidationProps = {
  period: "2026-11",
  periodLabel: "noviembre 2026",
  grandTotal: "$ 3.000",
  pendingOrders: 2,
  suppliers: [
    {
      supplierId: "s1",
      supplierName: "Papelería Sur",
      materials: [{ label: "Arcilla Grande", quantity: 3, total: "$ 3.000" }],
      total: "$ 3.000",
      summary:
        "Pedido a Papelería Sur\nMes: noviembre 2026\n- Arcilla Grande x3",
      orderIds: ["o1", "o2"],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EnrollmentConsolidation", () => {
  it("shows each supplier with its materials, totals and the pending count", async () => {
    const { container } = render(<EnrollmentConsolidation {...base} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /noviembre 2026/ }),
    ).toBeVisible();
    const section = screen.getByRole("region", { name: "Papelería Sur" });
    expect(within(section).getByText("Arcilla Grande")).toBeVisible();
    expect(within(section).getByText("Cantidad: 3")).toBeVisible();
    expect(within(section).queryByRole("table")).toBeNull();
    expect(within(section).getAllByText("$ 3.000").length).toBeGreaterThan(0);
    expect(screen.getByText(/2 pedidos a confirmar/)).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("shows breadcrumbs, the order workflow and the consequence of the bulk action", () => {
    render(<EnrollmentConsolidation {...base} />);

    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(
      within(crumbs).getByRole("link", { name: "Inscripciones" }),
    ).toHaveAttribute("href", "/admin/inscripciones");
    const steps = screen.getByRole("list", { name: "Pasos del pedido" });
    expect(
      within(steps)
        .getByText(/Solicitar materiales/)
        .closest("li"),
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByText(
        "Marca 2 pedidos cobrados como solicitados al proveedor. Después los marcás como recibidos cuando lleguen.",
      ),
    ).toBeVisible();
  });

  it("offers a readonly summary and a bulk form with one hidden id per order", () => {
    const { container } = render(<EnrollmentConsolidation {...base} />);

    expect(screen.getByLabelText("Resumen para Papelería Sur")).toHaveValue(
      base.suppliers[0]?.summary,
    );
    expect(screen.getByLabelText("Resumen para Papelería Sur")).toHaveAttribute(
      "readonly",
    );
    const ids = container.querySelectorAll('input[name="orderId"]');
    expect([...ids].map((input) => input.getAttribute("value"))).toEqual([
      "o1",
      "o2",
    ]);
    expect(
      container.querySelector('input[name="intent"][value="mark-requested"]'),
    ).not.toBeNull();
    expect(container.querySelector('input[name="mes"]')).toHaveValue("2026-11");
    expect(
      screen.getByRole("button", { name: "Marcar como solicitado" }),
    ).toBeVisible();
  });

  it("hides the bulk action when no order can still be requested", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        suppliers={base.suppliers.map((supplier) => ({
          ...supplier,
          orderIds: [],
        }))}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Marcar como solicitado" }),
    ).toBeNull();
  });

  it("copies the summary to the clipboard", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<EnrollmentConsolidation {...base} />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar resumen" }));

    expect(writeText).toHaveBeenCalledWith(base.suppliers[0]?.summary);
  });

  it("filters by month with a plain GET form", () => {
    render(<EnrollmentConsolidation {...base} />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(within(form).getByLabelText("Mes")).toHaveValue("2026-11");
  });

  it("shows the notice and the refusal", () => {
    render(
      <EnrollmentConsolidation
        {...base}
        requestedCount={2}
        formError="Se marcaron 1 de 2 pedidos."
      />,
    );

    expect(
      screen
        .getByText("Se marcaron 2 pedidos como solicitados.")
        .closest("[role=status]"),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "Siguiente: cuando lleguen los materiales, marcá cada pedido como recibido.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Se marcaron 1 de 2 pedidos.",
    );
  });

  it("says when there is nothing to buy", () => {
    render(
      <EnrollmentConsolidation {...base} suppliers={[]} pendingOrders={0} />,
    );

    expect(
      screen.getByText("No hay materiales para pedir este mes"),
    ).toBeVisible();
  });
});
