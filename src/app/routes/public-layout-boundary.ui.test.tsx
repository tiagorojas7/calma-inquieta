import { render, screen } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import PublicLayout, { ErrorBoundary } from "./public-layout";

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
  }, 10_000);

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
  }, 10_000);
});

describe("public layout header backdrop", () => {
  const logo = {
    src: "/media/brand/brand-logo-56.7b093bc3.webp",
    alt: "",
    width: 56,
    height: 59,
  };
  const logoLight = {
    src: "/media/brand/brand-logo-light-56.298df7e7.webp",
    alt: "",
    width: 56,
    height: 59,
  };
  const layoutData = {
    wordmark: "Calma Inquieta",
    whatsappHref: "https://wa.me/5493517395239",
    instagramHref: "https://www.instagram.com/calma.inquieta/",
    directionsHref: "https://www.google.com/maps/dir/?api=1&destination=x",
    brand: { logo, logoLight },
    footer: {
      address: { street: "Albert Sabin 6079", locality: "Argüello" },
      bajada: "Equilibrio entre serenidad y movimiento",
      whatsapp: { display: "351 739 5239", provisional: true },
    },
  };

  function renderLayout(handle?: unknown) {
    const Stub = createRoutesStub([
      {
        id: "routes/public-layout",
        path: "/",
        Component: PublicLayout,
        loader: () => layoutData,
        children: [
          {
            index: true,
            Component: () => <p>Página de prueba</p>,
            ...(handle === undefined ? {} : { handle }),
          },
        ],
      },
    ]);
    return render(<Stub initialEntries={["/"]} />);
  }

  it("uses the dark-hero header when the matched route carries the handle", async () => {
    renderLayout({ heroBackdrop: "dark-below-lg" });

    const header = await screen.findByRole("banner");
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

  it("keeps the normal header for a route without the handle or with another value", async () => {
    const { unmount } = renderLayout();
    const plain = await screen.findByRole("banner");
    expect(plain).not.toHaveAttribute("data-backdrop");
    expect(plain.querySelector('img[data-ink="light"]')).toBeNull();
    unmount();

    renderLayout({ heroBackdrop: "something-else" });
    expect(await screen.findByRole("banner")).not.toHaveAttribute(
      "data-backdrop",
    );
  });

  it("feeds the footer the logo and the directions link", async () => {
    renderLayout();

    await screen.findByRole("banner");
    const footer = screen.getByRole("contentinfo");
    expect(footer.querySelector("img")).toHaveAttribute("src", logo.src);
    expect(screen.getByRole("link", { name: /cómo llegar/i })).toHaveAttribute(
      "href",
      layoutData.directionsHref,
    );
  });
});
