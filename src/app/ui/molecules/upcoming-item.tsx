import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Pill } from "../atoms/pill";
import { DateBadge, type DateBadgeParts } from "./date-badge";

export function UpcomingItem({
  date,
  title,
  detail,
  badge,
  href,
  ctaLabel,
}: {
  date: DateBadgeParts;
  title: string;
  detail?: string;
  badge?: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <article className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-tan-400 py-4 last:border-b-0">
      <DateBadge {...date} />
      <div className="flex flex-1 flex-col gap-1">
        <Heading level={3}>{title}</Heading>
        {detail ? <p className="text-ink-700">{detail}</p> : null}
        {badge ? (
          <div>
            <Pill tone="notice">{badge}</Pill>
          </div>
        ) : null}
      </div>
      <ButtonLink href={href} variant="text-arrow">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
