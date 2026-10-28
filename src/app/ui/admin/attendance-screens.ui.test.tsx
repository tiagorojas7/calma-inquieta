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
  it("offers a GET filter and plain links to each turno", async () => {
    const { container } = render(<AttendanceIndex {...index} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Asistencia" }),
    ).toBeVisible();
    const form = screen.getByRole("search", { name: "Elegir clases" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/asistencia");
    expect(within(form).getByLabelText("Mes")).toHaveValue("2026-10");
    expect(within(form).getByLabelText("Taller")).toHaveValue("w1");
    expect(screen.getByRole("link", { name: "Cerámica" })).toHaveAttribute(
      "href",
      "/admin/asistencia/p/t",
    );
    expect(
      screen.getByRole("link", { name: "Ver recuperaciones" }),
    ).toHaveAttribute("href", "/admin/asistencia/recuperaciones");
    await expectNoAxeViolations(container);
  });

  it("says there are no turnos for the filter", () => {
    render(<AttendanceIndex {...index} rows={[]} />);
    expect(
      screen.getByRole("heading", { name: "No hay turnos para este filtro" }),
    ).toBeVisible();
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
  ],
};

describe("AttendanceSessions", () => {
  it("lists each class date with its counts and a plain link", async () => {
    const { container } = render(<AttendanceSessions {...sessions} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Cerámica, Lunes tarde" }),
    ).toBeVisible();
    const row = screen.getByRole("row", { name: /Lunes 05\/10\/2026/ });
    expect(
      within(row).getByRole("link", { name: "Lunes 05/10/2026" }),
    ).toHaveAttribute("href", "/admin/asistencia/p/t/2026-10-05");
    expect(
      within(row)
        .getAllByRole("cell")
        .map((c) => c.textContent),
    ).toEqual(["Lunes 05/10/2026", "2", "1", "1"]);
    await expectNoAxeViolations(container);
  });
});

const sheet: AttendanceSheetProps = {
  heading: "Lunes 05/10/2026",
  subtitle: "Cerámica, Lunes tarde · octubre 2026",
  backHref: "/admin/asistencia/p/t",
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
  it("marks every student inside ONE native post form", async () => {
    const { container } = render(<AttendanceSheet {...sheet} />);

    const forms = screen.getAllByRole("form");
    expect(forms).toHaveLength(1);
    expect(forms[0]).toHaveAttribute("method", "post");
    const ana = screen.getByRole("group", { name: "Ana Pérez" });
    expect(within(ana).getByLabelText("Ausente")).toBeChecked();
    expect(within(ana).getByLabelText("Presente")).not.toBeChecked();
    expect(within(ana).getByLabelText("Presente")).toHaveAttribute(
      "name",
      "status:ana@example.com",
    );
    expect(
      screen.getByRole("button", { name: "Guardar asistencia" }),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("shows the fee state and withholds marks until the fee is paid", () => {
    render(<AttendanceSheet {...sheet} />);

    expect(screen.getByText("Cuota pagada")).toBeVisible();
    expect(screen.getByText("Cuota pendiente")).toBeVisible();
    expect(screen.queryByRole("group", { name: "Caro Díaz" })).toBeNull();
    expect(
      screen.getByText(
        "Las alumnas con la cuota pendiente se pueden marcar cuando confirmes el pago.",
      ),
    ).toBeVisible();
  });

  it("confirms a saved sheet and shows a save error", () => {
    const { rerender } = render(
      <AttendanceSheet {...sheet} feedback={{ saved: true }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Asistencia guardada.",
    );
    rerender(<AttendanceSheet {...sheet} feedback={{ error: "No pudimos" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos");
  });

  it("has no save button when nobody has paid yet", () => {
    render(
      <AttendanceSheet
        {...sheet}
        rows={sheet.rows.filter((row) => !row.feePaid)}
      />,
    );
    expect(screen.queryByRole("button", { name: "Guardar asistencia" })).toBe(
      null,
    );
  });
});
