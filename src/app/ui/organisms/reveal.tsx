import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";

type RevealState = "visible" | "hidden" | "shown";

/** Milliseconds each `index` step delays the reveal (stagger). */
const STAGGER_MS = 80;

/**
 * Scroll reveal (S6): fades and lifts its children about 20 px into place
 * when they scroll into view. Transform and opacity only (motion.css).
 *
 * - Server markup and first paint are fully visible (`data-reveal="visible"`).
 * - After mount, an element that starts below the fold becomes `hidden`
 *   and flips to `shown` once it intersects the viewport, once.
 * - Elements that start in view, reduced-motion users and browsers without
 *   IntersectionObserver never hide. motion.css applies the hidden state
 *   only under prefers-reduced-motion: no-preference.
 * - Never wrap the LCP image. Do not put your own transform on the Reveal
 *   element: wrap a child instead.
 *
 * Stagger siblings with `index` (80 ms per step) or set `delay` in ms.
 */
export function Reveal({
  as: Tag = "div",
  delay,
  index,
  className = "",
  style,
  children,
  ...props
}: PropsWithChildren<
  Omit<HTMLAttributes<HTMLElement>, "style"> & {
    as?: "div" | "section" | "article" | "li" | "p" | "figure" | "span";
    /** Delay in milliseconds; wins over `index`. */
    delay?: number;
    /** Position in a staggered group, 80 ms per step. */
    index?: number;
    style?: CSSProperties;
  }
>) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<RevealState>("visible");

  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      element.getBoundingClientRect().top < window.innerHeight
    ) {
      return undefined;
    }
    setState("hidden");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setState("shown");
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const delayMs =
    delay ?? (index === undefined ? undefined : index * STAGGER_MS);
  const merged =
    delayMs === undefined
      ? style
      : ({
          ...style,
          "--reveal-delay": `${String(delayMs)}ms`,
        } as CSSProperties);

  return (
    <Tag
      {...props}
      ref={ref as never}
      data-reveal={state}
      className={className}
      style={merged}
    >
      {children}
    </Tag>
  );
}
