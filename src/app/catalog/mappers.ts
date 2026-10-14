import type { CatalogContent } from "~/modules/site-content";
import { fillCopyTemplate } from "~/modules/site-content";
import type { PublicIntensivo, PublicTaller } from "~/modules/workshops";
import { dateBadgeParts, formatTimeRange, weekdayName } from "./format";

/**
 * Read model to presentational props. Every label, the stand-in image and the
 * "y N turnos más" template come from `CatalogContent`; every weekday, time
 * and date string comes from the pure formatters. No price is ever mapped
 * here for Inicio (design PC13).
 */

const INICIO_VISIBLE_TURNOS = 2;

function tallerSchedule(
  turnos: PublicTaller["turnos"],
  content: CatalogContent,
): string | undefined {
  if (turnos.length === 0) {
    return undefined;
  }
  const shown = turnos
    .slice(0, INICIO_VISIBLE_TURNOS)
    .map(
      (turno) =>
        `${weekdayName(turno.weekday)}, ${formatTimeRange(turno.startsAt, turno.endsAt)}`,
    )
    .join(" · ");
  const hidden = turnos.length - INICIO_VISIBLE_TURNOS;
  if (hidden <= 0) {
    return shown;
  }
  const more =
    hidden === 1
      ? content.shared.moreTurnosOne
      : fillCopyTemplate(content.shared.moreTurnos, {
          cantidad: String(hidden),
        });
  return `${shown} ${more}`;
}

/** Props of an Inicio `ActivityCard`, plus the list key. */
export function tallerToActivityCard(
  taller: PublicTaller,
  content: CatalogContent,
) {
  const schedule = tallerSchedule(taller.turnos, content);
  return {
    id: taller.slug,
    image: taller.images[0] ?? content.fallbackImage,
    title: taller.name,
    description: taller.summary,
    ...(schedule === undefined ? {} : { schedule }),
    ...(taller.status === "paused" ? { badge: content.shared.paused } : {}),
    href: `/talleres/${taller.slug}`,
    ctaLabel: content.talleres.cardCtaLabel,
  };
}

/** Props of an Inicio `UpcomingItem`, plus the list key. */
export function intensivoToUpcomingItem(
  intensivo: PublicIntensivo,
  content: CatalogContent,
) {
  return {
    id: intensivo.slug,
    date: dateBadgeParts(intensivo.date),
    title: intensivo.name,
    detail: formatTimeRange(intensivo.startsAt, intensivo.endsAt),
    ...(intensivo.status === "paused" ? { badge: content.shared.paused } : {}),
    href: `/intensivos/${intensivo.slug}`,
    ctaLabel: content.intensivos.cardCtaLabel,
  };
}
