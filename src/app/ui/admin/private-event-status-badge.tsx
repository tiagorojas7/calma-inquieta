import { StatusChip } from "./status-chip";

/** Private event status on the shared chip (fixed colors live in `status-chip.tsx`). */
export function PrivateEventStatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return <StatusChip status={status} label={label} />;
}
