import type { ReactNode } from "react";
import { Link } from "react-router";
import { ButtonLink } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { DateBadge, type DateBadgeParts } from "../molecules/date-badge";
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
  /** The next open intensivo, so the first screen already holds a date to book. */
  next?:
    | {
        title: string;
        detail?: string | undefined;
        href: string;
        date: DateBadgeParts;
      }
    | undefined;
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
  next,
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
        <Heading level={1} id="hero-title">
          {title}
        </Heading>
        <Text className="hero-subtitle max-w-prose text-lead">{subtitle}</Text>
        <div className="flex flex-wrap gap-4">
          <ButtonLink href="/talleres" className="hero-cta">
            Ver talleres
          </ButtonLink>
          <ButtonLink
            href="/intensivos"
            variant="secondary"
            className="hero-cta"
          >
            Ver workshops
          </ButtonLink>
        </div>
        {next ? (
          <Link
            to={next.href}
            viewTransition
            className="group flex w-full max-w-prose items-center gap-4 rounded-md bg-surface p-3 pr-5 shadow-raised transition-[transform,box-shadow] duration-300 ease-calm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lift"
          >
            <span className="rounded-sm bg-sage-200 px-3 py-2">
              <DateBadge {...next.date} tone="olive" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-display text-2xl font-semibold leading-tight text-ink-900">
                {next.title}
              </span>
              <span className="text-sm text-ink-700">
                <span className="whitespace-nowrap">Próximo intensivo</span>
                {next.detail ? (
                  <>
                    {" · "}
                    <span className="whitespace-nowrap font-semibold tabular-nums text-olive-800">
                      {next.detail}
                    </span>
                  </>
                ) : null}
              </span>
            </span>
            <Icon
              name="arrow"
              aria-hidden="true"
              className="size-6 shrink-0 text-clay-800 transition-transform duration-300 ease-calm motion-safe:group-hover:translate-x-1"
            />
          </Link>
        ) : null}
        <div className="mt-4 flex w-full max-w-prose flex-col gap-2 border-t border-tan-400 pt-6">
          <p
            data-hero-location
            className="flex items-center gap-2 font-medium text-ink-900"
          >
            <Icon
              name="pin"
              aria-hidden="true"
              className="size-5 shrink-0 text-clay-800"
            />
            <span>{eyebrow}</span>
          </p>
          <Text tone="muted" className="hero-bajada">
            {bajada}
          </Text>
        </div>
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
