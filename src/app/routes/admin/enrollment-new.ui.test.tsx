import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminEnrollmentNew from "./enrollment-new";

const options = [
  { value: "ceramica|2026-11|t1", label: "Cerámica · noviembre 2026 · Lunes" },
];

describe("admin enrollment-new screen", () => {
  it("shows breadcrumbs, a back button and the form", async () => {
    const Stub = createRoutesStub([
      {
        path: "/admin/inscripciones/nueva",
        Component: AdminEnrollmentNew,
        loader: () => ({ options }),
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
