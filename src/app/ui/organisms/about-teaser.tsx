import { BotanicalSprig } from "../atoms/botanical-sprig";
import { ButtonLink } from "../atoms/button";
import { Frame } from "../atoms/frame";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { ScriptText } from "../atoms/script-text";
import { Text } from "../atoms/text";
import { Reveal } from "./reveal";
import { Section } from "./section";

type TeaserImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
};

const TEASER_SIZES = "(min-width: 64rem) 24rem, calc(100vw - 2.5rem)";
const ACCENT_SIZES = "(min-width: 64rem) 16rem, 50vw";

/**
 * Quiénes somos teaser on a full-bleed sand band (S7): the text with a
 * handwritten pull phrase, and two overlapping photos of different ratios
 * (4:5 and 4:3, the second in a white frame) with a sprig crossing them.
 */
export function AboutTeaser({
  heading,
  body,
  image,
  accentImage,
  pull,
}: {
  heading: string;
  body: string;
  image?: TeaserImage;
  accentImage?: TeaserImage;
  pull?: string;
}) {
  return (
    <Section bleed tone="sand" spacing="lg" className="overflow-x-clip">
      <div
        className={`grid items-center gap-12 ${image ? "lg:grid-cols-2 lg:gap-x-16" : ""}`}
      >
        <Reveal className="flex max-w-prose flex-col items-start gap-4">
          <Heading level={2}>{heading}</Heading>
          {pull ? (
            <ScriptText as="p" tone="accent">
              {pull}
            </ScriptText>
          ) : null}
          <Text>{body}</Text>
          <ButtonLink href="/quienes-somos" variant="text-arrow">
            Conocé quiénes somos
          </ButtonLink>
        </Reveal>
        {image ? (
          <Reveal
            index={1}
            className="teaser-collage relative pb-10 lg:justify-self-end lg:w-full lg:max-w-md"
          >
            <Image
              {...image}
              intrinsicRatio={false}
              sizes={TEASER_SIZES}
              className="aspect-4/5 h-auto w-3/4 rounded-sm object-cover"
            />
            {accentImage ? (
              <Frame
                tilt="right"
                className="absolute right-0 bottom-0 z-10 w-1/2"
              >
                <Image
                  {...accentImage}
                  intrinsicRatio={false}
                  sizes={ACCENT_SIZES}
                  className="aspect-4/3 h-auto w-full object-cover"
                />
              </Frame>
            ) : null}
            <BotanicalSprig
              size="lg"
              variant="sage"
              className="absolute -top-8 right-4 z-20 rotate-12"
            />
          </Reveal>
        ) : null}
      </div>
    </Section>
  );
}
