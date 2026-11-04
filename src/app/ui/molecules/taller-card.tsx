import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Pill } from "../atoms/pill";
import { Text } from "../atoms/text";
import { PausedNotice } from "./paused-notice";
import { PriceTag } from "./price-tag";
import { TurnoList } from "./turno-list";

type CardImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Listing card of a monthly taller: the photo on top and a liquid-glass panel
 * over its lower edge. The name is the display serif, the teacher a display
 * italic subtitle, the summary the sans body and each turno a weekday plus a
 * sage time pill. Paused wins over the no-offering notice, and the seats
 * indicator shows only for an open taller with an offering.
 */
export function TallerCard({
  image,
  name,
  teacher,
  summary,
  turnos,
  price,
  notice,
  seats,
  paused,
  href,
  ctaLabel,
}: {
  image: CardImage;
  name: string;
  teacher?: string;
  summary: string;
  turnos: Parameters<typeof TurnoList>[0]["items"];
  price?: { label?: string; amount: string; suffix?: string };
  notice?: string;
  seats?: string;
  paused?: string;
  href: string;
  ctaLabel: string;
}) {
  const showSeats = Boolean(seats) && !paused && !notice;
  return (
    <article className="card-hover flex h-full flex-col overflow-hidden rounded-md bg-surface shadow-raised">
      <div className="card-hover-frame relative w-full">
        <Image
          {...image}
          intrinsicRatio={false}
          className="block aspect-3/2 h-auto w-full object-cover md:aspect-4/3"
        />
      </div>
      <div className="glass relative z-10 mx-3 -mt-10 mb-3 flex flex-1 flex-col items-start gap-4 rounded-md p-5">
        <Heading level={2} size="h3">
          {name}
        </Heading>
        {teacher ? (
          <p className="font-display text-xl italic text-ink-900">{teacher}</p>
        ) : null}
        <Text>{summary}</Text>
        <TurnoList items={turnos} />
        {price ? (
          <div
            data-slot="price-block"
            className="w-full border-t border-tan-400 pt-4"
          >
            <PriceTag {...price} />
          </div>
        ) : null}
        {paused ? (
          <>
            <Pill tone="notice">Pausado</Pill>
            <PausedNotice text={paused} />
          </>
        ) : notice ? (
          <>
            <Pill tone="notice">Próximamente</Pill>
            <Text tone="accent">{notice}</Text>
          </>
        ) : null}
        {showSeats && seats ? <Pill>{seats}</Pill> : null}
        <ButtonLink href={href} className="mt-auto w-full">
          {ctaLabel}
        </ButtonLink>
      </div>
    </article>
  );
}
