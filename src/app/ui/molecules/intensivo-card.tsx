import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Pill } from "../atoms/pill";
import { Text } from "../atoms/text";
import { ConditionsNote } from "./conditions-note";
import { DateBadge, type DateBadgeParts } from "./date-badge";
import { PausedNotice } from "./paused-notice";
import { PriceTag } from "./price-tag";

type CardImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Listing card of an intensivo. The conditions note never carries the minimum
 * seats line: that line belongs to the detail page only.
 */
export function IntensivoCard({
  image,
  date,
  name,
  duration,
  teacher,
  price,
  deposit,
  seats,
  materialsBadge,
  paused,
  conditions,
  href,
  ctaLabel,
}: {
  image: CardImage;
  date: DateBadgeParts;
  name: string;
  duration: string;
  teacher?: string;
  price: string;
  deposit: string;
  seats?: string;
  materialsBadge?: string;
  paused?: string;
  conditions: { label: string; policyText: string };
  href: string;
  ctaLabel: string;
}) {
  return (
    <article className="flex h-full flex-col items-start gap-4 rounded-md bg-surface p-4 shadow-card">
      <Image {...image} className="w-full rounded-sm object-cover" />
      <div className="flex items-center gap-4">
        <DateBadge {...date} />
        <Heading level={2} size="h3">
          {name}
        </Heading>
      </div>
      {teacher ? <Text tone="muted">{teacher}</Text> : null}
      <Text>{duration}</Text>
      <PriceTag amount={price} />
      <Text tone="muted">{deposit}</Text>
      <div className="flex flex-wrap gap-2">
        {materialsBadge ? <Pill>{materialsBadge}</Pill> : null}
        {seats && !paused ? <Pill>{seats}</Pill> : null}
      </div>
      {paused ? <PausedNotice text={paused} /> : null}
      <ConditionsNote {...conditions} />
      <ButtonLink href={href} variant="text-arrow" className="mt-auto">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
