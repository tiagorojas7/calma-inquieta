import { ButtonLink } from "../atoms/button";
import { stickyBarClasses, usePrimaryActionOffScreen } from "./off-screen";

/**
 * Mobile-only bottom bar that repeats the page's primary action, only while
 * that action is off screen, so the two never show together. The real,
 * focusable action lives in the booking summary, so this copy is hidden from
 * assistive technology and skipped by the keyboard to avoid duplicate stops.
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
  const shown = usePrimaryActionOffScreen();

  return (
    <div
      data-sticky-action
      data-shown={shown}
      aria-hidden="true"
      className={`glass sticky bottom-0 z-20 -mx-4 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden ${stickyBarClasses(shown)}`}
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
