import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Text } from "../atoms/text";

type TeaserImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
};

const TEASER_SIZES = "(min-width: 64rem) 24rem, calc(100vw - 2.5rem)";

export function AboutTeaser({
  heading,
  body,
  image,
}: {
  heading: string;
  body: string;
  image?: TeaserImage;
}) {
  return (
    <section
      className={`grid items-center gap-8 py-section ${image ? "lg:grid-cols-2 lg:gap-x-12" : ""}`}
    >
      <div className="flex max-w-prose flex-col items-start gap-4">
        <Heading level={2}>{heading}</Heading>
        <Text>{body}</Text>
        <ButtonLink href="/quienes-somos" variant="text-arrow">
          Conocé quiénes somos
        </ButtonLink>
      </div>
      {image ? (
        <Image
          {...image}
          sizes={TEASER_SIZES}
          className="w-full max-w-sm rounded-sm object-cover lg:justify-self-end"
        />
      ) : null}
    </section>
  );
}
