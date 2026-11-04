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
    <div className="card-hover relative flex items-start gap-4 rounded-md bg-white p-4 shadow-card has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-clay-800">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage-200 text-olive-800">
        <Icon name={icon} aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="font-display text-lg font-semibold text-ink-900">
          {label}
        </span>
        {href ? (
          <a
            className="link-underline-rest link-underline text-clay-800 after:absolute after:inset-0"
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

const dateTones = {
  /** The original small badge. */
  clay: "text-clay-800",
  /** On glass or white: ink-900, the strongest pair. */
  ink: "text-ink-900",
  /** On a sage block: olive-800 on sage-200, calm and about 7:1. */
  olive: "text-olive-800",
} as const;

/**
 * Renders preformatted parts as given; the delivery formatter owns the names.
 * Any tone but `clay` sets the day large in the display face and the weekday
 * and month small, spaced and uppercase in the sans face, so the date reads
 * day first and the three parts do not look alike.
 */
export function DateBadge({
  dateTime,
  weekday,
  day,
  month,
  label,
  tone = "clay",
}: DateBadgeParts & { tone?: keyof typeof dateTones }) {
  const large = tone !== "clay";
  const small = large ? "text-eyebrow tracking-eyebrow" : undefined;
  return (
    <time
      className={`flex min-w-14 flex-col items-center text-center font-semibold uppercase ${dateTones[tone]}`}
      dateTime={dateTime}
      aria-label={label}
    >
      {weekday ? <span className={small}>{weekday}</span> : null}
      <span
        className={large ? "font-display text-4xl leading-none" : undefined}
      >
        {day}
      </span>
      <span className={small}>{month}</span>
    </time>
  );
}
