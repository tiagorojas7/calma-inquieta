import { useEffect, useId, useRef } from "react";
import { Icon } from "../atoms/icon";

export interface MaterialPhotoImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Optional responsive candidates; the full-screen render uses them. */
  srcSet?: string;
}

const HISTORY_FLAG = "materialPhoto";

function closeDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
  dialog.dispatchEvent(new Event("close"));
}

/**
 * A large product photo that opens full screen in a native modal `<dialog>`.
 * The browser traps focus and closes it on Escape; the close button and a tap
 * on the backdrop close it too. Opening pushes a history entry so the phone
 * back button closes the photo instead of leaving the page.
 */
export function MaterialPhoto({
  image,
  name,
}: {
  image: MaterialPhotoImage;
  name: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pushed = useRef(false);
  const titleId = useId();

  useEffect(() => {
    function onPopState() {
      const dialog = dialogRef.current;
      pushed.current = false;
      if (dialog?.open) closeDialog(dialog);
    }
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    try {
      const current: unknown = window.history.state;
      const base =
        typeof current === "object" && current !== null ? current : {};
      window.history.pushState({ ...base, [HISTORY_FLAG]: true }, "");
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  }

  function dismiss(dialog: HTMLDialogElement) {
    closeDialog(dialog);
    onClosed();
  }

  function onClosed() {
    if (!pushed.current) return;
    pushed.current = false;
    window.history.back();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Ver la foto de ${name} en pantalla completa`}
        className="group relative block w-full overflow-hidden rounded-md bg-sand-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
      >
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 64rem) 20rem, (min-width: 40rem) 45vw, 100vw"
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          className="aspect-4/3 w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-calm motion-safe:group-hover:scale-105"
        />
        <span
          aria-hidden="true"
          className="absolute right-2 bottom-2 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-clay-800 shadow-card"
        >
          Ampliar
        </span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={onClosed}
        onClick={(event) => {
          if (event.target === event.currentTarget)
            dismiss(event.currentTarget);
        }}
        className="m-auto max-h-dvh max-w-dvw overflow-auto bg-transparent p-0 backdrop:bg-ink-900/80"
      >
        <div className="relative flex flex-col items-center gap-3 p-3">
          <p
            id={titleId}
            className="max-w-full rounded-md bg-surface px-3 py-1 font-serif text-lg text-ink-900"
          >
            {name}
          </p>
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="100vw"
            loading="lazy"
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="max-h-svh max-w-full rounded-md bg-surface object-contain"
          />
          <button
            type="button"
            autoFocus
            onClick={(event) => {
              const dialog = event.currentTarget.closest("dialog");
              if (dialog) dismiss(dialog);
            }}
            aria-label="Cerrar foto"
            className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-surface text-clay-800 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
          >
            <Icon name="close" aria-hidden="true" className="size-5" />
          </button>
        </div>
      </dialog>
    </>
  );
}
