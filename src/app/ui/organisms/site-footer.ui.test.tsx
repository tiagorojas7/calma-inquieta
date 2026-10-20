import { render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { PUBLIC_PAGES } from "~/app/site-map";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { SiteFooter } from "./site-footer";

type FooterProfile = Parameters<typeof SiteFooter>[0]["profile"];

const profile: FooterProfile = {
  name: "Calma Inquieta",
  address: { street: "Albert Sabin 6079", locality: "Argüello" },
  bajada: "Equilibrio entre serenidad y movimiento",
  instagramHref: "https://www.instagram.com/calma.inquieta/",
  whatsappHref: "https://wa.me/5493517395239",
  directionsHref:
    "https://www.google.com/maps/dir/?api=1&destination=Albert%20Sabin%206079",
  whatsappDisplay: "351 739 5239",
  provisional: true,
};

const logo = {
  src: "/media/brand/brand-logo-56.7b093bc3.webp",
  srcSet: "/media/brand/brand-logo-56.7b093bc3.webp 56w",
  width: 56,
  height: 59,
};

function renderFooter(
  overrides: Partial<FooterProfile> = {},
  brand?: { logo?: typeof logo },
) {
  const Stub = createRoutesStub([
    {
      path: "*",
      Component: () => (
        <SiteFooter
          pages={PUBLIC_PAGES}
          profile={{ ...profile, ...overrides }}
          {...(brand ? { brand } : {})}
        />
      ),
    },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("SiteFooter", () => {
  it("shows NAP, bajada, social links and the no-JS page navigation", async () => {
    const { container } = renderFooter();

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Albert Sabin 6079",
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Argüello");
    expect(screen.getByRole("contentinfo")).toHaveTextContent(profile.bajada);
    expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
      "href",
      profile.instagramHref,
    );
    expect(screen.getByRole("link", { name: /instagram/i })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );

    const nav = screen.getByRole("navigation", { name: "Páginas" });
    expect(within(nav).getAllByRole("link")).toHaveLength(PUBLIC_PAGES.length);
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(PUBLIC_PAGES.map((page) => page.path));
    await expectNoAxeViolations(container);
  });

  it("underlines every text link of the footer with the animated underline", () => {
    renderFooter();

    const textLinks = screen
      .getAllByRole("link")
      .filter(
        (link) =>
          !link.hasAttribute("data-footer-social") &&
          !link.hasAttribute("data-footer-cta"),
      );
    expect(textLinks).toHaveLength(PUBLIC_PAGES.length);
    for (const link of textLinks) {
      expect(link, link.textContent).toHaveClass("link-underline");
    }
  });

  it("keeps a provisional WhatsApp number usable without printing its digits", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      profile.whatsappHref,
    );
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent(
      profile.whatsappDisplay,
    );
  });

  it("prints confirmed WhatsApp digits and optional confirmed facts", () => {
    renderFooter({
      provisional: false,
      email: "hola@calmainquieta.com",
      phone: "+54 351 555 0101",
      hours: "Lunes a viernes, 9 a 18 h",
    });
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(profile.whatsappDisplay);
    expect(footer).toHaveTextContent("hola@calmainquieta.com");
    expect(footer).toHaveTextContent("+54 351 555 0101");
    expect(footer).toHaveTextContent("Lunes a viernes, 9 a 18 h");
  });

  it("offers WhatsApp, Instagram and Google Maps icon links with a visible label and a 44 px target", () => {
    renderFooter();

    const whatsapp = screen.getByRole("link", { name: /whatsapp/i });
    const instagram = screen.getByRole("link", { name: /instagram/i });
    const maps = screen.getByRole("link", { name: /cómo llegar/i });
    expect(whatsapp).toHaveAttribute("href", profile.whatsappHref);
    expect(instagram).toHaveAttribute("href", profile.instagramHref);
    expect(maps).toHaveAttribute("href", profile.directionsHref);
    expect(maps).toHaveAccessibleName(/google maps/i);
    for (const link of [whatsapp, instagram, maps]) {
      expect(link).toHaveAttribute("data-footer-social");
      expect(link).toHaveClass("min-h-11");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(link.textContent.trim()).not.toBe("");
    }
  });

  it("keeps a non-http WhatsApp fallback in the same tab", () => {
    renderFooter({ whatsappHref: "#" });

    expect(screen.getByRole("link", { name: /whatsapp/i })).not.toHaveAttribute(
      "target",
    );
  });

  it("closes with a booking call to action that reaches WhatsApp", () => {
    renderFooter();

    const cta = screen.getByRole("link", { name: /reservá tu lugar/i });
    expect(cta).toHaveAttribute("href", profile.whatsappHref);
    expect(cta).toHaveAttribute("data-footer-cta");
    expect(cta).toHaveClass("min-h-11");
  });

  it("shows the logo beside the name and the tagline in the script accent", () => {
    const { container } = renderFooter({}, { logo });

    const footer = screen.getByRole("contentinfo");
    expect(footer.querySelector("img")).toHaveAttribute("src", logo.src);
    expect(footer.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByText(profile.bajada)).toHaveAttribute(
      "data-script",
      "true",
    );
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("renders without a logo", () => {
    renderFooter();

    expect(screen.getByRole("contentinfo").querySelector("img")).toBeNull();
  });

  it("leaves the Maps link out when no directions link is known", () => {
    const withoutDirections: FooterProfile = { ...profile };
    delete withoutDirections.directionsHref;
    const Stub = createRoutesStub([
      {
        path: "*",
        Component: () => (
          <SiteFooter pages={PUBLIC_PAGES} profile={withoutDirections} />
        ),
      },
    ]);
    render(<Stub initialEntries={["/"]} />);

    expect(screen.queryByRole("link", { name: /cómo llegar/i })).toBeNull();
    expect(screen.getByRole("link", { name: /instagram/i })).toBeVisible();
  });

  it("decorates the booking panel with one sprig that assistive technology skips", () => {
    renderFooter();

    const sprigs = screen
      .getByRole("contentinfo")
      .querySelectorAll(".site-footer-cta [data-variant]");
    expect(sprigs).toHaveLength(1);
    expect(sprigs[0]).toHaveAttribute("aria-hidden", "true");
  });
});
