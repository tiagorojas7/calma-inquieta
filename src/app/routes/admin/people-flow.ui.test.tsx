import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminSupplierDetail from "./supplier-detail";
import AdminSupplierNew from "./supplier-new";
import AdminSuppliers from "./suppliers";
import AdminTeacherDetail from "./teacher-detail";
import AdminTeacherNew from "./teacher-new";
import AdminTeachers from "./teachers";

const SUPPLIERS = "/admin/materiales/proveedores";

const teacherValues = {
  name: "Ana Gómez",
  bioLine: "Cerámica",
  phone: "",
  email: "",
  modality: "own",
};

const supplierValues = { name: "Casa Pincel", phone: "", email: "", notes: "" };

function crumbs() {
  return within(screen.getByRole("navigation", { name: "Migas de pan" }));
}

describe("teachers guided flow", () => {
  it("list shows breadcrumbs, a saved banner and one card per teacher", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/profesores",
        Component: AdminTeachers,
        loader: () => ({
          filter: "activos",
          feedback: "saved",
          rows: [
            { id: "t1", name: "Ana Gómez", modality: "own", active: true },
          ],
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/profesores?ok=saved"]} />,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cambios guardados",
    );
    expect(crumbs().getByRole("link", { name: "Panel" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("list", { name: "Profesores" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ana Gómez" })).toHaveAttribute(
      "href",
      "/admin/profesores/t1",
    );
    await expectNoAxeViolations(container);
  });

  it("new screen has breadcrumbs and a back link", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/profesores/nuevo",
        Component: AdminTeacherNew,
        loader: () => null,
        action: () => null,
      },
    ]);
    render(<Stub initialEntries={["/admin/profesores/nuevo"]} />);
    expect(
      await screen.findByRole("link", { name: "Volver a profesores" }),
    ).toHaveAttribute("href", "/admin/profesores");
    expect(crumbs().getByRole("link", { name: "Profesores" })).toHaveAttribute(
      "href",
      "/admin/profesores",
    );
  });

  it("detail confirms archiving in a danger section placed after the form", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/profesores/:id",
        Component: AdminTeacherDetail,
        action: () => null,
        loader: () => ({
          id: "t1",
          active: true,
          feedback: "restored",
          values: teacherValues,
          assignedTo: [],
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/profesores/t1"]} />,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Profesor reactivado",
    );
    expect(
      screen.getByRole("link", { name: "Volver a profesores" }),
    ).toHaveAttribute("href", "/admin/profesores");
    const danger = screen.getByRole("region", { name: "Zona de riesgo" });
    expect(danger).toBeVisible();
    fireEvent.click(within(danger).getByRole("button", { name: "Archivar" }));
    expect(
      await screen.findByRole("dialog", { name: "¿Archivar este profesor?" }),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });
});

describe("suppliers guided flow", () => {
  it("list shows nested breadcrumbs, a created banner and cards", async () => {
    const Stub = createRoutesStub([
      {
        path: SUPPLIERS,
        Component: AdminSuppliers,
        loader: () => ({
          filter: "activos",
          feedback: "created",
          rows: [
            { id: "s1", name: "Casa Pincel", phone: "351 555", active: true },
          ],
        }),
      },
    ]);
    const { container } = render(<Stub initialEntries={[SUPPLIERS]} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Proveedor creado",
    );
    expect(crumbs().getByRole("link", { name: "Materiales" })).toHaveAttribute(
      "href",
      "/admin/materiales",
    );
    expect(
      screen.getByRole("link", { name: "Volver a materiales" }),
    ).toHaveAttribute("href", "/admin/materiales");
    expect(screen.getByText("351 555")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("new screen explains that notes are internal and links back", async () => {
    const Stub = createRoutesStub([
      {
        path: `${SUPPLIERS}/nuevo`,
        Component: AdminSupplierNew,
        loader: () => null,
        action: () => null,
      },
    ]);
    render(<Stub initialEntries={[`${SUPPLIERS}/nuevo`]} />);
    expect(
      await screen.findByRole("link", { name: "Volver a proveedores" }),
    ).toHaveAttribute("href", SUPPLIERS);
  });

  it("detail confirms archiving with its effect on materials", async () => {
    const Stub = createRoutesStub([
      {
        path: `${SUPPLIERS}/:id`,
        Component: AdminSupplierDetail,
        action: () => null,
        loader: () => ({
          id: "s1",
          active: true,
          feedback: "archived",
          values: supplierValues,
        }),
      },
    ]);
    render(<Stub initialEntries={[`${SUPPLIERS}/s1`]} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Proveedor archivado",
    );
    const danger = screen.getByRole("region", { name: "Zona de riesgo" });
    fireEvent.click(within(danger).getByRole("button", { name: "Archivar" }));
    expect(
      await screen.findByRole("dialog", { name: "¿Archivar este proveedor?" }),
    ).toHaveTextContent("Los materiales que ya lo tienen lo siguen mostrando");
  });
});
