import { BotanicalSprig } from "../atoms/botanical-sprig";
import { ButtonLink } from "../atoms/button";
import { Frame } from "../atoms/frame";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Text } from "../atoms/text";
import { Reveal } from "./reveal";

type Photo = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
};

const PRIMARY_SIZES = "(min-width: 64rem) 20rem, 58vw";
const SECONDARY_SIZES = "(min-width: 64rem) 17rem, 48vw";

/**
 * The booking lead above the Inicio catalog cards (S11, S17): a heading, a
 * line of copy and the two calls to action on one side, and a layered photo
 * pair on the other (a tall 4:5 photo with a wide 3:2 print in a white frame
 * laid over it, a sprig crossing both). The cards below stay untouched, so
 * the band still reads when the catalog is empty. Both photos are lazy: they
 * sit below the fold.
 */
export function HomeCatalogLead({
  heading,
  body,
  primary,
  secondary,
  whatsappHref,
}: {
  heading: string;
  body: string;
  primary: Photo;
  secondary: Photo;
  whatsappHref?: string | undefined;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-x-16">
      <Reveal className="flex max-w-prose flex-col items-start gap-5">
        <Heading level={2}>{heading}</Heading>
        <Text>{body}</Text>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {whatsappHref ? (
            <ButtonLink href={whatsappHref}>
              Reservá tu lugar por WhatsApp
            </ButtonLink>
          ) : null}
          <ButtonLink
            href="/talleres"
            variant={whatsappHref ? "text-arrow" : "primary"}
          >
            Ver todos los talleres
          </ButtonLink>
        </div>
      </Reveal>
      <Reveal index={1} className="photo-pair">
        <div className="photo-pair-a">
          <Image
            {...primary}
            intrinsicRatio={false}
            sizes={PRIMARY_SIZES}
            className="aspect-4/5 h-auto w-full object-cover"
          />
        </div>
        <Frame tilt="left" className="photo-pair-b">
          <Image
            {...secondary}
            intrinsicRatio={false}
            sizes={SECONDARY_SIZES}
            className="aspect-3/2 h-auto w-full object-cover"
          />
        </Frame>
        <BotanicalSprig
          size="md"
          variant="sage"
          className="absolute -top-8 -left-4 z-20 -rotate-12"
        />
      </Reveal>
    </div>
  );
}
