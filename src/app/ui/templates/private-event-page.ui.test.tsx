import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { privateEventsCopy } from "~/app/private-events/copy";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PrivateEventPage } from "./private-event-page";

const values = {
  fullName: "Ana Pérez",
  phone: "351 555 0101",
  email: "",
  desiredDate: "2026-12-05",
  place: "Mi casa",
  participants: "12",
  notes: "",
};

const shared = {
  copy: privateEventsCopy,
  whatsappHref: "https://wa.me/5493517395239?text=Hola",
  instagramHref: "https://www.instagram.com/calma.inquieta/",
};

describe("PrivateEventPage", () => {
  it("renders a native post form with labelled fields and preserved values", async () => {
    const { container } = render(
      <PrivateEventPage
        {...shared}
        state="form"
        values={values}
        errors={{}}
        minDate="2026-10-28"
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Eventos privados",
    );
    const form = screen.getByRole("form", {
      name: privateEventsCopy.form.label,
    });
    expect(form).toHaveAttribute("method", "post");
    expect(screen.getByLabelText("Nombre y apellido")).toHaveValue("Ana Pérez");
    expect(screen.getByLabelText("Fecha deseada")).toHaveAttribute(
      "min",
      "2026-10-28",
    );
    expect(screen.getByLabelText("Cantidad de personas")).toHaveAttribute(
      "max",
      "200",
    );
    expect(
      screen.getByRole("button", { name: "Enviar consulta" }),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("shows each error next to its field", async () => {
    const { container } = render(
      <PrivateEventPage
        {...shared}
        state="form"
        values={values}
        errors={{ phone: "Ingresá un teléfono argentino válido." }}
        minDate="2026-10-28"
      />,
    );

    expect(screen.getByLabelText(/WhatsApp o teléfono/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ingresá un teléfono argentino válido.",
    );
    await expectNoAxeViolations(container);
  });

  it("thanks the visitor with WhatsApp and Instagram links", async () => {
    const { container } = render(
      <PrivateEventPage {...shared} state="thanks" />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "¡Gracias por escribirnos!",
    );
    expect(
      screen.getByRole("link", { name: /Escribinos por WhatsApp/ }),
    ).toHaveAttribute("href", shared.whatsappHref);
    expect(
      screen.getByRole("link", { name: /Seguinos en Instagram/ }),
    ).toHaveAttribute("href", shared.instagramHref);
    await expectNoAxeViolations(container);
  });

  it("omits the WhatsApp link when the number is unusable", () => {
    render(
      <PrivateEventPage {...shared} whatsappHref={undefined} state="thanks" />,
    );

    expect(
      screen.queryByRole("link", { name: /Escribinos por WhatsApp/ }),
    ).toBeNull();
  });

  it("holds the form in a raised surface card with a full-width submit on phones", () => {
    const { container } = render(
      <PrivateEventPage
        {...shared}
        state="form"
        values={values}
        errors={{}}
        minDate="2026-10-28"
      />,
    );
    const card = container.querySelector("[data-form-card]");
    expect(card).not.toBeNull();
    expect(card?.className).toContain("shadow-raised");
    expect(card).toContainElement(screen.getByRole("form"));
    expect(
      screen.getByRole("button", { name: "Enviar consulta" }).className,
    ).toContain("w-full");
  });

  it("gives the thanks state one primary WhatsApp action and a tertiary Instagram link", () => {
    render(<PrivateEventPage {...shared} state="thanks" />);
    const whatsapp = screen.getByRole("link", {
      name: /Escribinos por WhatsApp/,
    });
    const instagram = screen.getByRole("link", {
      name: /Seguinos en Instagram/,
    });
    expect(whatsapp.className).toContain("bg-clay-600");
    expect(instagram.className).not.toContain("bg-clay-600");
    for (const link of [whatsapp, instagram]) {
      expect(link.querySelector("svg[aria-hidden='true']")).not.toBeNull();
      expect(link.className).toContain("min-h-11");
    }
  });

  it("keeps the thanks message inside a card", () => {
    const { container } = render(
      <PrivateEventPage {...shared} state="thanks" />,
    );
    expect(container.querySelector("[data-form-card]")).not.toBeNull();
  });
});
