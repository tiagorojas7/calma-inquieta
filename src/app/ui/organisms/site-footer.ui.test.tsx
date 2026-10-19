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
  whatsappDisplay: "351 739 5239",
  provisional: true,
};

function renderFooter(overrides: Partial<FooterProfile> = {}) {
  const Stub = createRoutesStub([
    {
      path: "*",
      Component: () => (
        <SiteFooter
          pages={PUBLIC_PAGES}
          profile={{ ...profile, ...overrides }}
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

  it("underlines every footer link with the animated underline", () => {
    renderFooter();

    for (const link of screen.getAllByRole("link")) {
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
});
