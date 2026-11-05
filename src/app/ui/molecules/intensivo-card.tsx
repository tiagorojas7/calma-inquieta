import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Pill } from "../atoms/pill";
import { Text } from "../atoms/text";
import { ConditionsNote } from "./conditions-note";
import { DateBadge, type DateBadgeParts } from "./date-badge";
import { PausedNotice } from "./paused-notice";
import { PriceTag } from "./price-tag";
import { TeacherLine } from "./teacher-line";
import { TimePill } from "./time-pill";

type CardImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Listing card of an intensivo, the liquid-glass one: the date and the
 * materials/seats marks are small glass chips over the photo, and the details
 * sit on a glass panel that rises over the photo's lower edge. Type roles: the
 * name in the display serif, the teacher a display italic subtitle, the hours
 * in a sage pill with tabular numerals, the price in the display face and the
 * deposit in small sans. The conditions note never carries the minimum seats
 * line: that line belongs to the detail page only.
 */
export function IntensivoCard({
  image,
  date,
  name,
  duration,
  teacher,
  teacherBio,
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
  /** A short excerpt of the teacher's description. */
  teacherBio?: string;
  price: string;
  deposit: string;
  seats?: string;
  materialsBadge?: string;
  paused?: string;
  conditions: { label: string; policyText: string };
  href: string;
  ctaLabel: string;
}) {
  const showSeats = Boolean(seats) && !paused;
  return (
    <article className="card-hover flex h-full flex-col overflow-hidden rounded-md bg-surface shadow-raised">
      <div className="card-hover-frame relative w-full">
        <Image {...image} className="block w-full object-cover" />
        <div className="glass absolute left-3 top-3 rounded-sm px-3 py-2">
          <DateBadge {...date} tone="ink" />
        </div>
        {materialsBadge || showSeats ? (
          <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
            {materialsBadge ? (
              <span className="glass rounded-pill px-3 py-1 text-sm font-semibold text-ink-900">
                {materialsBadge}
              </span>
            ) : null}
            {showSeats ? (
              <span className="glass rounded-pill px-3 py-1 text-sm font-semibold text-ink-900">
                {seats}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="glass relative z-10 mx-3 -mt-10 mb-3 flex flex-1 flex-col items-start gap-4 rounded-md p-5">
        <Heading level={2} size="h3">
          {name}
        </Heading>
        {teacher ? <TeacherLine name={teacher} bio={teacherBio} /> : null}
        <TimePill>{duration}</TimePill>
        <div
          data-slot="price-block"
          className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-tan-400 pt-4"
        >
          <PriceTag amount={price} />
          <Text tone="muted" className="text-sm">
            {deposit}
          </Text>
        </div>
        {paused ? (
          <>
            <Pill tone="notice">Pausado</Pill>
            <PausedNotice text={paused} />
          </>
        ) : null}
        <ConditionsNote {...conditions} />
        <ButtonLink href={href} className="mt-auto w-full justify-center">
          {ctaLabel}
        </ButtonLink>
      </div>
    </article>
  );
}
