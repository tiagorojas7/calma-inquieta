import type { ReactNode } from "react";
export function EmptyState({
  message,
  actions = [],
}: {
  message: ReactNode;
  actions?: { href: string; label: string }[];
}) {
  return (
    <div>
      <p>{message}</p>
      {actions.map((action) => (
        <a key={action.href} href={action.href}>
          {action.label}
        </a>
      ))}
    </div>
  );
}
