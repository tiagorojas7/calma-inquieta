import { adminMicrocopy } from "./microcopy";
import { StatusChip } from "./status-chip";

export type AdminStatus = keyof typeof adminMicrocopy.status;

/** Workshop, intensive, material and teacher status on the shared chip. */
export function StatusBadge({ status }: { status: AdminStatus }) {
  return <StatusChip status={status} label={adminMicrocopy.status[status]} />;
}
