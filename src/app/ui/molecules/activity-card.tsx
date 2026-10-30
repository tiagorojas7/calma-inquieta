import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Pill } from "../atoms/pill";
import { Text } from "../atoms/text";

type ActivityImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};
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
    <article className="card-hover flex h-full flex-col items-start gap-3 rounded-md bg-surface p-4 shadow-raised">
      <div className="card-hover-frame w-full rounded-sm">
        <Image
          {...image}
          intrinsicRatio={false}
          className="block aspect-3/2 h-auto w-full object-cover md:aspect-4/3"
        />
      </div>
      {badge ? <Pill tone="notice">{badge}</Pill> : null}
      <Heading level={3}>{title}</Heading>
      <Text>{description}</Text>
      {schedule ? <Text tone="muted">{schedule}</Text> : null}
      <ButtonLink href={href} variant="text-arrow" className="mt-auto">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
