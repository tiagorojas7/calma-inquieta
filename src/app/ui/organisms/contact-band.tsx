import { BotanicalSprig } from "../atoms/botanical-sprig";
import { ButtonLink } from "../atoms/button";
import { Butterfly } from "../atoms/butterfly";
import { Eyebrow } from "../atoms/eyebrow";
import { Frame } from "../atoms/frame";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Text } from "../atoms/text";
import { Reveal } from "./reveal";
import { Section } from "./section";

type BandPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
};

type BandAction = { href: string; label: string };

const PHOTO_SIZES = "(min-width: 64rem) 20rem, 64vw";

const lightFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas";

/**
 * Shared closing call to action (Inicio and Quiénes somos). A chocolate band
 * with a warm terracotta glow, a hairline stitched frame, the big butterfly
 * resting at one corner and a sprig climbing from the foot. The heading is
 * set at display size, the primary action is a cream pill with a drawn arrow
 * and the secondary actions are cream text links. An optional 4:5 photo sits
 * in a white frame beside the invitation. All pairs are AA on cocoa-900
 * (canvas 13.7, sand-200 10.5, apricot-300 8.2).
 */
export function ContactBand({
  eyebrow,
  heading,
  body,
  primary,
  secondary = [],
  image,
}: {
  /** Short decorative signpost above the heading. */
  eyebrow?: string;
  heading: string;
  body: string;
  primary: BandAction;
  secondary?: readonly BandAction[];
  image?: BandPhoto | undefined;
}) {
  return (
    <Section
      bleed
      tone="cocoa"
      spacing="lg"
      grain
      className="band-glow band-frame overflow-x-clip"
    >
      <Butterfly
        size="xl"
        className={
          image
            ? "right-2 top-6 lg:right-120 lg:top-14"
            : "right-2 top-6 lg:right-24 lg:top-1/2 lg:-translate-y-1/2"
        }
      />
      <BotanicalSprig
        size="lg"
        variant="olive"
        light
        className="absolute -top-14 left-6 lg:top-auto lg:bottom-0 lg:left-auto lg:right-72"
      />
      <div
        className={`grid items-center gap-12 ${image ? "lg:grid-cols-2 lg:gap-x-16" : ""}`}
      >
        <Reveal className="flex max-w-prose flex-col items-start gap-5 max-lg:mt-28">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Heading level={2} size="display">
            {heading}
          </Heading>
          <Text className="text-lead text-sand-200!">{body}</Text>
          <div className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-4">
            <ButtonLink
              href={primary.href}
              className={`bg-canvas! text-cocoa-900! hover:bg-sand-200! ${lightFocus}`}
            >
              {primary.label}
            </ButtonLink>
            {secondary.map((action) => (
              <ButtonLink
                key={action.href}
                href={action.href}
                variant="tertiary"
                className={`text-canvas! ${lightFocus}`}
              >
                {action.label}
              </ButtonLink>
            ))}
          </div>
        </Reveal>
        {image ? (
          <Reveal index={1} className="contact-photo lg:justify-self-end">
            <Frame tilt="right">
              <Image
                {...image}
                intrinsicRatio={false}
                sizes={PHOTO_SIZES}
                className="aspect-4/5 h-auto w-full object-cover"
              />
            </Frame>
          </Reveal>
        ) : null}
      </div>
    </Section>
  );
}
