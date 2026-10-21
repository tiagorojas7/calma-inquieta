import type { HTMLAttributes, PropsWithChildren } from "react";

const tiltClasses = {
  none: "",
  left: "-rotate-2",
  right: "rotate-2",
} as const;

export type FrameTilt = keyof typeof tiltClasses;

/**
 * A photo print: a white border and a soft shadow around its child. The
 * border is part of the frame, so the child keeps its own aspect ratio and
 * the frame never shifts the layout. `tilt` turns it two degrees.
 */
export function Frame({
  tilt = "none",
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>> & { tilt?: FrameTilt }) {
  return (
    <div
      {...props}
      className={`bg-surface p-2 shadow-lift lg:p-3 ${tiltClasses[tilt]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
