import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminEnrollmentNew from "./enrollment-new";

const options = [
  {
    value: "ceramica|2026-11|t1",
    label: "Cerámica · noviembre 2026 · Lunes",
    fee: "58000",
  },
];

const materials = [
  {
    materialId: "m-1",
    variantId: "v-1",
    name: "Arcilla blanca",
    label: "1 kg",
    unitPrice: 4000,
    priceLabel: "$ 4.000",
  },
];

describe("admin enrollment-new screen", () => {
  it("shows breadcrumbs, a back button and the form", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/inscripciones/nueva",
        Component: AdminEnrollmentNew,
        loader: () => ({ options, materials }),
      },
    ]);
    const { container } = render(
      <Stub initialEntries={["/admin/inscripciones/nueva"]} />,
    );
    expect(
      await screen.findByRole(
        "heading",
        { name: "Nueva inscripción" },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Volver a inscripciones/ }),
    ).toHaveAttribute("href", "/admin/inscripciones");
    expect(screen.getByLabelText("Taller, mes y turno")).toBeInTheDocument();
    expect(screen.getByLabelText("Cuota")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Materiales (opcional)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Buscar material" }),
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("explains the empty state when nothing accepts enrollments", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/inscripciones/nueva",
        Component: AdminEnrollmentNew,
        loader: () => ({ options: [] }),
      },
    ]);
    render(<Stub initialEntries={["/admin/inscripciones/nueva"]} />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "No hay talleres con inscripciones abiertas.",
    );
  });
});
