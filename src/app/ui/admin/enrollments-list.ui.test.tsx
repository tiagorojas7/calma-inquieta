import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EnrollmentsList, type EnrollmentsListProps } from "./enrollments-list";

const props: EnrollmentsListProps = {
  rows: [
    {
      id: "o1",
      number: "CI-2026-0007",
      studentName: "Ana Pérez",
      workshopName: "Cerámica",
      month: "noviembre 2026",
      turno: "Lunes",
      status: "pending_confirmation",
      statusLabel: "Pendiente de confirmación",
      total: "$ 58.000",
      requestedOn: "31/10/2026",
    },
  ],
  filter: {
    estado: "pending_confirmation",
    mes: "",
    taller: "",
    q: "",
    page: 1,
  },
  workshops: [{ id: "w1", name: "Cerámica" }],
  hasNext: true,
};

describe("EnrollmentsList", () => {
  it("lists the orders with a link to each detail", async () => {
    const { container } = render(<EnrollmentsList {...props} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Inscripciones" }),
    ).toBeVisible();
    const row = screen.getByRole("row", { name: /CI-2026-0007/ });
    expect(
      within(row).getByRole("link", { name: "CI-2026-0007" }),
    ).toHaveAttribute("href", "/admin/inscripciones/o1");
    for (const cell of [
      "Ana Pérez",
      "Cerámica",
      "noviembre 2026",
      "Lunes",
      "$ 58.000",
      "31/10/2026",
      "Pendiente de confirmación",
    ])
      expect(within(row).getByText(cell)).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("offers a GET filter form that keeps the current values", () => {
    render(
      <EnrollmentsList
        {...props}
        filter={{ ...props.filter, q: "ana@", mes: "2026-11", taller: "w1" }}
      />,
    );

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("method", "get");
    expect(within(form).getByLabelText("Buscar")).toHaveValue("ana@");
    expect(within(form).getByLabelText("Mes")).toHaveValue("2026-11");
    expect(within(form).getByLabelText("Taller")).toHaveValue("w1");
    expect(within(form).getByLabelText("Estado")).toHaveValue(
      "pending_confirmation",
    );
  });

  it("paginates with plain links that keep the filters", () => {
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

  it("shows an empty state when nothing matches", () => {
    render(<EnrollmentsList {...props} rows={[]} hasNext={false} />);

    expect(
      screen.getByText("No hay inscripciones para este filtro"),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
