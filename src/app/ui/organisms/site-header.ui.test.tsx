import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PUBLIC_PAGES } from "~/app/site-map";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  function renderHeader(path = "/", menuOpen = false) {
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <SiteHeader
            pages={PUBLIC_PAGES}
            profile={{ whatsappHref: "https://wa.me/5493517395239" }}
            menuOpen={menuOpen}
            onMenuOpenChange={vi.fn()}
          />
        ),
      },
    ]);
    return render(<Stub initialEntries={[path]} />);
  }

  it.each([["/"], ["/talleres"], ["/nos-publicado"]])(
    "renders the complete navigation at %s",
    (path) => {
      const { container } = renderHeader(path);
      const nav = screen.getByRole("navigation", { name: "Principal" });
      const links = within(nav).getAllByRole("link");
      expect(links).toHaveLength(6);
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        PUBLIC_PAGES.map((page) => page.path),
      );
      expect(
        screen.getByRole("link", { name: "Escribinos por WhatsApp" }),
      ).toHaveAttribute("href", "https://wa.me/5493517395239");
      expect(
        screen.getByRole("link", { name: "Escribinos por WhatsApp" })
          .parentElement,
      ).toBe(
        screen.getByRole("navigation", { name: "Principal" }).parentElement,
      );
      const current = links.filter(
        (link) => link.getAttribute("aria-current") === "page",
      );
      expect(current).toHaveLength(path === "/nos-publicado" ? 0 : 1);
      if (path !== "/nos-publicado")
        expect(current[0]).toHaveAttribute("href", path);
      expect(
        screen.getByRole("link", { name: "Calma Inquieta" }),
      ).toHaveAttribute("href", "/");
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-controls",
        "menu-principal",
      );
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(
        screen
          .getByRole("button")
          .parentElement?.querySelector("#menu-principal"),
      ).toHaveAttribute("data-state", "closed");
      return expectNoAxeViolations(container);
    },
  );
});
