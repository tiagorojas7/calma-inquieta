/** Decorative line butterfly: absolutely positioned, flight and flap live in motifs.css. */
export function Butterfly() {
  return (
    <div
      aria-hidden="true"
      className="motif-flight pointer-events-none absolute -top-5 right-6 z-10 size-7 text-clay-800 lg:-top-6 lg:size-10"
    >
      <svg
        className="size-full"
        viewBox="0 0 48 40"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className="motif-wing motif-wing-left">
          <path
            className="fill-sand-300"
            d="M24 14C18 6 9 3 5 7C3 11 9 19 24 20Z"
          />
          <path
            className="fill-sand-300"
            d="M24 21C16 21 10 27 11 34C17 36 23 31 24 28Z"
          />
          <path d="M24 17C17 13 11 10 7 8" />
        </g>
        <g className="motif-wing motif-wing-right">
          <path
            className="fill-sand-300"
            d="M24 14C30 6 39 3 43 7C45 11 39 19 24 20Z"
          />
          <path
            className="fill-sand-300"
            d="M24 21C32 21 38 27 37 34C31 36 25 31 24 28Z"
          />
          <path d="M24 17C31 13 37 10 41 8" />
        </g>
        <path d="M24 11V31" strokeWidth={3} />
        <path d="M24 11C23 8 22 6 20 4M24 11C25 8 26 6 28 4" />
        <circle cx="20" cy="4" r="1" />
        <circle cx="28" cy="4" r="1" />
      </svg>
    </div>
  );
}
