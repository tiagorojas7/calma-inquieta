import type { PropsWithChildren } from "react";
import { microcopy } from "../microcopy";
export { Pill } from "./pill";
export const Divider = () => (
  <hr role="presentation" className="border-tan-400" />
);
export const VisuallyHidden = ({ children }: PropsWithChildren) => (
  <span className="sr-only">{children}</span>
);
export const SkipLink = ({ inert }: { inert?: boolean }) => (
  <a
    href="#contenido"
    inert={inert || undefined}
    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-canvas focus:px-4 focus:py-3 focus:text-clay-800 focus:underline"
  >
    {microcopy.skipToContent}
  </a>
);
