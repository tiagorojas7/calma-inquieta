import { useEffect, useState } from "react";
import { ButtonLink } from "../atoms/button";

/** The id of the real action in the booking summary, the one the bar stands in for. */
export const PRIMARY_ACTION_ID = "primary-action";

/**
 * Mobile-only bottom bar that repeats the page's primary action, only while
 * that action is off screen, so the two never show together. The real,
 * focusable action lives in the booking summary, so this copy is hidden from
 * assistive technology and skipped by the keyboard to avoid duplicate stops.
 * It starts hidden, so the server markup and a page without script show only
 * the real action; a browser that cannot watch the action keeps the bar on.
 * It is a flow-sticky element at the end of the article, so it never covers
 * content; the footer scrolls past it. It is liquid glass, so the page shows
 * through the blur as it scrolls under the bar.
 */
export function StickyAction({
  href,
  label,
  variant = "primary",
}: {
  href: string;
  label: string;
  variant?: "primary" | "success";
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const action = document.getElementById(PRIMARY_ACTION_ID);
    if (!action || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      setShown(!entries.at(-1)?.isIntersecting);
    });
    observer.observe(action);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      data-sticky-action
      data-shown={shown}
      aria-hidden="true"
      className={`glass sticky bottom-0 z-20 -mx-4 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity,visibility] duration-300 ease-calm motion-reduce:transition-none lg:hidden ${shown ? "translate-y-0 opacity-100" : "invisible translate-y-full opacity-0"}`}
    >
      <ButtonLink
        href={href}
        variant={variant}
        tabIndex={-1}
        className="w-full"
      >
        {label}
      </ButtonLink>
    </div>
  );
}
