import { ButtonLink } from "../atoms/button";

/**
 * Mobile-only bottom bar that repeats the page's primary action. The real,
 * focusable action lives in the booking summary, so this copy is hidden from
 * assistive technology and skipped by the keyboard to avoid duplicate stops.
 * It is a flow-sticky element at the end of the article, so it never covers
 * content; the footer scrolls past it.
 */
export function StickyAction({ href, label }: { href: string; label: string }) {
  return (
    <div
      data-sticky-action
      aria-hidden="true"
      className="sticky bottom-0 z-20 -mx-4 bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-raised lg:hidden"
    >
      <ButtonLink href={href} tabIndex={-1} className="w-full">
        {label}
      </ButtonLink>
    </div>
  );
}
