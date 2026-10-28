import type { CatalogContent } from "~/modules/site-content";
import { fillCopyTemplate } from "~/modules/site-content";
import type {
  PublicImage,
  PublicIntensivo,
  PublicTaller,
} from "~/modules/workshops";
import {
  dateBadgeParts,
  formatDuration,
  formatEventDate,
  formatPesos,
  formatTimeRange,
  weekdayName,
} from "./format";
import { seatsIndicator, tallerDisplay } from "./display-state";
import type { ActivityLink } from "./whatsapp";

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

const MINUTES_PER_HOUR = 60;

function minutesOf(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * MINUTES_PER_HOUR + Number(minutes);
}

function classLength(startsAt: string, endsAt: string): string {
  return formatDuration(minutesOf(endsAt) - minutesOf(startsAt));
}

function intensivoDuration(intensivo: PublicIntensivo): string {
  return classLength(intensivo.startsAt, intensivo.endsAt);
}

function coverOf(
  images: readonly PublicImage[],
  content: CatalogContent,
): PublicImage {
  return images[0] ?? content.fallbackImage;
}

/** Seats are never derived from capacity: open means "Cupo limitado". */
function intensivoSeats(
  intensivo: PublicIntensivo,
  content: CatalogContent,
): string | undefined {
  return intensivo.status === "open" ? content.shared.seatsLimited : undefined;
}

/** Props of an `IntensivoCard` on the listing, plus the list key. */
export function intensivoToCard(
  intensivo: PublicIntensivo,
  content: CatalogContent,
) {
  const seats = intensivoSeats(intensivo, content);
  return {
    id: intensivo.slug,
    image: coverOf(intensivo.images, content),
    date: dateBadgeParts(intensivo.date),
    name: intensivo.name,
    duration: intensivoDuration(intensivo),
    ...(intensivo.teacher ? { teacher: intensivo.teacher.name } : {}),
    price: formatPesos(intensivo.price),
    deposit: `${content.intensivos.depositLabel} ${formatPesos(intensivo.deposit)}`,
    ...(seats === undefined ? {} : { seats }),
    ...(intensivo.materialsIncluded
      ? { materialsBadge: content.intensivos.materialsIncluded }
      : {}),
    ...(intensivo.status === "paused" ? { paused: content.shared.paused } : {}),
    conditions: {
      label: content.intensivos.conditionsLabel,
      policyText: intensivo.policyText,
    },
    href: `/intensivos/${intensivo.slug}`,
    ctaLabel: content.intensivos.cardCtaLabel,
  };
}

/** Public microcopy of the enrollment call to action (es-AR, voseo). */
const ENROLLMENT_LABEL = "Inscribirme";

type DetailAction =
  | { kind: "inquiry"; href: string; label: string }
  | { kind: "enrollment"; href: string; label: string }
  | { kind: "reserve"; href: string; label: string }
  | {
      kind: "paused";
      text: string;
      link: { href: string; label: string };
    };

/**
 * Props of the intensivo detail page. `link` is the WhatsApp link for the
 * activity state: the inquiry link when open, the paused link when paused.
 * `reservation`, when the seat request is open, replaces the inquiry action.
 * The cover is the hero; the other images form the gallery, keyed by position
 * and source because one asset may repeat.
 */
export function intensivoToDetail(
  intensivo: PublicIntensivo,
  content: CatalogContent,
  link: ActivityLink,
  reservation?: { href: string; label: string },
) {
  const seats = intensivoSeats(intensivo, content);
  const action: DetailAction =
    intensivo.status === "paused"
      ? {
          kind: "paused",
          text: content.shared.paused,
          link: { href: link.href, label: link.label },
        }
      : reservation
        ? { kind: "reserve", href: reservation.href, label: reservation.label }
        : { kind: "inquiry", href: link.href, label: link.label };
  return {
    breadcrumb: {
      label: content.shared.breadcrumbLabel,
      items: [
        { label: content.intensivos.heading, href: "/intensivos" },
        { label: intensivo.name },
      ],
    },
    name: intensivo.name,
    image: coverOf(intensivo.images, content),
    dateLine: formatEventDate(intensivo.date),
    duration: intensivoDuration(intensivo),
    timeRange: formatTimeRange(intensivo.startsAt, intensivo.endsAt),
    description: intensivo.description,
    ...(intensivo.teacher
      ? {
          teacher: {
            heading: content.intensivos.teacherHeading,
            name: intensivo.teacher.name,
            ...(intensivo.teacher.bioLine
              ? { bioLine: intensivo.teacher.bioLine }
              : {}),
          },
        }
      : {}),
    price: {
      label: content.intensivos.priceLabel,
      amount: formatPesos(intensivo.price),
    },
    deposit: {
      label: content.intensivos.depositLabel,
      amount: formatPesos(intensivo.deposit),
    },
    ...(seats === undefined ? {} : { seats }),
    ...(intensivo.materialsIncluded
      ? { materialsBadge: content.intensivos.materialsIncluded }
      : {}),
    conditions: {
      label: content.intensivos.conditionsLabel,
      policyText: intensivo.policyText,
      minSeats: fillCopyTemplate(content.intensivos.minSeats, {
        cantidad: String(intensivo.minSeats),
      }),
    },
    gallery: intensivo.images.slice(1).map((image, offset) => ({
      id: `${String(offset + 1)}-${image.src}`,
      ...image,
    })),
    action,
  };
}

type TallerCardTurno = { key: string; weekday: string; timeRange: string };

function turnoKey(turno: PublicTaller["turnos"][number], index: number) {
  return `${String(index)}-${String(turno.weekday)}-${turno.startsAt}`;
}

/**
 * Props of a `TallerCard` on the listing, plus the list key. Seats follow the
 * display state (never capacity), and paused wins over the no-offering notice.
 */
export function tallerToCard(taller: PublicTaller, content: CatalogContent) {
  const display = tallerDisplay(taller.status, taller.offering);
  const turnos: TallerCardTurno[] = taller.turnos.map((turno, index) => ({
    key: turnoKey(turno, index),
    weekday: weekdayName(turno.weekday),
    timeRange: formatTimeRange(turno.startsAt, turno.endsAt),
  }));
  return {
    id: taller.slug,
    image: coverOf(taller.images, content),
    name: taller.name,
    ...(taller.teacher ? { teacher: taller.teacher.name } : {}),
    summary: taller.summary,
    turnos,
    ...(taller.offering
      ? {
          price: {
            amount: formatPesos(taller.offering.fee),
            suffix: content.talleres.feeSuffix,
          },
        }
      : {}),
    ...(display === "no-offering"
      ? { notice: content.talleres.noOffering }
      : {}),
    ...(seatsIndicator(display).kind === "limited"
      ? { seats: content.shared.seatsLimited }
      : {}),
    ...(display === "paused" ? { paused: content.shared.paused } : {}),
    href: `/talleres/${taller.slug}`,
    ctaLabel: content.talleres.cardCtaLabel,
  };
}

/** WhatsApp links of a taller detail: the page link and one link per turno. */
export interface TallerLinks {
  readonly main: ActivityLink;
  readonly turnos: readonly ActivityLink[];
}

/**
 * Props of the taller detail page. Per-turno inquiry links and seats exist
 * only for a taller that is not paused; seats only with an offering.
 */
export function tallerToDetail(
  taller: PublicTaller,
  content: CatalogContent,
  links: TallerLinks,
) {
  const display = tallerDisplay(taller.status, taller.offering);
  const seats =
    seatsIndicator(display).kind === "limited"
      ? content.shared.seatsLimited
      : undefined;
  let action: DetailAction = {
    kind: "inquiry",
    href: links.main.href,
    label: links.main.label,
  };
  if (display === "paused") {
    action = {
      kind: "paused",
      text: content.shared.paused,
      link: { href: links.main.href, label: links.main.label },
    };
  } else if (taller.offering && taller.turnos.length > 0) {
    action = {
      kind: "enrollment",
      href: `/talleres/${taller.slug}/inscripcion?period=${taller.offering.period}`,
      label: ENROLLMENT_LABEL,
    };
  }
  return {
    breadcrumb: {
      label: content.shared.breadcrumbLabel,
      items: [
        { label: content.talleres.heading, href: "/talleres" },
        { label: taller.technique },
        { label: taller.name },
      ],
    },
    name: taller.name,
    image: coverOf(taller.images, content),
    description: taller.description,
    ...(taller.teacher
      ? {
          teacher: {
            heading: content.talleres.teacherHeading,
            name: taller.teacher.name,
            ...(taller.teacher.bioLine
              ? { bioLine: taller.teacher.bioLine }
              : {}),
          },
        }
      : {}),
    turnosHeading: content.talleres.turnosHeading,
    turnos: taller.turnos.map((turno, index) => {
      const inquiry = display === "paused" ? undefined : links.turnos[index];
      return {
        key: turnoKey(turno, index),
        weekday: weekdayName(turno.weekday),
        timeRange: formatTimeRange(turno.startsAt, turno.endsAt),
        duration: classLength(turno.startsAt, turno.endsAt),
        ...(seats === undefined ? {} : { seats }),
        ...(inquiry
          ? { inquiry: { href: inquiry.href, label: inquiry.label } }
          : {}),
      };
    }),
    ...(taller.offering
      ? {
          fee: {
            label: content.talleres.feeLabel,
            amount: formatPesos(taller.offering.fee),
          },
        }
      : {}),
    ...(display === "no-offering"
      ? { notice: content.talleres.noOffering }
      : {}),
    action,
    ...(taller.project
      ? {
          project: {
            heading: content.talleres.projectHeading,
            title: taller.project.title,
            description: taller.project.description,
            images: taller.project.images.map((image, offset) => ({
              id: `${String(offset)}-${image.src}`,
              ...image,
            })),
          },
        }
      : {}),
    gallery: taller.images.slice(1).map((image, offset) => ({
      id: `${String(offset + 1)}-${image.src}`,
      ...image,
    })),
  };
}
