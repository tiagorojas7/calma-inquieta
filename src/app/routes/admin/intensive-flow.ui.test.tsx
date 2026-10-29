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
    const list = screen.getByRole("list", { name: "Intensivos" });
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
      await screen.findByRole("link", { name: "Volver a intensivos" }),
    ).toHaveAttribute("href", "/admin/intensivos");
    expect(crumbs().getByRole("link", { name: "Intensivos" })).toHaveAttribute(
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
          teachers: [],
          audit: { updatedBy: "a@x.test", updatedAt: "1 dic 2026" },
        }),
      },
    ]);
    render(<Stub initialEntries={["/admin/intensivos/i1"]} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Intensivo publicado",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Cerámica de sábado" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Volver a intensivos" }),
    ).toHaveAttribute("href", "/admin/intensivos");
    expect(crumbs().getByText("Cerámica de sábado")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
