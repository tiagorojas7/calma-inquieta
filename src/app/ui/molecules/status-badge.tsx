import { Icon, type IconName } from "../atoms/icon";

export type StatusTone = "pending" | "done" | "cancelled";

const toneClasses: Record<StatusTone, string> = {
  pending: "bg-sand-200 text-clay-800",
  done: "bg-sage-200 text-olive-800",
  cancelled: "bg-blush-100 text-terracotta-700",
};

const toneIcons: Record<StatusTone, IconName> = {
  pending: "clock",
  done: "heart",
  cancelled: "close",
};

/** The state of an order or a request: the icon and the words carry it, not only the colour. */
export function StatusBadge({
  status,
  tone,
  label,
}: {
  status: string;
  tone: StatusTone;
  label: string;
}) {
  return (
    <p
      data-status={status}
      className={`inline-flex w-fit items-center gap-2 rounded-pill px-3 py-1 text-sm font-semibold ${toneClasses[tone]}`}
    >
      <Icon name={toneIcons[tone]} size={18} />
      <span>{label}</span>
    </p>
  );
}
