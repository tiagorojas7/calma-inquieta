import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  AttendanceIndex,
  AttendanceSessions,
  type AttendanceIndexProps,
  type AttendanceSessionsProps,
} from "./attendance-screens";
import { AttendanceSheet, type AttendanceSheetProps } from "./attendance-sheet";

const index: AttendanceIndexProps = {
  filter: { mes: "2026-10", taller: "w1" },
  months: [{ value: "2026-10", label: "octubre 2026" }],
  workshops: [{ value: "w1", label: "Cerámica" }],
  rows: [
    {
      key: "p:t",
      href: "/admin/asistencia/p/t",
      workshop: "Cerámica",
      turno: "Lunes tarde",
      schedule: "Lunes 18:00 a 20:00 h",
      sessions: 4,
    },
  ],
};

describe("AttendanceIndex", () => {
  it("offers a GET filter and a plain link to the make-ups", async () => {
    const { container } = render(<AttendanceIndex {...index} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Asistencia" }),
    ).toBeVisible();
    const form = screen.getByRole("search", { name: "Asistencia" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/asistencia");
    expect(within(form).getByLabelText("Mes")).toHaveValue("2026-10");
    expect(within(form).getByLabelText("Taller")).toHaveValue("w1");
    expect(
      screen.getByRole("link", { name: "Recuperaciones" }),
    ).toHaveAttribute("href", "/admin/asistencia/recuperaciones");
    expect(
      screen.getByRole("link", { name: "Volver a Clases" }),
    ).toHaveAttribute("href", "/admin/clases");
    await expectNoAxeViolations(container);
  });

  it("shows each turno as a card with one button and no labels to read", () => {
    render(<AttendanceIndex {...index} />);

    const card = within(
      screen.getByRole("list", { name: "Asistencia" }),
    ).getByRole("listitem");
    expect(within(card).getByText("Cerámica")).toBeVisible();
    expect(
      within(card).getByText("Lunes tarde · Lunes 18:00 a 20:00 h"),
    ).toBeVisible();
    expect(within(card).getByText("4 clases")).toBeVisible();
    expect(
      within(card).getByRole("link", { name: "Abrir: Cerámica, Lunes tarde" }),
    ).toHaveAttribute("href", "/admin/asistencia/p/t");
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Migas de pan" }),
    ).toBeNull();
  });

  it("says there are no turnos for the filter", () => {
    render(<AttendanceIndex {...index} rows={[]} />);
    expect(
      screen.getByRole("heading", { name: "No hay turnos" }),
    ).toBeVisible();
    expect(screen.getByText("Probá con otro mes.")).toBeVisible();
  });
});

const sessions: AttendanceSessionsProps = {
  heading: "Cerámica, Lunes tarde",
  subtitle: "octubre 2026 · Lunes 18:00 a 20:00 h",
  rows: [
    {
      key: "2026-10-05",
      href: "/admin/asistencia/p/t/2026-10-05",
      date: "Lunes 05/10/2026",
      marked: "2",
      present: "1",
      absent: "1",
    },
    {
      key: "2026-10-12",
      href: "/admin/asistencia/p/t/2026-10-12",
      date: "Lunes 12/10/2026",
      marked: "0",
      present: "0",
      absent: "0",
    },
  ],
};

describe("AttendanceSessions", () => {
  it("lists each class date with who came and who did not, and a plain link", async () => {
    const { container } = render(<AttendanceSessions {...sessions} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Cerámica, Lunes tarde" }),
    ).toBeVisible();
    const [marked, empty] = within(
      screen.getByRole("list", { name: "Cerámica, Lunes tarde" }),
    ).getAllByRole("listitem") as [HTMLElement, HTMLElement];
    expect(
      within(marked).getByRole("link", { name: "Abrir: Lunes 05/10/2026" }),
    ).toHaveAttribute("href", "/admin/asistencia/p/t/2026-10-05");
    expect(marked).toHaveTextContent("Vinieron: 1 · Faltaron: 1");
    expect(empty).not.toHaveTextContent("Vinieron");
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute(
      "href",
      "/admin/asistencia",
    );
    await expectNoAxeViolations(container);
  });
});

const sheet: AttendanceSheetProps = {
  heading: "Lunes 05/10/2026",
  subtitle: "Cerámica, Lunes tarde · octubre 2026",
  backHref: "/admin/asistencia/p/t",
  path: "/admin/asistencia/p/t/2026-10-05",
  pendingNote: "Debe la cuota del mes. Podés marcarla igual.",
  makeUpFullWarning: "Quedó agendada, pero ese turno ya está completo ese día.",
  makeUpTurnos: [
    { value: "p:u", label: "Cerámica, Miércoles (octubre 2026)" },
    { value: "p:v", label: "Cerámica, Viernes (octubre 2026)" },
  ],
  rows: [
    {
      email: "ana@example.com",
      name: "Ana Pérez",
      orderNumber: "CI-1",
      feePaid: true,
      status: "absent",
      makeUp: null,
    },
    {
      email: "caro@example.com",
      name: "Caro Díaz",
      orderNumber: "CI-2",
      feePaid: false,
      status: null,
      makeUp: null,
    },
  ],
};

describe("AttendanceSheet", () => {
  it("gives each student two big toggles, Vino and Faltó, that post with the one form", async () => {
    const { container } = render(<AttendanceSheet {...sheet} />);

    const marking = screen.getByRole("form", {
      name: "Asistencia de la clase",
    });
    expect(marking).toHaveAttribute("method", "post");
    expect(marking.id).toBe("attendance-sheet");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    for (const radio of radios)
      expect(radio).toHaveAttribute("form", "attendance-sheet");
    const ana = screen.getByRole("group", { name: "Ana Pérez" });
    expect(within(ana).getByLabelText("Faltó")).toBeChecked();
    expect(within(ana).getByLabelText("Vino")).not.toBeChecked();
    expect(within(ana).getByLabelText("Vino")).toHaveAttribute(
      "name",
      "status:ana@example.com",
    );
    expect(within(ana).getByLabelText("Vino").closest("label")).toHaveClass(
      "min-h-16",
    );
    await expectNoAxeViolations(container);
  });

  it("collects the marks into the one native form when it is submitted", () => {
    render(<AttendanceSheet {...sheet} />);

    const marking = screen.getByRole<HTMLFormElement>("form", {
      name: "Asistencia de la clase",
    });
    const data = new FormData(marking);
    expect(data.get("intent")).toBe("save");
    expect(data.get("returnTo")).toBe("/admin/asistencia/p/t/2026-10-05");
    expect(data.get("status:ana@example.com")).toBe("absent");
    expect(data.get("status:caro@example.com")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveAttribute(
      "form",
      "attendance-sheet",
    );
  });

  it("shows one big card per student and a sticky Guardar, with no breadcrumbs or order numbers", () => {
    render(<AttendanceSheet {...sheet} />);

    expect(
      within(screen.getByRole("list", { name: "Alumnas" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("navigation", { name: "Migas de pan" }),
    ).toBeNull();
    expect(screen.queryByText("CI-1")).toBeNull();
    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute(
      "href",
      "/admin/asistencia/p/t",
    );
    expect(
      screen.getByRole("button", { name: "Guardar" }).closest("div"),
    ).toHaveClass("sticky");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("keeps the pending-fee note and lets a pending student be marked like a paid one", () => {
    render(<AttendanceSheet {...sheet} />);

    expect(
      screen.getByText("Debe la cuota del mes. Podés marcarla igual."),
    ).toBeVisible();
    const caro = screen.getByRole("group", { name: "Caro Díaz" });
    expect(within(caro).getByLabelText("Vino")).toHaveAttribute(
      "name",
      "status:caro@example.com",
    );
    expect(within(caro).getByLabelText("Faltó")).toBeVisible();
  });

  it("says what was saved in a few words and shows a save error", () => {
    const { rerender } = render(
      <AttendanceSheet {...sheet} feedback={{ saved: true }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardado: asistencia guardada",
    );
    rerender(<AttendanceSheet {...sheet} feedback={{ error: "No pudimos" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos");
    rerender(
      <AttendanceSheet {...sheet} feedback={{ makeUpScheduled: true }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardado: recuperación agendada",
    );
  });

  it("has no Guardar when there are no students", () => {
    render(<AttendanceSheet {...sheet} rows={[]} />);
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    expect(
      screen.getByText("Todavía no hay alumnas en esta clase."),
    ).toBeVisible();
  });

  it("warns without blocking when the make-up turno is full", () => {
    render(
      <AttendanceSheet
        {...sheet}
        feedback={{ makeUpScheduled: true, makeUpFull: true }}
      />,
    );
    expect(
      screen.getByText(
        "Quedó agendada, pero ese turno ya está completo ese día.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  describe("make-up classes", () => {
    it("shows Agendar recuperación right on the row of a student saved as absent, and only hers", () => {
      render(<AttendanceSheet {...sheet} />);

      const form = screen.getByRole("form", {
        name: "Agendar recuperación: Ana Pérez",
      });
      expect(form).toHaveAttribute("method", "post");
      expect(form.closest("li")).toHaveTextContent("Ana Pérez");
      expect(form.querySelector("input[name=intent]")).toHaveValue("makeup");
      expect(form.querySelector("input[name=email]")).toHaveValue(
        "ana@example.com",
      );
      expect(form.querySelector("input[name=returnTo]")).toHaveValue(
        "/admin/asistencia/p/t/2026-10-05",
      );
      expect(form.querySelector("input[name=anchor]")).toHaveValue("alumna-1");
      expect(within(form).getByLabelText("Turno")).toHaveValue("p:u");
      expect(within(form).getByLabelText("Fecha")).toHaveAttribute(
        "type",
        "date",
      );
      expect(
        within(form).getByRole("button", { name: "Agendar" }),
      ).toBeInTheDocument();
      expect(
        within(form).getByText("Agendar recuperación").closest("details"),
      ).not.toHaveAttribute("open");
      expect(
        screen.queryByRole("form", { name: "Agendar recuperación: Caro Díaz" }),
      ).toBeNull();
      expect(form.closest("li")).toHaveAttribute("id", "alumna-1");
    });

    it("shows the scheduled state instead of a form", () => {
      const [ana, caro] = sheet.rows as [
        AttendanceSheetProps["rows"][number],
        AttendanceSheetProps["rows"][number],
      ];
      render(
        <AttendanceSheet
          {...sheet}
          rows={[
            {
              ...ana,
              makeUp: { status: "pending", label: "Recuperación pendiente" },
            },
            caro,
          ]}
        />,
      );
      expect(screen.getByText("Recuperación pendiente")).toBeVisible();
      expect(
        screen.queryByRole("form", { name: /Agendar recuperación/ }),
      ).toBeNull();
    });

    it("offers no make-up form while nobody is saved as absent", () => {
      render(
        <AttendanceSheet
          {...sheet}
          rows={sheet.rows.map((row) => ({ ...row, status: null }))}
        />,
      );
      expect(
        screen.queryByRole("form", { name: /Agendar recuperación/ }),
      ).toBeNull();
    });

    it("shows a rejected form's errors and what was typed on that student only, open", async () => {
      const { container } = render(
        <AttendanceSheet
          {...sheet}
          feedback={{
            makeUp: {
              email: "ana@example.com",
              errors: { makeUpDate: "Elegí una fecha válida." },
              values: { makeUpTurno: "p:v", makeUpDate: "2026-10-15" },
            },
          }}
        />,
      );
      const form = screen.getByRole("form", {
        name: "Agendar recuperación: Ana Pérez",
      });
      expect(within(form).getByLabelText("Turno")).toHaveValue("p:v");
      expect(within(form).getByLabelText("Fecha")).toHaveValue("2026-10-15");
      expect(within(form).getByRole("alert")).toHaveTextContent(
        "Elegí una fecha válida.",
      );
      expect(
        within(form).getByText("Agendar recuperación").closest("details"),
      ).toHaveAttribute("open");
      await expectNoAxeViolations(container);
    });
  });
});
