import type { PropsWithChildren } from "react";

type PillTone = "neutral" | "notice";

const toneClasses: Record<PillTone, string> = {
  neutral: "bg-sage-200 text-olive-800 ring-1 ring-inset ring-olive-800/20",
  notice:
    "bg-blush-100 text-terracotta-700 ring-1 ring-inset ring-terracotta-700/25",
};

export function Pill({
  tone = "neutral",
  children,
}: PropsWithChildren<{ tone?: PillTone }>) {
  return (
    <span
      data-tone={tone}
      className={`inline-block rounded-pill px-3.5 py-1 text-sm font-semibold tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
