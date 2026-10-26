const tones: Record<string, "neutral" | "positive" | "attention"> = {
  pending_confirmation: "attention",
  paid: "positive",
  materials_requested: "neutral",
  materials_received: "positive",
  cancelled: "attention",
};

// Only declared contrast pairs: olive on sage, ink on sand, terracotta on sand.
const toneClasses = {
  neutral: "bg-sand-200 text-ink-900",
  positive: "bg-sage-200 text-olive-800",
  attention: "bg-sand-200 text-terracotta-700",
} as const;

/** The label always carries the meaning; the tone is reinforcement only. */
export function OrderStatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const tone = tones[status] ?? "neutral";
  return (
    <span
      data-status={status}
      data-tone={tone}
      className={`inline-block rounded-pill px-3 py-1 font-sans text-sm font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
