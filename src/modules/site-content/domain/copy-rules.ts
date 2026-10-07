export interface CopyViolation {
  readonly text: string;
  readonly rule: "workshop" | "tuteo";
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

// "workshop" is forbidden anywhere, even inside a longer word.
const WORKSHOP = /workshop/iu;
// A tuteo term counts only as a whole word: "eligen" must not trip "elige".
const TUTEO = new RegExp(
  String.raw`(?<![\p{L}])(?:${TUTEO_TERMS.join("|")})(?![\p{L}])`,
  "iu",
);

/**
 * Scans copy for the forbidden word "workshop" and for tuteo. Each string is
 * reported at most once per rule, with the first text that matched.
 */
export function findCopyViolations(
  strings: readonly string[],
): readonly CopyViolation[] {
  const violations: CopyViolation[] = [];
  for (const text of strings) {
    const workshop = WORKSHOP.exec(text);
    if (workshop) {
      violations.push({ text, rule: "workshop", match: workshop[0] });
    }
    const tuteo = TUTEO.exec(text);
    if (tuteo) {
      violations.push({ text, rule: "tuteo", match: tuteo[0] });
    }
  }
  return violations;
}
