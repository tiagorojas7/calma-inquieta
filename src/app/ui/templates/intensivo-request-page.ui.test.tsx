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
  },
  projects: [
    {
      id: "proyecto-taza",
      name: "Taza de torno",
      total: "$ 40.000",
      deposit: "$ 15.000",
    },
  ],
  conditions: {
    label: "Condiciones",
    policyText: "Si no llegamos al mínimo, devolvemos la seña.",
    minSeats: "Si no se alcanza el mínimo de 4 personas, se cancela.",
  },
  backHref: "/intensivos/intensivo-de-ceramica",
  values: {
    fullName: "Ana Pérez",
    email: "ana@example.com",
    phone: "351",
    projectId: "",
  },
  errors: {},
};

const TWO_PROJECTS = [
  {
    id: "proyecto-taza",
    name: "Taza de torno",
    total: "$ 40.000",
    deposit: "$ 15.000",
  },
  {
    id: "proyecto-plato",
    name: "Plato hondo",
    total: "$ 30.000",
    deposit: "$ 10.000",
    image: {
      src: "/media/plato.webp",
      alt: "Un plato",
      width: 800,
      height: 600,
    },
  },
];

function renderForm(props: Partial<IntensivoRequestPageProps> = {}) {
  return render(
    <MemoryRouter>
      <IntensivoRequestPage {...base} {...props} />
    </MemoryRouter>,
  );
}

describe("IntensivoRequestPage policy acceptance", () => {
  it("ends with the one checkbox of both documents, linked, with the conditions note above it", () => {
    const { container } = renderForm({
      policies: { conditionsVersion: 2, privacyVersion: 5 },
    });
    const checkbox = screen.getByRole("checkbox", {
      name: "Leí y acepto las condiciones y la política de privacidad",
    });
    expect(checkbox).toHaveAttribute("name", "policy");
    expect(
      screen.getByRole("link", { name: "las condiciones" }),
    ).toHaveAttribute("href", "/condiciones");
    expect(
      screen.getByRole("link", { name: "la política de privacidad" }),
    ).toHaveAttribute("href", "/privacidad");
    expect(
      container.querySelector('input[name="conditionsVersion"]'),
    ).toHaveValue("2");
    expect(container.querySelector('input[name="privacyVersion"]')).toHaveValue(
      "5",
    );
    const note = screen.getByText(
      "Si no llegamos al mínimo, devolvemos la seña.",
    );
    expect(
      note.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByLabelText(/^Leí las condiciones/)).toBeNull();
  });

  it("posts no versions when they could not be read, but still shows the checkbox", () => {
    const { container } = renderForm({ policies: null });
    expect(
      container.querySelector('input[name="conditionsVersion"]'),
    ).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: /Leí y acepto/ }),
    ).toBeVisible();
  });
});

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

  it("offers each project with its image, total and deposit, in order, as a required choice", () => {
    renderForm({ projects: TWO_PROJECTS });

    const group = screen.getByRole("group", { name: "Elegí tu proyecto" });
    const options = within(group).getAllByRole("radio");
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "proyecto-taza",
      "proyecto-plato",
    ]);
    for (const option of options) {
      expect(option).toHaveAttribute("name", "project");
      expect(option).toBeRequired();
    }
    const plato = screen.getByRole("radio", { name: /Plato hondo/ });
    expect(plato).toHaveAccessibleName(/\$ 30\.000/);
    expect(plato).toHaveAccessibleName(/\$ 10\.000/);
    expect(
      within(group).getByRole("img", { name: "Un plato" }),
    ).toHaveAttribute("src", "/media/plato.webp");
    expect(within(group).getAllByRole("img")).toHaveLength(1);
  });

  it("shows the description of a project that has one, inside its choice", () => {
    renderForm({
      projects: [
        { ...TWO_PROJECTS[0], description: "Una taza al torno." },
        TWO_PROJECTS[1],
      ] as typeof TWO_PROJECTS,
    });

    expect(
      screen.getByRole("radio", { name: /Taza de torno/ }),
    ).toHaveAccessibleName(/Una taza al torno./);
    expect(
      screen.getByRole("radio", { name: /Plato hondo/ }),
    ).not.toHaveAccessibleName(/Una taza/);
  });

  it("preselects the only project, but leaves several unchosen until the visitor picks", () => {
    const { unmount } = renderForm();
    expect(screen.getByRole("radio", { name: /Taza de torno/ })).toBeChecked();
    unmount();

    const many = renderForm({ projects: TWO_PROJECTS });
    for (const option of screen.getAllByRole("radio"))
      expect(option).not.toBeChecked();
    many.unmount();

    renderForm({
      projects: TWO_PROJECTS,
      values: { ...base.values, projectId: "proyecto-plato" },
    });
    expect(screen.getByRole("radio", { name: /Plato hondo/ })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Taza de torno/ }),
    ).not.toBeChecked();
  });

  it("shows the project error by the choice and links to it from the summary", () => {
    renderForm({
      projects: TWO_PROJECTS,
      errors: { project: "Elegí un proyecto de la lista." },
    });

    expect(
      screen.getByRole("link", { name: "Elegí un proyecto de la lista." }),
    ).toHaveAttribute("href", "#project");
    const first = screen.getAllByRole("radio")[0];
    expect(first).toHaveAttribute("id", "project");
    expect(
      screen.getByRole("group", { name: "Elegí tu proyecto" }),
    ).toHaveAccessibleDescription("Elegí un proyecto de la lista.");
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
    expect(
      screen.getByRole("checkbox", { name: /Leí y acepto/ }),
    ).toBeInvalid();
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
  projectName: "Taza de torno",
  date: "sábado 14 de noviembre",
  time: "10:00 a 14:00",
  price: "$ 40.000",
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
      within(receipt).getByText("Proyecto").nextElementSibling,
    ).toHaveTextContent("Taza de torno");
    expect(
      within(receipt).getByText("Total").nextElementSibling,
    ).toHaveTextContent("$ 40.000");
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

  it("leaves the project row out for a request made before projects", () => {
    render(<IntensivoRequestSummaryPage {...summary} projectName={null} />);

    expect(screen.queryByText("Proyecto")).toBeNull();
    expect(screen.getByText("Total")).toBeVisible();
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
