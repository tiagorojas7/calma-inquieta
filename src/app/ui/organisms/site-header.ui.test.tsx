import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub, StaticRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PUBLIC_PAGES } from "~/app/site-map";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { SiteHeader } from "./site-header";

const whatsappHref = "https://wa.me/5493517395239";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  setScrollY(0);
  Reflect.deleteProperty(document, "startViewTransition");
});

describe("SiteHeader scroll state", () => {
  function renderHeader(menuOpen = false) {
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <SiteHeader
            pages={PUBLIC_PAGES}
            profile={{ whatsappHref }}
            menuOpen={menuOpen}
            onMenuOpenChange={vi.fn()}
          />
        ),
      },
    ]);
    return render(<Stub initialEntries={["/"]} />);
  }

  it("is solid in the server markup, so it reads without JavaScript", () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/">
        <SiteHeader
          pages={PUBLIC_PAGES}
          profile={{ whatsappHref }}
          menuOpen={false}
          onMenuOpenChange={vi.fn()}
        />
      </StaticRouter>,
    );

    expect(html).toContain('data-solid="true"');
    expect(html).toContain("bg-sand-200");
    expect(html).not.toContain("bg-transparent");
  });

  it("is transparent over the page top after mount", () => {
    renderHeader();

    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-solid", "false");
    expect(header).toHaveClass("bg-transparent");
    expect(header).not.toHaveClass("shadow-header");
  });

  it("becomes solid sand with a soft shadow after scrolling past 24 px", () => {
    renderHeader();
    const header = screen.getByRole("banner");

    setScrollY(24);
    fireEvent.scroll(window);
    expect(header).toHaveAttribute("data-solid", "false");

    setScrollY(25);
    fireEvent.scroll(window);
    expect(header).toHaveAttribute("data-solid", "true");
    expect(header).toHaveClass("bg-sand-200", "shadow-header");
    expect(header).not.toHaveClass("bg-transparent");

    setScrollY(0);
    fireEvent.scroll(window);
    expect(header).toHaveAttribute("data-solid", "false");
  });

  it("starts solid when the page is mounted already scrolled", () => {
    setScrollY(400);
    renderHeader();

    expect(screen.getByRole("banner")).toHaveAttribute("data-solid", "true");
  });

  it("is solid while the menu is open, however far the page is scrolled", () => {
    renderHeader(true);

    expect(screen.getByRole("banner")).toHaveAttribute("data-solid", "true");
  });

  it("is sticky, eases its colour and shadow and removes its scroll listener on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHeader();

    expect(screen.getByRole("banner")).toHaveClass(
      "sticky",
      "top-0",
      "z-30",
      "site-header",
      "transition-[background-color,box-shadow]",
      "duration-300",
    );
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

describe("SiteHeader full-screen menu", () => {
  function renderMenu(path = "/", menuOpen = true) {
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <SiteHeader
            pages={PUBLIC_PAGES}
            profile={{ whatsappHref }}
            menuOpen={menuOpen}
            onMenuOpenChange={vi.fn()}
          />
        ),
      },
    ]);
    return render(<Stub initialEntries={[path]} />);
  }

  it("is a full-screen overlay with an entrance hook and a close button", () => {
    renderMenu();

    const close = screen.getByRole("button", { name: "Cerrar menú" });
    const overlay = close.parentElement?.querySelector("#menu-principal");
    expect(overlay).toHaveClass(
      "menu-overlay",
      "max-lg:fixed",
      "max-lg:inset-0",
    );
    expect(close).toHaveAttribute("aria-expanded", "true");
  });

  it("sets large Cormorant links that stagger in by index", () => {
    renderMenu();

    const items = within(
      screen.getByRole("navigation", { name: "Principal" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(PUBLIC_PAGES.length);
    items.forEach((item, index) => {
      expect(item).toHaveClass("menu-item");
      expect(item.style.getPropertyValue("--i")).toBe(String(index));
      expect(within(item).getByRole("link")).toHaveClass(
        "max-lg:font-display",
        "max-lg:text-4xl",
      );
    });
    const cta = screen.getByRole("link", { name: "Escribinos por WhatsApp" });
    expect(cta).toHaveClass("menu-item");
    expect(cta.style.getPropertyValue("--i")).toBe(String(PUBLIC_PAGES.length));
  });

  it("takes the logo out of the tab order while the overlay is open", () => {
    renderMenu();

    expect(
      screen.getByRole("link", { name: "Calma Inquieta", hidden: true }),
    ).toHaveAttribute("inert");
  });

  it("leaves the logo reachable while the menu is closed", () => {
    renderMenu("/", false);

    expect(
      screen.getByRole("link", { name: "Calma Inquieta" }),
    ).not.toHaveAttribute("inert");
  });

  it("navigates the logo and the nav links with a view transition", async () => {
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
    const user = userEvent.setup();
    renderMenu("/talleres", false);

    await user.click(screen.getByRole("link", { name: "Calma Inquieta" }));
    expect(start).toHaveBeenCalledTimes(1);

    await act(async () => {
      await user.click(
        within(screen.getByRole("navigation", { name: "Principal" })).getByRole(
          "link",
          { name: "Talleres" },
        ),
      );
    });
    expect(start).toHaveBeenCalledTimes(2);
  });
});

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
      const disclosure = screen
        .getByRole("button")
        .parentElement?.querySelector("#menu-principal");
      expect(disclosure).toHaveAttribute("data-state", "closed");
      expect(disclosure).toHaveClass(
        "max-lg:data-[state=closed]:hidden",
        "max-lg:min-h-screen",
        "max-lg:w-full",
        "max-lg:fixed",
        "max-lg:inset-0",
        "max-lg:z-40",
      );
      expect(disclosure).toHaveClass("lg:flex");
      return expectNoAxeViolations(container);
    },
  );

  it("renders an opaque, scrollable mobile menu panel beneath its toggle", () => {
    renderHeader("/", true);

    const toggle = screen.getByRole("button", { name: "Cerrar menú" });
    const disclosure = toggle.parentElement?.querySelector("#menu-principal");

    expect(disclosure).toHaveAttribute("data-state", "open");
    expect(disclosure).toHaveClass(
      "max-lg:bg-sand-200",
      "max-lg:min-h-screen",
      "max-lg:overflow-y-auto",
      "max-lg:px-gutter",
      "max-lg:py-24",
      "max-lg:z-40",
    );
    expect(toggle).toHaveClass("relative", "z-50");
  });
});

describe("SiteHeader brand", () => {
  const logo = {
    src: "/media/brand/brand-logo-56.7b093bc3.webp",
    srcSet: "/media/brand/brand-logo-56.7b093bc3.webp 56w",
    width: 56,
    height: 59,
  };
  const logoLight = {
    src: "/media/brand/brand-logo-light-56.298df7e7.webp",
    srcSet: "/media/brand/brand-logo-light-56.298df7e7.webp 56w",
    width: 56,
    height: 59,
  };

  function renderBrand(
    props: Partial<Parameters<typeof SiteHeader>[0]> = {},
    path = "/",
  ) {
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <SiteHeader
            pages={PUBLIC_PAGES}
            profile={{ whatsappHref }}
            menuOpen={false}
            onMenuOpenChange={vi.fn()}
            {...props}
          />
        ),
      },
    ]);
    return render(<Stub initialEntries={[path]} />);
  }

  it("shows the monogram beside the visible wordmark, and the link keeps its name", async () => {
    const { container } = renderBrand({ brand: { logo } });

    const home = screen.getByRole("link", { name: "Calma Inquieta" });
    expect(home).toHaveAttribute("href", "/");
    expect(home).toHaveTextContent("Calma Inquieta");
    const image = home.querySelector("img");
    expect(image).toHaveAttribute("src", logo.src);
    expect(image).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("falls back to the wordmark alone when no logo is published", () => {
    renderBrand({ brand: {} });

    const home = screen.getByRole("link", { name: "Calma Inquieta" });
    expect(home.querySelector("img")).toBeNull();
    expect(home).toHaveTextContent("Calma Inquieta");
  });

  it("marks a dark hero backdrop and ships the light logo only then", () => {
    const { unmount } = renderBrand({ brand: { logo, logoLight } });
    expect(screen.getByRole("banner")).not.toHaveAttribute("data-backdrop");
    expect(screen.getByRole("banner").querySelector("img")).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(
      screen.getByRole("banner").querySelector('img[data-ink="light"]'),
    ).toBeNull();
    unmount();

    renderBrand({
      brand: { logo, logoLight },
      heroBackdrop: "dark-below-lg",
    });
    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-backdrop", "dark-below-lg");
    expect(header.querySelector('img[data-ink="light"]')).toHaveAttribute(
      "src",
      logoLight.src,
    );
    expect(header.querySelector('img[data-ink="dark"]')).toHaveAttribute(
      "src",
      logo.src,
    );
  });

  it("keeps the scroll state and the menu toggle on a dark backdrop", () => {
    renderBrand({
      brand: { logo, logoLight },
      heroBackdrop: "dark-below-lg",
    });
    const header = screen.getByRole("banner");

    expect(header).toHaveAttribute("data-solid", "false");
    setScrollY(80);
    fireEvent.scroll(window);
    expect(header).toHaveAttribute("data-solid", "true");
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-controls",
      "menu-principal",
    );
  });

  it("shows a tagline in the script accent inside the open menu", () => {
    renderBrand({
      profile: {
        whatsappHref,
        tagline: "Equilibrio entre serenidad y movimiento",
      },
      menuOpen: true,
    });

    const tagline = screen.getByText("Equilibrio entre serenidad y movimiento");
    expect(tagline).toHaveAttribute("data-script", "true");
    expect(tagline.closest(".menu-item")).not.toBeNull();
  });

  it("puts the WhatsApp glyph in the call to action without changing its name", () => {
    renderBrand();

    const cta = screen.getByRole("link", { name: "Escribinos por WhatsApp" });
    expect(cta.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives back width at lg so the nav and call to action fit at 1024 px", () => {
    renderBrand({ brand: { logo } });

    const home = screen.getByRole("link", { name: "Calma Inquieta" });
    expect(home.querySelector("span:not(.brand-logo)")).toHaveClass(
      "text-2xl",
      "lg:text-xl",
      "xl:text-2xl",
    );
    const cta = screen.getByRole("link", { name: "Escribinos por WhatsApp" });
    expect(cta.querySelector("svg")).toHaveClass("lg:max-xl:hidden");
  });
});
