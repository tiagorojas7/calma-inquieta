import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Image } from "../atoms/image";
import { Pill } from "../atoms/pill";
import { Text } from "../atoms/text";

type ActivityImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Inicio card of a monthly taller: the photo on top and a liquid-glass panel
 * that rises over its lower edge, so the photo shows through the blur. Three
 * type roles keep the content from blending: the title in the display serif,
 * the description in the sans body, and the schedule in a sage pill with
 * tabular numerals. The call to action is a solid full-width button.
 */
export function ActivityCard({
  image,
  title,
  description,
  schedule,
  badge,
  href,
  ctaLabel,
}: {
  image: ActivityImage;
  title: string;
  description: string;
  schedule?: string;
  badge?: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <article className="card-hover flex h-full flex-col overflow-hidden rounded-md bg-surface shadow-raised">
      <div className="card-hover-frame relative w-full">
        <Image
          {...image}
          intrinsicRatio={false}
          className="block aspect-3/2 h-auto w-full object-cover md:aspect-4/3"
        />
      </div>
      <div className="glass relative z-10 mx-3 -mt-10 mb-3 flex flex-1 flex-col items-start gap-4 rounded-md p-5">
        {badge ? <Pill tone="notice">{badge}</Pill> : null}
        <Heading level={3}>{title}</Heading>
        <Text>{description}</Text>
        {schedule ? (
          <p className="flex items-start gap-2 rounded-sm bg-sage-200 px-3 py-2 text-sm font-semibold tabular-nums text-olive-800">
            <Icon
              name="clock"
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <span>{schedule}</span>
          </p>
        ) : null}
        <ButtonLink href={href} className="mt-auto w-full">
          {ctaLabel}
        </ButtonLink>
      </div>
    </article>
  );
}
