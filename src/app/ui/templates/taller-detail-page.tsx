import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { ButtonLink } from "../atoms/button";
import { Text } from "../atoms/text";
import { Breadcrumb } from "../molecules/breadcrumb";
import { PausedNotice } from "../molecules/paused-notice";
import { PriceTag } from "../molecules/price-tag";
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
    | {
        kind: "paused";
        text: string;
        link: { href: string; label: string };
      };
  project?: ProjectSectionProps;
  gallery: (DetailImage & { id: string })[];
}

/** Detail of one taller: one `h1`, then `h2` sections, no form. */
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
      {project ? <ProjectSection {...project} /> : null}
      <GalleryGrid images={gallery} />
    </article>
  );
}
