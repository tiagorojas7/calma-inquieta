import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

describe("OrderPage", () => {
  it("shows a pending summary, the four payment steps and the hand-off", () => {
    render(<OrderPage {...pending} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /CI-2026-0007/ }),
    ).toBeVisible();
    expect(screen.getByText("Pendiente de confirmación")).toBeVisible();
    expect(screen.getByText("Cerámica")).toBeVisible();
    expect(screen.getByText("octubre 2026")).toBeVisible();
    expect(screen.getByText("Lunes · 10:00 a 12:00 h")).toBeVisible();
    expect(screen.getByText("Arcilla 1 kg ×2")).toBeVisible();
    expect(screen.getByText("$ 58.000")).toBeVisible();

    const steps = screen.getByRole("list", { name: "Cómo pagar" });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: /^Enviar pedido por WhatsApp/ }),
    ).toHaveAttribute("href", pending.whatsappHref);
  });

  it("renders the summary without a link when no hand-off exists", () => {
    render(<OrderPage {...pending} whatsappHref={null} />);

    expect(screen.getByText("$ 58.000")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("thanks a paid visitor instead of asking for payment", () => {
    render(
      <OrderPage
        {...pending}
        status="paid"
        statusLabel="Cobrado"
        whatsappHref={null}
      />,
    );

    expect(screen.getByText("Cobrado")).toBeVisible();
    expect(screen.getByText(/¡Gracias!/)).toBeVisible();
    expect(screen.queryByRole("list", { name: "Cómo pagar" })).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
