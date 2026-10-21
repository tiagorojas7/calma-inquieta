import type { ReactNode } from "react";
import { ButtonLink } from "../atoms/button";
import { Eyebrow, Heading, Text } from "../atoms/heading";
import {
  HERO_DESKTOP_MEDIA,
  HERO_LEAD_MOBILE_SIZES,
  HERO_LEAD_RESPONSIVE_SIZES,
  HERO_LEAD_SIZES,
  HERO_MOBILE_MEDIA,
  HeroCollage,
  type CollageImg,
  type CollageLoop,
} from "./hero-collage";
import { Section } from "./section";

export {
  HERO_DESKTOP_MEDIA,
  HERO_LEAD_MOBILE_SIZES,
  HERO_LEAD_RESPONSIVE_SIZES,
  HERO_LEAD_SIZES,
  HERO_MOBILE_MEDIA,
};

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  /** The collage photos in slot order (lead, framed, torn). */
  collage: readonly CollageImg[];
  note: string;
  keywords: readonly string[];
  /** The optional decorative loop: a collage tile from lg. */
  loop?: CollageLoop | undefined;
  bajada: string;
};

/**
 * Inicio hero (S2, S16). It fills the viewport (100svh, header included) and
 * looks the same on every width: the copy on the light canvas and the image5
 * collage. From lg they sit side by side; on phones the collage follows the
 * copy as one scaled board (owner decision 2026-10-20).
 */
export function HeroSection({
  eyebrow,
  title,
  subtitle,
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
      <div className="hero-copy">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} id="hero-title">
          {title}
        </Heading>
        <Text className="hero-subtitle max-w-prose text-lead">{subtitle}</Text>
        <div className="flex flex-wrap gap-4">
          <ButtonLink href="/talleres" className="hero-cta">
            Ver talleres
          </ButtonLink>
          <ButtonLink href="/intensivos" variant="outline" className="hero-cta">
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
