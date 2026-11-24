import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminMaterialDetail from "./material-detail";
import { MaterialDetail } from "~/app/ui/admin/material-detail";

const ID = "11111111-1111-4111-8111-111111111111";
const detail = {
  id: ID,
  name: "Pincel plano",
  description: "Para acrílico.",
  category: "Pinceles",
  active: true,
  available: false,
  supplierId: "22222222-2222-4222-8222-222222222222",
  suppliers: [
    { id: "33333333-3333-4333-8333-333333333333", name: "Casa activa" },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Casa archivada (archivado)",
    },
  ],
  image: {
    assetId: "image-1",
    src: "/imagenes/pincel.webp",
    alt: "Un pincel",
  },
  variants: [
    {
      id: "v1",
      label: "Chico",
      price: "2500",
      cost: "800",
      onHand: 3,
      available: true,
      used: false,
      swatch: "#111111",
    },
    {
      id: "v2",
      label: "Grande",
      price: "2500",
      cost: "",
      onHand: 0,
      available: false,
      used: true,
      swatch: null,
    },
  ],
  audit: { updatedBy: "admin@example.com", updatedAt: "20 oct 2026, 00:30" },
};

function stub(data = detail, action: () => unknown = () => null) {
  return createRoutesStub([
    {
      path: "/admin/materiales/:id",
      Component: AdminMaterialDetail,
      loader: () => data,
      HydrateFallback: () => null,
      action,
    },
  ]);
}

describe("material detail screen", () => {
  it("renders identity, availability, archived supplier continuity, used variant, audit and a plain back anchor accessibly", async () => {
    const { container } = render(
      <MaterialDetail
        {...detail}
        values={detail}
        errors={{}}
        formError={undefined}
        stateError={undefined}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "Pincel plano" }),
    ).toBeVisible();
    expect(screen.getAllByText("No disponible")).toHaveLength(2);
    expect(screen.getAllByText("Casa archivada (archivado)")).toHaveLength(2);
    expect(screen.getByText("Grande")).toBeVisible();
    expect(screen.getByText("Usada")).toBeVisible();
    expect(
      screen.getByText("No disponible", { selector: "span" }),
    ).toBeVisible();
    fireEvent.click(screen.getByText("Más datos"));
    expect(screen.getByText("admin@example.com")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver a materiales" }),
    ).toHaveAttribute("href", "/admin/materiales");
    expect(screen.getByRole("img", { name: "Un pincel" })).toHaveAttribute(
      "src",
      "/imagenes/pincel.webp",
    );
    await expectNoAxeViolations(container);
  });

  it("hydrates a native edit form with the material identity and preserves accessible save feedback", () => {
    render(
      <MaterialDetail
        {...detail}
        errors={{
          variants: { rows: [{}, { price: "El precio no es válido." }] },
        }}
        formError="Revisá los campos marcados e intentá de nuevo."
        values={{
          ...detail,
          image: {
            assetId: "image-1",
            src: "/imagenes/pincel.webp",
            alt: "Un pincel",
          },
        }}
        stateError={undefined}
      />,
    );

    const save = screen.getByRole("button", { name: "Guardar cambios" });
    const form = save.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form?.querySelector("input[name=intent] ")).toHaveValue("save");
    expect(form?.querySelectorAll("input[name=variantId]")).toHaveLength(2);
    expect(screen.getByDisplayValue("Pincel plano")).toBeVisible();
    expect(screen.getByDisplayValue("Grande")).toBeVisible();
    expect(
      screen.getByText("Revisá los campos marcados e intentá de nuevo."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByText("El precio no es válido.")).toBeVisible();
  });

  it("shows each variant's supplier cost and on-hand units", () => {
    render(
      <MaterialDetail
        {...detail}
        values={detail}
        errors={{}}
        formError={undefined}
        stateError={undefined}
      />,
    );

    const chico = screen.getByRole("form", { name: "Ajustar stock de Chico" });
    expect(chico.closest("li")).toHaveTextContent(/Costo: \$\s800/);
    expect(chico.closest("li")).toHaveTextContent(/\$\s2\.500/);
    expect(chico.closest("li")).toHaveTextContent("En stock: 3");
    const grande = screen.getByRole("form", {
      name: "Ajustar stock de Grande",
    });
    expect(grande.closest("li")).toHaveTextContent("Costo sin cargar");
    expect(grande.closest("li")).toHaveTextContent("En stock: 0");
  });

  it("puts a one-field stock arrival form on each compact variant row and keeps full editing behind one disclosure", () => {
    render(
      <MaterialDetail
        {...detail}
        values={detail}
        errors={{}}
        formError={undefined}
        stateError={undefined}
      />,
    );

    const chico = screen.getByRole("form", {
      name: "Cargar unidades de Chico",
    });
    expect(chico).toHaveAttribute("method", "post");
    expect(chico.querySelector('input[name="intent"]')).toHaveValue(
      "adjust-stock",
    );
    expect(chico.querySelector('input[name="variantId"]')).toHaveValue("v1");
    expect(chico.querySelector('input[name="reason"]')).toHaveValue("Llegaron");
    expect(
      within(chico).getByLabelText("Unidades que llegaron de Chico"),
    ).toHaveAttribute("name", "delta");
    expect(within(chico).getByRole("button", { name: "Cargar" })).toBeVisible();
    expect(
      screen.getByText("Editar datos").closest("details"),
    ).not.toHaveAttribute("open");
  });

  it("offers a native stock adjustment form per variant with a signed delta and a required reason", () => {
    render(
      <MaterialDetail
        {...detail}
        values={detail}
        errors={{}}
        formError={undefined}
        stateError={undefined}
      />,
    );

    fireEvent.click(screen.getAllByText("Otro ajuste")[0] as HTMLElement);

    const form = screen.getByRole("form", { name: "Ajustar stock de Chico" });
    expect(form).toHaveAttribute("method", "post");
    expect(form.querySelector("input[name=intent]")).toHaveValue(
      "adjust-stock",
    );
    expect(form.querySelector("input[name=variantId]")).toHaveValue("v1");
    expect(within(form).getByLabelText(/Cantidad/)).toHaveAttribute(
      "name",
      "delta",
    );
    expect(within(form).getByLabelText("Motivo")).toHaveAttribute(
      "name",
      "reason",
    );
    expect(
      within(form).getByRole("button", { name: "Ajustar stock" }),
    ).toBeVisible();
  });

  it("keeps the rejected adjustment's text and shows its field errors on that variant only", () => {
    render(
      <MaterialDetail
        {...detail}
        values={detail}
        errors={{}}
        formError={undefined}
        stateError={undefined}
        stockRejection={{
          variantId: "v1",
          delta: "-9",
          reason: "Rotura",
          errors: {
            delta: "No podés restar más de lo que hay: en stock hay 3.",
          },
        }}
      />,
    );

    const chico = screen.getByRole("form", { name: "Ajustar stock de Chico" });
    expect(within(chico).getByLabelText(/Cantidad/)).toHaveValue("-9");
    expect(within(chico).getByLabelText("Motivo")).toHaveValue("Rotura");
    expect(
      within(chico).getByText(
        "No podés restar más de lo que hay: en stock hay 3.",
      ),
    ).toBeVisible();
    const grande = screen.getByRole("form", {
      name: "Ajustar stock de Grande",
    });
    expect(within(grande).getByLabelText(/Cantidad/)).toHaveValue("");
  });

  it("keeps a rejected arrival beside its own variant instead of opening the advanced adjustment", () => {
    render(
      <MaterialDetail
        {...detail}
        values={detail}
        errors={{}}
        formError={undefined}
        stateError={undefined}
        stockRejection={{
          variantId: "v1",
          delta: "0",
          reason: "Llegaron",
          errors: { delta: "Poné una cantidad mayor a cero." },
        }}
      />,
    );

    const arrival = screen.getByRole("form", {
      name: "Cargar unidades de Chico",
    });
    expect(
      within(arrival).getByLabelText("Unidades que llegaron de Chico"),
    ).toHaveValue(0);
    expect(
      within(arrival).getByText("Poné una cantidad mayor a cero."),
    ).toBeVisible();
    expect(
      screen.getAllByText("Otro ajuste")[0]?.closest("details"),
    ).not.toHaveAttribute("open");
  });

  it("announces lifecycle feedback accessibly", () => {
    render(
      <MaterialDetail
        {...detail}
        errors={{}}
        formError={undefined}
        values={detail}
        stateError="Ya existe uno activo con el mismo nombre."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ya existe uno activo con el mismo nombre.",
    );
  });

  it("shows a refused archive or deletion right under the title, ahead of the variants", () => {
    render(
      <MaterialDetail
        {...detail}
        errors={{}}
        formError={undefined}
        values={detail}
        stateError="No se puede borrar: tiene ventas, pedidos, ofertas o movimientos de stock. Podés archivarlo."
      />,
    );

    const alert = screen.getByRole("alert");
    const title = screen.getByRole("heading", { level: 1 });
    const variants = screen.getByRole("heading", { name: "Variantes" });
    expect(
      title.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      alert.compareDocumentPosition(variants) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses a ConfirmedSubmit native document form to deactivate an active material", async () => {
    const Active = stub();
    render(<Active initialEntries={[`/admin/materiales/${ID}`]} />);

    const deactivate = await screen.findByRole("button", {
      name: "Archivar",
    });
    const form = deactivate.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form?.querySelector("input[name=intent]")).toHaveValue("deactivate");
    fireEvent.click(deactivate);
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("separately confirms irreversible deletion without submitting the archive intent", async () => {
    const Active = stub();
    render(<Active initialEntries={[`/admin/materiales/${ID}`]} />);
    const remove = await screen.findByRole("button", {
      name: "Borrar definitivamente",
    });
    expect(remove.closest("form")).toHaveAttribute("method", "post");
    expect(
      remove.closest("form")?.querySelector('input[name="intent"]'),
    ).toHaveValue("delete");
    fireEvent.click(remove);
    expect(
      await screen.findByRole("dialog", {
        name: "¿Borrar este material definitivamente?",
      }),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "No se puede deshacer",
    );
  });

  it("keeps removal actions before secondary editing details", () => {
    render(
      <MaterialDetail
        {...detail}
        values={detail}
        errors={{}}
        formError={undefined}
        stateError={undefined}
      />,
    );
    const section = screen.getByRole("region", { name: "Estado del material" });
    const edit = screen.getByText("Editar datos").closest("details");
    if (!edit) throw new Error("missing edit disclosure");
    expect(
      section.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses a ConfirmedSubmit native document form to reactivate an inactive material", async () => {
    const Inactive = stub({ ...detail, active: false });
    render(<Inactive initialEntries={[`/admin/materiales/${ID}`]} />);

    const reactivate = await screen.findByRole("button", { name: "Reactivar" });
    const form = reactivate.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form?.querySelector("input[name=intent]")).toHaveValue("reactivate");
    fireEvent.click(reactivate);
    expect(await screen.findByRole("dialog")).toBeVisible();
  });
});
