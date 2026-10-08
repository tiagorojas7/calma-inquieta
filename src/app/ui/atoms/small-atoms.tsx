import type { PropsWithChildren } from "react";
import { microcopy } from "../microcopy";
export const Pill = ({ children }: PropsWithChildren) => (
  <span>{children}</span>
);
export const Divider = () => (
  <hr role="presentation" className="border-tan-400" />
);
export const VisuallyHidden = ({ children }: PropsWithChildren) => (
  <span className="sr-only">{children}</span>
);
export const SkipLink = ({ inert }: { inert?: boolean }) => (
  <a href="#contenido" inert={inert || undefined}>
    {microcopy.skipToContent}
  </a>
);
