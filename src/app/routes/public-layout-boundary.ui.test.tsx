import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ErrorBoundary } from "./public-layout";

describe("public layout error boundary", () => {
  it("renders public chrome around a safe not-found error", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => {
          throw data(null, { status: 404 });
        },
        ErrorBoundary,
      },
    ]);
    const { container } = render(<Stub initialEntries={["/"]} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Página no encontrada" }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("secret-token");
    await expectNoAxeViolations(container, { page: true });
  });

  it("renders public chrome around a safe server error", async () => {
    const Stub = createRoutesStub([{ path: "/", Component: ErrorBoundary }]);
    const { container } = render(<Stub initialEntries={["/"]} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Algo salió mal" }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("secret-token");
    await expectNoAxeViolations(container, { page: true });
  });
});
