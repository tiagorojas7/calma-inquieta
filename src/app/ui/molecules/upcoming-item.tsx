import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Pill } from "../atoms/pill";
import { DateBadge, type DateBadgeParts } from "./date-badge";

/**
 * One upcoming intensivo as a soft ticket: a sage date block with the day set
 * large, the title in the display serif, the hours in their own sage pill with
 * tabular numerals, and a full-width solid button on phones.
 */
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
    <article className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-md bg-sand-100 p-4 shadow-raised sm:flex-nowrap sm:gap-x-6 sm:p-5">
      <div className="rounded-sm bg-sage-200 px-3 py-3">
        <DateBadge {...date} tone="olive" />
      </div>
      <div className="flex min-w-0 flex-1 basis-40 flex-col items-start gap-2">
        <Heading level={3}>{title}</Heading>
        {detail ? (
          <p className="flex items-center gap-2 rounded-sm bg-sage-200 px-3 py-1.5 text-sm font-semibold tabular-nums text-olive-800">
            <Icon name="clock" aria-hidden="true" className="size-4 shrink-0" />
            <span>{detail}</span>
          </p>
        ) : null}
        {badge ? <Pill tone="notice">{badge}</Pill> : null}
      </div>
      <ButtonLink href={href} className="w-full sm:w-auto">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
