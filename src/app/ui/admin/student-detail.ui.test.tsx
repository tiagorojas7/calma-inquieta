import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { StudentDetail, type StudentDetailProps } from "./student-detail";

const student: StudentDetailProps["student"] = {
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "5493515550000",
  activities: [
    {
      workshop: "Cerámica",
      month: "octubre 2026",
      turno: "Martes 18:00 a 20:00",
      status: "paid",
      statusLabel: "Cobrado",
    },
  ],
  orders: [
    {
      id: "o2",
      number: "CI-2026-0002",
      workshop: "Acuarela",
      month: "noviembre 2026",
      status: "pending_confirmation",
      statusLabel: "Pendiente de confirmación",
      total: "$ 58.000",
      paidOn: null,
    },
    {
      id: "o1",
      number: "CI-2026-0001",
      workshop: "Cerámica",
      month: "octubre 2026",
      status: "paid",
      statusLabel: "Cobrado",
      total: "$ 58.000",
      paidOn: "05/10/2026",
    },
  ],
  note: {
    text: "Zurda.",
    meta: "Actualizadas por owner@example.com el 31/10/2026 12:30.",
  },
};

describe("StudentDetail", () => {
  it("shows breadcrumbs, a top back link and the order history as cards", () => {
    render(<StudentDetail student={student} />);

    const crumbs = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(
      within(crumbs).getByRole("link", { name: "Alumnas" }),
    ).toHaveAttribute("href", "/admin/alumnas");
    expect(
      screen.getByRole("link", { name: "Volver a alumnas" }),
    ).toHaveAttribute("href", "/admin/alumnas");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("confirms a saved note with a status message", () => {
    render(<StudentDetail student={student} feedback="note-saved" />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Observaciones guardadas",
    );
  });

  it("shows her data, activities and order history with links to each order", async () => {
    const { container } = render(<StudentDetail student={student} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Ana Pérez" }),
    ).toBeVisible();
    expect(screen.getByText("ana@example.com")).toBeVisible();
    expect(screen.getByText("5493515550000")).toBeVisible();

    const activities = screen.getByRole("region", {
      name: "Talleres e intensivos",
    });
    expect(within(activities).getByText("Martes 18:00 a 20:00")).toBeVisible();

    const history = screen.getByRole("region", {
      name: "Historial de pedidos y pagos",
    });
    expect(
      within(history).getByRole("link", { name: "CI-2026-0002" }),
    ).toHaveAttribute("href", "/admin/inscripciones/o2");
    expect(within(history).getByText("05/10/2026")).toBeVisible();
    expect(within(history).getByText("Sin cobrar")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("offers a native post form with the saved note", () => {
    render(<StudentDetail student={student} />);

    const form = screen.getByRole("form", { name: "Observaciones" });
    expect(form).toHaveAttribute("method", "post");
    expect(
      within(form).getByLabelText("Observaciones sobre la alumna"),
    ).toHaveValue("Zurda.");
    expect(
      within(form).getByText(
        "Actualizadas por owner@example.com el 31/10/2026 12:30.",
      ),
    ).toBeVisible();
    expect(
      within(form).getByRole("button", { name: "Guardar observaciones" }),
    ).toBeVisible();
  });

  it("keeps the typed text and shows the error after a refused save", () => {
    render(
      <StudentDetail
        student={student}
        form={{ error: "Demasiado largo.", value: "Texto nuevo" }}
      />,
    );

    const field = screen.getByLabelText("Observaciones sobre la alumna");
    expect(field).toHaveValue("Texto nuevo");
    expect(field).toHaveAccessibleDescription(/Demasiado largo\./);
  });

  it("says so when she has no current enrollments", () => {
    render(<StudentDetail student={{ ...student, activities: [] }} />);

    expect(
      screen.getByText("Todavía no tiene inscripciones vigentes."),
    ).toBeVisible();
  });

  it("summarizes her attendance and make-up classes", () => {
    render(
      <StudentDetail
        student={{
          ...student,
          attendance: {
            present: "8",
            absent: "2",
            makeUpsPending: "1",
            makeUpsDone: "1",
          },
        }}
      />,
    );

    const summary = screen.getByRole("region", { name: "Asistencia" });
    expect(summary).toHaveTextContent("Clases a las que vino8");
    expect(summary).toHaveTextContent("Clases que faltó2");
    expect(summary).toHaveTextContent("Recuperaciones pendientes1");
    expect(summary).toHaveTextContent("Recuperaciones realizadas1");
  });

  it("shows no attendance section when it is unavailable", () => {
    render(<StudentDetail student={{ ...student, attendance: null }} />);
    expect(screen.queryByRole("region", { name: "Asistencia" })).toBeNull();
  });
});
