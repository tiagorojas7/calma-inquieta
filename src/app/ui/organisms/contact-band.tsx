import { BotanicalSprig } from "../atoms/botanical-sprig";
import { Butterfly } from "../atoms/butterfly";
import { Frame } from "../atoms/frame";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Text } from "../atoms/text";
import { microcopy } from "../microcopy";
import { Reveal } from "./reveal";
import { Section } from "./section";

type BandPhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
};

const PHOTO_SIZES = "(min-width: 64rem) 20rem, 64vw";

const lightFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas";

/**
 * Closing band on deep clay (S7, S11): the big butterfly rests at one corner
 * and a sprig climbs from the foot. A lazy 4:5 photo in a white frame sits
 * beside the call to action (hands finishing a piece at the workshop table),
 * so the band invites booking instead of reading flat. Both calls to action
 * are restyled for the dark ground (light fill with clay text, light link)
 * because the shared buttons are tuned for light backgrounds.
 */
export function ContactBand({
  heading,
  body,
  whatsappHref,
  instagramHref,
  image,
}: {
  heading: string;
  body: string;
  whatsappHref: string;
  instagramHref?: string;
  image?: BandPhoto | undefined;
}) {
  const external = /^https?:/.test(whatsappHref);
  return (
    <Section bleed tone="clay" spacing="lg" className="overflow-x-clip">
      <Butterfly size="xl" className="right-2 top-6 lg:right-120 lg:top-14" />
      <BotanicalSprig
        size="lg"
        variant="olive"
        light
        className="absolute -top-14 left-6 lg:top-auto lg:bottom-0 lg:left-auto lg:right-72"
      />
      <div
        className={`grid items-center gap-12 ${image ? "lg:grid-cols-2 lg:gap-x-16" : ""}`}
      >
        <Reveal className="flex max-w-prose flex-col items-start gap-4 max-lg:mt-28">
          <Heading level={2}>{heading}</Heading>
          <Text>{body}</Text>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={whatsappHref}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className={`inline-block min-h-11 rounded-md bg-canvas px-6 py-3 font-sans text-clay-800 transition-[background-color,box-shadow,transform] duration-200 ease-calm hover:bg-sand-100 hover:shadow-card motion-safe:hover:-translate-y-0.5 ${lightFocus}`}
            >
              Escribinos por WhatsApp
              {external && (
                <span className="sr-only">{microcopy.opensInNewTab}</span>
              )}
            </a>
            {instagramHref ? (
              <a
                href={instagramHref}
                rel="noopener noreferrer"
                className={`link-underline link-underline-rest min-h-11 content-center text-canvas ${lightFocus}`}
              >
                Instagram
              </a>
            ) : null}
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
