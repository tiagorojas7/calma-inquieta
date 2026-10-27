import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminSupplierDetail from "./supplier-detail";
import AdminSupplierNew from "./supplier-new";
import AdminSuppliers from "./suppliers";

const LIST = "/admin/materiales/proveedores";

describe("supplier admin screens", () => {
  it("list screen renders the loaded rows, the filter links and plain anchors", async () => {
    const Stub = createRoutesStub([
      {
        path: LIST,
        Component: AdminSuppliers,
        loader: () => ({
          filter: "activos",
          rows: [
            { id: "s1", name: "Casa Pincel", phone: "351 555", active: true },
            { id: "s2", name: "Arcilla Sur", phone: null, active: true },
          ],
        }),
      },
    ]);
    const { container } = render(<Stub initialEntries={[LIST]} />);
    expect(
      await screen.findByRole("link", { name: "Casa Pincel" }),
    ).toHaveAttribute("href", `${LIST}/s1`);
    expect(screen.getByText("351 555")).toBeVisible();
    expect(screen.getByText("Sin teléfono")).toBeVisible();
    expect(screen.getByRole("link", { name: "Activos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Nuevo proveedor" }),
    ).toHaveAttribute("href", `${LIST}/nuevo`);
    await expectNoAxeViolations(container);
  });

  it("list screen shows the empty state when there are no suppliers", async () => {
    const Stub = createRoutesStub([
      {
        path: LIST,
        Component: AdminSuppliers,
        loader: () => ({ filter: "activos", rows: [] }),
      },
    ]);
    render(<Stub initialEntries={[LIST]} />);
    expect(
      await screen.findByRole("heading", {
        name: "Todavía no hay proveedores",
      }),
    ).toBeVisible();
  });

  it("create screen shows an empty form, then the server errors with the typed values", async () => {
    const Rejected = createRoutesStub([
      {
        id: "new",
        path: `${LIST}/nuevo`,
        Component: AdminSupplierNew,
        action: () => null,
        loader: () => null,
      },
    ]);
    const { container } = render(
      <Rejected
        initialEntries={[`${LIST}/nuevo`]}
        hydrationData={{
          loaderData: { new: null },
          actionData: {
            new: {
              values: { name: "Casa", phone: "", email: "x", notes: "" },
              errors: { email: "El formato no es válido. Revisalo." },
              formError: "Revisá los campos marcados e intentá de nuevo.",
            },
          },
        }}
      />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue("Casa");
    expect(
      screen.getByLabelText("Correo electrónico"),
    ).toHaveAccessibleDescription(/El formato no es válido/);
    expect(
      screen.getByText("Revisá los campos marcados e intentá de nuevo."),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("create screen starts empty and submits as a native document post", async () => {
    // Layer 1 (admin-gate) denies every /admin/**.data request, so a client
    // navigation or fetcher submit would be refused even for an admin.
    const Stub = createRoutesStub([
      {
        path: `${LIST}/nuevo`,
        Component: AdminSupplierNew,
        action: () => null,
        loader: () => null,
      },
    ]);
    render(<Stub initialEntries={[`${LIST}/nuevo`]} />);
    const name = await screen.findByLabelText("Nombre");
    expect(name).toHaveValue("");
    expect(screen.getByLabelText("Teléfono")).toBeVisible();
    expect(screen.getByLabelText("Notas")).toBeVisible();
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      LIST,
    );
    const form = name.closest("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form).toHaveAttribute("novalidate");
    expect(fireEvent.submit(form as HTMLFormElement)).toBe(true);
  });

  it("edit screen loads the supplier into the form with a native archive form", async () => {
    const Stub = createRoutesStub([
      {
        path: `${LIST}/:id`,
        Component: AdminSupplierDetail,
        action: () => null,
        loader: () => ({
          id: "s1",
          active: true,
          values: {
            name: "Casa Pincel",
            phone: "351 555",
            email: "c@x.test",
            notes: "Entrega los jueves",
          },
        }),
      },
    ]);
    const { container } = render(<Stub initialEntries={[`${LIST}/s1`]} />);
    expect(await screen.findByLabelText("Nombre")).toHaveValue("Casa Pincel");
    expect(screen.getByLabelText("Notas")).toHaveValue("Entrega los jueves");
    const archive = screen.getByRole("button", { name: "Archivar" });
    const form = archive.closest("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form?.querySelector("input[name=intent]")).toHaveValue("archive");
    expect(fireEvent.submit(form as HTMLFormElement)).toBe(true);
    await expectNoAxeViolations(container);
  });

  it("edit screen of an archived supplier explains it and offers to reactivate", async () => {
    const Stub = createRoutesStub([
      {
        path: `${LIST}/:id`,
        Component: AdminSupplierDetail,
        action: () => null,
        loader: () => ({
          id: "s1",
          active: false,
          values: { name: "Casa Pincel", phone: "", email: "", notes: "" },
        }),
      },
    ]);
    render(<Stub initialEntries={[`${LIST}/s1`]} />);
    const reactivate = await screen.findByRole("button", { name: "Reactivar" });
    expect(
      reactivate.closest("form")?.querySelector("input[name=intent]"),
    ).toHaveValue("reactivate");
    expect(screen.getByText("Este proveedor está archivado.")).toBeVisible();
  });
});
