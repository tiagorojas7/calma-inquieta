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
    <section>
      <Heading level={2}>{heading}</Heading>
      <ul>
        {images.map(({ id, ...image }, at) => (
          <li key={id}>
            <button
              type="button"
              onClick={(event) => {
                open(at, event.currentTarget);
              }}
            >
              <Image {...image} />
            </button>
          </li>
        ))}
      </ul>
      <dialog
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
          <figure>
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
            />
            <figcaption id={captionId}>{current.alt}</figcaption>
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
