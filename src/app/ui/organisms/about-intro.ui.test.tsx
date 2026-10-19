import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AboutIntro } from "./about-intro";

const images = [
  {
    src: "/media/about/a.webp",
    alt: "Un rincón del espacio",
    width: 480,
    height: 640,
  },
  {
    src: "/media/about/b.webp",
    alt: "Un grupo en taller",
    width: 480,
    height: 360,
  },
  { src: "/media/about/c.webp", alt: "Dos jarrones", width: 480, height: 389 },
] as const;

const props = {
  heading: "Quiénes somos",
  paragraphs: ["Primero.", "Segundo."],
  valueProposition: "Te ofrecemos un lugar.",
  pullQuote: "Calma, creatividad y un poquito de inquietud.",
  images,
};

describe("AboutIntro", () => {
  it("renders the H1, the paragraphs and the value proposition", async () => {
    const { container } = render(
      <main>
        <AboutIntro {...props} />
      </main>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Quiénes somos" }),
    ).toBeVisible();
    expect(screen.getByText("Primero.")).toBeVisible();
    expect(screen.getByText("Segundo.")).toBeVisible();
    expect(screen.getByText("Te ofrecemos un lugar.")).toBeVisible();
    await expectNoAxeViolations(container, { page: true });
  });

  it("sets the pull-quote in the script face", () => {
    render(<AboutIntro {...props} />);
    const quote = screen.getByText(
      "Calma, creatividad y un poquito de inquietud.",
    );
    expect(quote).toHaveAttribute("data-script", "true");
  });

  it("collages the photos with their own ratios, lazy and with alt", () => {
    render(<AboutIntro {...props} />);
    for (const image of images) {
      const img = screen.getByRole("img", { name: image.alt });
      expect(img.style.aspectRatio).toBe(
        `${String(image.width)} / ${String(image.height)}`,
      );
      expect(img).toHaveAttribute("loading", "lazy");
    }
  });

  it("keeps the text before the collage in reading order", () => {
    const { container } = render(<AboutIntro {...props} />);
    const heading = screen.getByRole("heading", { level: 1 });
    const firstImage = container.querySelector("img") as HTMLElement;
    expect(
      heading.compareDocumentPosition(firstImage) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("adds a decorative sprig and white frames", () => {
    const { container } = render(<AboutIntro {...props} />);
    expect(
      container.querySelectorAll('[aria-hidden="true"] svg').length,
    ).toBeGreaterThan(0);
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(images.length);
    for (const figure of figures) {
      expect(figure).toHaveClass("border-white");
    }
  });

  it("renders without a pull-quote or photos", () => {
    const { container } = render(
      <AboutIntro {...props} pullQuote={undefined} images={[]} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-script]")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
  });

  it("sits in a full-bleed canvas band", () => {
    const { container } = render(<AboutIntro {...props} />);
    const band = container.querySelector("section");
    expect(band).toHaveAttribute("data-tone", "canvas");
    expect(band).toHaveAttribute("data-bleed", "true");
  });
});
