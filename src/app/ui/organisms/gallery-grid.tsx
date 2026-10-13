import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Image } from "../atoms/image";
import { microcopy } from "../microcopy";

interface GalleryEntry {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export function GalleryGrid({
  heading,
  images,
}: {
  heading: string;
  images: readonly GalleryEntry[];
}) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const captionId = useId();
  if (!images.length) return null;

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

  return (
    <section className="flex flex-col gap-6 py-section">
      <Heading level={2}>{heading}</Heading>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.map(({ id, ...image }, at) => (
          <li key={id}>
            <button
              type="button"
              className="block aspect-square w-full overflow-hidden rounded-sm"
              onClick={(event) => {
                open(at, event.currentTarget);
              }}
            >
              <Image {...image} className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
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
    </section>
  );
}
