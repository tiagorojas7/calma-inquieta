import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ErrorPage } from "./error-page";

function renderError(status: number, onRetry?: () => void) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <main>
          <ErrorPage status={status} {...(onRetry ? { onRetry } : {})} />
        </main>
      ),
    },
    { path: "/talleres", Component: () => <p>Pantalla de talleres</p> },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("ErrorPage", () => {
  it.each([404, 500])("renders safe Spanish copy for %s", async (status) => {
    const { container } = renderError(status);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(container.textContent).not.toContain("secret-token");
    await expectNoAxeViolations(container, { page: true });
  });

  it.each([404, 500])(
    "offers one primary route home and useful destinations for %s (ER01, ER02)",
    (status) => {
      renderError(status);
      const home = screen.getByRole("link", { name: "Volver al inicio" });
      expect(home).toHaveAttribute("href", "/");
      expect(home).toHaveClass("bg-clay-600");
      expect(screen.getByRole("link", { name: "Contacto" })).not.toHaveClass(
        "bg-clay-600",
      );
      expect(
        screen.getByRole("link", { name: "Ver talleres" }),
      ).toHaveAttribute("href", "/talleres");
      expect(
        screen.getByRole("link", { name: "Ver intensivos" }),
      ).toHaveAttribute("href", "/intensivos");
      expect(screen.getByRole("link", { name: "Contacto" })).toHaveAttribute(
        "href",
        "/contacto",
      );
    },
  );

  it("navigates inside the app instead of reloading the document", async () => {
    renderError(404);
    await userEvent.click(screen.getByRole("link", { name: "Ver talleres" }));
    expect(await screen.findByText("Pantalla de talleres")).toBeVisible();
  });

  it("offers a retry only for server errors", async () => {
    const onRetry = vi.fn();
    renderError(500, onRetry);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offers no retry on a not-found page", () => {
    renderError(404);
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("keeps the decorative art out of the accessibility tree", () => {
    const { container } = renderError(404);
    expect(container.querySelector("[data-error-art]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
