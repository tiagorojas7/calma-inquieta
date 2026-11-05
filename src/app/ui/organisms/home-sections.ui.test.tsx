import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  activityFixture,
  upcomingItemFixture,
  trustClaimFixtures,
} from "~/testing/fixtures/ui";
import { ActivityShowcase } from "./activity-showcase";
import { AboutTeaser } from "./about-teaser";
import { ContactBand } from "./contact-band";
import { Icon } from "../atoms/icon";
import { TrustRow } from "./trust-row";
import { UpcomingList } from "./upcoming-list";

describe("home organisms", () => {
  it("renders TrustRow null for empty claims", async () => {
    const { container } = render(<TrustRow claims={[]} />);
    expect(container).toBeEmptyDOMElement();
    await expectNoAxeViolations(container);
  });

  it("renders one TrustItem per claim", async () => {
    const { container } = render(<TrustRow claims={trustClaimFixtures} />);
    expect(screen.getByText("Experiencias cuidadas")).toBeInTheDocument();
    expect(screen.getByText("Para crear en comunidad")).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("each trust item shows the glyph of its own claim", () => {
    const { container } = render(
      <TrustRow
        claims={[
          { id: "a", label: "Uno", icon: "leaf" },
          { id: "b", label: "Dos", icon: "hands" },
        ]}
      />,
    );
    const glyph = (name: "leaf" | "hands") =>
      render(<Icon name={name} />).container.querySelector("svg")?.innerHTML;
    const shown = [...container.querySelectorAll("svg")].map(
      (s) => s.innerHTML,
    );
    expect(shown).toEqual([glyph("leaf"), glyph("hands")]);
  });

  it("no arrow glyph appears in the trust row", () => {
    const { container } = render(<TrustRow claims={trustClaimFixtures} />);
    const arrow = render(<Icon name="arrow" />).container.querySelector(
      "svg",
    )?.innerHTML;
    expect(arrow).toBeTruthy();
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.innerHTML).not.toBe(arrow);
    }
  });

  it("the row does not render without approved claims", () => {
    const { container } = render(<TrustRow claims={[]} />);
    expect(container.querySelector("section")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders ActivityShowcase empty state with its external action", async () => {
    const { container } = render(
      <ActivityShowcase
        items={[]}
        emptyAction={{
          href: "https://wa.me/5493510000000",
          label: "Escribinos por WhatsApp",
        }}
      />,
    );
    expect(
      screen.getByText("Pronto vamos a compartir nuevas propuestas."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(activityFixture.title)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Escribinos por WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/5493510000000");
    expect(
      screen.queryByRole("link", { name: "Escribinos" }),
    ).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("keeps catalog modules free of nested page-section spacing", () => {
    const { container, rerender } = render(
      <ActivityShowcase
        items={[]}
        emptyAction={{
          href: "https://wa.me/5493510000000",
          label: "Escribinos",
        }}
      />,
    );

    expect(container.querySelector("section")).not.toHaveClass("py-section");
    rerender(
      <UpcomingList
        items={[]}
        emptyAction={{
          href: "https://www.instagram.com/calma.inquieta/",
          label: "Seguinos",
        }}
      />,
    );
    expect(container.querySelector("section")).not.toHaveClass("py-section");
  });

  it("renders each ActivityShowcase card when populated", async () => {
    const { container } = render(
      <MemoryRouter>
        <ActivityShowcase
          items={[activityFixture]}
          emptyAction={{
            href: "https://wa.me/5493510000000",
            label: "Escribinos por WhatsApp",
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(activityFixture.title)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: activityFixture.ctaLabel }),
    ).toHaveAttribute("href", activityFixture.href);
    await expectNoAxeViolations(container);
  });

  it("renders UpcomingList empty state with its external action", async () => {
    const { container } = render(
      <UpcomingList
        items={[]}
        emptyAction={{
          href: "https://www.instagram.com/calma.inquieta/",
          label: "Seguinos en Instagram",
        }}
      />,
    );
    expect(
      screen.getByText("Pronto vamos a anunciar nuevas fechas."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByText(upcomingItemFixture.title),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Seguinos en Instagram" }),
    ).toHaveAttribute("href", "https://www.instagram.com/calma.inquieta/");
    expect(
      screen.queryByRole("link", { name: "Escribinos" }),
    ).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("renders each UpcomingList card when populated", async () => {
    const { container } = render(
      <MemoryRouter>
        <UpcomingList
          items={[upcomingItemFixture]}
          emptyAction={{
            href: "https://www.instagram.com/calma.inquieta/",
            label: "Seguinos en Instagram",
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(upcomingItemFixture.title)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: upcomingItemFixture.ctaLabel }),
    ).toHaveAttribute("href", upcomingItemFixture.href);
    await expectNoAxeViolations(container);
  });

  it("renders AboutTeaser content and link accessibly", async () => {
    const { container } = render(
      <MemoryRouter>
        <AboutTeaser heading="Quiénes somos" body="Creamos juntas." />
      </MemoryRouter>,
    );
    expect(screen.getByText("Creamos juntas.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Conocé quiénes somos" }),
    ).toHaveAttribute("href", "/quienes-somos");
    await expectNoAxeViolations(container);
  });

  it("the teaser renders the image lazy with width, height and non-empty alt", async () => {
    const { container } = render(
      <MemoryRouter>
        <AboutTeaser
          heading="Quiénes somos"
          body="Creamos juntas."
          image={{
            src: "/media/home/home-teaser-800.0a1b2c3d.webp",
            alt: "Una cesta con flores silvestres",
            width: 800,
            height: 1000,
            srcSet:
              "/media/home/home-teaser-480.1b2c3d4e.webp 480w, /media/home/home-teaser-800.0a1b2c3d.webp 800w",
          }}
        />
      </MemoryRouter>,
    );
    const photo = screen.getByRole("img", {
      name: "Una cesta con flores silvestres",
    });
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo).not.toHaveAttribute("fetchpriority", "high");
    expect(photo).toHaveAttribute("width", "800");
    expect(photo).toHaveAttribute("height", "1000");
    expect(photo).toHaveAttribute(
      "srcset",
      expect.stringContaining("home-teaser-480"),
    );
    expect(photo).toHaveAttribute(
      "sizes",
      "(min-width: 64rem) 24rem, calc(100vw - 2.5rem)",
    );
    await expectNoAxeViolations(container);
  });

  it("from lg the teaser has two columns", () => {
    const image = {
      src: "/media/home/home-teaser-800.0a1b2c3d.webp",
      alt: "Una cesta con flores silvestres",
      width: 800,
      height: 1000,
    };
    const { container, rerender } = render(
      <MemoryRouter>
        <AboutTeaser
          heading="Quiénes somos"
          body="Creamos juntas."
          image={image}
        />
      </MemoryRouter>,
    );
    expect(container.querySelector(".lg\\:grid-cols-2")).not.toBeNull();
    rerender(
      <MemoryRouter>
        <AboutTeaser heading="Quiénes somos" body="Creamos juntas." />
      </MemoryRouter>,
    );
    expect(container.querySelector(".lg\\:grid-cols-2")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  describe("AboutTeaser collage", () => {
    const main = {
      src: "/media/home/home-teaser-800.0a1b2c3d.webp",
      alt: "Una cesta con flores silvestres",
      width: 800,
      height: 1000,
    };
    const accent = {
      src: "/media/about/about-jarrones-960.0a1b2c3d.webp",
      alt: "Dos jarrones tejidos sobre una repisa",
      width: 960,
      height: 779,
    };
    const renderTeaser = (props: object = {}) =>
      render(
        <MemoryRouter>
          <AboutTeaser
            heading="Quiénes somos"
            body="Creamos juntas."
            image={main}
            accentImage={accent}
            pull="Hecho a mano, compartido entre todas"
            {...props}
          />
        </MemoryRouter>,
      );

    it("is a full-bleed sand band", () => {
      const { container } = renderTeaser();
      const band = container.querySelector("section");

      expect(band).toHaveAttribute("data-bleed", "true");
      expect(band).toHaveAttribute("data-tone", "sand");
    });

    it("overlaps two lazy photos of different ratios, the second in a white frame", () => {
      renderTeaser();
      const first = screen.getByAltText(main.alt);
      const second = screen.getByAltText(accent.alt);

      expect(first).toHaveClass("aspect-4/5");
      expect(second).toHaveClass("aspect-4/3");
      expect(first).toHaveAttribute("loading", "lazy");
      expect(second).toHaveAttribute("loading", "lazy");
      expect(second.closest(".bg-surface")).not.toBeNull();
      expect(first.closest(".bg-surface")).toBeNull();
      expect(first.closest(".teaser-collage")).toBe(
        second.closest(".teaser-collage"),
      );
    });

    it("adds the script pull phrase and a decorative sprig", () => {
      const { container } = renderTeaser();
      const pull = screen.getByText("Hecho a mano, compartido entre todas");

      expect(pull).toHaveAttribute("data-script", "true");
      expect(container.querySelector("[data-variant]")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });

    it("reveals its blocks with a stagger", () => {
      const { container } = renderTeaser();
      const revealed = [...container.querySelectorAll("[data-reveal]")];

      expect(revealed.length).toBeGreaterThanOrEqual(2);
      expect(
        revealed.map((element) =>
          (element as HTMLElement).style.getPropertyValue("--reveal-delay"),
        ),
      ).toContain("80ms");
    });

    it("has no axe violations", async () => {
      const { container } = renderTeaser();
      await expectNoAxeViolations(container);
    });
  });

  describe("ContactBand band", () => {
    const renderBand = () =>
      render(
        <MemoryRouter>
          <ContactBand
            heading="Hablemos"
            body="Estamos para acompañarte."
            primary={{
              href: "https://wa.me/5493510000000",
              label: "Escribinos por WhatsApp",
            }}
            secondary={[
              {
                href: "https://www.instagram.com/calma.inquieta/",
                label: "Instagram",
              },
            ]}
          />
        </MemoryRouter>,
      );

    it("is a full-bleed cocoa band with a big butterfly and a sprig", () => {
      const { container } = renderBand();
      const band = container.querySelector("section");

      expect(band).toHaveAttribute("data-bleed", "true");
      expect(band).toHaveAttribute("data-tone", "cocoa");
      expect(
        container.querySelector('[data-size="xl"].motif-flight'),
      ).not.toBeNull();
      expect(container.querySelector("[data-variant]")).not.toBeNull();
    });

    it("keeps the motifs and the stitched frame off the phone layout", () => {
      const { container } = renderBand();
      const band = container.querySelector("section");

      expect(band).not.toHaveClass("band-frame");
      expect(
        container.querySelector('[data-size="xl"].motif-flight'),
      ).toHaveClass("max-lg:hidden");
      expect(container.querySelector("[data-variant]")).toHaveClass(
        "max-lg:hidden",
      );
    });

    it("is one flat solid colour: no glow, no grain overlay", () => {
      const { container } = renderBand();
      const band = container.querySelector("section");

      expect(band).toHaveClass("bg-cocoa-900");
      expect(band).not.toHaveClass("band-glow");
      expect(band).not.toHaveClass("paper-grain");
    });

    it("puts the invitation on a liquid-glass panel in strong dark text, with the last heading word in the accent italic", () => {
      render(
        <MemoryRouter>
          <ContactBand
            heading="¿Querés sumarte?"
            body="Estamos para acompañarte."
            primary={{ href: "/talleres", label: "Ver talleres" }}
          />
        </MemoryRouter>,
      );
      const heading = screen.getByRole("heading", { level: 2 });
      const panel = heading.closest(".glass");

      expect(panel).not.toBeNull();
      expect(panel).toHaveClass("text-ink-900", "rounded-md");
      expect(panel).toContainElement(
        screen.getByText("Estamos para acompañarte."),
      );
      expect(heading).toHaveTextContent("¿Querés sumarte?");
      expect(heading.querySelector("em")).toHaveTextContent("sumarte?");
    });

    it("gives the secondary action a solid clay outline that fills on hover", () => {
      renderBand();
      const instagram = screen.getByRole("link", { name: /Instagram/ });

      expect(instagram).toHaveClass(
        "border-2",
        "border-clay-600",
        "hover:bg-clay-600",
      );
      expect(instagram.className).not.toMatch(/border-canvas|bg-canvas/);
    });

    it("stacks both actions as full-width pills on phones, each with its own icon", () => {
      render(
        <MemoryRouter>
          <ContactBand
            heading="Hablemos"
            body="Estamos para acompañarte."
            primary={{
              href: "https://wa.me/5493510000000",
              label: "Escribinos por WhatsApp",
              icon: "whatsapp",
            }}
            secondary={[
              {
                href: "https://www.instagram.com/calma.inquieta/",
                label: "Instagram",
                icon: "instagram",
              },
            ]}
          />
        </MemoryRouter>,
      );
      const whatsapp = screen.getByRole("link", {
        name: /Escribinos por WhatsApp/,
      });
      const instagram = screen.getByRole("link", { name: /Instagram/ });

      expect(whatsapp).toHaveClass("w-full", "sm:w-auto");
      expect(instagram).toHaveClass("w-full", "sm:w-auto", "border-2");
      expect(whatsapp.querySelector("svg")).not.toBeNull();
      expect(instagram.querySelector("svg")).not.toBeNull();
      expect(whatsapp.parentElement).toBe(instagram.parentElement);
      expect(whatsapp.parentElement).toHaveClass("flex-col", "sm:flex-row");
    });

    it("marks itself as the page's closing band so the footer does not repeat the call to action", () => {
      const { container } = renderBand();

      expect(container.querySelector("section")).toHaveClass("closing-band");
    });

    it("styles both calls to action for the glass panel", async () => {
      const { container } = renderBand();

      expect(
        screen.getByRole("link", { name: /Escribinos por WhatsApp/ }),
      ).toHaveClass("bg-clay-600");
      expect(screen.getByRole("link", { name: /Instagram/ })).toHaveClass(
        "text-clay-800",
      );
      await expectNoAxeViolations(container);
    });
  });

  describe("ContactBand photo", () => {
    const hands = {
      src: "/media/home/home-band-hands-960.webp",
      srcSet:
        "/media/home/home-band-hands-480.webp 480w, /media/home/home-band-hands-960.webp 960w",
      alt: "Manos terminando un espejo de paja",
      width: 960,
      height: 1200,
    };
    const renderWithPhoto = (props: object = {}) =>
      render(
        <MemoryRouter>
          <ContactBand
            heading="Hablemos"
            body="Estamos para acompañarte."
            primary={{
              href: "https://wa.me/5493510000000",
              label: "Escribinos por WhatsApp",
            }}
            image={hands}
            {...props}
          />
        </MemoryRouter>,
      );

    it("fills the band with a lazy, sized photo behind the call to action", async () => {
      const { container } = renderWithPhoto();
      const photo = screen.getByAltText(hands.alt);
      const layer = photo.closest(".band-photo");

      expect(photo).toHaveClass("object-cover", "size-full");
      expect(photo).toHaveAttribute("loading", "lazy");
      expect(photo).toHaveAttribute("sizes");
      expect(layer).toHaveClass("absolute", "inset-0", "-z-10");
      expect(container.querySelector("section")).toHaveClass("isolate");
      expect(
        screen.getByRole("link", { name: /Escribinos por WhatsApp/ }),
      ).toBeInTheDocument();
      await expectNoAxeViolations(container);
    });

    it("darkens the photo with a half-opaque solid veil that deepens on hover and focus, and keeps the band compact", () => {
      const { container } = renderWithPhoto();
      const veil = container.querySelector("[data-band-veil]");
      const panel = screen
        .getByRole("heading", { name: "Hablemos" })
        .closest(".glass");

      expect(veil).not.toBeNull();
      expect(veil).toHaveClass(
        "bg-cocoa-900/35",
        "group-hover:bg-cocoa-900/55",
        "group-focus-within:bg-cocoa-900/55",
        "pointer-events-none",
      );
      expect(veil?.className).not.toMatch(/gradient/);
      expect(veil?.closest(".band-photo")).not.toBeNull();
      expect(container.querySelector("section")).toHaveClass("group");
      expect(panel?.parentElement).toHaveClass("min-h-128", "lg:min-h-112");
    });

    it("sets the body in ink-900, because ink-700 falls below AA on glass over a dark photo", () => {
      const { container } = renderWithPhoto();
      const panel = container.querySelector(".glass");

      expect(panel?.querySelector("p")).toHaveClass("text-ink-900");
      expect(panel?.querySelector("p")).not.toHaveClass("text-ink-700");
    });

    it("never prints text on the photo: the heading and the actions sit on the glass panel", () => {
      renderWithPhoto();
      const panel = screen
        .getByRole("heading", { name: "Hablemos" })
        .closest(".glass");

      expect(panel).not.toBeNull();
      expect(panel).toContainElement(
        screen.getByRole("link", { name: /Escribinos por WhatsApp/ }),
      );
      expect(panel).not.toContainElement(screen.getByAltText(hands.alt));
    });

    it("keeps the band whole without a photo", () => {
      const { container } = renderWithPhoto({ image: undefined });

      expect(container.querySelectorAll("img")).toHaveLength(0);
      expect(
        screen.getByRole("heading", { name: "Hablemos" }),
      ).toBeInTheDocument();
    });
  });

  it("renders ContactBand content and WhatsApp link accessibly", async () => {
    const { container } = render(
      <MemoryRouter>
        <ContactBand
          heading="Hablemos"
          body="Estamos para acompañarte."
          primary={{
            href: "https://wa.me/5493510000000",
            label: "Escribinos por WhatsApp",
          }}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Hablemos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Estamos para acompañarte.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Escribinos por WhatsApp/ }),
    ).toHaveAttribute("href", "https://wa.me/5493510000000");
    await expectNoAxeViolations(container);
  });
});
