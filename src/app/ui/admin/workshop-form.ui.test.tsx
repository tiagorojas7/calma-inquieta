import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { WorkshopForm, WorkshopStatePanel } from "./workshop-form";
import { QuickWorkshopForm } from "./workshop-quick-form";

const values = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  technique: "",
  defaultFee: "",
  teacherId: "",
  percentage: "",
  images: [],
};

function stub(element: React.ReactElement) {
  const Stub = createRoutesStub([{ path: "/", Component: () => element }]);
  return render(<Stub />);
}

describe("short fields on a wide form", () => {
  const pairOf = (label: string) =>
    screen.getByLabelText(label).closest("[data-field-pair]");

  it("keeps the fee visible while secondary fields are closed by default", () => {
    stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );

    expect(screen.getByLabelText("Nombre")).toBeVisible();
    expect(screen.getByLabelText("Arancel mensual (en pesos)")).toBeVisible();
    const more = screen.getByText("Más opciones").closest("details");
    expect(more).not.toHaveAttribute("open");
    expect(more).toContainElement(screen.getByLabelText("Enlace"));
    expect(more).toContainElement(screen.getByLabelText("Técnica"));
    expect(more).toContainElement(screen.getByLabelText("Porcentaje acordado"));
    expect(pairOf("Nombre")).toBeNull();
  });
});

describe("card text versus full content", () => {
  it("names the card text Descripción and the full detail Contenido interno", () => {
    stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );

    expect(screen.getByLabelText("Descripción")).toHaveAttribute(
      "name",
      "summary",
    );
    const content = screen.getByLabelText("Contenido interno");
    expect(content).toHaveAttribute("name", "description");
    expect(content).toHaveAccessibleDescription(
      /antes de completar los datos de inscripción/,
    );
  });
});

describe("the agreed percentage", () => {
  it("warns under the percentage that opened months keep theirs", () => {
    stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );

    expect(
      screen.getByLabelText("Porcentaje acordado"),
    ).toHaveAccessibleDescription(
      /Los meses ya abiertos conservan su porcentaje; para cambiarlo, editá ese mes\./,
    );
  });
});

describe("the one-page form asks for both texts", () => {
  const quickValues = {
    name: "",
    summary: "Cerámica desde cero.",
    description: "Un taller para empezar de cero.",
    teacherId: "",
    defaultFee: "",
    percentage: "",
    images: [],
    rows: [],
  };

  it("asks for the card Descripción before the Contenido interno and keeps what was typed", () => {
    stub(
      <QuickWorkshopForm
        values={quickValues}
        errors={{ summary: "Completá este campo." }}
        turnoErrors={{}}
        teachers={[]}
        cancelHref="/admin/talleres"
      />,
    );

    const summary = screen.getByLabelText("Descripción");
    const content = screen.getByLabelText("Contenido interno");
    expect(summary).toHaveAttribute("name", "summary");
    expect(summary).toHaveValue("Cerámica desde cero.");
    expect(summary).toHaveAccessibleDescription(/tarjetas/);
    expect(summary).toHaveAccessibleDescription(/Completá este campo\./);
    expect(content).toHaveAttribute("name", "description");
    expect(
      summary.compareDocumentPosition(content) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText(/El resumen sale de la descripción/)).toBeNull();
  });
});

/** Records whether a submit reached the document (not cancelled by the router). */
function submitReachesBrowser(form: HTMLFormElement | null) {
  const seen: { prevented: boolean | null } = { prevented: null };
  const observe = (event: Event) => {
    seen.prevented = event.defaultPrevented;
    event.preventDefault(); // keep jsdom from attempting a real navigation
  };
  document.addEventListener("submit", observe);
  form?.requestSubmit();
  document.removeEventListener("submit", observe);
  return seen.prevented === false;
}

describe("WorkshopForm", () => {
  it("is a native post form with noValidate, so the submit is a document request", async () => {
    // Layer 1 (admin-gate) denies every /admin/**.data request, so a router
    // Form or fetcher submit would be refused even for an admin.
    stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );
    const form = (await screen.findByLabelText("Nombre")).closest("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form).toHaveAttribute("novalidate");
    expect(fireEvent.submit(form as HTMLFormElement)).toBe(true);
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/talleres",
    );
  });

  it("labels each teacher with her modality", async () => {
    stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[{ id: "t2", name: "Beto Ruiz", modality: "third_party" }]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );
    expect(
      await screen.findByRole("option", { name: "Beto Ruiz (De terceros)" }),
    ).toBeVisible();
  });
});

describe("WorkshopStatePanel", () => {
  it("confirms before archiving and then posts the archive intent as a document", async () => {
    stub(
      <WorkshopStatePanel
        status="published"
        activeTurnos={1}
        error={undefined}
      />,
    );
    const archive = await screen.findByRole("button", { name: "Archivar" });
    const form = archive.closest("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form?.querySelector("input[name=intent]")).toHaveValue("archive");
    expect(screen.getByText("1 turno activo")).toBeVisible();

    await userEvent.click(archive);
    const dialog = screen.getByRole("dialog", { name: "¿Archivar el taller?" });
    expect(dialog).toBeVisible();

    const reached: { value: boolean } = { value: false };
    const observe = (event: Event) => {
      reached.value = !event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener("submit", observe);
    const buttons = screen.getAllByRole("button", { name: "Archivar" });
    await userEvent.click(buttons[buttons.length - 1] as HTMLElement);
    document.removeEventListener("submit", observe);
    expect(reached.value).toBe(true);
  });

  it("offers the publish control as a plain post for a draft, with delete behind a confirmation", async () => {
    stub(
      <WorkshopStatePanel status="draft" activeTurnos={0} error={undefined} />,
    );
    const publish = await screen.findByRole("button", { name: "Publicar" });
    expect(
      publish.closest("form")?.querySelector("input[name=intent]"),
    ).toHaveValue("publish");
    expect(submitReachesBrowser(publish.closest("form"))).toBe(true);
    expect(
      screen.getByRole("button", { name: "Eliminar borrador" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
  });

  it("resumes a paused workshop and restores an archived one", () => {
    const { unmount } = render(
      <WorkshopStatePanel status="paused" activeTurnos={1} error={undefined} />,
    );
    expect(
      screen
        .getByRole("button", { name: "Volver a publicar" })
        .closest("form")
        ?.querySelector("input[name=intent]"),
    ).toHaveValue("publish");
    unmount();
    render(
      <WorkshopStatePanel status="archived" activeTurnos={0} error="Falló." />,
    );
    expect(
      screen
        .getByRole("button", { name: "Restaurar como borrador" })
        .closest("form")
        ?.querySelector("input[name=intent]"),
    ).toHaveValue("restore");
    expect(screen.getByText("Falló.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Archivar" })).toBeNull();
  });
});

describe("taller photos", () => {
  const photos = (container: HTMLElement) => ({
    inputs: container.querySelectorAll("input[type=file]"),
    visible: container.querySelectorAll(
      "fieldset input[type=file]:not(details input)",
    ),
    hidden: container.querySelectorAll("details input[type=file]"),
  });

  it("keeps four photo slots available under the secondary options", async () => {
    const { container } = stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );
    await screen.findByText("Fotos");
    const { inputs, hidden } = photos(container);
    expect(inputs).toHaveLength(4);
    expect(hidden).toHaveLength(4);
    expect(screen.getByText("Agregar más fotos")).not.toBeVisible();
    await userEvent.click(screen.getByText("Más opciones"));
    expect(screen.getByText("Agregar más fotos")).toBeVisible();
  });

  it("keeps a stored photo with its alt text so saving does not drop it", async () => {
    const { container } = stub(
      <WorkshopForm
        values={{
          ...values,
          images: [{ assetId: "a1", src: "/media/a1.jpg", alt: "Mesa" }],
        }}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );
    await screen.findByText("Fotos");
    expect(container.querySelector("input[name=galleryAssetId]")).toHaveValue(
      "a1",
    );
    expect(container.querySelector("input[name=galleryAlt]")).toHaveValue(
      "Mesa",
    );
  });

  it("offers no material picker on the one-page form", () => {
    const { container } = stub(
      <QuickWorkshopForm
        values={{
          name: "",
          summary: "",
          description: "",
          teacherId: "",
          defaultFee: "",
          percentage: "",
          images: [],
          rows: [],
        }}
        errors={{}}
        turnoErrors={{}}
        teachers={[]}
        cancelHref="/admin/talleres"
      />,
    );
    expect(screen.queryByLabelText("Buscar material")).toBeNull();
    expect(container.querySelector("input[name=materialIds]")).toBeNull();
    expect(screen.queryByText(/Materiales/)).toBeNull();
  });

  it("offers the same four slots on the one-page form", async () => {
    const { container } = stub(
      <QuickWorkshopForm
        values={{
          name: "",
          summary: "",
          description: "",
          teacherId: "",
          defaultFee: "",
          percentage: "",
          images: [],
          rows: [],
        }}
        errors={{}}
        turnoErrors={{}}
        teachers={[]}
        cancelHref="/admin/talleres"
      />,
    );
    await screen.findByText("Fotos");
    const { inputs, hidden } = photos(container);
    expect(inputs).toHaveLength(4);
    expect(hidden).toHaveLength(2);
  });
});

describe("workshop form on a wide screen", () => {
  it("keeps the main data in one column, the description and the options in the other, and the actions below", () => {
    const { container } = stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );

    const columns = container.querySelector("[data-columns]");
    expect(columns).not.toBeNull();
    const [start, end] = Array.from(columns?.children ?? []) as [
      HTMLElement,
      HTMLElement,
    ];
    expect(within(start).getByLabelText("Nombre")).toBeVisible();
    expect(
      within(start).getByLabelText("Arancel mensual (en pesos)"),
    ).toBeVisible();
    expect(within(end).queryByLabelText("Nombre")).toBeNull();
    expect(within(end).getByText("Más opciones")).toBeVisible();
    expect(columns).not.toContainElement(
      screen.getByRole("button", { name: "Guardar" }),
    );
  });
});
