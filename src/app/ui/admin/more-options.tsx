import type { ReactNode } from "react";
import { Icon } from "../atoms/icon";
import { adminCopy } from "./copy";

/**
 * Advanced fields behind a native disclosure, closed by default. It needs no
 * JavaScript, and what is inside still posts with the form while it is closed.
 */
export function MoreOptions({
  label = adminCopy.common.moreOptions,
  defaultOpen = false,
  children,
}: {
  label?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen || undefined} className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-lg font-semibold text-clay-800 hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 [&::-webkit-details-marker]:hidden">
        <Icon
          name="chevron-right"
          size={20}
          aria-hidden="true"
          className="transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
        {label}
      </summary>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </details>
  );
}
