const AXIS = 12;
const FIRST_X = 12;
const LAST_X = 308;
const HALF_PERIOD = 15;
const LIFT = 7.5;

const round = (value: number) => Number(value.toFixed(2));

/**
 * One strand of the twined cord as a cubic path: an arch every 15 px,
 * alternating above and below the axis (period 30 px), from x 12 to x 308.
 * `phase` 0 starts above the axis, 1 mirrors it. The closing arch is shorter
 * when the span is not a whole number of half periods.
 */
export function twinedStrand(phase: 0 | 1): string {
  const parts = [`M${String(FIRST_X)} ${String(AXIS)}`];
  let above = phase === 0;
  for (let x = FIRST_X; x < LAST_X; above = !above) {
    const width = Math.min(HALF_PERIOD, LAST_X - x);
    const y = String(AXIS + (above ? -LIFT : LIFT));
    const point = (at: number, py: string) => `${String(round(at))} ${py}`;
    parts.push(
      `C${point(x + width / 3, y)} ${point(x + (2 * width) / 3, y)} ${point(x + width, String(AXIS))}`,
    );
    x += width;
  }
  return parts.join(" ");
}

const STRAND_A = twinedStrand(0);
const STRAND_B = twinedStrand(1);

/** Decorative paper-cord divider: static SVG, drawn in by motifs.css only when motion is allowed. */
export function CordDivider() {
  return (
    <div aria-hidden="true" className="flex justify-center py-2 text-tan-400">
      <svg
        className="h-6 w-full max-w-80"
        viewBox="0 0 320 24"
        focusable="false"
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
      >
        <path
          className="motif-cord-a"
          d={STRAND_A}
          pathLength="1"
          stroke="currentColor"
        />
        <path
          className="motif-cord-b"
          d={STRAND_B}
          pathLength="1"
          stroke="currentColor"
        />
        <circle cx="6" cy="12" r="2.5" stroke="currentColor" />
        <circle cx="314" cy="12" r="2.5" stroke="currentColor" />
      </svg>
    </div>
  );
}
