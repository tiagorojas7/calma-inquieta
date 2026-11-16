import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  EnrollmentDetail,
  type EnrollmentDetailProps,
} from "./enrollment-detail";

const base: EnrollmentDetailProps = {
  order: {
    id: "o1",
    number: "CI-2026-0007",
    status: "pending_confirmation",
    statusLabel: "Pendiente de confirmación",
    studentName: "Ana Pérez",
    email: "ana@example.com",
    phone: "5493515550000",
    workshopName: "Cerámica",
    month: "noviembre 2026",
    turno: "Lunes · 10:00 a 12:00 h",
    requestedAt: "31/10/2026 12:30",
    policyVersion: "2026-10",
    fee: "$ 48.000",
    materialsTotal: "$ 10.000",
    total: "$ 58.000",
    totalPesos: "58000",
    lines: [
      {
        label: "Arcilla 1 kg",
        supplier: "Proveedor Sur",
        quantity: 2,
        unitPrice: "$ 5.000",
        lineTotal: "$ 10.000",
      },
    ],
    payment: null,
    seat: { confirmed: 3, capacity: 8 },
    audit: [
      {
        at: "31/10/2026 12:30",
        actor: "public",
        from: null,
        to: "Pendiente de confirmación",
        note: null,
      },
    ],
    actions: {
      confirm: true,
      cancel: true,
      materialsRequested: false,
      materialsReceived: false,
    },
    cancelRefund: null,
    refund: null,
    today: "2026-10-31",
  },
};

const paidOrder: EnrollmentDetailProps["order"] = {
  ...base.order,
  status: "paid",
  statusLabel: "Cobrado",
  payment: {
    paidOn: "30/10/2026",
    amount: "$ 58.000",
    confirmedBy: "admin@x.test",
    note: null,
  },
  actions: {
    confirm: false,
    cancel: true,
    materialsRequested: true,
    materialsReceived: false,
  },
  cancelRefund: { paid: "$ 58.000", paidPesos: "58000" },
};

describe("EnrollmentDetail", () => {
  it("shows the summary, the contact data and the collapsed history", async () => {
    const { container } = render(<EnrollmentDetail {...base} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /CI-2026-0007/ }),
    ).toBeVisible();
    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(
      within(crumbs).getByRole("link", { name: "Inscripciones" }),
    ).toHaveAttribute("href", "/admin/inscripciones");
    expect(
      screen.getByRole("link", { name: "Volver a inscripciones" }),
    ).toHaveAttribute("href", "/admin/inscripciones");
    for (const text of [
      "Ana Pérez",
      "ana@example.com",
      "5493515550000",
      "Cerámica",
      "noviembre 2026",
      "Lunes · 10:00 a 12:00 h",
      "31/10/2026 12:30",
      "$ 58.000",
      "Proveedor Sur",
      "3 de 8 lugares confirmados",
    ])
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.queryByRole("table")).toBeNull();
    const history = screen.getByText("Historial").closest("details");
    expect(history).not.toHaveAttribute("open");
    expect(
      within(history as HTMLElement).getByText("public"),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("works in two columns: the job on the left, the facts on the right", () => {
    render(<EnrollmentDetail {...base} />);

    const summary = screen.getByRole("region", { name: "Resumen" });
    const next = screen.getByRole("heading", { name: "Próximo paso" });

    expect(summary.closest("[data-detail-grid]")).toHaveClass(
      "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
    );
    expect(summary.closest("[data-detail-facts]")).toHaveClass("lg:order-2");
    expect(next.closest("section")).toHaveClass("bg-surface", "shadow-card");
  });

  it("gives the total of the order its own weight", () => {
    render(<EnrollmentDetail {...base} />);

    expect(
      screen.getByText("Total").closest("[data-order-total]"),
    ).not.toBeNull();
  });

  it("shows the progress and the one next step for each status", () => {
    const { rerender } = render(<EnrollmentDetail {...base} />);
    const steps = () => screen.getByRole("list", { name: "Avance del pedido" });
    expect(
      within(steps())
        .getByText(/Confirmar cobro/)
        .closest("li"),
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByText(/Siguiente paso: confirmar el cobro/),
    ).toBeVisible();

    rerender(
      <EnrollmentDetail
        order={{
          ...base.order,
          status: "materials_requested",
          statusLabel: "Solicitado al proveedor",
          actions: {
            confirm: false,
            cancel: false,
            materialsRequested: false,
            materialsReceived: true,
          },
        }}
      />,
    );
    expect(
      within(steps())
        .getByText(/Recibir materiales/)
        .closest("li"),
    ).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByText(/Siguiente paso: marcar como recibido/),
    ).toBeVisible();

    rerender(
      <EnrollmentDetail
        order={{
          ...base.order,
          status: "cancelled",
          statusLabel: "Cancelado",
          actions: {
            confirm: false,
            cancel: false,
            materialsRequested: false,
            materialsReceived: false,
          },
        }}
      />,
    );
    expect(
      screen.queryByRole("list", { name: "Avance del pedido" }),
    ).toBeNull();
    expect(screen.getByText(/Este pedido está cancelado/)).toBeVisible();
  });

  it("shows the success banner for a feedback code", () => {
    render(<EnrollmentDetail {...base} feedback="confirmed" />);

    expect(screen.getByRole("status")).toHaveTextContent("Cobro confirmado");
  });

  it("keeps cancelling in a separate danger zone", () => {
    render(<EnrollmentDetail {...base} />);

    const zone = screen.getByRole("region", { name: "Zona de riesgo" });
    expect(
      within(zone).getByRole("button", { name: "Cancelar pedido" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("form", { name: "Confirmar cobro" })).queryByRole(
        "button",
        { name: "Cancelar pedido" },
      ),
    ).toBeNull();
  });

  it("confirms with the order total prefilled and disables the submit while pending", () => {
    render(<EnrollmentDetail {...base} />);

    const form = screen.getByRole("form", { name: "Confirmar cobro" });
    expect(within(form).getByLabelText("Monto cobrado")).toHaveValue("58000");
    expect(within(form).getByLabelText("Monto cobrado")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    expect(within(form).getByLabelText("Fecha de pago")).toHaveValue(
      "2026-10-31",
    );
    expect(within(form).getByLabelText("Fecha de pago")).toHaveAttribute(
      "max",
      "2026-10-31",
    );
    const submit = within(form).getByRole("button", {
      name: "Confirmar cobro",
    });
    expect(submit).toBeEnabled();
    fireEvent.submit(form);
    expect(submit).toBeDisabled();
  });

  it("shows field errors and keeps the typed values", () => {
    render(
      <EnrollmentDetail
        {...base}
        form={{
          errors: { amount: "Ingresá un monto en pesos enteros." },
          values: { amount: "58000,50", paidOn: "2026-10-30", note: "x" },
        }}
      />,
    );

    expect(screen.getByLabelText("Monto cobrado")).toHaveValue("58000,50");
    expect(
      screen.getByText("Ingresá un monto en pesos enteros."),
    ).toBeVisible();
  });

  it("shows a refusal as an alert", () => {
    render(
      <EnrollmentDetail
        {...base}
        form={{
          formError: "El turno está completo. El pedido sigue pendiente.",
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El turno está completo.",
    );
  });

  it("asks before cancelling and needs a reason", async () => {
    const user = userEvent.setup();
    render(<EnrollmentDetail {...base} />);

    await user.type(screen.getByLabelText("Motivo"), "Pidió la baja");
    await user.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/no se puede deshacer/i)).toBeVisible();
  });

  it("asks a paid order's cancellation for the refund, prefilled with what was paid and today", async () => {
    const user = userEvent.setup();
    render(<EnrollmentDetail {...base} order={paidOrder} />);

    const form = screen.getByRole("form", { name: "Cancelar pedido" });
    expect(within(form).getByLabelText("Motivo")).toBeVisible();
    const amount = within(form).getByLabelText("Monto devuelto");
    expect(amount).toHaveValue("58000");
    expect(amount).toHaveAttribute("inputmode", "numeric");
    expect(amount).toBeRequired();
    expect(within(form).getByText(/Cobraste \$ 58\.000/)).toBeVisible();
    const date = within(form).getByLabelText("Fecha de devolución");
    expect(date).toHaveValue("2026-10-31");
    expect(date).toHaveAttribute("max", "2026-10-31");
    expect(date).toBeRequired();
    expect(
      within(form).getByLabelText("Nota de la devolución (opcional)"),
    ).not.toBeRequired();

    await user.click(
      within(form).getByRole("button", { name: "Cancelar pedido" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/la devolución/i)).toBeVisible();
  });

  it("keeps the simple cancel, with no refund fields, for a pending order", () => {
    render(<EnrollmentDetail {...base} />);

    const form = screen.getByRole("form", { name: "Cancelar pedido" });
    expect(within(form).getByLabelText("Motivo")).toBeVisible();
    expect(within(form).queryByLabelText("Monto devuelto")).toBeNull();
    expect(within(form).queryByLabelText("Fecha de devolución")).toBeNull();
  });

  it("shows the refund errors and keeps what was typed", () => {
    render(
      <EnrollmentDetail
        {...base}
        order={paidOrder}
        form={{
          errors: {
            refundAmount: "La devolución no puede ser mayor que lo cobrado.",
            refundedOn: "La fecha de devolución no puede ser futura.",
          },
          values: {
            reason: "Pidió la baja",
            refundAmount: "70000",
            refundedOn: "2026-11-05",
            refundNote: "Transferencia",
          },
        }}
      />,
    );

    const form = screen.getByRole("form", { name: "Cancelar pedido" });
    expect(within(form).getByLabelText("Monto devuelto")).toHaveValue("70000");
    expect(
      within(form).getByLabelText("Monto devuelto"),
    ).toHaveAccessibleDescription(/mayor que lo cobrado/);
    expect(within(form).getByLabelText("Fecha de devolución")).toHaveValue(
      "2026-11-05",
    );
    expect(
      within(form).getByText("La fecha de devolución no puede ser futura."),
    ).toBeVisible();
    expect(
      within(form).getByLabelText("Nota de la devolución (opcional)"),
    ).toHaveValue("Transferencia");
  });

  it.each([
    ["a partial refund", "$ 25.000"],
    ["nothing returned", "$ 0"],
  ])(
    "shows the recorded refund beside the payment for %s",
    (_label, amount) => {
      render(
        <EnrollmentDetail
          {...base}
          order={{
            ...paidOrder,
            status: "cancelled",
            statusLabel: "Cancelado",
            actions: {
              confirm: false,
              cancel: false,
              materialsRequested: false,
              materialsReceived: false,
            },
            cancelRefund: null,
            refund: {
              amount,
              refundedOn: "31/10/2026",
              note: "Transferencia",
              refundedBy: "owner@x.test",
            },
          }}
        />,
      );

      const refund = screen.getByRole("region", { name: "Devolución" });
      expect(within(refund).getByText(amount)).toBeVisible();
      expect(within(refund).getByText("31/10/2026")).toBeVisible();
      expect(within(refund).getByText("Transferencia")).toBeVisible();
      expect(within(refund).getByText("owner@x.test")).toBeVisible();
      expect(screen.getByRole("region", { name: "Cobro" })).toBeVisible();
    },
  );

  it("shows no refund section when nothing was refunded", () => {
    render(<EnrollmentDetail {...base} />);

    expect(screen.queryByRole("region", { name: "Devolución" })).toBeNull();
  });

  it("offers only the next materials step for a paid order", () => {
    render(
      <EnrollmentDetail
        {...base}
        order={{
          ...base.order,
          status: "paid",
          statusLabel: "Cobrado",
          payment: {
            paidOn: "02/11/2026",
            amount: "$ 58.000",
            confirmedBy: "admin@x.test",
            note: "Transferencia",
          },
          actions: {
            confirm: false,
            cancel: true,
            materialsRequested: true,
            materialsReceived: false,
          },
        }}
      />,
    );

    expect(screen.queryByRole("form", { name: "Confirmar cobro" })).toBeNull();
    expect(screen.getByText("admin@x.test")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Marcar como solicitado" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Marcar como recibido" }),
    ).toBeNull();
  });

  it("offers no action on a cancelled order", () => {
    render(
      <EnrollmentDetail
        {...base}
        order={{
          ...base.order,
          status: "cancelled",
          statusLabel: "Cancelado",
          actions: {
            confirm: false,
            cancel: false,
            materialsRequested: false,
            materialsReceived: false,
          },
        }}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("form")).toBeNull();
  });
});
