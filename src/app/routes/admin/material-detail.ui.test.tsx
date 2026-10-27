import { fireEvent, render, screen } from "@testing-library/react";
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
  image: { src: "/imagenes/pincel.webp", alt: "Un pincel" },
  variants: [
    {
      id: "v1",
      label: "Chico",
      price: "2500",
      available: true,
      used: false,
      swatch: "#111111",
    },
    {
      id: "v2",
      label: "Grande",
      price: "2500",
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
      action,
    },
  ]);
}

describe("material detail screen", () => {
  it("renders identity, availability, archived supplier continuity, used variant, audit and a plain back anchor accessibly", async () => {
    const Stub = stub();
    const { container } = render(
      <Stub initialEntries={[`/admin/materiales/${ID}`]} />,
    );
    expect(
      await screen.findByRole("heading", { name: "Pincel plano" }),
    ).toBeVisible();
    expect(screen.getAllByText("No disponible")).toHaveLength(2);
    expect(screen.getByText("Casa archivada (archivado)")).toBeVisible();
    expect(screen.getByText("Grande")).toBeVisible();
    expect(screen.getByText("Usada")).toBeVisible();
    expect(
      screen.getByText("No disponible", { selector: "span" }),
    ).toBeVisible();
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

  it("announces lifecycle feedback accessibly", () => {
    render(
      <MaterialDetail
        {...detail}
        stateError="Ya existe uno activo con el mismo nombre."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ya existe uno activo con el mismo nombre.",
    );
  });

  it("uses ConfirmedSubmit native document forms for deactivate and reactivate", async () => {
    const Active = stub();
    const { unmount } = render(
      <Active initialEntries={[`/admin/materiales/${ID}`]} />,
    );
    const deactivate = await screen.findByRole("button", {
      name: "Desactivar",
    });
    const activeForm = deactivate.closest("form");
    expect(activeForm).toHaveAttribute("method", "post");
    expect(activeForm?.querySelector("input[name=intent]")).toHaveValue(
      "deactivate",
    );
    fireEvent.click(deactivate);
    expect(await screen.findByRole("dialog")).toBeVisible();
    unmount();

    const Archived = stub({ ...detail, active: false });
    render(<Archived initialEntries={[`/admin/materiales/${ID}`]} />);
    const reactivate = await screen.findByRole("button", { name: "Reactivar" });
    const archivedForm = reactivate.closest("form");
    expect(archivedForm).toHaveAttribute("method", "post");
    expect(archivedForm?.querySelector("input[name=intent]")).toHaveValue(
      "reactivate",
    );
    fireEvent.click(reactivate);
    expect(await screen.findByRole("dialog")).toBeVisible();
  });
});
