import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Image } from "../atoms/image";
import { microcopy } from "../microcopy";
import { Reveal } from "./reveal";
import { Section } from "./section";

export interface GalleryEntry {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /** Responsive candidates; the lightbox offers the browser all of them. */
  readonly srcSet?: string;
}

// Rows are justified by width: a tile is as wide as `--row-h` times its ratio.
const THUMBNAIL_SIZES =
  "(min-width: 90rem) 28rem, (min-width: 48rem) 31vw, 46vw";
const LIGHTBOX_SIZES = "(min-width: 48rem) 46rem, 100vw";

type TileShape = "tall" | "portrait" | "square" | "wide";

/** The tile's silhouette, from the photo's real width over height. */
function shapeOf(ratio: number): TileShape {
  if (ratio < 0.65) return "tall";
  if (ratio < 0.95) return "portrait";
  return ratio < 1.1 ? "square" : "wide";
}

/**
 * The shared lightbox: `open(at, button)` shows image `at` in a modal dialog
 * (arrow keys, Previous/Next, Close) and returns focus to `button` on close.
 * Render the returned `lightbox` node once, next to the thumbnails.
 */
export function useGalleryLightbox(images: readonly GalleryEntry[]): {
  open: (at: number, button: HTMLButtonElement) => void;
  lightbox: ReactNode;
} {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const captionId = useId();

  const current = index === null ? undefined : images[index];
  const step = (delta: number) => {
    setIndex((i) => ((i ?? 0) + delta + images.length) % images.length);
  };

  const open = (at: number, button: HTMLButtonElement) => {
    opener.current = button;
    setIndex(at);
    // The dialog content renders on this state change; showModal needs the node only.
    dialogRef.current?.showModal();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
  };

  const lightbox = (
    <dialog
      className="m-auto w-full max-w-3xl rounded-md bg-canvas p-4 backdrop:bg-ink-900/60"
      ref={dialogRef}
      aria-labelledby={captionId}
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      onClose={() => {
        setIndex(null);
        opener.current?.focus();
      }}
    >
      {current && (
        <figure className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={() => dialogRef.current?.close()}>
            <Icon name="close" />
            {microcopy.close}
          </button>
          <button
            type="button"
            onClick={() => {
              step(-1);
            }}
          >
            <Icon name="chevron-left" />
            {microcopy.previous}
          </button>
          <Image
            src={current.src}
            alt={current.alt}
            width={current.width}
            height={current.height}
            {...(current.srcSet ? { srcSet: current.srcSet } : {})}
            sizes={LIGHTBOX_SIZES}
            className="max-h-screen w-full basis-full object-contain"
          />
          <figcaption id={captionId} className="basis-full text-ink-700">
            {current.alt}
          </figcaption>
          <button
            type="button"
            onClick={() => {
              step(1);
            }}
          >
            <Icon name="chevron-right" />
            {microcopy.next}
          </button>
        </figure>
      )}
    </dialog>
  );
  return { open, lightbox };
}

export function GalleryGrid({
  heading,
  images,
}: {
  heading?: string;
  images: readonly GalleryEntry[];
}) {
  const { open, lightbox } = useGalleryLightbox(images);
  if (!images.length) return null;

  const body = (
    <>
      {heading ? <Heading level={2}>{heading}</Heading> : null}
      <ul className="flex flex-wrap items-start justify-center gap-3 [--row-h:12rem] md:gap-4 md:[--row-h:20rem] lg:[--row-h:20rem] xl:[--row-h:26rem]">
        {images.map(({ id, ...image }, at) => {
          const ratio = image.width / image.height;
          return (
            <Reveal
              as="li"
              key={id}
              index={at % 4}
              data-shape={shapeOf(ratio)}
              className="min-w-0"
              style={{
                flexGrow: Math.round(ratio * 100),
                flexBasis: `calc(${ratio.toFixed(3)} * var(--row-h))`,
                // A leftover last tile stays near its nominal size, centred.
                maxWidth: `calc(${ratio.toFixed(3)} * var(--row-h) * 1.3)`,
              }}
            >
              <div className="card-hover rounded-sm">
                <button
                  type="button"
                  className="card-hover-frame block w-full rounded-sm"
                  onClick={(event) => {
                    open(at, event.currentTarget);
                  }}
                >
                  <Image
                    {...image}
                    sizes={THUMBNAIL_SIZES}
                    className="block w-full object-cover"
                  />
                </button>
              </div>
            </Reveal>
          );
        })}
      </ul>
      {lightbox}
    </>
  );
  // Without a heading the grid sits inside a parent section.
  return heading ? (
    <Section bleed tone="canvas">
      <div className="flex flex-col gap-8">{body}</div>
    </Section>
  ) : (
    body
  );
}
