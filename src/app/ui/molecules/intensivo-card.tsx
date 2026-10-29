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
    <article className="card-hover flex h-full flex-col items-start gap-4 rounded-md bg-surface p-4 shadow-raised">
      <div className="card-hover-frame w-full rounded-sm">
        <Image {...image} className="block w-full object-cover" />
      </div>
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3">
        <div className="rounded-sm bg-sand-100 p-2 shadow-rest">
          <DateBadge {...date} />
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <Heading level={2} size="h3">
            {name}
          </Heading>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Text>{duration}</Text>
        {teacher ? <Text tone="muted">{teacher}</Text> : null}
      </div>
      <div
        data-slot="price-block"
        className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-tan-400 pt-4"
      >
        <PriceTag amount={price} />
        <Text tone="muted">{deposit}</Text>
      </div>
      <div className="flex flex-wrap gap-2">
        {materialsBadge ? <Pill>{materialsBadge}</Pill> : null}
        {seats && !paused ? <Pill>{seats}</Pill> : null}
      </div>
      {paused ? (
        <>
          <Pill tone="notice">Pausado</Pill>
          <PausedNotice text={paused} />
        </>
      ) : null}
      <ConditionsNote {...conditions} />
      <ButtonLink
        href={href}
        variant="secondary"
        className="mt-auto w-full justify-center"
      >
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
