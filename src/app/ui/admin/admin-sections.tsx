import type { ReactNode } from "react";
import { Heading } from "../atoms/heading";
import { AdminEmptyState } from "./empty-state";

/**
 * Mobile-first replacement for a wide list table: one card per row, with no
 * horizontal scroll. The caller renders each card's content.
 */
export function AdminCardList<Row>({
  label,
  rows,
  rowKey,
  card,
  empty,
}: {
  label: string;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  card: (row: Row) => ReactNode;
  empty: {
    title: string;
    message: string;
    action: { href: string; label: string };
  };
}) {
  if (rows.length === 0) return <AdminEmptyState {...empty} />;
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {rows.map((row) => (
        <li
          key={rowKey(row)}
          className="flex flex-col gap-2 rounded-md bg-surface p-4 shadow-card"
        >
          {card(row)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Separated section for archive, cancel and delete actions, so a destructive
 * button never sits next to the primary save action.
 */
export function AdminDangerZone({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex max-w-prose flex-col gap-3 rounded-md border border-terracotta-700 p-4"
    >
      <Heading level={2} size="h3">
        {title}
      </Heading>
      {children}
    </section>
  );
}
