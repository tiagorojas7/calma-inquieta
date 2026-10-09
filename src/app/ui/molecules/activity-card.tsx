import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
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
  href,
  ctaLabel,
}: {
  image: ActivityImage;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <article>
      <Image {...image} />
      <Heading level={3}>{title}</Heading>
      <Text>{description}</Text>
      <ButtonLink href={href} variant="text-arrow">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
