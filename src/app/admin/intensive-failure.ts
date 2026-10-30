import type { IntensivePublishRule } from "~/modules/workshops";

/**
 * The publish rules an intensivo can still miss, in the order they are shown.
 * The list is typed against the domain rules so a new rule cannot be left out.
 */
const KNOWN_RULES = [
  "name",
  "slug",
  "teacher",
  "percentage",
  "time-range",
  "future-start",
  "price",
  "deposit",
  "capacity",
  "min-seats",
] as const satisfies readonly IntensivePublishRule[];

/**
 * What stopped the one-click intensivo flow after the draft was saved,
 * carried as a bounded `?falta=<rule>,<rule>` query parameter on the redirect
 * to the intensivo. Only known rules are honored, so the page never renders
 * text taken from the URL. `null` means no failure; an empty list means the
 * publish failed without naming a rule.
 */
export function intensiveMissing(
  request: Request,
): readonly IntensivePublishRule[] | null {
  const value = new URL(request.url).searchParams.get("falta");
  if (value === null) return null;
  const asked = value.split(",");
  return KNOWN_RULES.filter((rule) => asked.includes(rule));
}

/** `path` with the missing rules appended. */
export function withIntensiveMissing(
  path: string,
  rules: readonly IntensivePublishRule[],
): string {
  return `${path}${path.includes("?") ? "&" : "?"}falta=${rules.join(",")}`;
}
