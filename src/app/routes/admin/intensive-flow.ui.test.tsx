import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminIntensiveDetail from "./intensive-detail";
import AdminIntensiveNew from "./intensive-new";
import AdminIntensives from "./intensives";

const values = {
  name: "Cerámica de sábado",
  slug: "ceramica-de-sabado",
  summary: "Resumen",
  description: "Descripción",
  teacherId: "",
  percentage: "",
  eventDate: "2026-12-12",
  startsAt: "10:00",
  endsAt: "13:00",
  price: "30000",
  deposit: "10000",
  capacity: "12",
  minSeats: "4",
  policyText: "Política",
  materialsIncluded: false,
  images: [],
};

function crumbs() {
  return within(screen.getByRole("navigation", { name: "Migas de pan" }));
}

describe("intensives guided flow", () => {
  it("list shows breadcrumbs, a banner and a card with date, state and seats", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/intensivos",
        Component: AdminIntensives,
        loader: () => ({
          filter: "vigentes",
          feedback: "deleted",
          rows: [
            {
              id: "i1",
              name: "Cerámica de sábado",
              teacherName: "Ana Gómez",
              status: "draft",
              dateTime: "12 dic 2026, 10:00",
              capacity: 12,
            },
          ],
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/intensivos?ok=deleted"]} />,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Borrador eliminado",
    );
    expect(crumbs().getByRole("link", { name: "Panel" })).toHaveAttribute(
      "href",
      "/admin",
    );
    const list = screen.getByRole("list", { name: "Workshops" });
    expect(within(list).getByText("12 dic 2026, 10:00")).toBeVisible();
    expect(within(list).getByText("Lugares: 12")).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("new screen has breadcrumbs and a top back link", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/intensivos/nuevo",
        Component: AdminIntensiveNew,
        loader: () => ({ teachers: [] }),
        action: () => null,
      },
    ]);
    render(<Stub initialEntries={["/admin/intensivos/nuevo"]} />);
    expect(
      await screen.findByRole("link", { name: "Volver a workshops" }),
    ).toHaveAttribute("href", "/admin/intensivos");
    expect(crumbs().getByRole("link", { name: "Workshops" })).toHaveAttribute(
      "href",
      "/admin/intensivos",
    );
  });

  it("detail shows the intensive name, breadcrumbs, back link and a saved banner", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        action: () => null,
        loader: () => ({
          id: "i1",
          status: "draft",
          feedback: "published",
          values,
          projects: [],
          teachers: [],
          audit: { updatedBy: "a@x.test", updatedAt: "1 dic 2026" },
        }),
      },
    ]);
    render(<Stub initialEntries={["/admin/intensivos/i1"]} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Workshop publicado",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Cerámica de sábado" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver a workshops" }),
    ).toHaveAttribute("href", "/admin/intensivos");
    expect(crumbs().getByText("Cerámica de sábado")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("detail lists the projects of the workshop and confirms a project change", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        action: () => null,
        loader: () => ({
          id: "i1",
          status: "draft",
          feedback: "projectAdded",
          values,
          projects: [
            {
              id: "p1",
              name: "Taza de torno",
              amounts: { price: "$ 45.000", deposit: "$ 15.000" },
              image: null,
              values: {
                name: "Taza de torno",
                price: "45000",
                deposit: "15000",
                image: null,
              },
              materials: [
                {
                  variantId: "v1",
                  name: "Arcilla blanca",
                  label: "5 kg",
                  quantity: 2,
                  onHand: 7,
                },
              ],
            },
          ],
          materialChoices: [],
          teachers: [],
          audit: { updatedBy: "a@x.test", updatedAt: "1 dic 2026" },
        }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/intensivos/i1?ok=projectAdded"]} />,
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Proyecto agregado",
    );
    const list = screen.getByRole("list", { name: "Proyectos" });
    expect(within(list).getByText("Taza de torno")).toBeVisible();
    expect(
      within(list).getByText("Precio $ 45.000 · Seña $ 15.000"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Agregar proyecto" }).closest("form"),
    ).not.toBe(screen.getByLabelText("Nombre").closest("form"));
    const bill = screen.getByRole("group", {
      name: "Materiales de Taza de torno",
    });
    expect(within(bill).getByText("Arcilla blanca")).toBeVisible();
    expect(within(bill).getByText(/En stock: 7/)).toBeVisible();
    expect(
      within(bill).getByRole("spinbutton", {
        name: "Cantidad de Arcilla blanca 5 kg",
      }),
    ).toHaveValue(2);
    await expectNoAxeViolations(container);
  });

  it("detail confirms a bill change and shows a refused line on its project", async () => {
    const loaderData = {
      id: "i1",
      status: "draft",
      feedback: "materialSaved",
      values,
      projects: [
        {
          id: "p1",
          name: "Taza de torno",
          amounts: { price: "$ 45.000", deposit: "$ 15.000" },
          image: null,
          values: {
            name: "Taza de torno",
            price: "45000",
            deposit: "15000",
            image: null,
          },
          materials: [],
        },
      ],
      materialChoices: [],
      teachers: [],
      audit: { updatedBy: "a@x.test", updatedAt: "1 dic 2026" },
    };
    const Stub = createRoutesStub([
      {
        id: "detail",
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        action: () => null,
        loader: () => loaderData,
      },
    ]);

    render(
      <Stub
        initialEntries={["/admin/intensivos/i1?ok=materialSaved"]}
        hydrationData={{
          loaderData: { detail: loaderData },
          actionData: {
            detail: {
              projectMaterial: {
                projectId: "p1",
                message:
                  "Ese material ya está en la lista de este proyecto. Cambiá su cantidad.",
              },
            },
          },
        }}
      />,
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cantidad guardada",
    );
    expect(
      screen.getByText(
        "Ese material ya está en la lista de este proyecto. Cambiá su cantidad.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Este proyecto todavía no tiene materiales."),
    ).toBeVisible();
  });

  it("detail shows what a refused project action returned", async () => {
    const loaderData = {
      id: "i1",
      status: "draft",
      values,
      projects: [],
      materialChoices: [],
      teachers: [],
      audit: { updatedBy: "a@x.test", updatedAt: "1 dic 2026" },
    };
    const Stub = createRoutesStub([
      {
        id: "detail",
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        action: () => null,
        loader: () => loaderData,
      },
    ]);

    render(
      <Stub
        initialEntries={["/admin/intensivos/i1"]}
        hydrationData={{
          loaderData: { detail: loaderData },
          actionData: {
            detail: {
              projects: {
                target: "new",
                values: {
                  name: "",
                  price: "1000",
                  deposit: "2000",
                  image: null,
                },
                errors: { name: "Completá este campo." },
                formError: "Revisá los campos marcados e intentá de nuevo.",
              },
            },
          },
        }}
      />,
    );

    expect(await screen.findByText("Completá este campo.")).toBeVisible();
    expect(screen.getByLabelText("Precio total (en pesos)")).toHaveValue(
      "1000",
    );
    expect(screen.getByLabelText("Nombre")).toHaveValue("Cerámica de sábado");
  });
});
