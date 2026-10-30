export type StatusTone =
  "orange" | "green" | "blue" | "teal" | "grey" | "neutral";

/**
 * The fixed status colors. Every admin status (order, intensive, workshop,
 * private event) resolves here, so a color always means the same thing:
 * orange = Por cobrar / pendiente, green = Pagado / Publicado, blue = Pedido /
 * solicitado, teal = Recibido / completo, grey = Cancelado, neutral = Borrador.
 */
const TONES: Record<string, StatusTone> = {
  pending_confirmation: "orange",
  pending: "orange",
  paused: "orange",
  contactada: "orange",
  paid: "green",
  published: "green",
  active: "green",
  materials_requested: "blue",
  requested: "blue",
  nueva: "blue",
  materials_received: "teal",
  received: "teal",
  complete: "teal",
  completed: "teal",
  cerrada: "teal",
  cancelled: "grey",
  archived: "grey",
  draft: "neutral",
};

// Full class names so Tailwind sees them; pairs are checked in admin-colors.test.ts.
const toneClasses: Record<StatusTone, string> = {
  orange: "bg-status-orange-bg text-status-orange-fg",
  green: "bg-status-green-bg text-status-green-fg",
  blue: "bg-status-blue-bg text-status-blue-fg",
  teal: "bg-status-teal-bg text-status-teal-fg",
  grey: "bg-status-grey-bg text-status-grey-fg",
  neutral:
    "border border-admin-line bg-status-neutral-bg text-status-neutral-fg",
};

export function statusTone(status: string): StatusTone {
  return TONES[status] ?? "neutral";
}

/** The one status chip. The label carries the meaning; the color reinforces it. */
export function StatusChip({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const tone = statusTone(status);
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
