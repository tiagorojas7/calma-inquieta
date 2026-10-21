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
 * Listing card of a monthly taller. Paused wins over the no-offering notice,
 * and the seats indicator shows only for an open taller with an offering.
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
    <article className="card-hover flex h-full flex-col items-start gap-4 rounded-md bg-surface p-4 shadow-card">
      <div className="card-hover-frame w-full rounded-sm">
        <Image {...image} className="block w-full object-cover" />
      </div>
      <Heading level={2} size="h3">
        {name}
      </Heading>
      {teacher ? <Text tone="muted">{teacher}</Text> : null}
      <Text>{summary}</Text>
      <TurnoList items={turnos} />
      {price ? <PriceTag {...price} /> : null}
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
      <ButtonLink href={href} variant="text-arrow" className="mt-auto">
        {ctaLabel}
      </ButtonLink>
    </article>
  );
}
