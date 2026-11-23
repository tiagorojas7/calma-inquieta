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
import { parseReservationBrowse } from "./reservation-browse";

const money = (pesos: number): Money => {
  const value = Money.fromCentavos(pesos * 100);
  if (!value.ok) throw new Error("bad money");
  return value.value;
};
const paid = money(15000);

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
        paidAmount: paid,
        paidOn: "2026-10-21",
        paymentNote: "transferencia",
        price: money(15000),
        deposit: money(15000),
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

const confirmedBase = {
  status: "confirmed",
  paidAmount: paid,
  paidOn: "2026-10-21",
  projectId: FAKE_PROJECT_ID,
  price: money(40000),
  deposit: money(15000),
} as const;

const balanceView = intensiveRequestsView(
  {
    intensivo: buildIntensiveOffer(),
    confirmedSeats: 2,
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
    ],
  },
  "2026-10-28",
);

const card = (name: string) => screen.getByRole("article", { name });
const detailsOf = (scope: HTMLElement, label: string) =>
  within(scope).getByText(label).closest("details");

describe("IntensiveRequestsScreen", () => {
  it("names the workshop, its date and seats, and goes back to Clases", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Intensivo de cerámica/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 lugares/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a Clases" }),
    ).toHaveAttribute("href", "/admin/clases");
  });

  it("shows each person as a card with her project and the state in words", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    expect(
      within(card("Ana Pérez")).getByText("Proyecto: Taza de torno"),
    ).toBeInTheDocument();
    expect(card("Ana Pérez")).toHaveTextContent("Pidió lugar");
    expect(card("Bea Gómez")).toHaveTextContent("Pagó todo");
  });

  it("gives a pending request one button with the deposit and a form that returns to her card", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const form = within(card("Ana Pérez")).getByRole("form", {
      name: /Confirmar seña/,
    });
    expect(
      within(form).getByRole("button", {
        name: /^Confirmar seña \$\s15\.000$/,
      }),
    ).toBeInTheDocument();
    const hidden = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value;
    expect(hidden("intent")).toBe("confirm");
    expect(hidden("requestId")).toBe("pending-1");
    expect(hidden("intensiveId")).toBe(view.intensivo.id);
    expect(hidden("returnTo")).toBe(
      `/admin/intensivos/${view.intensivo.id}/reservas?ver=pending-1`,
    );
    expect(hidden("anchor")).toBe("reserva-pending-1");
    expect(within(form).getByLabelText("Monto")).toHaveValue("15000");
    expect(within(form).getByLabelText("Fecha")).toHaveValue("2026-10-28");
    expect(detailsOf(form, "Otro monto o fecha")).not.toHaveAttribute("open");
  });

  it("offers the balance of a confirmed request in one button, and none once it is paid", () => {
    render(<IntensiveRequestsScreen view={balanceView} feedback={undefined} />);

    const owes = card("Debe Saldo");
    expect(owes.querySelector("[data-summary-tone]")).toHaveTextContent(
      /Debe \$\s25\.000/,
    );
    expect(owes.querySelector("[data-facts]")).toHaveTextContent(
      "Pagó la seña",
    );
    expect(owes.querySelector("[data-facts]")).not.toHaveTextContent(
      "$ 25.000",
    );
    expect(
      within(owes).getByRole("button", { name: /^Cobrar saldo \$\s25\.000$/ }),
    ).toBeInTheDocument();
    expect(within(owes).getByLabelText("Monto")).toHaveValue("25000");
    expect(card("Pagó Todo")).toHaveTextContent("Pagó todo");
    expect(
      within(card("Pagó Todo")).queryByRole("button", {
        name: /Cobrar|Confirmar/,
      }),
    ).toBeNull();
  });

  it("keeps cancelling behind Cancelar, asking a confirmed request for her refund", () => {
    render(<IntensiveRequestsScreen view={balanceView} feedback={undefined} />);

    const cancel = within(card("Debe Saldo")).getByRole("form", {
      name: /^Cancelar/,
    });
    expect(detailsOf(cancel, "Cancelar")).not.toHaveAttribute("open");
    expect(within(cancel).getByLabelText("Motivo")).toBeRequired();
    expect(within(cancel).getByLabelText("Devolviste")).toHaveValue("15000");
    expect(within(cancel).getByLabelText("Fecha de devolución")).toHaveValue(
      "2026-10-28",
    );
    expect(
      within(cancel).getByRole("button", { name: "Sí, cancelar" }),
    ).toBeInTheDocument();
    const settled = within(card("Pagó Todo")).getByRole("form", {
      name: /^Cancelar/,
    });
    expect(within(settled).getByLabelText("Devolviste")).toHaveValue("40000");
  });

  it("asks a pending request for no refund", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const cancel = within(card("Ana Pérez")).getByRole("form", {
      name: /^Cancelar/,
    });
    expect(within(cancel).queryByLabelText("Devolviste")).toBeNull();
  });

  it("puts what is not needed behind Ver más", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const more = detailsOf(card("Ana Pérez"), "Ver más");
    expect(more).not.toHaveAttribute("open");
    expect(more).toHaveTextContent("Condiciones v2 · Privacidad v3");
    expect(more).toHaveTextContent("WhatsApp");
  });

  it("keeps cancelled requests behind a link, with the reason", () => {
    render(<IntensiveRequestsScreen view={view} feedback={undefined} />);

    const group = screen.getByText("Canceladas (1)").closest("details");
    expect(group).not.toHaveAttribute("open");
    expect(group).toHaveTextContent("Carla Ruiz");
    expect(group).toHaveTextContent("Motivo: no puede asistir");
    expect(within(card("Carla Ruiz")).queryByRole("form")).toBeNull();
  });

  it("shows a rejected form's errors and values only on its own person, with the form open", async () => {
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

    const owes = card("Debe Saldo");
    expect(within(owes).getByLabelText("Monto")).toHaveValue("100");
    expect(within(owes).getByLabelText("Monto")).toHaveAccessibleDescription(
      /Ingresá el saldo completo/,
    );
    expect(owes).toHaveTextContent("ya estaba registrado");
    expect(detailsOf(owes, "Otro monto o fecha")).toHaveAttribute("open");
    expect(within(owes).getAllByRole("alert")).toHaveLength(2);
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    await expectNoAxeViolations(container);
  });

  it("opens the cancel step of the person whose cancel was refused", () => {
    render(
      <IntensiveRequestsScreen
        view={view}
        feedback={{
          requestId: "pending-1",
          intent: "cancel",
          formError: undefined,
          errors: { reason: "Contanos el motivo." },
          values: { reason: "" },
        }}
      />,
    );

    expect(detailsOf(card("Ana Pérez"), "Cancelar")).toHaveAttribute("open");
  });

  it("confirms what was saved in a few words", () => {
    render(
      <IntensiveRequestsScreen
        view={view}
        feedback={undefined}
        done="confirmed"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardado: seña confirmada",
    );
  });

  it("uses only plain anchors and native forms, and has no accessibility violations", async () => {
    const { container } = render(
      <IntensiveRequestsScreen view={view} feedback={undefined} />,
    );

    for (const form of container.querySelectorAll("form"))
      expect(form).toHaveAttribute("method", "post");
    expect(container.querySelectorAll("a").length).toBeGreaterThan(0);
    await expectNoAxeViolations(container);
  });
});

const crowd = intensiveRequestsView(
  {
    intensivo: buildIntensiveOffer({ capacity: 30 }),
    confirmedSeats: 4,
    requests: [
      ...Array.from({ length: 8 }, (_, index) =>
        buildStoredRequest({
          id: `pending-${String(index)}`,
          fullName: `Pendiente ${String(index)}`,
          email: `pending${String(index)}@example.com`,
          projectId: FAKE_PROJECT_ID,
        }),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        buildStoredRequest({
          ...confirmedBase,
          id: `owes-${String(index)}`,
          fullName: `Saldo ${String(index)}`,
          email: `owes${String(index)}@example.com`,
        }),
      ),
      buildStoredRequest({
        ...confirmedBase,
        id: "settled-0",
        fullName: "Josefina Núñez",
        email: "jose@example.com",
        balance: {
          amount: money(25000),
          paidOn: "2026-10-25",
          note: null,
          by: "duena@example.com",
          at: new Date("2026-10-25T15:00:00.000Z"),
        },
      }),
    ],
  },
  "2026-10-28",
);
const crowdPath = `/admin/intensivos/${crowd.intensivo.id}/reservas`;
const browse = (query: string) =>
  parseReservationBrowse(new URLSearchParams(query));

describe("IntensiveRequestsScreen with many reservations", () => {
  it("shows at most six people, says how many there are and counts each state", () => {
    render(
      <IntensiveRequestsScreen
        view={crowd}
        feedback={undefined}
        browse={browse("")}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(screen.getByText("Mostrando 6 de 12")).toBeInTheDocument();
    const filters = screen.getByRole("navigation", { name: "Ver reservas" });
    expect(
      within(filters).getByRole("link", { name: "Todas 12" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(filters).getByRole("link", { name: "Por confirmar 8" }),
    ).toHaveAttribute("href", `${crowdPath}?estado=por-confirmar#reservas`);
    expect(
      within(filters).getByRole("link", { name: "Deben saldo 3" }),
    ).toBeInTheDocument();
    expect(
      within(filters).getByRole("link", { name: "Pagadas 1" }),
    ).toBeInTheDocument();
  });

  it("shows only the people of the chosen state", () => {
    render(
      <IntensiveRequestsScreen
        view={crowd}
        feedback={undefined}
        browse={browse("estado=deben-saldo")}
      />,
    );

    const names = screen
      .getAllByRole("article")
      .map((article) => article.getAttribute("aria-label") ?? article.id);
    expect(names).toHaveLength(3);
    expect(card("Saldo 0")).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Pendiente 0" })).toBeNull();
    expect(screen.getByRole("link", { name: "Deben saldo 3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("finds a person by name without accents or capitals, with a native search form", () => {
    render(
      <IntensiveRequestsScreen
        view={crowd}
        feedback={undefined}
        browse={browse("buscar=nunez")}
      />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(card("Josefina Núñez")).toBeInTheDocument();
    const search = screen.getByRole("search");
    const form = search.closest("form") ?? search;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", `${crowdPath}#reservas`);
    expect(within(search).getByLabelText("Buscar por nombre")).toHaveValue(
      "nunez",
    );
    expect(
      screen.getByRole("link", { name: "Borrar búsqueda" }),
    ).toHaveAttribute("href", `${crowdPath}#reservas`);
  });

  it("says so when nobody matches", () => {
    render(
      <IntensiveRequestsScreen
        view={crowd}
        feedback={undefined}
        browse={browse("buscar=zzz")}
      />,
    );

    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      screen.getByText("No hay reservas con ese nombre."),
    ).toBeInTheDocument();
  });

  it("keeps the person just acted on in view, and her forms come back with the same filter", () => {
    render(
      <IntensiveRequestsScreen
        view={crowd}
        feedback={undefined}
        browse={browse("estado=por-confirmar&ver=settled-0")}
      />,
    );

    const kept = card("Josefina Núñez");
    expect(kept).toBeInTheDocument();
    const form = within(card("Pendiente 0")).getByRole("form", {
      name: /Confirmar seña/,
    });
    expect(
      form.querySelector<HTMLInputElement>('input[name="returnTo"]')?.value,
    ).toBe(`${crowdPath}?estado=por-confirmar&ver=pending-0`);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <IntensiveRequestsScreen
        view={crowd}
        feedback={undefined}
        browse={browse("")}
      />,
    );
    await expectNoAxeViolations(container);
  });
});
