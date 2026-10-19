import type { ReactNode } from "react";

/**
 * Hand-drawn looking sprigs (S4), inline SVG in the brand's olive, sage and
 * clay tokens. Decorative: aria-hidden, no text, no request. The size scale
 * is the owner's 60 to 150 px; the sprig is meant to overlap photos and
 * section edges, so it takes its own placement through `className`.
 */
const sizeClasses = {
  sm: "size-15",
  md: "size-25",
  lg: "size-37.5",
} as const;

export type SprigSize = keyof typeof sizeClasses;
export type SprigVariant = "olive" | "sage" | "wheat";

type Leaf = {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
};

const n = (value: number) => String(Number(value.toFixed(1)));

/** A pointed leaf lying along +x from the origin. */
function leafPath(length: number, width: number): string {
  return `M0 0C${n(length * 0.3)} ${n(-width)} ${n(length * 0.75)} ${n(-width * 0.7)} ${n(length)} 0C${n(length * 0.75)} ${n(width * 0.7)} ${n(length * 0.3)} ${n(width)} 0 0Z`;
}

function leaves(list: readonly Leaf[], fill: string): ReactNode {
  return list.map(({ x, y, angle, length, width }) => (
    <path
      key={`${String(x)}-${String(y)}-${String(angle)}`}
      className={fill}
      d={leafPath(length, width)}
      transform={`translate(${String(x)} ${String(y)}) rotate(${String(angle)})`}
    />
  ));
}

const OLIVE_LEAVES: readonly Leaf[] = [
  { x: 47, y: 132, angle: -150, length: 24, width: 6 },
  { x: 48, y: 118, angle: -30, length: 24, width: 6 },
  { x: 49, y: 100, angle: -150, length: 23, width: 6 },
  { x: 51, y: 86, angle: -32, length: 23, width: 6 },
  { x: 53, y: 70, angle: -148, length: 21, width: 5.5 },
  { x: 55, y: 55, angle: -34, length: 21, width: 5.5 },
  { x: 56, y: 40, angle: -146, length: 18, width: 5 },
  { x: 58, y: 26, angle: -36, length: 18, width: 5 },
  { x: 58, y: 10, angle: -92, length: 16, width: 4.5 },
];

const SAGE_LEAVES: readonly Leaf[] = [
  { x: 41, y: 140, angle: -160, length: 20, width: 11 },
  { x: 43, y: 126, angle: -20, length: 20, width: 11 },
  { x: 44, y: 106, angle: -165, length: 19, width: 10.5 },
  { x: 46, y: 90, angle: -15, length: 19, width: 10.5 },
  { x: 47, y: 72, angle: -160, length: 17, width: 9.5 },
  { x: 49, y: 56, angle: -22, length: 17, width: 9.5 },
  { x: 50, y: 38, angle: -155, length: 15, width: 8.5 },
  { x: 52, y: 24, angle: -28, length: 15, width: 8.5 },
  { x: 52, y: 10, angle: -90, length: 13, width: 7.5 },
];

const WHEAT_GRAINS: readonly Leaf[] = [
  { x: 51, y: 70, angle: -125, length: 15, width: 4.5 },
  { x: 51, y: 70, angle: -55, length: 15, width: 4.5 },
  { x: 51, y: 56, angle: -128, length: 15, width: 4.5 },
  { x: 51, y: 56, angle: -52, length: 15, width: 4.5 },
  { x: 51, y: 42, angle: -130, length: 14, width: 4 },
  { x: 51, y: 42, angle: -50, length: 14, width: 4 },
  { x: 51, y: 28, angle: -132, length: 13, width: 4 },
  { x: 51, y: 28, angle: -48, length: 13, width: 4 },
  { x: 51, y: 14, angle: -90, length: 13, width: 3.5 },
];

const WHEAT_GRASS: readonly Leaf[] = [
  { x: 50, y: 154, angle: -118, length: 54, width: 5 },
  { x: 50, y: 154, angle: -62, length: 48, width: 5 },
];

const STEMS: Record<SprigVariant, string> = {
  olive: "M48 156C46 112 54 62 58 8",
  sage: "M40 156C60 112 32 72 52 8",
  wheat: "M50 156C50 112 52 62 51 12",
};

const TONE: Record<SprigVariant, string> = {
  olive: "text-olive-800",
  sage: "text-olive-800",
  wheat: "text-clay-800",
};

export function BotanicalSprig({
  size = "md",
  variant = "olive",
  light = false,
  className = "",
}: {
  size?: SprigSize;
  variant?: SprigVariant;
  /** Stems in sand-200 instead of olive or clay, for dark bands. */
  light?: boolean;
  /** Placement and rotation: sprigs sit over photos and section edges. */
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-size={size}
      data-variant={variant}
      className={`pointer-events-none block ${sizeClasses[size]} ${light ? "text-sand-200" : TONE[variant]} ${className}`.trim()}
    >
      <svg
        className="size-full overflow-visible"
        viewBox="0 0 100 160"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={STEMS[variant]} />
        {variant === "olive" ? leaves(OLIVE_LEAVES, "fill-sage-200") : null}
        {variant === "sage" ? leaves(SAGE_LEAVES, "fill-sage-200") : null}
        {variant === "wheat" ? (
          <>
            {leaves(WHEAT_GRASS, "fill-sage-200")}
            {leaves(WHEAT_GRAINS, "fill-sand-300")}
          </>
        ) : null}
      </svg>
    </span>
  );
}
