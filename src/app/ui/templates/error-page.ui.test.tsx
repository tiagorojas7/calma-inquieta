import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ErrorPage } from "./error-page";

describe("ErrorPage", () => {
  it.each([404, 500])("renders safe Spanish copy for %s", async (status) => {
    const { container } = render(
      <main>
        <ErrorPage status={status} />
      </main>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Contacto" })).toHaveAttribute(
      "href",
      "/contacto",
    );
    expect(container.textContent).not.toContain("secret-token");
    await expectNoAxeViolations(container, { page: true });
  });
});
