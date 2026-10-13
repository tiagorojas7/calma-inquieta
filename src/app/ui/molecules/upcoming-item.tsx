import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { DateBadge } from "./date-badge";

export function UpcomingItem({
  date,
  title,
  href,
  ctaLabel,
}: {
  date: string;
  title: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <article className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-tan-400 py-4 last:border-b-0">
      <DateBadge date={date} />
      <Heading level={3} className="flex-1">
        {title}
      </Heading>
      <ButtonLink href={href} variant="text-arrow">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
