import { BotanicalSprig } from "../atoms/botanical-sprig";
import { Butterfly } from "../atoms/butterfly";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";
import { microcopy } from "../microcopy";
import { Reveal } from "./reveal";
import { Section } from "./section";

const lightFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas";

/**
 * Closing band on deep clay (S7): the big butterfly rests at one corner and a
 * sprig climbs from the foot. Both calls to action are restyled for the dark
 * ground (light fill with clay text, light link) because the shared buttons
 * are tuned for light backgrounds.
 */
export function ContactBand({
  heading,
  body,
  whatsappHref,
  instagramHref,
}: {
  heading: string;
  body: string;
  whatsappHref: string;
  instagramHref?: string;
}) {
  const external = /^https?:/.test(whatsappHref);
  return (
    <Section bleed tone="clay" spacing="lg" className="overflow-x-clip">
      <Butterfly size="xl" className="right-2 top-6 lg:right-24 lg:top-8" />
      <BotanicalSprig
        size="lg"
        variant="olive"
        light
        className="absolute -top-14 left-6 lg:top-auto lg:bottom-0 lg:left-auto lg:right-72"
      />
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
    </Section>
  );
}
