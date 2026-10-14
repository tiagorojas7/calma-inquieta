import type { PropsWithChildren } from "react";

type PillTone = "neutral" | "notice";

const toneClasses: Record<PillTone, string> = {
  neutral: "bg-sage-200 text-olive-800",
  notice: "bg-sand-200 text-terracotta-700",
};

export function Pill({
  tone = "neutral",
  children,
}: PropsWithChildren<{ tone?: PillTone }>) {
  return (
    <span
      data-tone={tone}
      className={`inline-block rounded-pill px-3 py-1 text-sm font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
