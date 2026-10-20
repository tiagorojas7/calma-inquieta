import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  restoreBrowserStubs,
  stubIntersectionObserver,
  stubMatchMedia,
} from "~/testing/ui/browser-stubs";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { GalleryCarousel } from "./gallery-carousel";

const images = [
  {
    id: "c-portrait",
    src: "/media/about/p-480.webp",
    alt: "Retrato",
    width: 480,
    height: 640,
  },
  {
    id: "c-tall",
    src: "/media/about/t-480.webp",
    alt: "Vertical",
    width: 480,
    height: 853,
  },
  {
    id: "c-wide",
    src: "/media/about/w-480.webp",
    alt: "Apaisada",
    width: 480,
    height: 360,
  },
] as const;

const INTERVAL = 5000;
let observer: ReturnType<typeof stubIntersectionObserver>;
let media: ReturnType<typeof stubMatchMedia>;
let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  observer = stubIntersectionObserver();
  media = stubMatchMedia();
  scrollTo = vi.fn();
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: scrollTo,
  });
  // jsdom has no layout: a tile's offset is its slide index times 100.
  Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
    configurable: true,
    get(this: HTMLElement) {
      return Number(this.dataset["slide"] ?? 0) * 100;
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  restoreBrowserStubs();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
  Reflect.deleteProperty(HTMLElement.prototype, "offsetLeft");
  Reflect.deleteProperty(document, "hidden");
});

function setup(extra: { heading?: string } = { heading: "Un vistazo" }) {
  const view = render(<GalleryCarousel {...extra} images={images} />);
  const region = () => screen.getByRole("region");
  const counter = (position: number) =>
    screen.getByText(`Imagen ${String(position)} de ${String(images.length)}`);
  const tick = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };
  return { ...view, region, counter, tick };
}

describe("GalleryCarousel structure", () => {
  it("is a labelled carousel region with every image as a button", () => {
    const { region } = setup();
    expect(region()).toHaveAccessibleName("Un vistazo");
    expect(region()).toHaveAttribute("aria-roledescription", "carrusel");
    for (const image of images) {
      const button = screen.getByRole("button", { name: image.alt });
      expect(within(button).getByRole("img")).toHaveAttribute("alt", image.alt);
    }
  });

  it("keeps the mixed tile widths: each tile reserves its own ratio", () => {
    setup();
    const tile = (alt: string) =>
      screen.getByRole("button", { name: alt }).closest("li") as HTMLElement;
    expect(tile("Retrato")).toHaveAttribute("data-shape", "portrait");
    expect(tile("Vertical")).toHaveAttribute("data-shape", "tall");
    expect(tile("Apaisada")).toHaveAttribute("data-shape", "wide");
    for (const image of images) {
      expect(tile(image.alt).style.aspectRatio).toBe(
        `${String(image.width)} / ${String(image.height)}`,
      );
    }
  });

  it("names a generic region when there is no heading", () => {
    const { container } = setup({});
    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelector("section")).toBeNull();
    expect(screen.getByRole("region")).toHaveAccessibleName("Galería");
  });

  it("sits in a full-bleed canvas band when it has a heading", () => {
    const { container } = setup();
    const band = container.querySelector("section");
    expect(band).toHaveAttribute("data-bleed", "true");
    expect(band).toHaveAttribute("data-tone", "canvas");
    expect(
      screen.getByRole("heading", { level: 2, name: "Un vistazo" }),
    ).toBeVisible();
  });

  it("renders nothing for an empty gallery", () => {
    const { container } = render(<GalleryCarousel heading="x" images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("has no axe violations", async () => {
    vi.useRealTimers();
    const { container } = setup();
    await expectNoAxeViolations(container);
  });
});

describe("GalleryCarousel navigation", () => {
  it("starts at the first image and announces the position", () => {
    const { counter } = setup();
    expect(counter(1)).toBeInTheDocument();
  });

  it("Next and Previous move and scroll the track, wrapping at the edges", () => {
    const { counter } = setup();
    const next = screen.getByRole("button", { name: "Siguiente" });
    const previous = screen.getByRole("button", { name: "Anterior" });
    fireEvent.click(next);
    expect(counter(2)).toBeInTheDocument();
    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: 100 }),
    );
    fireEvent.click(next);
    fireEvent.click(next);
    expect(counter(1)).toBeInTheDocument();
    fireEvent.click(previous);
    expect(counter(3)).toBeInTheDocument();
    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ left: 200 }),
    );
  });

  it("moves with the arrow keys on the carousel", () => {
    const { counter, region } = setup();
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(counter(2)).toBeInTheDocument();
    fireEvent.keyDown(region(), { key: "ArrowLeft" });
    expect(counter(1)).toBeInTheDocument();
  });

  it("follows a swipe once the scroll settles", () => {
    const { counter, tick } = setup();
    const track = screen.getByRole("list");
    track.scrollLeft = 190;
    fireEvent.scroll(track);
    tick(200);
    expect(counter(3)).toBeInTheDocument();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("fills the progress bar to the current position", () => {
    const { container } = setup();
    const fill = container.querySelector("[data-progress]") as HTMLElement;
    expect(fill.style.transform).toBe("scaleX(0.3333333333333333)");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(fill.style.transform).toBe("scaleX(0.6666666666666666)");
  });
});

describe("GalleryCarousel auto-advance", () => {
  it("advances on its own and wraps", () => {
    const { counter, tick } = setup();
    tick(INTERVAL);
    expect(counter(2)).toBeInTheDocument();
    tick(INTERVAL);
    tick(INTERVAL);
    expect(counter(1)).toBeInTheDocument();
  });

  it("a manual step restarts the countdown", () => {
    const { counter, tick } = setup();
    tick(INTERVAL - 1000);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    tick(INTERVAL - 1000);
    expect(counter(2)).toBeInTheDocument();
    tick(1000);
    expect(counter(3)).toBeInTheDocument();
  });

  it("pauses while hovered and resumes on leave", () => {
    const { counter, tick, region } = setup();
    fireEvent.mouseEnter(region());
    tick(INTERVAL * 2);
    expect(counter(1)).toBeInTheDocument();
    fireEvent.mouseLeave(region());
    tick(INTERVAL);
    expect(counter(2)).toBeInTheDocument();
  });

  it("pauses while focus is inside and resumes when it leaves", () => {
    const { counter, tick } = setup();
    const next = screen.getByRole("button", { name: "Siguiente" });
    fireEvent.focus(next);
    tick(INTERVAL * 2);
    expect(counter(1)).toBeInTheDocument();
    fireEvent.blur(next, { relatedTarget: document.body });
    tick(INTERVAL);
    expect(counter(2)).toBeInTheDocument();
  });

  it("pauses while the tab is hidden", () => {
    const { counter, tick } = setup();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    tick(INTERVAL * 2);
    expect(counter(1)).toBeInTheDocument();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    tick(INTERVAL);
    expect(counter(2)).toBeInTheDocument();
  });

  it("pauses while scrolled out of view", () => {
    const { counter, tick } = setup();
    observer.trigger(false);
    tick(INTERVAL * 2);
    expect(counter(1)).toBeInTheDocument();
    observer.trigger(true);
    tick(INTERVAL);
    expect(counter(2)).toBeInTheDocument();
  });

  it("has a pause button that stops and restarts it", () => {
    const { counter, tick } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Pausar animación" }));
    tick(INTERVAL * 2);
    expect(counter(1)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Reproducir animación" }),
    );
    tick(INTERVAL);
    expect(counter(2)).toBeInTheDocument();
  });

  it("keeps the live status quiet while it advances and polite when it does not", () => {
    const { counter } = setup();
    const status = () => counter(1).closest("[aria-live]");
    expect(status()).toHaveAttribute("aria-live", "off");
    fireEvent.click(screen.getByRole("button", { name: "Pausar animación" }));
    expect(status()).toHaveAttribute("aria-live", "polite");
  });

  it("does not auto-advance under reduced motion, and has no pause button", () => {
    media.setReduce(true);
    const { counter, tick } = setup();
    tick(INTERVAL * 3);
    expect(counter(1)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pausar animación" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(counter(2)).toBeInTheDocument();
    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: "auto" }),
    );
    expect(counter(2).closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("does not advance a single image", () => {
    render(<GalleryCarousel images={[images[0]]} />);
    act(() => {
      vi.advanceTimersByTime(INTERVAL * 2);
    });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });
});

describe("GalleryCarousel lightbox", () => {
  it("opens the activated image and navigates inside the dialog", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Vertical" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "Vertical" })).toBeVisible();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByRole("img", { name: "Apaisada" })).toBeVisible();
  });

  it("closes and returns focus to the activating tile", async () => {
    setup();
    const tile = screen.getByRole("button", { name: "Retrato" });
    fireEvent.click(tile);
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cerrar",
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(tile).toHaveFocus();
  });
});
