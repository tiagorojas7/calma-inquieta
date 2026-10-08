import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { NavLink } from "./nav-link";

describe("NavLink", () => {
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
    render(<Stub initialEntries={["/"]} />);
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
    screen.getByRole("link").click();
    expect(onNavigate).toHaveBeenCalled();
  });
});
