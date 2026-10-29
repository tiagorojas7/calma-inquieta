import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { FaqItem } from "../molecules/faq-item";
import { AboutIntro } from "./about-intro";
import { ContactSection } from "./contact-section";

const images = [
  { src: "/a.webp", alt: "Uno", width: 480, height: 640 },
  { src: "/b.webp", alt: "Dos", width: 480, height: 360 },
  { src: "/c.webp", alt: "Tres", width: 480, height: 389 },
] as const;
const loops = [0, 1, 2].map((at) => ({
  poster: { src: `/p${String(at)}.webp`, alt: "", width: 90, height: 160 },
  sources: [{ src: `/v${String(at)}.mp4`, type: "video/mp4" }],
  width: 90,
  height: 160,
}));
const intro = {
  heading: "Quiénes somos",
  paragraphs: ["Primero.", "Segundo."],
  valueProposition: "Te ofrecemos un lugar.",
  pullQuote: "Calma.",
  images,
};

/** Class tokens that apply at every width and pull a box out of its column. */
function unprefixedNegativeMargins(root: Element): string[] {
  return [...root.querySelectorAll("[class]")]
    .flatMap((node) => node.getAttribute("class")?.split(/\s+/) ?? [])
    .filter((token) => /^-m[xylrtb]?-/.test(token));
}

describe("AboutIntro (A01, A02)", () => {
  it("keeps body copy outside scroll reveals", () => {
    render(<AboutIntro {...intro} />);
    for (const text of ["Segundo.", "Te ofrecemos un lugar."]) {
      expect(screen.getByText(text).closest("[data-reveal]")).toBeNull();
    }
    expect(
      screen.getByRole("heading", { level: 1 }).closest("[data-reveal]"),
    ).not.toBeNull();
  });

  it("stacks the photo collage on phones without negative margins", () => {
    const { container } = render(<AboutIntro {...intro} />);
    expect(unprefixedNegativeMargins(container)).toEqual([]);
  });

  it("keeps the loop collage free of narrow overlaps", () => {
    const { container } = render(<AboutIntro {...intro} loops={loops} />);
    expect(unprefixedNegativeMargins(container)).toEqual([]);
  });
});

describe("FaqItem (A03)", () => {
  it("draws the plus/minus indicator at the 44 px target size", () => {
    render(<FaqItem question="¿Cuándo?" answer="Pronto." />);
    const summary = screen.getByText("¿Cuándo?");
    expect(summary.className).toContain("after:size-11");
    expect(summary.className).not.toContain("after:size-9");
  });
});

describe("ContactSection (C01, C02)", () => {
  function setup() {
    return render(
      <MemoryRouter>
        <main>
          <ContactSection
            heading="Contacto"
            intro="Escribinos."
            directionsHref="https://example.test/ruta"
            items={[
              {
                id: "address",
                icon: "pin",
                label: "Dirección",
                value: "Calle 1",
              },
              {
                id: "whatsapp",
                icon: "whatsapp",
                label: "WhatsApp",
                value: "Escribinos por WhatsApp",
                href: "https://wa.me/549",
              },
            ]}
          />
        </main>
      </MemoryRouter>,
    );
  }

  it("makes WhatsApp the single primary action, ahead of the other links", () => {
    setup();
    const whatsapp = screen.getByRole("link", {
      name: /Escribinos por WhatsApp/,
    });
    expect(whatsapp.closest("[data-contact-primary]")).not.toBeNull();
    const talleres = screen.getByRole("link", { name: "Ver talleres" });
    expect(
      whatsapp.compareDocumentPosition(talleres) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(screen.getByRole("main")).getAllByRole("link", {
        name: /Escribinos por WhatsApp/,
      }),
    ).toHaveLength(1);
  });

  it("pairs the secondary links with decorative icons and keeps their names", () => {
    setup();
    for (const name of ["Ver talleres", /Cómo llegar/]) {
      const link = screen.getByRole("link", { name });
      expect(link.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    }
  });
});
