import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  HERO_DESKTOP_MEDIA,
  HERO_MOBILE_MEDIA,
  HERO_STILL_SIZES,
  HeroSection,
} from "./hero-section";

const image = {
  mobile: {
    src: "/media/home/m-720.webp",
    srcSet: "/media/home/m-480.webp 480w, /media/home/m-720.webp 720w",
    alt: "Pieza circular de papel kraft",
    width: 720,
    height: 900,
  },
  desktop: {
    src: "/media/home/d-960.webp",
    srcSet: "/media/home/d-480.webp 480w, /media/home/d-960.webp 960w",
    alt: "Pieza circular de papel kraft",
    width: 960,
    height: 1280,
  },
};

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
  ornament,
  withLoop,
}: { ornament?: ReactNode; withLoop?: typeof loop } = {}) {
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
        image={image}
        loop={withLoop}
        bajada="Equilibrio entre serenidad y movimiento"
        ornament={ornament}
      />
    </MemoryRouter>,
  );
}

describe("HeroSection", () => {
  it("renders exactly one img inside a picture", () => {
    const { container } = renderHero();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelectorAll("picture")).toHaveLength(1);
    expect(container.querySelector("picture > img")).toBe(
      screen.getByRole("img"),
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", image.mobile.alt);
  });

  it("the img is eager and fetchpriority high", () => {
    renderHero();
    const still = screen.getByRole("img");
    expect(still).toHaveAttribute("loading", "eager");
    expect(still).toHaveAttribute("fetchpriority", "high");
  });

  it("the img has aspect-4/5 and lg:aspect-3/4", () => {
    renderHero();
    const still = screen.getByRole("img");
    expect(still).toHaveClass("aspect-4/5", "lg:aspect-3/4");
    expect(still.style.aspectRatio).toBe("");
  });

  it("the desktop source declares 3:4 and the img 4:5 dimensions", () => {
    const { container } = renderHero();
    const sources = container.querySelectorAll("picture > source");
    expect(sources).toHaveLength(1);
    expect(sources[0]).toHaveAttribute("media", HERO_DESKTOP_MEDIA);
    expect(sources[0]).toHaveAttribute("srcset", image.desktop.srcSet);
    expect(sources[0]).toHaveAttribute("sizes", HERO_STILL_SIZES);
    expect(sources[0]).toHaveAttribute("width", "960");
    expect(sources[0]).toHaveAttribute("height", "1280");
    const still = screen.getByRole("img");
    expect(still).toHaveAttribute("src", image.mobile.src);
    expect(still).toHaveAttribute("srcset", image.mobile.srcSet);
    expect(still).toHaveAttribute("sizes", HERO_STILL_SIZES);
    expect(still).toHaveAttribute("width", "720");
    expect(still).toHaveAttribute("height", "900");
  });

  it("no element carries max-md:hidden", () => {
    const { container } = renderHero();
    for (const element of container.querySelectorAll("*")) {
      const hiding = [...element.classList].filter((name) =>
        /(^|:)hidden$/.test(name),
      );
      expect(hiding, element.outerHTML.slice(0, 80)).toEqual([]);
    }
  });

  it("renders one h1 with an emphasized word", () => {
    renderHero();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1 }).querySelector("em"),
    ).toBeTruthy();
    expect(screen.getByText("Calma Inquieta")).toBeInTheDocument();
    expect(
      screen.getByText("Un espacio para encontrarnos."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Equilibrio entre serenidad y movimiento"),
    ).toBeInTheDocument();
  });

  it("the CTAs link to /talleres and /intensivos", () => {
    renderHero();
    expect(screen.getByRole("link", { name: "Ver talleres" })).toHaveAttribute(
      "href",
      "/talleres",
    );
    expect(
      screen.getByRole("link", { name: "Ver intensivos" }),
    ).toHaveAttribute("href", "/intensivos");
  });

  it("the image is visually first on phones while the h1 stays first in DOM order", () => {
    const { container } = renderHero();
    const heading = screen.getByRole("heading", { level: 1 });
    const picture = container.querySelector("picture");
    expect(picture).not.toBeNull();
    expect(
      heading.compareDocumentPosition(picture as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const ordered = picture?.closest(".order-first");
    expect(ordered).not.toBeNull();
    expect(ordered).toHaveClass("lg:order-none");
  });

  it("exports HERO_DESKTOP_MEDIA, HERO_MOBILE_MEDIA and HERO_STILL_SIZES", () => {
    expect(HERO_DESKTOP_MEDIA).toBe("(min-width: 64rem)");
    expect(HERO_MOBILE_MEDIA).toBe("not all and (min-width: 64rem)");
    expect(HERO_STILL_SIZES).toBe(
      "(min-width: 30rem) 28rem, calc(100vw - 2.5rem)",
    );
  });

  it("the ornament slot renders inside the still photo wrapper", () => {
    const { container } = renderHero({
      ornament: <span data-testid="ornament" />,
    });
    const wrapper = container.querySelector("picture")?.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass("order-first", "relative");
    expect(wrapper).toContainElement(screen.getByTestId("ornament"));
  });

  it("renders no ornament by default", () => {
    const { container } = renderHero();
    expect(container.querySelector("[data-testid]")).toBeNull();
  });

  it("has no axe violations", async () => {
    const { container } = renderHero();
    await expectNoAxeViolations(container);
  });

  describe("loop slot", () => {
    const loopTile = (container: HTMLElement) =>
      container.querySelector(`img[src="${loop.poster.src}"]`)?.parentElement;

    it("the loop tile exists once and follows the text in DOM order", () => {
      const { container } = renderHero({ withLoop: loop });
      const tiles = container.querySelectorAll(`img[src="${loop.poster.src}"]`);
      expect(tiles).toHaveLength(1);
      const tile = loopTile(container);
      expect(tile).not.toBeNull();
      for (const text of [
        screen.getByRole("heading", { level: 1 }),
        screen.getByText("Equilibrio entre serenidad y movimiento"),
        screen.getByRole("link", { name: "Ver intensivos" }),
      ]) {
        expect(
          text.compareDocumentPosition(tile as Element) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
      expect(container.querySelectorAll("video")).toHaveLength(0);
    });

    it("no loop tile renders when the loop is absent", () => {
      const { container } = renderHero();
      expect(loopTile(container)).toBeUndefined();
      expect(container.querySelectorAll("img")).toHaveLength(1);
    });

    it("the loop tile is 4:5 on phones and a small tile from lg", () => {
      const { container } = renderHero({ withLoop: loop });
      const tile = loopTile(container);
      expect(tile).toHaveStyle({ aspectRatio: "720 / 900" });
      expect(tile).toHaveClass(
        "order-last",
        "w-full",
        "max-w-md",
        "lg:absolute",
        "lg:w-40",
        "xl:w-48",
      );
      const poster = container.querySelector(`img[src="${loop.poster.src}"]`);
      expect(poster).toHaveAttribute(
        "sizes",
        "(min-width: 80rem) 12rem, (min-width: 64rem) 10rem, (min-width: 30rem) 28rem, calc(100vw - 2.5rem)",
      );
      expect(poster).toHaveAttribute("loading", "lazy");
      expect(poster).not.toHaveAttribute("fetchpriority");
    });

    it("keeps the still as the only eager high-priority image", () => {
      const { container } = renderHero({ withLoop: loop });
      expect(container.querySelectorAll("img[fetchpriority]")).toHaveLength(1);
      expect(container.querySelectorAll('img[loading="eager"]')).toHaveLength(
        1,
      );
    });

    it("has no axe violations with the loop", async () => {
      const { container } = renderHero({ withLoop: loop });
      await expectNoAxeViolations(container);
    });
  });
});
