import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { EmptyState } from "./empty-state";
describe("EmptyState", () => {
  it("renders a message and one or two calls to action without a list", async () => {
    const { container } = render(
      <EmptyState
        message="Todavía no hay actividades"
        actions={[{ href: "/contacto", label: "Consultanos" }]}
      />,
    );
    expect(screen.getByText("Todavía no hay actividades")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveTextContent("Consultanos");
    expect(container.querySelector("ul")).toBeNull();
    await expectNoAxeViolations(container);
  });
});
