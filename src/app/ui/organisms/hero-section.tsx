import type { ReactNode } from "react";
import { ButtonLink } from "../atoms/button";
import { Eyebrow, Heading, Text } from "../atoms/heading";
import { Picture } from "../atoms/picture";
import {
  HERO_DESKTOP_MEDIA,
  HERO_LEAD_SIZES,
  HERO_MOBILE_MEDIA,
  HeroCollage,
  type CollageImg,
  type CollageLoop,
} from "./hero-collage";
import { Section } from "./section";

export { HERO_DESKTOP_MEDIA, HERO_LEAD_SIZES, HERO_MOBILE_MEDIA };

/** The phone backdrop spans the viewport. */
export const HERO_BACKDROP_SIZES = "100vw";

/** 1 by 1 transparent WebP: the backdrop swaps to it from lg, where it is hidden. */
const BLANK_PIXEL =
  "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  /** Phones: a 9:16 photo behind the text, the LCP below lg. */
  backdrop: CollageImg;
  /** From lg: the collage photos in slot order (lead, framed, torn). */
  collage: readonly CollageImg[];
  note: string;
  keywords: readonly string[];
  /** The optional decorative loop: a collage tile from lg. */
  loop?: CollageLoop | undefined;
  bajada: string;
};

/**
 * Inicio hero (S2). Phones: the backdrop photo fills the first viewport
 * under the transparent header, with the eyebrow, h1 and CTAs over its calm
 * upper half on a cream scrim and the subtitle on a card at the bottom. From
 * lg: the text on the left and the image5 collage on the right. Exactly one
 * eager, high priority image downloads per breakpoint.
 */
export function HeroSection({
  eyebrow,
  title,
  subtitle,
  backdrop,
  collage,
  note,
  keywords,
  loop,
  bajada,
}: Props) {
  return (
    <Section
      bleed
      spacing="none"
      tone="canvas"
      aria-labelledby="hero-title"
      className="hero-stage"
    >
      <div className="hero-backdrop lg:hidden">
        <Picture
          {...backdrop}
          className="size-full object-cover"
          pictureClassName="contents"
          aboveTheFold
          fetchPriority="high"
          sizes={HERO_BACKDROP_SIZES}
          sources={[
            {
              media: HERO_DESKTOP_MEDIA,
              srcSet: BLANK_PIXEL,
              width: backdrop.width,
              height: backdrop.height,
            },
          ]}
        />
        <div aria-hidden="true" className="hero-scrim" />
      </div>
      <div className="hero-copy">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} id="hero-title">
          {title}
        </Heading>
        <Text className="max-w-prose text-lead max-lg:order-last max-lg:mt-auto max-lg:rounded-md max-lg:bg-canvas/90 max-lg:p-4">
          {subtitle}
        </Text>
        <div className="flex flex-wrap gap-4">
          <ButtonLink href="/talleres">Ver talleres</ButtonLink>
          <ButtonLink href="/intensivos" variant="outline">
            Ver intensivos
          </ButtonLink>
        </div>
        <Text
          tone="muted"
          className="mt-4 w-full max-w-prose border-t border-tan-400 pt-6 max-lg:sr-only"
        >
          {bajada}
        </Text>
      </div>
      <HeroCollage
        photos={collage}
        note={note}
        keywords={keywords}
        loop={loop}
      />
    </Section>
  );
}
