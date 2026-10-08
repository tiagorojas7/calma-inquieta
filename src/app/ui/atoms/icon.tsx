import type { SVGProps } from "react";
const paths = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  whatsapp: <path d="M5 19l1-3a7 7 0 1 1 2 2l-3 1Z" />,
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
} as const;
export function Icon({
  name,
  title,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths; title?: string }) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      role="img"
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
