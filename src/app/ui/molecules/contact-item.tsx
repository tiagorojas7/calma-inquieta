import { Icon } from "../atoms/icon";
import type { ComponentProps } from "react";
export function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: ComponentProps<typeof Icon>["name"];
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="card-hover card-accent flex items-start gap-4 rounded-md bg-white p-4 shadow-card">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sand-100 text-clay-800">
        <Icon name={icon} aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="font-display text-lg font-semibold text-ink-900">
          {label}
        </span>
        {href ? (
          <a
            className="link-underline-rest link-underline text-clay-800"
            href={href}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {value}
          </a>
        ) : (
          <span>{value}</span>
        )}
      </div>
    </div>
  );
}
export function TrustItem({
  icon,
  label,
}: {
  icon: ComponentProps<typeof Icon>["name"];
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-ink-900">
      <Icon name={icon} aria-hidden="true" className="text-clay-800" />
      <span>{label}</span>
    </div>
  );
}
export type DateBadgeParts = {
  dateTime: string;
  weekday?: string;
  day: string;
  month: string;
  label: string;
};

/** Renders preformatted parts as given; the delivery formatter owns the names. */
export function DateBadge({
  dateTime,
  weekday,
  day,
  month,
  label,
}: DateBadgeParts) {
  return (
    <time
      className="flex min-w-14 flex-col items-center text-center font-semibold uppercase text-clay-800"
      dateTime={dateTime}
      aria-label={label}
    >
      {weekday ? <span>{weekday}</span> : null}
      <span>{day}</span>
      <span>{month}</span>
    </time>
  );
}
