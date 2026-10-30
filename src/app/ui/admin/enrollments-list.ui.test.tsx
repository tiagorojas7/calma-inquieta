import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentsList, type EnrollmentsListProps } from "./enrollments-list";

const pending = {
  id: "o1",
  number: "CI-2026-0007",
  studentName: "Ana Pérez",
  workshopName: "Cerámica",
  month: "noviembre 2026",
  turno: "Lunes",
  status: "pending_confirmation",
  statusLabel: "Pendiente de confirmación",
  total: "$ 58.000",
  totalPesos: "58000",
  requestedOn: "31/10/2026",
};

const props: EnrollmentsListProps = {
  rows: [pending],
  filter: {
    estado: "pending_confirmation",
    mes: "",
    taller: "",
    q: "",
    page: 1,
  },
  tab: "por-cobrar",
  counts: { "por-cobrar": "1", pagadas: "4", canceladas: "50+" },
  today: "2026-10-31",
  workshops: [{ id: "w1", name: "Cerámica" }],
  hasNext: true,
  feedback: null,
};

const paidProps: EnrollmentsListProps = {
  ...props,
  tab: "pagadas",
  filter: { ...props.filter, estado: "paid" },
  rows: [
    { ...pending, status: "paid", statusLabel: "Cobrado" },
    {
      ...pending,
      id: "o2",
      number: "CI-2026-0008",
      status: "materials_requested",
      statusLabel: "Solicitado al proveedor",
    },
  ],
};

describe("EnrollmentsList tabs", () => {
  it("shows Por cobrar, Pagadas and Canceladas as plain links with a count", () => {
    render(<EnrollmentsList {...props} />);

    const nav = screen.getByRole("navigation", {
      name: "Estados de inscripciones",
    });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Por cobrar 1",
      "Pagadas 4",
      "Canceladas 50+",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/inscripciones?estado=pending_confirmation",
      "/admin/inscripciones?estado=paid",
      "/admin/inscripciones?estado=cancelled",
    ]);
  });

  it("marks only the active tab", () => {
    render(<EnrollmentsList {...paidProps} />);

    const nav = screen.getByRole("navigation", {
      name: "Estados de inscripciones",
    });
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.hasAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Pagadas");
  });

  it("keeps the month, taller and search filters when changing tab", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{
          ...props.filter,
          mes: "2026-11",
          taller: "w1",
          q: "ana",
          page: 3,
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /^Pagadas/ })).toHaveAttribute(
      "href",
      "/admin/inscripciones?estado=paid&mes=2026-11&taller=w1&q=ana",
    );
  });
});

describe("EnrollmentsList Por cobrar", () => {
  it("shows the student, taller, month, total and a link to the detail and contact", async () => {
    const { container } = render(<EnrollmentsList {...props} />);

    const card = within(
      screen.getByRole("list", { name: "Inscripciones" }),
    ).getByRole("listitem");
    for (const text of [
      "CI-2026-0007",
      "Ana Pérez",
      "Cerámica · noviembre 2026 · Lunes",
      "$ 58.000",
    ])
      expect(within(card).getByText(text)).toBeVisible();
    expect(
      within(card).getByRole("link", {
        name: "Ver detalle y contacto del pedido CI-2026-0007",
      }),
    ).toHaveAttribute("href", "/admin/inscripciones/o1");
    await expectNoAxeViolations(container);
  });

  it("links the student's WhatsApp on the card only when a link exists", () => {
    const { rerender } = render(
      <EnrollmentsList
        {...props}
        rows={[{ ...pending, whatsappHref: "https://wa.me/5493515550001" }]}
      />,
    );

    expect(
      screen.getByRole("link", { name: "WhatsApp con Ana Pérez" }),
    ).toHaveAttribute("href", "https://wa.me/5493515550001");

    rerender(<EnrollmentsList {...props} />);
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
  });

  it("marks paid with one native post: amount and date already filled", () => {
    render(<EnrollmentsList {...props} />);

    const card = within(
      screen.getByRole("list", { name: "Inscripciones" }),
    ).getByRole("listitem");
    const button = within(card).getByRole("button", { name: "Marcar pagado" });
    const form = button.closest("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/admin/inscripciones");
    const field = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    expect(field("intent")).toHaveValue("confirm");
    expect(field("orderId")).toHaveValue("o1");
    expect(field("amount")).toHaveValue("58000");
    expect(field("amount")?.type).toBe("hidden");
    expect(field("paidOn")).toHaveValue("2026-10-31");
    expect(field("paidOn")?.type).toBe("hidden");
    expect(field("returnTo")).toHaveValue(
      "/admin/inscripciones?estado=pending_confirmation",
    );
  });

  it("returns to the same list page, filters included", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, q: "ana", page: 2 }}
      />,
    );

    const form = screen
      .getByRole("button", { name: "Marcar pagado" })
      .closest("form") as HTMLFormElement;
    expect(form.querySelector('input[name="returnTo"]')).toHaveValue(
      "/admin/inscripciones?estado=pending_confirmation&q=ana&page=2",
    );
  });

  it("offers another amount, date and note behind a disclosure", () => {
    render(<EnrollmentsList {...props} />);

    const disclosure = screen.getByText("Otro monto").closest("details");
    expect(disclosure).not.toBeNull();
    expect(disclosure).not.toHaveAttribute("open");
    const form = disclosure?.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(within(form).getByLabelText("Monto cobrado")).toHaveValue("58000");
    expect(within(form).getByLabelText("Fecha de pago")).toHaveValue(
      "2026-10-31",
    );
    expect(within(form).getByLabelText("Fecha de pago")).toHaveAttribute(
      "max",
      "2026-10-31",
    );
    expect(within(form).getByLabelText("Nota (opcional)")).toBeInTheDocument();
    expect(
      within(form).getByRole("button", { name: "Registrar este pago" }),
    ).toBeInTheDocument();
  });

  it("cancels from the card with a required reason of 3 to 300 characters", () => {
    render(<EnrollmentsList {...props} />);

    const disclosure = screen.getByText("Cancelar").closest("details");
    expect(disclosure).not.toBeNull();
    const form = disclosure?.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector('input[name="intent"]')).toHaveValue("cancel");
    expect(form.querySelector('input[name="orderId"]')).toHaveValue("o1");
    expect(form.querySelector('input[name="returnTo"]')).toHaveValue(
      "/admin/inscripciones?estado=pending_confirmation",
    );
    const reason = within(form).getByLabelText("Motivo");
    expect(reason).toBeRequired();
    expect(reason).toHaveAttribute("minlength", "3");
    expect(reason).toHaveAttribute("maxlength", "300");
    const danger = within(form).getByRole("button", {
      name: "Cancelar inscripción",
    });
    expect(danger).toHaveAttribute("data-variant", "danger");
  });

  it("has one primary button per card: Marcar pagado", () => {
    render(<EnrollmentsList {...props} />);

    const primary = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("data-variant") === "primary")
      .map((button) => button.textContent);
    expect(primary).toEqual(["Marcar pagado", "Registrar este pago"]);
  });

  it("shows an empty state when nothing is pending", () => {
    render(
      <EnrollmentsList
        {...props}
        rows={[]}
        hasNext={false}
        counts={{ "por-cobrar": "0", pagadas: "0", canceladas: "0" }}
      />,
    );

    expect(screen.getByText("No hay inscripciones por cobrar")).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("EnrollmentsList Pagadas and Canceladas", () => {
  it("lists them as cards below lg and a table from lg, with a status chip", () => {
    render(<EnrollmentsList {...paidProps} />);

    const list = screen.getByRole("list", { name: "Inscripciones" });
    const table = screen.getByRole("table", { name: "Inscripciones" });
    expect(list.closest(".lg\\:hidden")).not.toBeNull();
    expect(table.closest(".hidden.lg\\:block")).not.toBeNull();
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Pedido",
      "Alumno",
      "Taller",
      "Mes",
      "Turno",
      "Estado",
      "Total",
      "Solicitado",
    ]);
    const row = within(table).getAllByRole("row")[2] as HTMLElement;
    expect(within(row).getByText("Solicitado al proveedor")).toHaveAttribute(
      "data-status",
      "materials_requested",
    );
    expect(
      within(row).getByRole("link", { name: "CI-2026-0008" }),
    ).toHaveAttribute("href", "/admin/inscripciones/o2");
  });

  it("offers no payment or cancel form on them", () => {
    render(<EnrollmentsList {...paidProps} />);

    expect(screen.queryByRole("button", { name: "Marcar pagado" })).toBeNull();
    expect(screen.queryByText("Otro monto")).toBeNull();
  });
});

describe("EnrollmentsList feedback and filters", () => {
  it("names the student in the success banner", () => {
    render(
      <EnrollmentsList
        {...props}
        feedback={{ kind: "paid", name: "Ana Pérez" }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Pago de Ana Pérez registrado",
    );
  });

  it("words a cancellation and an unnamed order", () => {
    const { rerender } = render(
      <EnrollmentsList
        {...props}
        feedback={{ kind: "cancelled", name: "Ana Pérez" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Inscripción de Ana Pérez cancelada",
    );

    rerender(
      <EnrollmentsList {...props} feedback={{ kind: "paid", name: null }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Pago registrado");
  });

  it("shows a refusal as an alert", () => {
    render(
      <EnrollmentsList
        {...props}
        actionError={{ error: "El pedido ya estaba cobrado.", orderId: "o1" }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El pedido ya estaba cobrado.",
    );
  });

  it("keeps the filters behind a toggle and shows the active ones as chips", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, mes: "2026-11", taller: "w1", q: "ana" }}
      />,
    );

    const chips = screen.getByRole("list", { name: "Filtros activos" });
    expect(
      within(chips)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Mes: 2026-11", "Taller: Cerámica", "Búsqueda: ana"]);
    const toggle = screen.getByText("Filtros");
    expect(toggle.tagName).toBe("SUMMARY");
    expect(toggle.closest("details")).toContainElement(
      screen.getByRole("search", { hidden: true }),
    );
  });

  it("offers a GET filter form that keeps the tab and the current values", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, q: "ana@", mes: "2026-11", taller: "w1" }}
      />,
    );

    const form = screen.getByRole("search", { hidden: true });
    expect(form).toHaveAttribute("method", "get");
    expect(form.querySelector('input[name="estado"]')).toHaveValue(
      "pending_confirmation",
    );
    expect(within(form).getByLabelText("Buscar")).toHaveValue("ana@");
    expect(within(form).getByLabelText("Mes")).toHaveValue("2026-11");
    expect(within(form).getByLabelText("Taller")).toHaveValue("w1");
  });

  it("paginates with plain links that keep the tab and filters", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, page: 2, q: "ana" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/admin/inscripciones?estado=pending_confirmation&q=ana&page=1",
    );
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute(
      "href",
      "/admin/inscripciones?estado=pending_confirmation&q=ana&page=3",
    );
  });
});
