import type { SVGProps } from "react";
const paths = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  whatsapp: (
    <>
      <path d="M5 19l1-3a7 7 0 1 1 2 2l-3 1Z" />
      <path d="M9.4 8.8c.2 2.2 2.4 4.4 4.7 4.7l1.1-1.2-1.7-.9-.8.6a3.8 3.8 0 0 1-1.8-1.8l.6-.8-.9-1.7Z" />
    </>
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="16.9" cy="7.1" r=".6" />
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
  map: (
    <path d="M9 4 3 6.2v13.6L9 17.6l6 2.2 6-2.2V4.2L15 6.4ZM9 4v13.6m6-11.2v13.4" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mail: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  hands: (
    <>
      <path d="M3 12l4-4 4 2 3-2 4 3 3-1" />
      <path d="M7 16l3 3a1.5 1.5 0 0 0 2 0l6-5.5" />
      <path d="M3 12l4 5" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z" />
      <path d="M5 19 13 11" />
    </>
  ),
  heart: (
    <path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20Z" />
  ),
  group: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.500s6 2.2 6 5.500M16 14c2.8 0 5 1.800 5 4.500" />
    </>
  ),
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
