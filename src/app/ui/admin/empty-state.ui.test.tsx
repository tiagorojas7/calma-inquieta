import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminEmptyState } from "./empty-state";

function renderState() {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <AdminEmptyState
          title="Todavía no hay profesores"
          message="Cargá el primero para poder asignarlo a un taller."
          action={{ href: "/admin/profesores/nuevo", label: "Nuevo profesor" }}
        />
      ),
    },
  ]);
  return render(<Stub />);
}

describe("AdminEmptyState", () => {
  it("shows a heading, the message and a link to create the first record", async () => {
    const { container } = renderState();
    expect(
      await screen.findByRole("heading", {
        name: "Todavía no hay profesores",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cargá el primero para poder asignarlo a un taller."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Nuevo profesor" }),
    ).toHaveAttribute("href", "/admin/profesores/nuevo");
    await expectNoAxeViolations(container);
  });
});
