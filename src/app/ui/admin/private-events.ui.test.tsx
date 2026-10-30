import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PrivateEventDetail } from "./private-event-detail";
import { PrivateEventsList } from "./private-events-list";

const statusOptions = [
  { value: "nueva", label: "Nueva" },
  { value: "contactada", label: "Contactada" },
  { value: "cerrada", label: "Cerrada" },
];

const row = {
  id: "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01",
  receivedOn: "28/10/2026",
  name: "Ana Pérez",
  desiredDate: "05/12/2026",
  place: "Casa en Nueva Córdoba",
  participants: 12,
  status: "nueva",
  statusLabel: "Nueva",
};

describe("PrivateEventsList", () => {
  it("shows breadcrumbs, a count and cards instead of a table", () => {
    render(
      <PrivateEventsList
        rows={[row]}
        filter=""
        statusOptions={statusOptions}
      />,
    );

    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(crumbs).getByRole("link", { name: "Panel" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByText("1 consulta")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Eventos privados" }),
    ).toBeVisible();
  });

  it("lists requests with a plain link to the detail and a GET filter", async () => {
    const { container } = render(
      <PrivateEventsList
        rows={[row]}
        filter="nueva"
        statusOptions={statusOptions}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Eventos privados",
    );
    expect(screen.getByRole("link", { name: "Ana Pérez" })).toHaveAttribute(
      "href",
      `/admin/eventos/${row.id}`,
    );
    const filter = screen.getByRole("search", { name: "Filtrar consultas" });
    expect(filter).toHaveAttribute("method", "get");
    expect(within(filter).getByLabelText("Estado")).toHaveValue("nueva");
    expect(screen.getByText("12")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("shows the empty state without rows", () => {
    render(
      <PrivateEventsList rows={[]} filter="" statusOptions={statusOptions} />,
    );

    expect(screen.getByText("Todavía no hay consultas")).toBeInTheDocument();
  });
});

describe("PrivateEventDetail", () => {
  const request = {
    id: row.id,
    name: "Ana Pérez",
    phone: "5493515550101",
    whatsappHref: "https://wa.me/5493515550101?text=",
    email: null,
    desiredDate: "05/12/2026",
    place: "Casa en Nueva Córdoba",
    participants: 12,
    notes: null,
    receivedAt: "28/10/2026 12:00",
    status: "nueva",
    statusLabel: "Nueva",
    statusChanged: null,
    statusOptions,
  };

  it("shows the contact data and a native status form", async () => {
    const { container } = render(<PrivateEventDetail request={request} />);

    expect(screen.getByText("5493515550101")).toBeInTheDocument();
    expect(screen.getByText("No dejó correo")).toBeInTheDocument();
    expect(screen.getByText("Sin observaciones")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Escribirle por WhatsApp" }),
    ).toHaveAttribute("href", request.whatsappHref);
    const form = screen.getByRole("form", { name: "Estado de la consulta" });
    expect(form).toHaveAttribute("method", "post");
    expect(within(form).getByLabelText("Estado")).toHaveValue("nueva");
    expect(
      screen.getByRole("link", { name: "Volver a las consultas" }),
    ).toHaveAttribute("href", "/admin/eventos");
    await expectNoAxeViolations(container);
  });

  it("shows breadcrumbs and a top back link", () => {
    render(<PrivateEventDetail request={request} />);

    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(
      within(crumbs).getByRole("link", { name: "Eventos privados" }),
    ).toHaveAttribute("href", "/admin/eventos");
  });

  it("confirms a saved status with a status message", () => {
    render(<PrivateEventDetail request={request} feedback="status-saved" />);

    expect(screen.getByRole("status")).toHaveTextContent("Estado actualizado");
  });

  it("shows who changed the status and a form error", () => {
    render(
      <PrivateEventDetail
        request={{ ...request, statusChanged: "a@x.test, 29/10/2026 10:00" }}
        formError="Elegí un estado de la lista e intentá de nuevo."
      />,
    );

    expect(screen.getByText("a@x.test, 29/10/2026 10:00")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Elegí un estado");
  });
});
