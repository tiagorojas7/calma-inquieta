import type { Clock } from "~/modules/_shared";

/** A clock that always reports the same instant. */
export function fixedClock(instant: Date): Clock {
  return { now: () => new Date(instant) };
}

export interface AdvancingClock extends Clock {
  advance(deltaMs: number): void;
}

/** A clock that only moves when a test advances it. */
export function advancingClock(start: Date): AdvancingClock {
  let currentMs = start.getTime();
  return {
    now: () => new Date(currentMs),
    advance(deltaMs) {
      currentMs += deltaMs;
    },
  };
}
