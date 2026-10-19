import { BotanicalSprig } from "../atoms/botanical-sprig";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { ScriptText } from "../atoms/script-text";
import { Text } from "../atoms/text";
import { Reveal } from "./reveal";
import { Section } from "./section";

interface IntroImage {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly srcSet?: string;
}

const MAIN_SIZES = "(min-width: 64rem) 22rem, 55vw";
const SIDE_SIZES = "(min-width: 64rem) 20rem, 45vw";

/** A photo in a white paper-style border; the tilt lives on the figure, not on the Reveal. */
function Framed({
  image,
  sizes,
  className,
}: {
  image: IntroImage;
  sizes: string;
  className: string;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-sm border-6 border-white bg-white shadow-lift ${className}`}
    >
      <Image {...image} sizes={sizes} className="block w-full object-cover" />
    </figure>
  );
}

/**
 * Quiénes somos opening band: the story on one side, a collage of
 * overlapping framed photos of different ratios on the other. The text comes
 * first in the DOM, so on a phone it leads and the collage follows, staggered.
 */
export function AboutIntro({
  heading,
  paragraphs,
  valueProposition,
  pullQuote,
  images,
}: {
  heading: string;
  paragraphs: readonly string[];
  valueProposition: string;
  pullQuote?: string | undefined;
  images: readonly IntroImage[];
}) {
  const [main, ...rest] = images;
  const [lead, ...others] = paragraphs;
  return (
    <Section bleed tone="canvas" spacing="lg">
      <div
        className={`grid items-center gap-12 ${main ? "lg:grid-cols-2 lg:gap-16" : ""}`}
      >
        <div className="flex max-w-prose flex-col gap-5">
          <Reveal>
            <Heading level={1}>{heading}</Heading>
          </Reveal>
          {lead ? (
            <Reveal index={1}>
              <p className="text-lead text-ink-700">{lead}</p>
            </Reveal>
          ) : null}
          {others.map((text, at) => (
            <Reveal key={text} index={at + 2}>
              <Text>{text}</Text>
            </Reveal>
          ))}
          <Reveal index={others.length + 2}>
            <p className="border-l-2 border-tan-400 pl-4 font-display text-xl italic text-clay-800">
              {valueProposition}
            </p>
          </Reveal>
          {pullQuote ? (
            <Reveal index={others.length + 3}>
              <blockquote className="mt-2">
                <ScriptText as="p">{pullQuote}</ScriptText>
              </blockquote>
            </Reveal>
          ) : null}
        </div>
        {main ? (
          <div className="relative mx-auto flex w-full max-w-md items-start pb-8 lg:max-w-none lg:pb-10">
            <Reveal className="z-10 mt-14 w-1/2 shrink-0 lg:mt-20">
              <div className="flex flex-col gap-4">
                {rest.map((image, at) => (
                  <Framed
                    key={image.src}
                    image={image}
                    sizes={SIDE_SIZES}
                    className={at % 2 === 0 ? "-rotate-2" : "rotate-2"}
                  />
                ))}
              </div>
            </Reveal>
            <Reveal
              index={2}
              className={`${rest.length ? "-ml-10 w-7/12" : "mx-auto w-4/5"} shrink-0`}
            >
              <Framed image={main} sizes={MAIN_SIZES} className="rotate-1" />
            </Reveal>
            <BotanicalSprig
              variant="olive"
              size="lg"
              className="absolute -bottom-2 -left-2 z-20 -rotate-12 lg:-left-8"
            />
            <BotanicalSprig
              variant="sage"
              size="md"
              className="absolute -right-2 -top-6 z-20 rotate-6 lg:-right-6"
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}
