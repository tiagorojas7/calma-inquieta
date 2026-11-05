import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { OrderPage, type OrderPageProps } from "~/app/ui/templates/order-page";

const pending: OrderPageProps = {
  number: "CI-2026-0007",
  status: "pending_confirmation",
  statusLabel: "Pendiente de confirmación",
  workshopName: "Cerámica",
  month: "octubre 2026",
  turno: "Lunes · 10:00 a 12:00 h",
  lines: [{ label: "Arcilla 1 kg", quantity: 2, lineTotal: "$ 10.000" }],
  fee: "$ 48.000",
  materialsTotal: "$ 10.000",
  total: "$ 58.000",
  whatsappHref: "https://wa.me/5493510000000?text=hola",
};

function renderOrder(props: OrderPageProps) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <OrderPage {...props} /> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("OrderPage receipt (O01)", () => {
  it("groups the facts in a receipt whose total is a definition", () => {
    renderOrder(pending);

    const receipt = screen.getByRole("region", { name: "Resumen del pedido" });
    const total = within(receipt).getByText("Total");
    expect(total.tagName).toBe("DT");
    expect(total.nextElementSibling).toHaveTextContent("$ 58.000");
    expect(
      within(receipt).getByText("Cuota").nextElementSibling,
    ).toHaveTextContent("$ 48.000");
    expect(
      within(receipt).getByText("Materiales").nextElementSibling,
    ).toHaveTextContent("$ 10.000");
    expect(within(receipt).getByText("Arcilla 1 kg ×2")).toBeVisible();
  });

  it("omits the materials rows when the order has none", () => {
    renderOrder({ ...pending, lines: [], materialsTotal: "$ 0" });

    const receipt = screen.getByRole("region", { name: "Resumen del pedido" });
    expect(within(receipt).queryByText("Materiales")).toBeNull();
    expect(within(receipt).getByText("Total")).toBeVisible();
  });
});

describe("OrderPage status (O02)", () => {
  it("shows an icon badge and the next step for a pending order", () => {
    renderOrder(pending);

    const badge = screen
      .getByText("Pendiente de confirmación")
      .closest("[data-status]");
    expect(badge).toHaveAttribute("data-status", "pending_confirmation");
    expect(badge?.querySelector("svg")).not.toBeNull();
    expect(
      screen.getByText(/Enviá tu pedido por WhatsApp para recibir/),
    ).toBeVisible();
  });

  it("explains a cancelled order and offers the contact page", () => {
    renderOrder({
      ...pending,
      status: "cancelled",
      statusLabel: "Cancelado",
      whatsappHref: null,
    });

    expect(
      screen.getByText("Cancelado").closest("[data-status]"),
    ).toHaveAttribute("data-status", "cancelled");
    expect(screen.getByText(/Este pedido fue cancelado/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir a Contacto" })).toHaveAttribute(
      "href",
      "/contacto",
    );
  });
});

describe("OrderPage progress", () => {
  it.each([
    ["pending_confirmation", "Pendiente", "bg-sand-200"],
    ["cancelled", "Cancelado", "bg-blush-100"],
    ["paid", "Cobrado", "bg-sage-200"],
  ])("tones the badge of a %s order", (status, statusLabel, tone) => {
    renderOrder({ ...pending, status, statusLabel, whatsappHref: null });

    expect(screen.getByText(statusLabel).closest("[data-status]")).toHaveClass(
      tone,
    );
  });

  it("joins the payment steps with a rule and fills the action on a phone", () => {
    const { container } = renderOrder(pending);

    expect(container.querySelectorAll("[data-step-rule]")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: /^Enviar pedido por WhatsApp/ }),
    ).toHaveClass("w-full", "sm:w-fit");
  });
});

describe("OrderPage hand-off fallback (O03)", () => {
  it("offers the contact page and the order number when WhatsApp is unavailable", () => {
    renderOrder({ ...pending, whatsappHref: null });

    expect(screen.getByRole("link", { name: "Ir a Contacto" })).toHaveAttribute(
      "href",
      "/contacto",
    );
    expect(screen.getByText(/Anotá tu número de pedido/)).toBeVisible();
    expect(screen.getAllByText(/CI-2026-0007/).length).toBeGreaterThan(1);
  });

  it("keeps the WhatsApp action and no fallback when the link exists", () => {
    renderOrder(pending);

    expect(
      screen.getByRole("link", { name: /^Enviar pedido por WhatsApp/ }),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Ir a Contacto" })).toBeNull();
  });
});

describe("OrderPage payment steps (O04)", () => {
  it("numbers the four steps and marks the first as the current one", async () => {
    const { container } = renderOrder(pending);

    const steps = screen.getByRole("list", { name: "Cómo pagar" });
    const items = within(steps).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveAttribute("aria-current", "step");
    expect(items[1]).not.toHaveAttribute("aria-current");
    expect(items[0]).toHaveTextContent("Ahora");
    expect(items[0]).toHaveTextContent("1");
    expect(items[3]).toHaveTextContent("4");
    await expectNoAxeViolations(container, { page: false });
  });
});
