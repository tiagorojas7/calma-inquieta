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
    <article>
      <DateBadge date={date} />
      <Heading level={3}>{title}</Heading>
      <ButtonLink href={href} variant="text-arrow">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
