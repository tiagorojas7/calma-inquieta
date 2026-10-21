import type { ReactNode } from "react";
import { EmptyState } from "../molecules/empty-state";

/** Single column at 360 px, two columns from `md`, three from `lg`. */
export function CatalogGrid({
  items,
  empty,
}: {
  items: readonly { key: string; node: ReactNode }[];
  empty: { message: string; action: { href: string; label: string } };
}) {
  if (!items.length) {
    return <EmptyState message={empty.message} actions={[empty.action]} />;
  }
  return (
    <ul className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map(({ key, node }) => (
        <li key={key} className="h-full">
          {node}
        </li>
      ))}
    </ul>
  );
}
