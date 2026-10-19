import type { HTMLAttributes, PropsWithChildren } from "react";
import { ScriptText } from "../atoms/script-text";

const tiltClasses = { left: "-rotate-3", right: "rotate-3" } as const;

/**
 * A handwritten note on a torn piece of kraft paper (S2): the text is in the
 * script face (ink-900 on sand-300 is AA), the paper has a ragged edge
 * (`paper-torn`, motifs.css) and the whole card is turned a few degrees. The
 * shadow lives on the outer element because a clip-path would cut it.
 */
export function PaperNote({
  tilt = "left",
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
  tilt?: keyof typeof tiltClasses;
}) {
  return (
    <div
      {...props}
      className={`drop-shadow-md ${tiltClasses[tilt]} ${className}`.trim()}
    >
      <div className="paper-torn bg-sand-300 px-6 py-6 lg:px-7 lg:py-9">
        <ScriptText as="p" tone="ink">
          {children}
        </ScriptText>
      </div>
    </div>
  );
}
