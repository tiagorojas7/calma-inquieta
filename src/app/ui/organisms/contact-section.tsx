import { ButtonLink } from "../atoms/button";
import { BotanicalSprig } from "../atoms/botanical-sprig";
import { Butterfly } from "../atoms/butterfly";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Text } from "../atoms/text";
import { ContactItem } from "../molecules/contact-item";
import { microcopy } from "../microcopy";
import { Reveal } from "./reveal";
import { Section } from "./section";
import type { ComponentProps } from "react";

interface ContactPhoto {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly srcSet?: string;
}

type Item = ComponentProps<typeof ContactItem> & { id: string };

const PHOTO_SIZES = "(min-width: 64rem) 42vw, calc(100vw - 2.5rem)";

/**
 * Contacto: a full-bleed sand band. The info sits on one side; the photo
 * bleeds to the right page edge on desktop and follows the info as a wide
 * card on a phone. The facade is dark blue at night, so a warm colour
 * overlay pulls it into the palette. No text ever sits on the photo.
 */
export function ContactSection({
  heading,
  intro,
  photo,
  items,
  directionsHref,
}: {
  heading: string;
  intro: string;
  photo?: ContactPhoto | undefined;
  items: readonly Item[];
  directionsHref: string;
}) {
  return (
    <Section
      bleed
      tone="sand"
      spacing="lg"
      className="lg:flex lg:min-h-144 lg:items-center"
    >
      <div className="flex flex-col gap-10">
        <Reveal
          className={`flex flex-col items-start gap-6 ${photo ? "lg:w-1/2" : "max-w-prose"}`}
        >
          <Heading level={1}>{heading}</Heading>
          <Text className="max-w-prose text-lead">{intro}</Text>
          <div className="grid w-full gap-6 sm:grid-cols-2">
            {items.map(({ id, ...item }) => (
              <ContactItem key={id} {...item} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href="/talleres">Ver talleres</ButtonLink>
            <ButtonLink href={directionsHref} variant="outline">
              {microcopy.directions}
            </ButtonLink>
          </div>
        </Reveal>
        {photo ? (
          <div
            data-photo-bleed="true"
            className="relative lg:absolute lg:inset-y-0 lg:right-0 lg:w-5/12"
          >
            <div
              data-photo-frame="true"
              className="relative aspect-[4/3] overflow-hidden rounded-md border-6 border-white shadow-lift lg:aspect-auto lg:h-full lg:rounded-l-md lg:rounded-r-none lg:border-r-0"
            >
              <Image
                {...photo}
                sizes={PHOTO_SIZES}
                className="h-full w-full object-cover"
              />
              <div
                data-warm-overlay="true"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <div className="absolute inset-0 bg-clay-600/55 mix-blend-color" />
                <div className="absolute inset-0 bg-linear-to-t from-sand-300/50 to-transparent mix-blend-soft-light" />
              </div>
            </div>
            <BotanicalSprig
              variant="sage"
              size="lg"
              className="absolute -bottom-6 -left-3 z-10 -rotate-6 lg:-left-10 lg:bottom-10"
            />
            <Butterfly
              size="lg"
              className="right-8 top-16 lg:right-20 lg:top-36"
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}
