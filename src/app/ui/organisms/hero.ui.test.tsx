import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  HERO_DESKTOP_MEDIA,
  HERO_LEAD_MOBILE_SIZES,
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
    expect(HERO_LEAD_MOBILE_SIZES).toMatch(/vw$/);
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

describe("HeroSection loading (same collage on every width)", () => {
  it("renders no phone backdrop: the collage shows on every width", () => {
    const { container } = renderHero();

    expect(container.querySelector(".hero-backdrop")).toBeNull();
    expect(container.querySelector(".hero-scrim")).toBeNull();
    expect(container.querySelector(".hero-collage")).not.toHaveClass(
      "max-lg:contents",
    );
    for (const tile of container.querySelectorAll(
      ".collage-lead, .collage-torn, .collage-framed",
    )) {
      expect(tile).not.toHaveClass("max-lg:hidden");
    }
  });

  it("the collage lead is the only eager high priority image, sized per breakpoint", () => {
    const { container } = renderHero({ withLoop: loop });
    const img = imgByAlt("Foto lead");
    const eager = [...container.querySelectorAll("img")].filter(
      (el) => el.getAttribute("loading") === "eager",
    );

    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute(
      "sizes",
      `${HERO_DESKTOP_MEDIA} ${HERO_LEAD_SIZES}, ${HERO_LEAD_MOBILE_SIZES}`,
    );
    expect(img.parentElement?.querySelectorAll("source")).toHaveLength(0);
    expect(eager).toEqual([img]);
  });

  it("every other image is lazy with no priority hint", () => {
    const { container } = renderHero({ withLoop: loop });

    for (const img of container.querySelectorAll("img")) {
      if (img.getAttribute("alt") === "Foto lead") continue;
      expect(img, img.outerHTML.slice(0, 60)).toHaveAttribute(
        "loading",
        "lazy",
      );
      expect(img).not.toHaveAttribute("fetchpriority");
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
