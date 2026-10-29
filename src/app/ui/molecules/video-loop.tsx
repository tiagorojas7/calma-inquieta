import { useEffect, useRef, useState } from "react";
import { Icon } from "../atoms/icons";
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
  /**
   * Hands the play/pause decision to the owner: the loop then renders no
   * button of its own and follows this flag (WCAG 2.2.2 stays with the owner).
   */
  paused?: boolean;
  /** Reports whether a video is mounted, so an external control shows only then. */
  onActiveChange?: (active: boolean) => void;
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
  paused,
  onActiveChange,
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
  const controlled = paused !== undefined;
  const halted = controlled ? paused : userPaused;

  useEffect(() => {
    onActiveChange?.(mounted);
  }, [mounted, onActiveChange]);

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
    if (visible && !halted) {
      void Promise.resolve(element.play()).catch(() => undefined);
    } else {
      element.pause();
    }
  }, [mounted, visible, halted]);

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
          {!controlled && (
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
              <Icon name={userPaused ? "play" : "pause"} className="size-5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
