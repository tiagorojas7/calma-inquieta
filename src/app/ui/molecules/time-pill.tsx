import type { ReactNode } from "react";
import { Icon } from "../atoms/icons";

/**
 * Hours and durations get their own treatment so they never blend with the
 * titles and the body copy: a sage pill (olive-800 on sage-200, about 7:1)
 * with a clock, semibold and tabular numerals so the digits line up.
 */
export function TimePill({ children }: { children: ReactNode }) {
  return (
    <p className="flex w-fit items-center gap-2 rounded-sm bg-sage-200 px-3 py-1.5 text-sm font-semibold tabular-nums text-olive-800">
      <Icon name="clock" aria-hidden="true" className="size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
