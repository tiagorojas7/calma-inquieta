import type { ReactNode } from "react";
export function EmptyState({
  message,
  actions = [],
}: {
  message: ReactNode;
  actions?: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-md bg-sand-100 p-6 shadow-rest">
      <p className="text-ink-700">{message}</p>
      {actions.map((action) => (
        <a
          key={action.href}
          href={action.href}
          className="min-h-11 text-clay-800 underline underline-offset-4"
        >
          {action.label}
        </a>
      ))}
    </div>
  );
}
