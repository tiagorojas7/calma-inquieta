import { StatusChip } from "./status-chip";

/** Order status on the shared chip (fixed colors live in `status-chip.tsx`). */
export function OrderStatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return <StatusChip status={status} label={label} />;
}
