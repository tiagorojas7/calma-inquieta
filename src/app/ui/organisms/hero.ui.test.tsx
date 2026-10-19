import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  HERO_BACKDROP_SIZES,
  HERO_DESKTOP_MEDIA,
  HERO_LEAD_SIZES,
  HERO_MOBILE_MEDIA,
  HeroSection,
} from "./hero-section";

const photo = (name: string, width: number, height: number) => ({
  src: `/media/home/${name}-960.webp`,
  srcSet: `/media/home/${name}-480.webp 480w, /media/home/${name}-960.webp 960w`,
  alt: `Foto ${name}`,
  width,
  height,
});

const backdrop = photo("backdrop", 720, 1280);
const collage = [
  photo("lead", 960, 1280),
  photo("wide", 960, 720),
  photo("square", 960, 960),
];

const loop = {
  poster: {
    src: "/media/video/home-loop-poster-720.0a1b2c3d.webp",
    srcSet:
      "/media/video/home-loop-poster-480.0a1b2c3d.webp 480w, /media/video/home-loop-poster-720.0a1b2c3d.webp 720w",
    alt: "",
    width: 720,
    height: 900,
  },
  sources: [
    { src: "/media/video/home-loop-720.0a1b2c3d.webm", type: "video/webm" },
    { src: "/media/video/home-loop-720.0a1b2c3d.mp4", type: "video/mp4" },
  ],
  width: 720,
  height: 900,
};

function renderHero({
  withLoop,
  photos = collage,
}: { withLoop?: typeof loop; photos?: typeof collage } = {}) {
  return render(
    <MemoryRouter>
      <HeroSection
        eyebrow="Calma Inquieta"
        title={
          <>
            Crear con <em>calma</em>
          </>
        }
        subtitle="Un espacio para encontrarnos."
        backdrop={backdrop}
        collage={photos}
        note="Crear también es una forma de volver a vos"
        keywords={["Arte", "Manos", "Encuentro", "Bienestar"]}
        loop={withLoop}
        bajada="Equilibrio entre serenidad y movimiento"
      />
    </MemoryRouter>,
  );
}

const imgByAlt = (alt: string) => screen.getByAltText(alt);

describe("HeroSection structure", () => {
  it("is a full-bleed tone band labelled by the h1", () => {
    const { container } = renderHero();
    const band = container.querySelector("section");

    expect(band).toHaveAttribute("data-bleed", "true");
    expect(band).toHaveAttribute("aria-labelledby", "hero-title");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAttribute(
      "id",
      "hero-title",
    );
    expect(
      screen.getByRole("heading", { level: 1 }).querySelector("em"),
    ).toBeTruthy();
  });

  it("keeps eyebrow, subtitle, bajada and the two CTAs", () => {
    renderHero();

    expect(screen.getByText("Calma Inquieta")).toBeInTheDocument();
    expect(
      screen.getByText("Un espacio para encontrarnos."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Equilibrio entre serenidad y movimiento"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver talleres" })).toHaveAttribute(
      "href",
      "/talleres",
    );
    expect(
      screen.getByRole("link", { name: "Ver intensivos" }),
    ).toHaveAttribute("href", "/intensivos");
  });

  it("exports the shared media and sizes", () => {
    expect(HERO_DESKTOP_MEDIA).toBe("(min-width: 64rem)");
    expect(HERO_MOBILE_MEDIA).toBe("not all and (min-width: 64rem)");
    expect(HERO_BACKDROP_SIZES).toBe("100vw");
    expect(HERO_LEAD_SIZES).toMatch(/vw$/);
  });
});

describe("HeroSection collage (from lg)", () => {
  it("shows three photos of different ratios, each with its ratio reserved by CSS", () => {
    renderHero();
    const lead = imgByAlt("Foto lead");
    const wide = imgByAlt("Foto wide");
    const square = imgByAlt("Foto square");

    expect(lead).toHaveClass("aspect-3/4");
    expect(wide).toHaveClass("aspect-4/3");
    expect(square).toHaveClass("aspect-square");
    for (const img of [lead, wide, square]) {
      expect(img).toHaveAttribute("width");
      expect(img).toHaveAttribute("height");
    }
  });

  it("puts the second photo in a white frame and gives the third a torn edge", () => {
    renderHero();
    const framed = imgByAlt("Foto wide").closest(".bg-surface");
    const torn = imgByAlt("Foto square").closest(".photo-torn");

    expect(framed).not.toBeNull();
    expect(framed).toHaveClass("shadow-lift");
    expect(torn).not.toBeNull();
    expect(imgByAlt("Foto lead").closest(".bg-surface")).toBeNull();
  });

  it("adds the kraft note in the script face and the four tracked keywords", () => {
    const { container } = renderHero();
    const note = screen.getByText("Crear también es una forma de volver a vos");

    expect(note).toHaveAttribute("data-script", "true");
    expect(note.closest(".paper-torn")).not.toBeNull();
    const words = [...container.querySelectorAll("ul li")].map(
      (item) => item.textContent,
    );
    expect(words).toEqual(["Arte", "Manos", "Encuentro", "Bienestar"]);
  });

  it("layers decorative motifs: a big butterfly and at least two sprigs", () => {
    const { container } = renderHero();
    const butterfly = container.querySelector('[data-size="lg"].motif-flight');
    const sprigs = container.querySelectorAll("[data-variant]");

    expect(butterfly).not.toBeNull();
    expect(butterfly).toHaveAttribute("aria-hidden", "true");
    expect(sprigs.length).toBeGreaterThanOrEqual(2);
    for (const sprig of sprigs) {
      expect(sprig).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("copes with a missing second or third photo", () => {
    renderHero({ photos: collage.slice(0, 1) });

    expect(screen.getByAltText("Foto lead")).toBeInTheDocument();
    expect(screen.queryByAltText("Foto wide")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Foto square")).not.toBeInTheDocument();
  });
});

describe("HeroSection phone backdrop and loading", () => {
  it("renders the backdrop as a full-bleed photo that fills the band, hidden from lg", () => {
    const { container } = renderHero();
    const img = imgByAlt("Foto backdrop");
    const holder = img.closest(".hero-backdrop");

    expect(holder).not.toBeNull();
    expect(holder).toHaveClass("lg:hidden");
    expect(img).toHaveClass("object-cover");
    expect(img).toHaveAttribute("sizes", HERO_BACKDROP_SIZES);
    expect(container.querySelector(".hero-scrim")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("the backdrop is the eager high priority image below lg and a blank pixel from lg", () => {
    const { container } = renderHero();
    const img = imgByAlt("Foto backdrop");
    const sources = img.parentElement?.querySelectorAll("source") ?? [];

    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img.parentElement?.tagName).toBe("PICTURE");
    expect(sources).toHaveLength(1);
    expect(sources[0]).toHaveAttribute("media", HERO_DESKTOP_MEDIA);
    expect(sources[0]?.getAttribute("srcset")).toMatch(/^data:image\/webp/);
    expect(container.querySelectorAll("picture")).toHaveLength(2);
  });

  it("the collage lead is the eager high priority image from lg and a blank pixel below", () => {
    renderHero();
    const img = imgByAlt("Foto lead");
    const sources = img.parentElement?.querySelectorAll("source") ?? [];

    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("sizes", HERO_LEAD_SIZES);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toHaveAttribute("media", HERO_MOBILE_MEDIA);
    expect(sources[0]?.getAttribute("srcset")).toMatch(/^data:image\/webp/);
  });

  it("every other image is lazy with no priority hint", () => {
    const { container } = renderHero({ withLoop: loop });
    const eager = [...container.querySelectorAll("img")].filter(
      (img) => img.getAttribute("loading") === "eager",
    );

    expect(eager.map((img) => img.getAttribute("alt"))).toEqual([
      "Foto backdrop",
      "Foto lead",
    ]);
    for (const img of container.querySelectorAll("img")) {
      if (!eager.includes(img)) {
        expect(img, img.outerHTML.slice(0, 60)).toHaveAttribute(
          "loading",
          "lazy",
        );
        expect(img).not.toHaveAttribute("fetchpriority");
      }
    }
  });
});

describe("HeroSection loop tile", () => {
  const tile = (container: HTMLElement) =>
    container.querySelector(`img[src="${loop.poster.src}"]`)?.parentElement;

  it("is one collage tile that follows the text in DOM order", () => {
    const { container } = renderHero({ withLoop: loop });
    const element = tile(container);

    expect(
      container.querySelectorAll(`img[src="${loop.poster.src}"]`),
    ).toHaveLength(1);
    expect(element).toHaveStyle({ aspectRatio: "720 / 900" });
    expect(element?.closest(".collage-loop")).not.toBeNull();
    for (const text of [
      screen.getByRole("heading", { level: 1 }),
      screen.getByRole("link", { name: "Ver intensivos" }),
    ]) {
      expect(
        text.compareDocumentPosition(element as Element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(container.querySelectorAll("video")).toHaveLength(0);
  });

  it("renders no tile without a loop", () => {
    const { container } = renderHero();

    expect(tile(container)).toBeUndefined();
  });
});

describe("HeroSection accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = renderHero();
    await expectNoAxeViolations(container);
  });

  it("has no axe violations with the loop", async () => {
    const { container } = renderHero({ withLoop: loop });
    await expectNoAxeViolations(container);
  });
});
