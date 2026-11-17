import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { intensiveRequestsView } from "~/app/intensive-requests/admin-view";
import { Money } from "~/modules/_shared";
import type { IntensiveRequestFeedback } from "./intensive-requests";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import {
  buildIntensiveOffer,
  FAKE_PROJECT_ID,
} from "~/testing/fakes/intensive-request-builders";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensiveRequestsScreen } from "./intensive-requests";

const paid = Money.fromCentavos(1_500_000);
if (!paid.ok) throw new Error("bad money");

const view = intensiveRequestsView(
  {
    intensivo: buildIntensiveOffer(),
    confirmedSeats: 1,
    requests: [
      buildStoredRequest({
        id: "pending-1",
        fullName: "Ana Pérez",
        projectId: FAKE_PROJECT_ID,
        acceptance: { conditionsVersion: 2, privacyVersion: 3 },
      }),
      buildStoredRequest({
        id: "confirmed-1",
        fullName: "Bea Gómez",
        email: "bea@example.com",
        status: "confirmed",
        paidAmount: paid.value,
        paidOn: "2026-10-21",
        paymentNote: "transferencia",
      }),
      buildStoredRequest({
        id: "cancelled-1",
        fullName: "Carla Ruiz",
        email: "carla@example.com",
        status: "cancelled",
        cancelReason: "no puede asistir",
      }),
    ],
  },
  "2026-10-28",
);

describe("IntensiveRequestsScreen", () => {
  it("lists the requests by status with the seats and the deposit", async () => {
    const { container } = render(
      <IntensiveRequestsScreen view={view} feedback={undefined} />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Reservas: Intensivo de cerámica",
    );
    expect(screen.getByText("1 de 2")).toBeVisible();
    for (const title of [
      "Pendientes de seña (1)",
      "Confirmadas (1)",
      "Canceladas (1)",
    ])
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver al workshop" }),
    ).toHaveAttribute(
      "href",
      "/admin/intensivos/0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01",
    );
    await expectNoAxeViolations(container);
  });

  it("shows the chosen project on each request that has one", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const card = screen.getByRole("article", { name: "Ana Pérez" });
    expect(
      within(card).getByText("Proyecto").nextElementSibling,
    ).toHaveTextContent("Taza de torno");
    const other = screen.getByRole("article", { name: "Bea Gómez" });
    expect(within(other).queryByText("Proyecto")).toBeNull();
  });

  it("shows the accepted document versions on each request, or that there is no record", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const card = screen.getByRole("article", { name: "Ana Pérez" });
    expect(
      within(card).getByText("Aceptación").nextElementSibling,
    ).toHaveTextContent("Condiciones v2 · Privacidad v3");
    const other = screen.getByRole("article", { name: "Bea Gómez" });
    expect(
      within(other).getByText("Aceptación").nextElementSibling,
    ).toHaveTextContent("Sin registro de aceptación");
  });

  it("gives a pending request a confirm form prefilled with the deposit and a cancel form", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const card = screen.getByRole("article", { name: "Ana Pérez" });
    const confirm = within(card).getByRole("form", {
      name: "Registrar la seña: Ana Pérez",
    });
    expect(confirm).toHaveAttribute("method", "post");
    expect(within(confirm).getByLabelText("Seña cobrada")).toHaveValue("15000");
    expect(within(confirm).getByLabelText("Fecha del pago")).toHaveValue(
      "2026-10-28",
    );
    expect(confirm.querySelector('input[name="requestId"]')).toHaveValue(
      "pending-1",
    );
    expect(
      within(card).getByRole("form", {
        name: "Cancelar la solicitud: Ana Pérez",
      }),
    ).toBeInTheDocument();
  });

  it("shows the payment of a confirmed request, with the balance and cancel but no deposit form", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const card = screen.getByRole("article", { name: "Bea Gómez" });
    expect(within(card).getByText("transferencia")).toBeInTheDocument();
    expect(within(card).getByText("21/10/2026")).toBeInTheDocument();
    expect(
      within(card).queryByRole("form", { name: /Registrar la seña/ }),
    ).toBeNull();
    expect(
      within(card).getByRole("form", { name: /Cancelar la solicitud/ }),
    ).toBeInTheDocument();
  });

  it("shows the reason of a cancelled request and no forms", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const card = screen.getByRole("article", { name: "Carla Ruiz" });
    expect(within(card).getByText("no puede asistir")).toBeInTheDocument();
    expect(within(card).queryByRole("form")).toBeNull();
  });

  it("shows a rejected form's errors and values only on its own request", async () => {
    const { container } = render(
      <IntensiveRequestsScreen
        view={view}
        feedback={{
          requestId: "pending-1",
          intent: "confirm",
          formError: undefined,
          errors: { amount: "Ingresá la seña completa del workshop." },
          values: { amount: "100", paidOn: "2026-10-27", note: "" },
        }}
      />,
    );

    const card = screen.getByRole("article", { name: "Ana Pérez" });
    const amount = within(card).getByLabelText("Seña cobrada");
    expect(amount).toHaveValue("100");
    expect(amount).toHaveAccessibleDescription(/Ingresá la seña completa/);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    await expectNoAxeViolations(container);
  });

  it("uses only plain anchors and native forms", () => {
    const { container } = render(
      <IntensiveRequestsScreen view={view} feedback={undefined} />,
    );

    for (const form of container.querySelectorAll("form"))
      expect(form).toHaveAttribute("method", "post");
    expect(container.querySelectorAll("a").length).toBeGreaterThan(0);
  });

  it("shows breadcrumbs back to the intensivo and a confirmation banner", () => {
    render(
      <IntensiveRequestsScreen
        view={view}
        feedback={undefined}
        done="confirmed"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Seña registrada: el lugar quedó confirmado",
    );
    const crumbs = within(
      screen.getByRole("navigation", { name: "Migas de pan" }),
    );
    expect(crumbs.getByRole("link", { name: "Workshops" })).toHaveAttribute(
      "href",
      "/admin/intensivos",
    );
  });

  it("keeps cancelling apart from confirming, behind an explicit step with its consequence", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const card = screen.getByRole("article", { name: "Ana Pérez" });
    const step = within(card).getByText("Cancelar esta solicitud");
    const details = step.closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(
      within(details as HTMLElement).getByRole("form", {
        name: "Cancelar la solicitud: Ana Pérez",
      }),
    ).toBeInTheDocument();
    expect(details).toHaveTextContent("No se puede deshacer");
  });

  it("opens only the pending group by default and collapses the finished ones", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const open = (title: string) =>
      screen
        .getByRole("heading", { name: title })
        .closest("details")
        ?.hasAttribute("open");
    expect(open("Confirmadas (1)")).toBe(false);
    expect(open("Canceladas (1)")).toBe(false);
    expect(
      screen
        .getByRole("heading", { name: "Pendientes de seña (1)" })
        .closest("details"),
    ).toBeNull();
  });

  describe("balance and refund", () => {
    const money = (pesos: number): Money => {
      const value = Money.fromCentavos(pesos * 100);
      if (!value.ok) throw new Error("bad money");
      return value.value;
    };
    const confirmedBase = {
      status: "confirmed",
      paidAmount: paid.value,
      paidOn: "2026-10-21",
      projectId: FAKE_PROJECT_ID,
      price: money(40000),
      deposit: money(15000),
    } as const;
    const balanceView = intensiveRequestsView(
      {
        intensivo: buildIntensiveOffer(),
        confirmedSeats: 3,
        requests: [
          buildStoredRequest({
            ...confirmedBase,
            id: "owes",
            fullName: "Debe Saldo",
            email: "owes@example.com",
          }),
          buildStoredRequest({
            ...confirmedBase,
            id: "settled",
            fullName: "Pagó Todo",
            email: "settled@example.com",
            balance: {
              amount: money(25000),
              paidOn: "2026-10-25",
              note: "efectivo",
              by: "duena@example.com",
              at: new Date("2026-10-25T15:00:00.000Z"),
            },
          }),
          buildStoredRequest({
            ...confirmedBase,
            id: "whole",
            fullName: "Seña Completa",
            email: "whole@example.com",
            price: money(15000),
          }),
          buildStoredRequest({
            id: "refunded",
            fullName: "Devuelta Ana",
            email: "refunded@example.com",
            status: "cancelled",
            paidAmount: paid.value,
            paidOn: "2026-10-21",
            cancelReason: "no puede asistir",
            refund: {
              amount: money(5000),
              refundedOn: "2026-10-23",
              note: "parcial",
            },
          }),
        ],
      },
      "2026-10-28",
    );
    const card = (name: string) => {
      render(
        <IntensiveRequestsScreen view={balanceView} feedback={undefined} />,
      );
      return screen.getByRole("article", { name });
    };

    it("prefills the deposit form with the deposit the person was quoted", () => {
      const quoted = intensiveRequestsView(
        {
          intensivo: buildIntensiveOffer(),
          confirmedSeats: 0,
          requests: [
            buildStoredRequest({
              id: "quoted",
              fullName: "Cotizada",
              price: money(30000),
              deposit: money(10000),
            }),
          ],
        },
        "2026-10-28",
      );
      render(<IntensiveRequestsScreen view={quoted} feedback={undefined} />);

      const form = screen.getByRole("form", {
        name: "Registrar la seña: Cotizada",
      });
      expect(within(form).getByLabelText("Seña cobrada")).toHaveValue("10000");
      expect(form).toHaveTextContent("seña de este proyecto");
    });

    it("shows the balance still owed and a form that prefills it", () => {
      const owes = card("Debe Saldo");

      expect(
        within(owes).getByText("Saldo").nextElementSibling?.textContent,
      ).toMatch(/^Pendiente: \$\s25\.000$/);
      const form = within(owes).getByRole("form", {
        name: "Registrar el saldo: Debe Saldo",
      });
      expect(form).toHaveAttribute("method", "post");
      expect(form.querySelector('input[name="intent"]')).toHaveValue("balance");
      expect(form.querySelector('input[name="requestId"]')).toHaveValue("owes");
      expect(within(form).getByLabelText("Saldo cobrado")).toHaveValue("25000");
      expect(within(form).getByLabelText("Fecha del pago")).toHaveValue(
        "2026-10-28",
      );
    });

    it("shows a paid balance with its note and author, and no second balance form", () => {
      const settled = card("Pagó Todo");

      expect(
        within(settled).getByText("Saldo").nextElementSibling?.textContent,
      ).toMatch(/^Cobrado: \$\s25\.000 el 25\/10\/2026$/);
      expect(within(settled).getByText("efectivo")).toBeInTheDocument();
      expect(
        within(settled).getByText(/duena@example\.com, 25\/10\/2026/),
      ).toBeInTheDocument();
      expect(
        within(settled).queryByRole("form", { name: /Registrar el saldo/ }),
      ).toBeNull();
    });

    it("says there is no balance when the deposit covered the price", () => {
      const whole = card("Seña Completa");

      expect(
        within(whole).getByText("Saldo").nextElementSibling,
      ).toHaveTextContent("No hay saldo");
      expect(
        within(whole).queryByRole("form", { name: /Registrar el saldo/ }),
      ).toBeNull();
    });

    it("asks a confirmed request for its refund, prefilled with what it paid", () => {
      const owes = card("Debe Saldo");

      const cancel = within(owes).getByRole("form", {
        name: "Cancelar la solicitud: Debe Saldo",
      });
      const amount = within(cancel).getByLabelText("Monto devuelto");
      expect(amount).toHaveValue("15000");
      expect(amount).toHaveAccessibleDescription(
        /Poné 0 si no devolviste nada/,
      );
      expect(within(cancel).getByLabelText("Fecha de devolución")).toHaveValue(
        "2026-10-28",
      );
      expect(
        within(cancel).getByLabelText("Nota de la devolución (opcional)"),
      ).toBeInTheDocument();
      expect(cancel).toHaveTextContent("los materiales vuelven al stock");
    });

    it("prefills the refund with deposit plus balance once the balance was paid", () => {
      const settled = card("Pagó Todo");

      expect(within(settled).getByLabelText("Monto devuelto")).toHaveValue(
        "40000",
      );
    });

    it("asks a pending request for no refund", () => {
      render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

      const cancel = within(
        screen.getByRole("article", { name: "Ana Pérez" }),
      ).getByRole("form", { name: "Cancelar la solicitud: Ana Pérez" });
      expect(within(cancel).queryByLabelText("Monto devuelto")).toBeNull();
    });

    it("shows the refund of a cancelled request and no forms", () => {
      const refunded = card("Devuelta Ana");

      expect(
        within(refunded).getByText("Monto devuelto").nextElementSibling
          ?.textContent,
      ).toMatch(/^\$\s5\.000$/);
      expect(within(refunded).getByText("23/10/2026")).toBeInTheDocument();
      expect(within(refunded).getByText("parcial")).toBeInTheDocument();
      expect(within(refunded).queryByRole("form")).toBeNull();
    });

    it("shows a rejected balance form on its own request and opens the confirmed group", async () => {
      const feedback: IntensiveRequestFeedback = {
        requestId: "owes",
        intent: "balance",
        formError: "El saldo de esta reserva ya estaba registrado.",
        errors: { amount: "Ingresá el saldo completo." },
        values: { amount: "100", paidOn: "2026-10-27", note: "" },
      };
      const { container } = render(
        <IntensiveRequestsScreen view={balanceView} feedback={feedback} />,
      );

      const owes = screen.getByRole("article", { name: "Debe Saldo" });
      expect(within(owes).getByLabelText("Saldo cobrado")).toHaveValue("100");
      expect(
        within(owes).getByLabelText("Saldo cobrado"),
      ).toHaveAccessibleDescription(/Ingresá el saldo completo/);
      expect(owes).toHaveTextContent("ya estaba registrado");
      expect(
        screen
          .getByRole("heading", { name: "Confirmadas (3)" })
          .closest("details"),
      ).toHaveAttribute("open");
      await expectNoAxeViolations(container);
    });

    it("shows the banner of a recorded balance", () => {
      render(
        <IntensiveRequestsScreen
          view={balanceView}
          feedback={undefined}
          done="balance"
        />,
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        "Saldo registrado: la reserva quedó paga",
      );
    });
  });
});
