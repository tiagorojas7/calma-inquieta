import { useEffect, useRef, useState } from "react";
import { Image } from "../atoms/image";
import { microcopy } from "../microcopy";

type Props = {
  /** Rendered with an empty alt: the loop is decorative. */
  poster: { src: string; width: number; height: number; srcSet?: string };
  sizes: string;
  /** In order of preference; the last one is the final fallback. */
  sources: readonly { src: string; type: string }[];
  /** Tile aspect ratio. */
  width: number;
  height: number;
  className?: string;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** Share of the tile that must be visible before the loop plays. */
const VISIBLE_THRESHOLD = 0.25;

/** The Network Information API is Chromium only and absent from the DOM lib. */
function saveDataOn(): boolean {
  const { connection } = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  return connection?.saveData === true;
}

function canObserve(): boolean {
  return (
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver !==
    undefined
  );
}

/**
 * A muted, decorative loop. The server and the first client render hold only a
 * lazy poster. After mount the video exists only when motion is allowed (no
 * reduced-motion preference, no Save-Data) and the tile has been visible, and it
 * plays only while visible. A small button lets the user pause it (WCAG 2.2.2).
 */
export function VideoLoop({
  poster,
  sizes,
  sources,
  width,
  height,
  className = "",
}: Props) {
  const tile = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const mounted = motionAllowed && armed && !failed;

  // The motion gate runs after mount so the server markup stays poster only.
  useEffect(() => {
    if (!canObserve()) {
      return;
    }
    const query = window.matchMedia(REDUCED_MOTION);
    const update = () => {
      setMotionAllowed(!query.matches && !saveDataOn());
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  // The first intersection arms the tile; later ones only play or pause it.
  useEffect(() => {
    const element = tile.current;
    if (!motionAllowed || !element) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const latest = entries.at(-1);
        if (!latest) {
          return;
        }
        setVisible(latest.isIntersecting);
        if (latest.isIntersecting) {
          setArmed(true);
        }
      },
      { threshold: VISIBLE_THRESHOLD },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      setArmed(false);
      setVisible(false);
      setPlaying(false);
    };
  }, [motionAllowed]);

  useEffect(() => {
    const element = video.current;
    if (!element) {
      return;
    }
    // React does not render the `muted` attribute, and autoplay policies need it.
    element.muted = true;
    element.defaultMuted = true;
    if (visible && !userPaused) {
      void Promise.resolve(element.play()).catch(() => undefined);
    } else {
      element.pause();
    }
  }, [mounted, visible, userPaused]);

  const fail = () => {
    setFailed(true);
    setPlaying(false);
  };

  return (
    <div
      ref={tile}
      className={`relative overflow-hidden rounded-sm ${className}`}
      style={{ aspectRatio: `${String(width)} / ${String(height)}` }}
    >
      <Image
        {...poster}
        alt=""
        aria-hidden="true"
        sizes={sizes}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {mounted && (
        <>
          <video
            ref={video}
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
            tabIndex={-1}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}
            onPlaying={() => {
              setPlaying(true);
            }}
            onError={(event) => {
              // A failing <source> bubbles here too; only the video's own error ends the loop.
              if (event.target === event.currentTarget) {
                fail();
              }
            }}
          >
            {sources.map((source, index) => (
              <source
                key={source.src}
                src={source.src}
                type={source.type}
                onError={index === sources.length - 1 ? fail : undefined}
              />
            ))}
          </video>
          <button
            type="button"
            aria-label={
              userPaused ? microcopy.playAnimation : microcopy.pauseAnimation
            }
            className="absolute bottom-2 right-2 grid size-11 place-items-center rounded-full bg-canvas text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
            onClick={() => {
              setUserPaused((paused) => !paused);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 fill-current"
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
        </>
      )}
    </div>
  );
}
