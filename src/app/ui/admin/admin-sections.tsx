import { useId, type ReactNode } from "react";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { AdminEmptyState } from "./empty-state";

/** Class list for a card that is one big tap target (see `.admin-tap`). */
export const ADMIN_TAP_CARD = "admin-tap relative pr-12";

/**
 * The overlay and chevron that turn a whole card into a tap target. The
 * overlay anchor is hidden from assistive tech and the tab order: the named
 * link inside the card stays the one accessible destination.
 */
export function AdminTapTarget({ href }: { href: string }) {
  return (
    <>
      <a href={href} data-tap="" aria-hidden="true" tabIndex={-1} />
      <Icon
        name="chevron-right"
        size={28}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-clay-800"
      />
    </>
  );
}

/**
 * Mobile-first replacement for a wide list table: one card per row, with no
 * horizontal scroll. The caller renders each card's content. With `href`, the
 * whole card opens that destination and shows a chevron.
 */
export function AdminCardList<Row>({
  label,
  rows,
  rowKey,
  card,
  empty,
  href,
}: {
  label: string;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  card: (row: Row) => ReactNode;
  href?: ((row: Row) => string | undefined) | undefined;
  empty: {
    title: string;
    message: string;
    action: {
      href: string;
      label: string;
      variant?: "success" | "primary" | "secondary";
    };
  };
}) {
  if (rows.length === 0) return <AdminEmptyState {...empty} />;
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {rows.map((row) => {
        const destination = href?.(row);
        return (
          <li
            key={rowKey(row)}
            className={`flex flex-col gap-2 rounded-md bg-surface p-4 shadow-card ${destination ? ADMIN_TAP_CARD : ""}`}
          >
            {card(row)}
            {destination ? <AdminTapTarget href={destination} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A section on its own raised panel: the title, an optional subtitle and action
 * on one row, then the content. Sections read as separate surfaces on the page,
 * so a screen is not one flat run of headings and rows.
 */
export function AdminSection({
  title,
  description,
  actions,
  className = "",
  children,
}: {
  title: string;
  description?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-4 rounded-md bg-surface p-5 shadow-card lg:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Heading level={2} id={id}>
            {title}
          </Heading>
          {description ? (
            <p className="text-sm text-ink-700">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
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
