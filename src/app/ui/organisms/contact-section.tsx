import { ButtonLink } from "../atoms/button";
import { BotanicalSprig } from "../atoms/botanical-sprig";
import { Butterfly } from "../atoms/butterfly";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icons";
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
 * overlay pulls it into the palette. No text ever sits on the photo itself:
 * with a photo, the address and the directions go on a liquid-glass card that
 * rises over its lower edge (beside it on desktop), so a visitor sees the
 * place and how to get there together. WhatsApp is the one primary action;
 * the catalog and the directions are subordinate.
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
  // WhatsApp is the preferred channel: it leads as the single primary action.
  const primary = items.find((item) => item.icon === "whatsapp" && item.href);
  // With a photo the address moves onto the glass card over it.
  const place = photo
    ? items.find((item) => item.icon === "pin" && item !== primary)
    : undefined;
  const rest = items.filter((item) => item !== primary && item !== place);
  return (
    <Section
      bleed
      tone="sand"
      spacing="page"
      className="lg:flex lg:min-h-144 lg:items-center"
    >
      <div className="flex flex-col gap-10">
        <Reveal
          className={`flex flex-col items-start gap-6 ${photo ? "lg:w-1/2" : "max-w-prose"}`}
        >
          <Heading level={1}>{heading}</Heading>
          <Text className="max-w-prose text-lead">{intro}</Text>
          {primary?.href ? (
            <div data-contact-primary className="w-full sm:w-auto">
              <ButtonLink
                href={primary.href}
                className="w-full gap-2 sm:w-auto"
              >
                <Icon name="whatsapp" aria-hidden="true" className="size-5" />
                {primary.value}
              </ButtonLink>
            </div>
          ) : null}
          <div className="grid w-full gap-6 sm:grid-cols-2">
            {rest.map(({ id, ...item }) => (
              <ContactItem key={id} {...item} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href="/talleres" variant="secondary" className="gap-2">
              <Icon name="calendar" aria-hidden="true" className="size-5" />
              Ver talleres
            </ButtonLink>
            {place ? null : (
              <ButtonLink href={directionsHref} variant="tertiary">
                <Icon name="map" aria-hidden="true" className="size-5" />
                {microcopy.directions}
              </ButtonLink>
            )}
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
        {photo && place ? (
          <div className="glass relative z-10 mx-4 -mt-16 flex flex-col items-start gap-4 rounded-md p-5 lg:absolute lg:bottom-12 lg:right-8 lg:mx-0 lg:mt-0 lg:w-96">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage-200 text-olive-800">
                <Icon name={place.icon} aria-hidden="true" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-lg font-semibold text-ink-900">
                  {place.label}
                </span>
                <span className="text-ink-900">{place.value}</span>
              </div>
            </div>
            <ButtonLink
              href={directionsHref}
              variant="secondary"
              className="w-full gap-2"
            >
              <Icon name="map" aria-hidden="true" className="size-5" />
              {microcopy.directions}
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </Section>
  );
}
