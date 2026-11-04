import type { ReactNode } from "react";
import { Icon, type IconName } from "../atoms/icons";

/** Left padding that makes room for the icon (icon 20 px + its 12 px inset). */
export const iconPadding = (icon: IconName | undefined) =>
  icon ? "pl-11" : "";

/**
 * A decorative icon at the start of a field's control, so a field is
 * recognised at a glance (a phone for the phone number, an envelope for the
 * email). The label still names the field: the icon is `aria-hidden`, never
 * takes a click (`pointer-events-none`) and is centred on one-line controls
 * or aligned with the first line of a multi-line one. Without an icon the
 * control renders exactly as before.
 */
export function FieldIcon({
  icon,
  multiline = false,
  children,
}: {
  icon?: IconName | undefined;
  multiline?: boolean;
  children: ReactNode;
}) {
  if (!icon) return <>{children}</>;
  return (
    <div className="relative">
      <Icon
        name={icon}
        data-field-icon=""
        aria-hidden="true"
        className={`pointer-events-none absolute left-3 size-5 text-clay-800 ${
          multiline ? "top-3" : "top-1/2 -translate-y-1/2"
        }`}
      />
      {children}
    </div>
  );
}
