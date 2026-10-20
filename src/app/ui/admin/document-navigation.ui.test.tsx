import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminButtonLink } from "./admin-button-link";
import { AdminEmptyState } from "./empty-state";

/**
 * Layer 1 (`admin-gate.ts`) denies every `/admin/**.data` request, so an admin
 * link must never be intercepted by the client router. A router `Link` calls
 * `preventDefault` on click; a plain anchor leaves the browser to navigate.
 */
function clickLeavesNavigationToBrowser(link: HTMLElement): boolean {
  const seen: { prevented: boolean | null } = { prevented: null };
  const observe = (event: Event) => {
    seen.prevented = event.defaultPrevented;
    event.preventDefault(); // keep jsdom from attempting a real navigation
  };
  document.addEventListener("click", observe);
  fireEvent.click(link);
  document.removeEventListener("click", observe);
  return seen.prevented === false;
}

describe("admin links navigate as documents", () => {
  it("AdminButtonLink is a plain anchor the router does not intercept", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <AdminButtonLink href="/admin/profesores/nuevo">
            Nuevo
          </AdminButtonLink>
        ),
      },
    ]);
    render(<Stub />);
    const link = await screen.findByRole("link", { name: "Nuevo" });
    expect(link).toHaveAttribute("href", "/admin/profesores/nuevo");
    expect(clickLeavesNavigationToBrowser(link)).toBe(true);
  });

  it("the empty state action is not intercepted by the router", async () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <AdminEmptyState
            title="Vacío"
            message="Nada todavía."
            action={{ href: "/admin/profesores/nuevo", label: "Crear" }}
          />
        ),
      },
    ]);
    render(<Stub />);
    const link = await screen.findByRole("link", { name: "Crear" });
    expect(clickLeavesNavigationToBrowser(link)).toBe(true);
  });
});
