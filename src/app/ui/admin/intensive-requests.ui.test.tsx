import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { intensiveRequestsView } from "~/app/intensive-requests/admin-view";
import { Money } from "~/modules/_shared";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import { buildIntensiveOffer } from "~/testing/fakes/intensive-request-builders";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensiveRequestsScreen } from "./intensive-requests";

const paid = Money.fromCentavos(1_500_000);
if (!paid.ok) throw new Error("bad money");

const view = intensiveRequestsView(
  {
    intensivo: buildIntensiveOffer(),
    confirmedSeats: 1,
    requests: [
      buildStoredRequest({ id: "pending-1", fullName: "Ana Pérez" }),
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

  it("shows the payment of a confirmed request, with cancel only", () => {
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
});
