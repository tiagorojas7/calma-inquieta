import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { intensiveRequestCopy } from "~/app/intensive-requests/copy";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  IntensivoRequestPage,
  type IntensivoRequestPageProps,
} from "./intensivo-request-page";
import {
  IntensivoRequestSummaryPage,
  type IntensivoRequestSummaryProps,
} from "./intensivo-request-summary-page";

const formCopy = {
  title: intensiveRequestCopy.form.label,
  ...intensiveRequestCopy.form,
};

const base = {
  copy: formCopy,
  intensivo: {
    name: "Intensivo de cerámica",
    dateLine: "sábado 14 de noviembre",
    deposit: "$ 15.000",
  },
  conditions: {
    label: "Condiciones",
    policyText: "Si no llegamos al mínimo, devolvemos la seña.",
    minSeats: "Si no se alcanza el mínimo de 4 personas, se cancela.",
  },
  backHref: "/intensivos/intensivo-de-ceramica",
  values: { fullName: "Ana Pérez", email: "ana@example.com", phone: "351" },
  errors: {},
};

function renderForm(props: Partial<IntensivoRequestPageProps> = {}) {
  return render(
    <MemoryRouter>
      <IntensivoRequestPage {...base} {...props} />
    </MemoryRouter>,
  );
}

describe("IntensivoRequestPage", () => {
  it("marks name, email and phone with their own icons", () => {
    renderForm();
    const glyphs = [
      intensiveRequestCopy.form.fullName,
      intensiveRequestCopy.form.email,
      intensiveRequestCopy.form.phone,
    ].map((label) => {
      const icon = screen
        .getByLabelText(label)
        .parentElement?.querySelector("[data-field-icon]");
      expect(icon, label).not.toBeNull();
      return icon?.innerHTML;
    });

    expect(new Set(glyphs).size).toBe(3);
  });

  it("renders a native post form with the conditions visible and values preserved", async () => {
    const { container } = renderForm();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Reservar mi lugar",
    );
    const form = screen.getByRole("form", { name: "Reservar mi lugar" });
    expect(form).toHaveAttribute("method", "post");
    expect(form).not.toHaveAttribute("action");
    expect(screen.getByLabelText("Nombre y apellido")).toHaveValue("Ana Pérez");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue(
      "ana@example.com",
    );
    expect(screen.getByText("$ 15.000")).toBeVisible();
    expect(
      screen.getByText("Si no llegamos al mínimo, devolvemos la seña."),
    ).toBeVisible();
    expect(screen.getByText(/mínimo de 4 personas/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Enviar solicitud" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver al workshop" }),
    ).toHaveAttribute("href", "/intensivos/intensivo-de-ceramica");
    await expectNoAxeViolations(container);
  });

  it("lands on a linked summary after a failed submit, so a phone sees what went wrong", () => {
    renderForm({ errors: { phone: "Ingresá un teléfono argentino válido." } });

    const summary = screen
      .getByText("Revisá estos datos")
      .closest("[role=alert]");
    expect(summary).toHaveFocus();
    expect(
      screen.getByRole("link", {
        name: "Ingresá un teléfono argentino válido.",
      }),
    ).toHaveAttribute("href", "#phone");
    expect(summary?.compareDocumentPosition(screen.getByRole("form"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("matches the enrollment form: a card, the conditions by the checkbox and a full-width submit", () => {
    renderForm();
    const form = screen.getByRole("form", { name: "Reservar mi lugar" });

    expect(form).toHaveClass("bg-surface", "shadow-raised");
    expect(
      within(form).getByText("Si no llegamos al mínimo, devolvemos la seña."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Enviar solicitud" }),
    ).toHaveClass("w-full", "sm:w-auto");
  });

  it("hides the honeypot from people and shows each error next to its field", async () => {
    const { container } = renderForm({
      errors: {
        email: "Ingresá un correo electrónico válido.",
        policy:
          "Tenés que aceptar las condiciones y la política de privacidad.",
      },
      formError: "Ya tenés una solicitud activa para este workshop.",
    });

    expect(container.querySelector("#honeypot")?.parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      screen.getByLabelText("Correo electrónico"),
    ).toHaveAccessibleDescription("Ingresá un correo electrónico válido.");
    expect(screen.getByLabelText(/Leí las condiciones/)).toBeInvalid();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(
      screen.getByText("Ya tenés una solicitud activa para este workshop."),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });
});

const summary: IntensivoRequestSummaryProps = {
  copy: {
    title: intensiveRequestCopy.summary.title,
    reference: intensiveRequestCopy.summary.reference,
    fields: intensiveRequestCopy.summary.fields,
    stepsTitle: intensiveRequestCopy.summary.stepsTitle,
    steps: intensiveRequestCopy.summary.steps,
    currentStep: intensiveRequestCopy.summary.currentStep,
    whatsapp: intensiveRequestCopy.summary.whatsapp,
    confirmed: intensiveRequestCopy.summary.confirmed,
    cancelled: intensiveRequestCopy.summary.cancelled,
    cancelledCta: intensiveRequestCopy.summary.cancelledCta,
  },
  reference: "abcdefgh",
  status: "pending_confirmation",
  statusLabel: "Pendiente de seña",
  intensivoName: "Intensivo de cerámica",
  date: "sábado 14 de noviembre",
  time: "10:00 a 14:00",
  deposit: "$ 15.000",
  whatsappHref: "https://wa.me/5493515550100?text=Hola",
  workshopsHref: "/intensivos",
};

describe("IntensivoRequestSummaryPage", () => {
  it("shows the pending steps and the WhatsApp hand-off", async () => {
    const { container } = render(<IntensivoRequestSummaryPage {...summary} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Solicitud abcdefgh",
    );
    expect(screen.getByText("Pendiente de seña")).toBeVisible();
    expect(screen.getByText("Workshop")).toBeVisible();
    const steps = screen.getByRole("list");
    expect(within(steps).getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: /Enviar resumen por WhatsApp/ }),
    ).toHaveAttribute("href", "https://wa.me/5493515550100?text=Hola");
    await expectNoAxeViolations(container);
  });

  it("groups the facts in a receipt and tones the status", () => {
    render(<IntensivoRequestSummaryPage {...summary} />);

    const receipt = screen.getByRole("region", { name: "Tu solicitud" });
    expect(within(receipt).getByText("Workshop").tagName).toBe("DT");
    expect(
      within(receipt).getByText("Workshop").nextElementSibling,
    ).toHaveTextContent("Intensivo de cerámica");
    expect(
      within(receipt).getByText("Seña").nextElementSibling,
    ).toHaveTextContent("$ 15.000");
    const badge = screen
      .getByText("Pendiente de seña")
      .closest("[data-status]");
    expect(badge).toHaveAttribute("data-status", "pending_confirmation");
    expect(badge).toHaveClass("bg-sand-200");
  });

  it("shows the registered step as done and the WhatsApp one as current", () => {
    const { container } = render(<IntensivoRequestSummaryPage {...summary} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("data-state", "done");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[1]).toHaveTextContent("Ahora");
    expect(container.querySelectorAll("[data-step-rule]")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: /Enviar resumen por WhatsApp/ }),
    ).toHaveClass("w-full", "sm:w-fit");
  });

  it("omits the link when the business number is unusable", () => {
    render(<IntensivoRequestSummaryPage {...summary} whatsappHref={null} />);

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("thanks a confirmed request and offers no payment steps", () => {
    render(
      <IntensivoRequestSummaryPage
        {...summary}
        status="confirmed"
        statusLabel="Lugar confirmado"
      />,
    );

    expect(screen.getByText(/tu lugar está confirmado/)).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("sends a cancelled request back to the site to book again", () => {
    render(
      <MemoryRouter>
        <IntensivoRequestSummaryPage
          {...summary}
          status="cancelled"
          statusLabel="Solicitud cancelada"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/fue cancelada/)).toBeVisible();
    expect(screen.getByText(/desde la web/)).toBeVisible();
    expect(screen.queryByText(/escribinos/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Ver workshops" })).toHaveAttribute(
      "href",
      "/intensivos",
    );
    expect(screen.queryByRole("list")).toBeNull();
  });
});
