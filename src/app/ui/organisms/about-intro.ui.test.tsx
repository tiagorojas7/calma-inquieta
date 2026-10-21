import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import {
  restoreBrowserStubs,
  spyOnPlayback,
  stubIntersectionObserver,
  stubMatchMedia,
} from "~/testing/ui/browser-stubs";
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

describe("AboutIntro with loops", () => {
  const loops = ["weaving", "basket", "frame"].map((name) => ({
    poster: {
      src: `/media/video/about-loop-${name}-poster-360.0a1b2c3d.webp`,
      alt: "",
      width: 360,
      height: 640,
    },
    sources: [
      {
        src: `/media/video/about-loop-${name}-360.0a1b2c3d.webm`,
        type: "video/webm" as const,
      },
      {
        src: `/media/video/about-loop-${name}-360.0a1b2c3d.mp4`,
        type: "video/mp4" as const,
      },
    ],
    width: 360,
    height: 640,
  }));
  let observer: ReturnType<typeof stubIntersectionObserver>;
  let media: ReturnType<typeof stubMatchMedia>;
  let playback: ReturnType<typeof spyOnPlayback>;

  beforeEach(() => {
    observer = stubIntersectionObserver();
    media = stubMatchMedia();
    playback = spyOnPlayback();
  });
  afterEach(() => {
    restoreBrowserStubs();
  });

  it("replaces the photos with three tilted white frames of 9:16 loops", () => {
    const { container } = render(<AboutIntro {...props} loops={loops} />);
    const figures = container.querySelectorAll("figure");
    expect(figures).toHaveLength(3);
    for (const figure of figures) {
      expect(figure).toHaveClass("border-white");
      expect(figure.className).toMatch(/-?rotate-/);
      const poster = figure.querySelector("img");
      expect(poster).toHaveAttribute("alt", "");
      expect((poster as HTMLElement).style.aspectRatio).toBe("360 / 640");
    }
    for (const image of images) {
      expect(screen.queryByRole("img", { name: image.alt })).toBeNull();
    }
  });

  it("plays the three loops muted once visible", () => {
    const { container } = render(<AboutIntro {...props} loops={loops} />);
    expect(container.querySelectorAll("video")).toHaveLength(0);
    observer.trigger(true);
    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(3);
    for (const video of videos) {
      expect(video.muted).toBe(true);
      expect(video).toHaveAttribute("loop");
      expect(video).toHaveAttribute("playsinline");
    }
    expect(playback.play).toHaveBeenCalledTimes(3);
  });

  it("offers one shared pause control that stops and resumes every loop", () => {
    render(<AboutIntro {...props} loops={loops} />);
    expect(screen.queryByRole("button")).toBeNull();
    observer.trigger(true);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(playback.pause).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Reproducir animación" }),
    ).toBeInTheDocument();
    const before = playback.play.mock.calls.length;
    fireEvent.click(screen.getByRole("button"));
    expect(playback.play.mock.calls.length).toBe(before + 3);
    expect(
      screen.getByRole("button", { name: "Pausar animación" }),
    ).toBeInTheDocument();
  });

  it("under reduced motion shows only posters, no video and no control", () => {
    media.setReduce(true);
    const { container } = render(<AboutIntro {...props} loops={loops} />);
    observer.trigger(true);
    expect(container.querySelectorAll("video")).toHaveLength(0);
    expect(container.querySelectorAll("figure img")).toHaveLength(3);
    expect(screen.queryByRole("button")).toBeNull();
    expect(playback.play).not.toHaveBeenCalled();
  });

  it("falls back to the photos when there are no loops", () => {
    render(<AboutIntro {...props} loops={[]} />);
    for (const image of images) {
      expect(screen.getByRole("img", { name: image.alt })).toBeInTheDocument();
    }
  });

  it("has no axe violations while the loops play", async () => {
    const { container } = render(
      <main>
        <AboutIntro {...props} loops={loops} />
      </main>,
    );
    observer.trigger(true);
    await expectNoAxeViolations(container, { page: true });
  });
});
