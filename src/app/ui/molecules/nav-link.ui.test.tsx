import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { NavLink } from "./nav-link";

/** jsdom has no View Transitions API: a stub that applies the update at once. */
function stubViewTransition() {
  const start = vi.fn((update?: () => unknown) => {
    void update?.();
    return {
      finished: Promise.resolve(),
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
      skipTransition: vi.fn(),
    };
  });
  Object.defineProperty(document, "startViewTransition", {
    value: start,
    configurable: true,
    writable: true,
  });
  return start;
}

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
});

describe("NavLink", () => {
  it("draws the animated underline and merges a className", () => {
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <NavLink href="/" className="font-display">
            Inicio
          </NavLink>
        ),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    expect(screen.getByRole("link")).toHaveClass(
      "link-underline",
      "font-display",
    );
  });

  it("navigates with a view transition", async () => {
    const start = stubViewTransition();
    const user = userEvent.setup();
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => <NavLink href="/talleres">Talleres</NavLink>,
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    await user.click(screen.getByRole("link", { name: "Talleres" }));

    expect(start).toHaveBeenCalled();
  });

  it("does not prefix-match the root at a nested location", () => {
    const Stub = createRoutesStub([
      { path: "*", Component: () => <NavLink href="/">Inicio</NavLink> },
    ]);
    render(<Stub initialEntries={["/talleres"]} />);
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });
  it("marks only the current route and notifies navigation", () => {
    const onNavigate = vi.fn();
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <NavLink href="/" onNavigate={onNavigate}>
            Inicio
          </NavLink>
        ),
      },
    ]);
    const { container } = render(<Stub initialEntries={["/"]} />);
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
    screen.getByRole("link").click();
    expect(onNavigate).toHaveBeenCalled();
    return expectNoAxeViolations(container);
  });
});
