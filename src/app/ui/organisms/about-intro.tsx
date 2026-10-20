import { useCallback, useState } from "react";
import { BotanicalSprig } from "../atoms/botanical-sprig";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { ScriptText } from "../atoms/script-text";
import { Text } from "../atoms/text";
import { microcopy } from "../microcopy";
import { VideoLoop } from "../molecules/video-loop";
import { Reveal } from "./reveal";
import { Section } from "./section";

interface IntroImage {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly srcSet?: string;
}

interface IntroLoop {
  readonly poster: IntroImage;
  readonly sources: readonly { readonly src: string; readonly type: string }[];
  readonly width: number;
  readonly height: number;
}

/** Tilt, width and drop of each of the three 9:16 frames, left to right. */
const LOOP_FRAMES = [
  { reveal: "mt-12 w-1/3 lg:mt-16", tilt: "-rotate-3" },
  { reveal: "z-10 -mx-3 w-5/12 lg:-mx-6", tilt: "rotate-1" },
  { reveal: "mt-20 w-1/3 lg:mt-28", tilt: "rotate-3" },
] as const;
const LOOP_SIZES = "(min-width: 64rem) 14rem, 38vw";

const MAIN_SIZES = "(min-width: 64rem) 22rem, 55vw";
const SIDE_SIZES = "(min-width: 64rem) 20rem, 45vw";

/** A photo in a white paper-style border; the tilt lives on the figure, not on the Reveal. */
function Framed({
  image,
  sizes,
  className,
}: {
  image: IntroImage;
  sizes: string;
  className: string;
}) {
  return (
    <figure
      className={`overflow-hidden rounded-sm border-6 border-white bg-white shadow-lift ${className}`}
    >
      <Image {...image} sizes={sizes} className="block w-full object-cover" />
    </figure>
  );
}

/**
 * The collage of muted loops: three tilted white frames that autoplay once in
 * view. One shared control pauses all of them, and it exists only while a
 * video is really mounted (never under reduced motion or Save-Data), so the
 * poster-only state has nothing to pause.
 */
function LoopCollage({ loops }: { loops: readonly IntroLoop[] }) {
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState<ReadonlySet<number>>(new Set());
  const report = useCallback((index: number, on: boolean) => {
    setActive((previous) => {
      if (previous.has(index) === on) return previous;
      const next = new Set(previous);
      if (on) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);
  return (
    <div className="relative mx-auto w-full max-w-md pb-14 lg:max-w-none lg:pb-16">
      <div
        aria-hidden="true"
        className="absolute inset-x-4 bottom-6 top-16 rounded-full bg-sand-200/70 lg:inset-x-10"
      />
      <div className="relative flex items-start">
        {loops.slice(0, LOOP_FRAMES.length).map((loop, at) => {
          const frame = LOOP_FRAMES[at] ?? LOOP_FRAMES[0];
          return (
            <Reveal
              key={loop.poster.src}
              index={at}
              className={`shrink-0 ${frame.reveal}`}
            >
              <LoopFrame
                loop={loop}
                index={at}
                tilt={frame.tilt}
                paused={paused}
                report={report}
              />
            </Reveal>
          );
        })}
      </div>
      {active.size > 0 ? (
        <button
          type="button"
          onClick={() => {
            setPaused((value) => !value);
          }}
          className="absolute bottom-0 left-1/2 z-30 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-canvas px-5 text-sm font-semibold text-ink-900 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4 fill-current"
            aria-hidden="true"
            focusable="false"
          >
            {paused ? (
              <path d="M8 5v14l11-7Z" />
            ) : (
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
            )}
          </svg>
          {paused ? microcopy.playAnimation : microcopy.pauseAnimation}
        </button>
      ) : null}
      <BotanicalSprig
        variant="olive"
        size="lg"
        className="absolute -bottom-2 -left-2 z-20 -rotate-12 lg:-left-8"
      />
      <BotanicalSprig
        variant="sage"
        size="md"
        className="absolute -right-2 -top-6 z-20 rotate-6 lg:-right-6"
      />
    </div>
  );
}

function LoopFrame({
  loop,
  index,
  tilt,
  paused,
  report,
}: {
  loop: IntroLoop;
  index: number;
  tilt: string;
  paused: boolean;
  report: (index: number, active: boolean) => void;
}) {
  const onActiveChange = useCallback(
    (on: boolean) => {
      report(index, on);
    },
    [report, index],
  );
  return (
    <figure
      className={`frame-float overflow-hidden rounded-sm border-6 border-white bg-white shadow-lift ${tilt}`}
    >
      <VideoLoop
        poster={loop.poster}
        sizes={LOOP_SIZES}
        sources={loop.sources}
        width={loop.width}
        height={loop.height}
        paused={paused}
        onActiveChange={onActiveChange}
      />
    </figure>
  );
}

/**
 * Quiénes somos opening band: the story on one side, a collage of
 * overlapping framed photos of different ratios on the other. The text comes
 * first in the DOM, so on a phone it leads and the collage follows, staggered.
 */
export function AboutIntro({
  heading,
  paragraphs,
  valueProposition,
  pullQuote,
  images,
  loops = [],
}: {
  heading: string;
  paragraphs: readonly string[];
  valueProposition: string;
  pullQuote?: string | undefined;
  images: readonly IntroImage[];
  /** Muted 9:16 loops; when present they take the collage and the photos rest. */
  loops?: readonly IntroLoop[];
}) {
  const [main, ...rest] = loops.length > 0 ? [] : images;
  const [lead, ...others] = paragraphs;
  return (
    <Section bleed tone="canvas" spacing="lg">
      <div
        className={`grid items-center gap-12 ${main || loops.length > 0 ? "lg:grid-cols-2 lg:gap-16" : ""}`}
      >
        <div className="flex max-w-prose flex-col gap-5">
          <Reveal>
            <Heading level={1}>{heading}</Heading>
          </Reveal>
          {lead ? (
            <Reveal index={1}>
              <p className="text-lead text-ink-700">{lead}</p>
            </Reveal>
          ) : null}
          {others.map((text, at) => (
            <Reveal key={text} index={at + 2}>
              <Text>{text}</Text>
            </Reveal>
          ))}
          <Reveal index={others.length + 2}>
            <p className="border-l-2 border-tan-400 pl-4 font-display text-xl italic text-clay-800">
              {valueProposition}
            </p>
          </Reveal>
          {pullQuote ? (
            <Reveal index={others.length + 3}>
              <blockquote className="mt-2">
                <ScriptText as="p">{pullQuote}</ScriptText>
              </blockquote>
            </Reveal>
          ) : null}
        </div>
        {loops.length > 0 ? <LoopCollage loops={loops} /> : null}
        {main ? (
          <div className="relative mx-auto flex w-full max-w-md items-start pb-8 lg:max-w-none lg:pb-10">
            <Reveal className="z-10 mt-14 w-1/2 shrink-0 lg:mt-20">
              <div className="flex flex-col gap-4">
                {rest.map((image, at) => (
                  <Framed
                    key={image.src}
                    image={image}
                    sizes={SIDE_SIZES}
                    className={at % 2 === 0 ? "-rotate-2" : "rotate-2"}
                  />
                ))}
              </div>
            </Reveal>
            <Reveal
              index={2}
              className={`${rest.length ? "-ml-10 w-7/12" : "mx-auto w-4/5"} shrink-0`}
            >
              <Framed image={main} sizes={MAIN_SIZES} className="rotate-1" />
            </Reveal>
            <BotanicalSprig
              variant="olive"
              size="lg"
              className="absolute -bottom-2 -left-2 z-20 -rotate-12 lg:-left-8"
            />
            <BotanicalSprig
              variant="sage"
              size="md"
              className="absolute -right-2 -top-6 z-20 rotate-6 lg:-right-6"
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}
