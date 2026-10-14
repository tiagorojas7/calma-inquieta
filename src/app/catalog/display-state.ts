/**
 * Display state of a taller on the public catalog. The input types are
 * structural: they match the public catalog read model (`PublicStatus`,
 * `PublicOffering`) without importing the workshops module.
 */
export type DisplayStatus = "open" | "paused";
export type TallerDisplay = "paused" | "open" | "no-offering";
export type SeatsIndicator = { kind: "limited" } | { kind: "none" };

/** Paused takes precedence over a missing offering. */
export function tallerDisplay(
  status: DisplayStatus,
  offering: object | null,
): TallerDisplay {
  if (status === "paused") {
    return "paused";
  }
  return offering === null ? "no-offering" : "open";
}

/** "Cupo limitado" only for an open taller; never derived from capacity. */
export function seatsIndicator(display: TallerDisplay): SeatsIndicator {
  return display === "open" ? { kind: "limited" } : { kind: "none" };
}
