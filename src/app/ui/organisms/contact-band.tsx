import { BotanicalSprig } from "../atoms/botanical-sprig";
import { ButtonLink } from "../atoms/button";
import { Butterfly } from "../atoms/butterfly";
import { EmphasizedLastWord } from "../atoms/emphasis";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
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

type BandAction = {
  href: string;
  label: string;
  /** Leading glyph of the button; omitted for plain navigation. */
  icon?: "whatsapp" | "instagram";
};

const PHOTO_SIZES = "100vw";

/**
 * Shared closing call to action (Inicio and Quiénes somos). The photo, when
 * there is one, fills the whole band and the invitation sits on a liquid-glass
 * panel over it, so no text ever sits on the photo itself and the photo stays
 * the hero of the band. The panel is a 78 % canvas tint, so ink-900 text keeps
 * about 9:1 over any part of the photo. Without a photo the panel sits on the
 * flat cocoa band and uses the dense sheet, because the regular one leaves the
 * clay-800 secondary label at 4.45:1 there. Phones get one column: the heading, the invitation and
 * two full-width solid buttons, each with its glyph, with the photo showing
 * above the panel. The butterfly and the sprig only appear from lg, beside the
 * panel. A half-opaque solid cocoa veil (35 %, 55 % on hover or focus) deepens
 * the photo so the panel stands out. The photo settles into place on its own
 * scroll timeline (motifs.css).
 */
export function ContactBand({
  heading,
  body,
  primary,
  secondary = [],
  image,
}: {
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
      spacing="md"
      className="closing-band group isolate overflow-x-clip"
    >
      {image ? (
        <div className="band-photo absolute inset-0 -z-10 overflow-hidden">
          <Image
            {...image}
            intrinsicRatio={false}
            sizes={PHOTO_SIZES}
            className="size-full object-cover"
          />
          <div
            aria-hidden="true"
            data-band-veil
            className="pointer-events-none absolute inset-0 bg-cocoa-900/35 transition-colors duration-500 ease-calm group-focus-within:bg-cocoa-900/55 group-hover:bg-cocoa-900/55 motion-reduce:transition-none"
          />
        </div>
      ) : null}
      <Butterfly
        size="xl"
        className={
          image
            ? "max-lg:hidden lg:right-24 lg:top-14"
            : "max-lg:hidden lg:right-24 lg:top-1/2 lg:-translate-y-1/2"
        }
      />
      <BotanicalSprig
        size="lg"
        variant="olive"
        light
        className="absolute max-lg:hidden lg:bottom-0 lg:right-72"
      />
      <div
        className={
          image ? "flex min-h-128 items-end lg:min-h-112 lg:items-center" : ""
        }
      >
        <Reveal
          className={`glass ${image ? "" : "glass-dense"} flex w-full max-w-xl flex-col items-start gap-6 rounded-md p-6 text-ink-900 [--em-color:var(--color-terracotta-700)] sm:p-8`}
        >
          <Heading level={2}>
            <EmphasizedLastWord text={heading} />
          </Heading>
          <Text tone="strong" className="text-lead">
            {body}
          </Text>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <ButtonLink href={primary.href} className="w-full gap-2 sm:w-auto">
              {primary.icon ? (
                <Icon
                  name={primary.icon}
                  aria-hidden="true"
                  className="size-5"
                />
              ) : null}
              {primary.label}
            </ButtonLink>
            {secondary.map((action) => (
              <ButtonLink
                key={action.href}
                href={action.href}
                variant="secondary"
                className="w-full gap-2 sm:w-auto"
              >
                {action.icon ? (
                  <Icon
                    name={action.icon}
                    aria-hidden="true"
                    className="size-5"
                  />
                ) : null}
                {action.label}
              </ButtonLink>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
