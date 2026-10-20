import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminWorkshopDetail from "./workshop-detail";
import AdminWorkshopNew from "./workshop-new";
import AdminWorkshops from "./workshops";

const TEACHERS = [
  { id: "t1", name: "Ana Gómez", modality: "own" },
  { id: "t2", name: "Beto Ruiz", modality: "third_party" },
];

const VALUES = {
  name: "Cerámica Creativa",
  slug: "ceramica-creativa",
  summary: "Modelado y torno",
  description: "Un taller para empezar de cero.",
  technique: "Cerámica",
  defaultFee: "12000",
  teacherId: "t2",
  percentage: "35,5",
};

describe("workshop admin screens", () => {
  it("list screen shows each workshop with teacher, status and turnos, and filter links", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres",
        Component: AdminWorkshops,
        loader: () => ({
          filter: "vigentes",
          rows: [
            {
              id: "w1",
              name: "Cerámica Creativa",
              teacherName: "Ana Gómez",
              status: "published",
              activeTurnos: 2,
            },
            {
              id: "w2",
              name: "Bordado",
              teacherName: null,
              status: "draft",
              activeTurnos: 0,
            },
          ],
        }),
      },
    ]);
    const { container } = render(<Stub initialEntries={["/admin/talleres"]} />);
    expect(
      await screen.findByRole("link", { name: "Cerámica Creativa" }),
    ).toHaveAttribute("href", "/admin/talleres/w1");
    expect(screen.getByText("Publicado")).toBeVisible();
    expect(screen.getByText("Sin profesor")).toBeVisible();
    expect(screen.getByRole("link", { name: "Vigentes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Archivados" })).toHaveAttribute(
      "href",
      "/admin/talleres?estado=archivados",
    );
    await expectNoAxeViolations(container);
  });

  it("list screen shows the empty state when there are no workshops", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres",
        Component: AdminWorkshops,
        loader: () => ({ filter: "vigentes", rows: [] }),
      },
    ]);
    render(<Stub initialEntries={["/admin/talleres"]} />);
    expect(
      await screen.findByRole("heading", { name: "Todavía no hay talleres" }),
    ).toBeVisible();
  });

  it("create screen shows an empty form, then the server errors with the typed values", async () => {
    const route = {
      id: "new",
      path: "/admin/talleres/nuevo",
      Component: AdminWorkshopNew,
      action: () => null,
      loader: () => ({ teachers: TEACHERS }),
    };
    const Empty = createRoutesStub([route]);
    const { unmount } = render(
      <Empty initialEntries={["/admin/talleres/nuevo"]} />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Profesor")).toHaveValue("");
    unmount();

    const Rejected = createRoutesStub([route]);
    const { container } = render(
      <Rejected
        initialEntries={["/admin/talleres/nuevo"]}
        hydrationData={{
          loaderData: { new: { teachers: TEACHERS } },
          actionData: {
            new: {
              values: { ...VALUES, defaultFee: "12,5" },
              errors: { defaultFee: "El formato no es válido. Revisalo." },
              formError: "Revisá los campos marcados e intentá de nuevo.",
            },
          },
        }}
      />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue(
      "Cerámica Creativa",
    );
    expect(
      screen.getByLabelText(/Arancel mensual/),
    ).toHaveAccessibleDescription(/El formato no es válido/);
    expect(screen.getByLabelText("Profesor")).toHaveValue("t2");
    expect(
      screen.queryByLabelText(/Entiendo que cambiar el enlace/),
    ).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("edit screen of a published workshop loads the values, the lifecycle controls and the slug confirmation", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/talleres/:id",
        Component: AdminWorkshopDetail,
        action: () => null,
        loader: () => ({
          id: "w1",
          status: "published",
          published: true,
          values: VALUES,
          teachers: TEACHERS,
          activeTurnos: 2,
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/talleres/w1"]} />,
    );
    expect(await screen.findByLabelText("Nombre")).toHaveValue(
      "Cerámica Creativa",
    );
    expect(screen.getByLabelText("Porcentaje acordado")).toHaveValue("35,5");
    expect(screen.getByLabelText("Profesor")).toHaveValue("t2");
    expect(screen.getByText("Publicado")).toBeVisible();
    expect(screen.getByText("2 turnos activos")).toBeVisible();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Archivar" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Eliminar borrador" }),
    ).toBeNull();
    expect(
      screen.getByLabelText(/Entiendo que cambiar el enlace/),
    ).not.toBeChecked();
    await expectNoAxeViolations(container);
  });

  it("edit screen of a draft offers publish and delete, and shows a refused state change", async () => {
    const Stub = createRoutesStub([
      {
        id: "detail",
        path: "/admin/talleres/:id",
        Component: AdminWorkshopDetail,
        action: () => null,
        loader: () => ({
          id: "w1",
          status: "draft",
          published: false,
          values: VALUES,
          teachers: TEACHERS,
          activeTurnos: 0,
        }),
      },
    ]);
    render(
      <Stub
        initialEntries={["/admin/talleres/w1"]}
        hydrationData={{
          loaderData: {
            detail: {
              id: "w1",
              status: "draft",
              published: false,
              values: VALUES,
              teachers: TEACHERS,
              activeTurnos: 0,
            },
          },
          actionData: {
            detail: {
              stateError:
                "Para publicar falta: un profesor asignado, al menos un turno activo.",
            },
          },
        }}
      />,
    );
    expect(
      await screen.findByRole("button", { name: "Publicar" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Eliminar borrador" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Para publicar falta: un profesor asignado, al menos un turno activo.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByLabelText(/Entiendo que cambiar el enlace/),
    ).toBeNull();
  });
});
