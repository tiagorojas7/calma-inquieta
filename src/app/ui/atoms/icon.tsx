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
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  play: <path d="M8 5v14l11-7Z" />,
  pin: (
    <>
      <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mail: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
} as const;
export function Icon({
  name,
  title,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths; title?: string }) {
  return (
    <svg
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={`size-6 shrink-0 fill-none stroke-current ${className}`}
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
