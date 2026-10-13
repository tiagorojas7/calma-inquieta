import { adminMicrocopy } from "./microcopy";

export type AdminStatus = keyof typeof adminMicrocopy.status;

const tones = {
  draft: "neutral",
  published: "positive",
  paused: "attention",
  cancelled: "attention",
  archived: "neutral",
  active: "positive",
} as const satisfies Record<AdminStatus, string>;

// Only declared contrast pairs: olive on sage, ink on sand, terracotta on sand.
const toneClasses = {
  neutral: "bg-sand-200 text-ink-900",
  positive: "bg-sage-200 text-olive-800",
  attention: "bg-sand-200 text-terracotta-700",
} as const;

/** The label always carries the meaning; the tone is reinforcement only. */
export function StatusBadge({ status }: { status: AdminStatus }) {
  const tone = tones[status];
  return (
    <span
      data-status={status}
      data-tone={tone}
      className={`inline-block rounded-pill px-3 py-1 font-sans text-sm font-semibold ${toneClasses[tone]}`}
    >
      {adminMicrocopy.status[status]}
    </span>
  );
}
