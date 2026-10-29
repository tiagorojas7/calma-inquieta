import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { ButtonLink } from "../atoms/button";
import { Text } from "../atoms/text";
import { microcopy } from "../microcopy";
import { BookingSummary } from "../molecules/booking-summary";
import { Breadcrumb } from "../molecules/breadcrumb";
import { PausedNotice } from "../molecules/paused-notice";
import { PriceTag } from "../molecules/price-tag";
import { StickyAction } from "../molecules/sticky-action";
import { TeacherBlock } from "../molecules/teacher-block";
import { TurnoList } from "../molecules/turno-list";
import { GalleryGrid } from "../organisms/gallery-grid";
import {
  ProjectSection,
  type ProjectSectionProps,
} from "../organisms/project-section";

type DetailImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** Structural props: plain strings, no module types. */
export interface TallerDetailProps {
  breadcrumb: { label: string; items: { label: string; href?: string }[] };
  name: string;
  image: DetailImage;
  description: string;
  teacher?: { heading: string; name: string; bioLine?: string };
  turnosHeading: string;
  turnos: Parameters<typeof TurnoList>[0]["items"];
  fee?: { label: string; amount: string };
  notice?: string;
  action:
    | { kind: "inquiry"; href: string; label: string }
    | { kind: "enrollment"; href: string; label: string }
    | {
        kind: "paused";
        text: string;
        link: { href: string; label: string };
      };
  project?: ProjectSectionProps;
  gallery: (DetailImage & { id: string })[];
}

/**
 * Detail of one taller: one `h1`, then `h2` sections, no form. The booking
 * summary (shifts, fee, action) comes right after the title in the DOM so it
 * is the first thing on a phone, and moves to a side column on large screens.
 */
export function TallerDetailPage({
  breadcrumb,
  name,
  image,
  description,
  teacher,
  turnosHeading,
  turnos,
  fee,
  notice,
  action,
  project,
  gallery,
}: TallerDetailProps) {
  return (
    <article className="flex flex-col gap-8 py-section">
      <Breadcrumb {...breadcrumb} />
      <header className="flex flex-col gap-3">
        <Heading level={1}>{name}</Heading>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <BookingSummary>
          {turnos.length ? (
            <section className="flex flex-col gap-3">
              <Heading level={2}>{turnosHeading}</Heading>
              <TurnoList items={turnos} />
            </section>
          ) : null}
          {fee ? <PriceTag label={fee.label} amount={fee.amount} /> : null}
          {notice ? <Text tone="accent">{notice}</Text> : null}
          {action.kind === "paused" ? (
            <PausedNotice text={action.text} link={action.link} />
          ) : (
            <ButtonLink href={action.href}>{action.label}</ButtonLink>
          )}
        </BookingSummary>
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <Image
            {...image}
            aboveTheFold
            className="w-full rounded-md object-cover"
          />
          <p className="max-w-prose whitespace-pre-line text-ink-700">
            {description}
          </p>
          {teacher ? (
            <TeacherBlock
              heading={teacher.heading}
              name={teacher.name}
              {...(teacher.bioLine ? { bioLine: teacher.bioLine } : {})}
            />
          ) : null}
          {project ? <ProjectSection {...project} /> : null}
          {gallery.length ? (
            <section className="flex flex-col gap-4">
              <Heading level={2}>{microcopy.gallery}</Heading>
              <GalleryGrid images={gallery} />
            </section>
          ) : null}
        </div>
      </div>
      {action.kind !== "paused" ? (
        <StickyAction href={action.href} label={action.label} />
      ) : null}
    </article>
  );
}
