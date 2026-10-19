import type { ReactNode } from "react";
import { ButtonLink } from "../atoms/button";
import { Eyebrow, Heading, Text } from "../atoms/heading";
import { Picture } from "../atoms/picture";
import { VideoLoop } from "../molecules/video-loop";

type Img = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
};

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  image: { mobile: Img; desktop: Img };
  /** The optional decorative loop: after the text on phones, a small tile from lg. */
  loop?:
    | {
        poster: Img;
        sources: readonly { src: string; type: string }[];
        width: number;
        height: number;
      }
    | undefined;
  bajada: string;
  /** Decorative slot anchored to the still photo's corner (the butterfly). */
  ornament?: ReactNode;
};

/** The viewport from which the desktop still replaces the phone still. */
export const HERO_DESKTOP_MEDIA = "(min-width: 64rem)";
/** The exact complement of the desktop media; only the route preload needs it. */
export const HERO_MOBILE_MEDIA = "not all and (min-width: 64rem)";
/** Layout width of the still: 28rem (`max-w-md`) or the viewport minus the gutters. */
export const HERO_STILL_SIZES =
  "(min-width: 30rem) 28rem, calc(100vw - 2.5rem)";

/** Layout width of the loop tile: 12rem from xl, 10rem from lg, else the still's width. */
const HERO_LOOP_SIZES =
  "(min-width: 80rem) 12rem, (min-width: 64rem) 10rem, (min-width: 30rem) 28rem, calc(100vw - 2.5rem)";

export function HeroSection({
  eyebrow,
  title,
  subtitle,
  image,
  loop,
  bajada,
  ornament,
}: Props) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative grid items-center gap-8 overflow-x-clip py-section lg:grid-cols-12 lg:gap-x-12"
    >
      <div className="flex flex-col items-start gap-6 lg:col-span-6 xl:col-span-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} id="hero-title">
          {title}
        </Heading>
        <Text className="max-w-prose text-lead">{subtitle}</Text>
        <div className="flex flex-wrap gap-4">
          <ButtonLink href="/talleres">Ver talleres</ButtonLink>
          <ButtonLink href="/intensivos" variant="outline">
            Ver intensivos
          </ButtonLink>
        </div>
        <Text
          tone="muted"
          className="mt-4 w-full max-w-prose border-t border-tan-400 pt-6"
        >
          {bajada}
        </Text>
      </div>
      <div className="contents lg:relative lg:col-span-6 lg:block lg:w-full lg:max-w-md lg:justify-self-end xl:col-span-7">
        <div className="relative order-first mx-auto w-full max-w-md lg:order-none">
          <Picture
            {...image.mobile}
            className="aspect-4/5 h-auto w-full rounded-sm object-cover lg:aspect-3/4"
            aboveTheFold
            fetchPriority="high"
            sizes={HERO_STILL_SIZES}
            sources={[
              {
                media: HERO_DESKTOP_MEDIA,
                srcSet: image.desktop.srcSet ?? image.desktop.src,
                width: image.desktop.width,
                height: image.desktop.height,
              },
            ]}
          />
          {ornament}
        </div>
        {loop && (
          <VideoLoop
            poster={loop.poster}
            sizes={HERO_LOOP_SIZES}
            sources={loop.sources}
            width={loop.width}
            height={loop.height}
            className="order-last mx-auto w-full max-w-md lg:absolute lg:-bottom-8 lg:-left-8 lg:mx-0 lg:w-40 lg:ring-8 lg:ring-canvas xl:w-48"
          />
        )}
      </div>
    </section>
  );
}
