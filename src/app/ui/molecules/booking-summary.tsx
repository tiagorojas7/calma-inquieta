import type { PropsWithChildren } from "react";
import { microcopy } from "../microcopy";

/** Conversion panel: the facts that decide the booking, then the action. */
export function BookingSummary({
  label = microcopy.bookingSummary,
  children,
}: PropsWithChildren<{ label?: string }>) {
  return (
    <aside
      aria-label={label}
      className="flex min-w-0 flex-col gap-5 rounded-md bg-surface p-6 shadow-raised lg:sticky lg:top-24"
    >
      {children}
    </aside>
  );
}
