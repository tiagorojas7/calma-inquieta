import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PUBLIC_PAGES } from "~/app/site-map";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { PublicPage } from "./public-page";

const profile = {
  name: "Calma Inquieta",
  address: { street: "Albert Sabin 6079", locality: "Argüello" },
  bajada: "Equilibrio entre serenidad y movimiento",
  instagramHref: "https://www.instagram.com/calma.inquieta/",
  whatsappHref: "https://wa.me/5493517395239",
  whatsappDisplay: "351 739 5239",
  provisional: true,
};

function renderPage(path = "/") {
  const Stub = createRoutesStub([
    {
      path: "*",
      Component: () => (
        <PublicPage pages={PUBLIC_PAGES} profile={profile}>
          <h1>Inicio</h1>
          <p>Contenido principal</p>
        </PublicPage>
      ),
    },
  ]);
  return render(<Stub initialEntries={[path]} />);
}

describe("PublicPage", () => {
  it("renders accessible landmarks, skip link and page axe contract", async () => {
    const { container } = renderPage();
    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toHaveAttribute("href", "#contenido");
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenido");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    await expectNoAxeViolations(container, { page: true });
  });

  it("centers the header, main and footer in the page container with gutters", () => {
    renderPage();
    const containers = [
      screen.getByRole("banner").firstElementChild,
      screen.getByRole("main"),
      screen.getByRole("contentinfo").firstElementChild,
    ];
    for (const element of containers) {
      expect(element).toHaveClass("mx-auto", "max-w-page", "px-gutter");
    }
  });

  it("inerts the background and manages menu close and focus", async () => {
    renderPage();
    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    fireEvent.click(toggle);
    expect(screen.getByRole("main")).toHaveAttribute("inert");
    expect(screen.getByRole("contentinfo")).toHaveAttribute("inert");
    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toHaveAttribute("inert");
    expect(document.documentElement).toHaveAttribute("data-menu-open");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(toggle).toHaveFocus());
    expect(document.documentElement).not.toHaveAttribute("data-menu-open");
  });

  it("lets the page render full-bleed bands: main is a plain container with no horizontal clipping of its own", () => {
    renderPage();

    expect(screen.getByRole("main")).not.toHaveClass("overflow-hidden");
    expect(screen.getByRole("main")).not.toHaveClass("overflow-x-hidden");
    expect(screen.getByRole("main")).toHaveClass("w-full");
  });

  it("traps Tab inside the open menu, wrapping from the last control to the toggle and back", () => {
    renderPage();
    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    fireEvent.click(toggle);
    const menu = document.getElementById("menu-principal");
    const controls = [
      toggle,
      ...Array.from(menu?.querySelectorAll<HTMLElement>("a[href]") ?? []),
    ];
    const last = controls[controls.length - 1];

    last?.focus();
    const forward = fireEvent.keyDown(document, { key: "Tab" });
    expect(forward).toBe(false);
    expect(toggle).toHaveFocus();

    const backward = fireEvent.keyDown(document, {
      key: "Tab",
      shiftKey: true,
    });
    expect(backward).toBe(false);
    expect(last).toHaveFocus();
  });

  it("leaves Tab alone between the menu controls and while the menu is closed", () => {
    renderPage();
    const toggle = screen.getByRole("button", { name: "Abrir menú" });

    toggle.focus();
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(true);

    fireEvent.click(toggle);
    toggle.focus();
    expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(true);
    expect(toggle).toHaveFocus();
  });

  it("locks the page scroll while the menu is open and releases it on close", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(document.documentElement).toHaveAttribute("data-menu-open");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(document.documentElement).not.toHaveAttribute("data-menu-open");
  });

  it("closes from navigation, pathname and desktop media changes", async () => {
    const mediaListeners: Array<(event: MediaQueryListEvent) => void> = [];
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "(min-width: 1024px)",
      onchange: null,
      addEventListener: (
        _type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        if (typeof listener === "function") mediaListeners.push(listener);
      },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Principal" })).getByRole(
        "link",
        { name: "Inicio" },
      ),
    );
    await waitFor(() => {
      expect(document.documentElement).not.toHaveAttribute("data-menu-open");
    });
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    mediaListeners.forEach((listener) => {
      listener({ matches: true } as MediaQueryListEvent);
    });
    await waitFor(() => {
      expect(document.documentElement).not.toHaveAttribute("data-menu-open");
    });
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
  });
});
