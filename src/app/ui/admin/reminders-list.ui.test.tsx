import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { filterReminderRecipients } from "~/app/routes/admin/reminders";
import { RemindersList, type RemindersListProps } from "./reminders-list";

const base: RemindersListProps = {
  values: {
    mensaje: "class",
    alumna: "",
    taller: "",
    turno: "",
  },
  workshops: [{ id: "w1", name: "Bordado" }],
  turnos: ["Martes 16:00 a 18:00"],
  result: null,
};

describe("RemindersList", () => {
  it("matches a student name without depending on case or accents", () => {
    const recipients = [
      {
        key: "ana@example.com",
        name: "Ana Pérez",
        email: "ana@example.com",
        message: "Hola, Ana.",
        link: null,
      },
      {
        key: "bea@example.com",
        name: "Bea Gómez",
        email: "bea@example.com",
        message: "Hola, Bea.",
        link: null,
      },
    ] as const;

    expect(filterReminderRecipients(recipients, "ana perez")).toEqual([
      recipients[0],
    ]);
    expect(filterReminderRecipients(recipients, "GÓMEZ")).toEqual([
      recipients[1],
    ]);
  });

  it("offers exactly the two reminder tasks and touch-friendly filters", async () => {
    const { container } = render(<RemindersList {...base} />);

    const taskGroup = screen.getByRole("group", {
      name: "Elegí qué necesitás resolver",
    });
    expect(within(taskGroup).getAllByRole("button")).toHaveLength(2);
    expect(
      within(taskGroup).getByRole("button", { name: "Clases de mañana" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(taskGroup).getByRole("button", { name: "Pagos pendientes" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Buscar alumna")).toHaveAttribute(
      "name",
      "alumna",
    );
    expect(screen.getByLabelText("Taller")).toBeVisible();
    expect(screen.getByLabelText("Turno")).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("renders one mobile card per recipient and keeps WhatsApp manual", async () => {
    const { container } = render(
      <RemindersList
        {...base}
        values={{ ...base.values, mensaje: "fee", alumna: "Ana" }}
        result={{
          preview: "Hola, Ana. Tu cuota está pendiente.",
          recipients: [
            {
              key: "ana@example.com",
              name: "Ana Pérez",
              email: "ana@example.com",
              message: "Hola, Ana. Tu cuota está pendiente.",
              link: "https://wa.me/5493511234567?text=Hola%2C%20Ana.",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Ana Pérez")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Abrir WhatsApp para Ana Pérez" }),
    ).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\//));
    expect(screen.getByText(/no se envía automáticamente/i)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
    await expectNoAxeViolations(container);
  });
});
