import { createContext, useContext, type PropsWithChildren } from "react";
import { Icon } from "../atoms/icon";
import { ADMIN_AREAS, type AdminAreaKey } from "./admin-areas";

const AdminAreaContext = createContext<AdminAreaKey | undefined>(undefined);

/**
 * The shell wraps the page in the area its path belongs to, so every header
 * below inherits the area color and icon without passing a prop.
 */
export function AdminAreaProvider({
  area,
  children,
}: PropsWithChildren<{ area: AdminAreaKey | undefined }>) {
  return <AdminAreaContext value={area}>{children}</AdminAreaContext>;
}

export function useAdminArea() {
  return useContext(AdminAreaContext);
}

/** Square icon chip in the area's colors. Decorative: a text label sits next to it. */
export function AreaChip({
  area,
  size = 24,
  className = "",
  onBand = false,
}: {
  area: AdminAreaKey;
  size?: number;
  className?: string;
  /** Sits on the area's own tint: a white chip keeps it visible. */
  onBand?: boolean;
}) {
  const style = ADMIN_AREAS[area];
  return (
    <span
      data-area-chip={area}
      className={`inline-flex shrink-0 items-center justify-center rounded-md p-2 ${onBand ? `bg-surface ${style.ink}` : style.chip} ${className}`}
    >
      <Icon name={style.icon} size={size} aria-hidden="true" />
    </span>
  );
}
