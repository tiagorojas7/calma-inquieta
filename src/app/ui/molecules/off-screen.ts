import { useEffect, useState } from "react";

/** The id of a page's real primary action, the one a sticky bar stands in for. */
export const PRIMARY_ACTION_ID = "primary-action";

/** How a sticky bar enters and leaves: transform and opacity, no layout. */
export function stickyBarClasses(shown: boolean): string {
  const state = shown
    ? "translate-y-0 opacity-100"
    : "invisible translate-y-full opacity-0";
  return `transition-[transform,opacity,visibility] duration-300 ease-calm motion-reduce:transition-none ${state}`;
}

/**
 * True while the page's primary action is off screen, so a sticky copy of it
 * and the real one never show together. It starts false, so the server markup
 * and a page without script show only the real action; a browser that cannot
 * watch the action gets true, and the sticky copy stays available.
 */
export function usePrimaryActionOffScreen(): boolean {
  const [offScreen, setOffScreen] = useState(false);

  useEffect(() => {
    const action = document.getElementById(PRIMARY_ACTION_ID);
    if (!action || typeof IntersectionObserver === "undefined") {
      setOffScreen(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      setOffScreen(!entries.at(-1)?.isIntersecting);
    });
    observer.observe(action);
    return () => {
      observer.disconnect();
    };
  }, []);

  return offScreen;
}
