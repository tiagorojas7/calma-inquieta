export interface CopyViolation {
  readonly text: string;
  readonly rule: "tuteo";
  readonly match: string;
}

/** Tuteo imperatives that voseo copy must not use (DMR R1). */
const TUTEO_TERMS = [
  "escríbenos",
  "elige",
  "selecciona",
  "haz clic",
  "debes",
  "reserva tu",
] as const;

// "workshop" used to be forbidden anywhere (DMR R1). The owner lifted it on
// 2026-11-04: "Workshops" is now the name of the one-day events.
// A tuteo term counts only as a whole word: "eligen" must not trip "elige".
const TUTEO = new RegExp(
  String.raw`(?<![\p{L}])(?:${TUTEO_TERMS.join("|")})(?![\p{L}])`,
  "iu",
);

/**
 * Scans copy for tuteo. Each string is reported at most once, with the first
 * term that matched.
 */
export function findCopyViolations(
  strings: readonly string[],
): readonly CopyViolation[] {
  const violations: CopyViolation[] = [];
  for (const text of strings) {
    const tuteo = TUTEO.exec(text);
    if (tuteo) {
      violations.push({ text, rule: "tuteo", match: tuteo[0] });
    }
  }
  return violations;
}
