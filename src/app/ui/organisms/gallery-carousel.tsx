import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Image } from "../atoms/image";
import { microcopy } from "../microcopy";
import { useGalleryLightbox, type GalleryEntry } from "./gallery-grid";
import { Reveal } from "./reveal";
import { Section } from "./section";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** Time each image stays before the carousel moves on by itself. */
const AUTO_MS = 5000;
/** Quiet time after the last scroll event before a swipe counts as settled. */
const SETTLE_MS = 120;
const TILE_SIZES = "(min-width: 64rem) 24rem, 70vw";

type TileShape = "tall" | "portrait" | "square" | "wide";

/** The tile's silhouette, from the photo's real width over height. */
function shapeOf(ratio: number): TileShape {
  if (ratio < 0.65) return "tall";
  if (ratio < 0.95) return "portrait";
  return ratio < 1.1 ? "square" : "wide";
}

/** Tall and portrait photos use the full row height; wide ones sit lower. */
const SHAPE_HEIGHT: Record<TileShape, string> = {
  tall: "var(--row-h)",
  portrait: "var(--row-h)",
  square: "calc(var(--row-h) * 0.84)",
  wide: "calc(var(--row-h) * 0.78)",
};

/** The tile whose left edge is nearest the scroll position; the last one at the end. */
function settledIndex(track: HTMLElement): number {
  const tiles = [...track.children] as HTMLElement[];
  const atEnd =
    track.scrollWidth > track.clientWidth &&
    track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  if (atEnd) return tiles.length - 1;
  let best = 0;
  let distance = Infinity;
  tiles.forEach((tile, at) => {
    const gap = Math.abs(tile.offsetLeft - track.scrollLeft);
    if (gap < distance) {
      distance = gap;
      best = at;
    }
  });
  return best;
}

const roundButton =
  "grid size-11 place-items-center rounded-full bg-white text-clay-800 shadow-card transition-colors hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * "Un vistazo" as a carousel: a scroll-snap strip of photos in their own
 * ratios that advances on its own. It waits while the pointer is over it,
 * while focus is inside, while the tab is hidden or the strip is off screen,
 * and for good under reduced motion. Previous/Next, arrow keys and swipe all
 * work, a visible pause button stops the auto-advance, and the position is
 * announced politely only when it is not changing by itself. Opening a photo
 * uses the shared lightbox.
 */
export function GalleryCarousel({
  heading,
  images,
  intervalMs = AUTO_MS,
}: {
  heading?: string;
  images: readonly GalleryEntry[];
  intervalMs?: number;
}) {
  const total = images.length;
  const { open, lightbox } = useGalleryLightbox(images);
  const region = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [active, setActive] = useState(0);
  // Motion stays off until the media query has been read after mount.
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const running =
    total > 1 &&
    motionAllowed &&
    !userPaused &&
    !hovered &&
    !focused &&
    !tabHidden &&
    inView;

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => {
      setMotionAllowed(!query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      setTabHidden(document.hidden);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    const element = region.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      const latest = entries.at(-1);
      if (latest) setInView(latest.isIntersecting);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(
    () => () => {
      clearTimeout(settle.current);
    },
    [],
  );

  const goTo = useCallback(
    (to: number) => {
      const strip = track.current;
      const tile = strip?.children[to];
      setActive(to);
      if (strip && tile instanceof HTMLElement) {
        strip.scrollTo({
          left: tile.offsetLeft,
          behavior: motionAllowed ? "smooth" : "auto",
        });
      }
    },
    [motionAllowed],
  );

  const step = useCallback(
    (delta: number) => {
      goTo((active + delta + total) % total);
    },
    [active, goTo, total],
  );

  // One timer per slide, so any move (auto, button, key or swipe) restarts it.
  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => {
      step(1);
    }, intervalMs);
    return () => {
      clearTimeout(id);
    };
  }, [running, step, intervalMs]);

  if (!total) return null;

  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (track.current) setActive(settledIndex(track.current));
    }, SETTLE_MS);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  const body = (
    <>
      <div
        ref={region}
        role="region"
        aria-roledescription="carrusel"
        aria-label={heading ?? "Galería"}
        className="flex flex-col gap-8"
        onKeyDown={onKeyDown}
        onMouseEnter={() => {
          setHovered(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
        }}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={onBlur}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          {heading ? <Heading level={2}>{heading}</Heading> : <span />}
          {total > 1 ? (
            <div className="ml-auto flex items-center gap-3">
              <p
                aria-live={running ? "off" : "polite"}
                aria-atomic="true"
                className="mr-1 font-display text-lg tabular-nums text-ink-700"
              >
                <span aria-hidden="true">
                  {active + 1} / {total}
                </span>
                <span className="sr-only">{`Imagen ${String(active + 1)} de ${String(total)}`}</span>
              </p>
              {motionAllowed ? (
                <button
                  type="button"
                  className={roundButton}
                  aria-label={
                    userPaused
                      ? microcopy.playAnimation
                      : microcopy.pauseAnimation
                  }
                  onClick={() => {
                    setUserPaused((paused) => !paused);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4 fill-current"
                    aria-hidden="true"
                    focusable="false"
                  >
                    {userPaused ? (
                      <path d="M8 5v14l11-7Z" />
                    ) : (
                      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                    )}
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                className={roundButton}
                aria-label={microcopy.previous}
                onClick={() => {
                  step(-1);
                }}
              >
                <Icon name="chevron-left" />
              </button>
              <button
                type="button"
                className={roundButton}
                aria-label={microcopy.next}
                onClick={() => {
                  step(1);
                }}
              >
                <Icon name="chevron-right" />
              </button>
            </div>
          ) : null}
        </div>
        <ul
          ref={track}
          onScroll={onScroll}
          className="relative -my-4 flex snap-x snap-mandatory items-center gap-3 overflow-x-auto py-4 [--row-h:15rem] [scrollbar-width:none] md:gap-5 md:[--row-h:22rem] xl:[--row-h:27rem] [&::-webkit-scrollbar]:hidden"
        >
          {images.map(({ id, ...image }, at) => {
            const ratio = image.width / image.height;
            const shape = shapeOf(ratio);
            return (
              <Reveal
                as="li"
                key={id}
                index={at % 4}
                data-shape={shape}
                data-slide={at}
                className="shrink-0 snap-start"
                style={{
                  aspectRatio: `${String(image.width)} / ${String(image.height)}`,
                  height: SHAPE_HEIGHT[shape],
                }}
              >
                <div className="card-hover h-full rounded-sm">
                  <button
                    type="button"
                    className="card-hover-frame block h-full w-full rounded-sm shadow-card"
                    onClick={(event) => {
                      open(at, event.currentTarget);
                    }}
                  >
                    <Image
                      {...image}
                      sizes={TILE_SIZES}
                      className="block h-full w-full object-cover"
                    />
                  </button>
                </div>
              </Reveal>
            );
          })}
        </ul>
        {total > 1 ? (
          <div
            aria-hidden="true"
            className="h-0.5 w-full overflow-hidden rounded-full bg-sand-300"
          >
            <span
              data-progress="true"
              className="block h-full origin-left bg-clay-600 motion-safe:transition-transform motion-safe:duration-500"
              style={{ transform: `scaleX(${String((active + 1) / total)})` }}
            />
          </div>
        ) : null}
      </div>
      {lightbox}
    </>
  );
  // Without a heading the carousel sits inside a parent section.
  return heading ? (
    <Section bleed tone="canvas" spacing="lg">
      <div className="flex flex-col gap-8">{body}</div>
    </Section>
  ) : (
    body
  );
}
