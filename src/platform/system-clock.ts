import type { Clock } from "~/modules/_shared";

export const systemClock: Clock = { now: () => new Date() };
