import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { RemindersScreen, type RemindersScreenProps } from "./reminders-screen";

const base: RemindersScreenProps = {
  values: {
    mensaje: "fee",
    cuando: "",
    actividad: "",
    texto: "",
    taller: "",
    mes: "",
    turno: "",
    estado: "",
  },
  kinds: [
    { value: "class", label: "Recordatorio de clase" },
    { value: "fee", label: "Cuota pendiente" },
  ],
  workshops: [{ id: "w1", name: "Bordado" }],
  periods: [{ value: "2026-10", label: "octubre 2026" }],
  turnos: ["Martes 16:00 a 18:00"],
  statuses: [{ value: "paid", label: "Pagado" }],
  errors: {},
  result: null,
};

const withResult: RemindersScreenProps = {
  ...base,
  result: {
    preview: "Hola, Ana. Tu cuota correspondiente a octubre figura pendiente.",
    recipients: [
      {
        key: "ana@example.com",
        name: "Ana Pérez",
        email: "ana@example.com",
        message: "Hola, Ana. Tu cuota.",
        link: "https://wa.me/5493511234567?text=Hola%2C%20Ana.",
      },
      {
        key: "bea@example.com",
        name: "Bea Gómez",
        email: "bea@example.com",
        message: "Hola, Bea. Tu cuota.",
        link: null,
      },
    ],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RemindersScreen", () => {
  it("offers a GET form with the template and the audience filters", async () => {
    const { container } = render(<RemindersScreen {...base} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Recordatorios" }),
    ).toBeVisible();
    const form = screen.getByRole("search", { name: "Preparar mensajes" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/recordatorios");
    expect(within(form).getByLabelText("Mensaje")).toHaveValue("fee");
    expect(within(form).getByLabelText("Taller")).toHaveAttribute(
      "name",
      "taller",
    );
    expect(within(form).getByLabelText("Mes")).toHaveAttribute("name", "mes");
    expect(within(form).getByLabelText("Turno")).toHaveAttribute(
      "name",
      "turno",
    );
    expect(
      within(form).getByLabelText("Estado de la inscripción"),
    ).toHaveAttribute("name", "estado");
    expect(
      within(form).getByRole("button", { name: "Preparar mensajes" }),
    ).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("shows the preview, the count and a WhatsApp link per student", async () => {
    const { container } = render(<RemindersScreen {...withResult} />);

    expect(screen.getByText(withResult.result?.preview ?? "")).toBeVisible();
    expect(screen.getByText("2 alumnas, 1 sin teléfono válido.")).toBeVisible();
    const link = screen.getByRole("link", {
      name: "Enviar por WhatsApp a Ana Pérez",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://wa.me/5493511234567?text=Hola%2C%20Ana.",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const bea = screen.getByRole("row", { name: /Bea Gómez/ });
    expect(within(bea).getByText("Sin teléfono válido")).toBeVisible();
    expect(within(bea).queryByRole("link")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("copies the message of a student and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<RemindersScreen {...withResult} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copiar mensaje de Bea Gómez" }),
    );

    expect(writeText).toHaveBeenCalledWith("Hola, Bea. Tu cuota.");
    expect(await screen.findByText("Mensaje copiado.")).toBeVisible();
  });

  it("says when nobody matches", () => {
    render(
      <RemindersScreen
        {...base}
        result={{ preview: "Hola, Ana. Hola.", recipients: [] }}
      />,
    );
    expect(screen.getByText("No hay alumnas para este filtro")).toBeVisible();
  });

  it("shows the field errors", () => {
    render(
      <RemindersScreen
        {...base}
        errors={{ actividad: "Escribí el nombre del intensivo." }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escribí el nombre del intensivo.",
    );
  });
});
