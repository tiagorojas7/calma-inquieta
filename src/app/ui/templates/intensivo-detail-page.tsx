import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Pill } from "../atoms/pill";
import { Text } from "../atoms/text";
import { Breadcrumb } from "../molecules/breadcrumb";
import { ConditionsNote } from "../molecules/conditions-note";
import { PausedNotice } from "../molecules/paused-notice";
import { PriceTag } from "../molecules/price-tag";
import { TeacherBlock } from "../molecules/teacher-block";
import { GalleryGrid } from "../organisms/gallery-grid";

type DetailImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** Structural props: plain strings, no module types. */
export interface IntensivoDetailProps {
  breadcrumb: { label: string; items: { label: string; href?: string }[] };
  name: string;
  image: DetailImage;
  dateLine: string;
  duration: string;
  timeRange: string;
  description: string;
  teacher?: { heading: string; name: string; bioLine?: string };
  price: { label: string; amount: string };
  deposit: { label: string; amount: string };
  seats?: string;
  materialsBadge?: string;
  conditions: { label: string; policyText: string; minSeats: string };
  gallery: (DetailImage & { id: string })[];
  action:
    | { kind: "inquiry"; href: string; label: string }
    | {
        kind: "paused";
        text: string;
        link: { href: string; label: string };
      };
}

/** Detail of one intensivo: one `h1`, then `h2` sections, no form. */
export function IntensivoDetailPage({
  breadcrumb,
  name,
  image,
  dateLine,
  duration,
  timeRange,
  description,
  teacher,
  price,
  deposit,
  seats,
  materialsBadge,
  conditions,
  gallery,
  action,
}: IntensivoDetailProps) {
  return (
    <article className="flex flex-col gap-8 py-section">
      <Breadcrumb {...breadcrumb} />
      <header className="flex flex-col gap-3">
        <Heading level={1}>{name}</Heading>
        <Text>{`${dateLine} · ${timeRange} · ${duration}`}</Text>
        <div className="flex flex-wrap gap-2">
          {materialsBadge ? <Pill>{materialsBadge}</Pill> : null}
          {seats ? <Pill>{seats}</Pill> : null}
        </div>
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
      <div className="flex flex-wrap gap-8">
        <PriceTag label={price.label} amount={price.amount} />
        <PriceTag label={deposit.label} amount={deposit.amount} />
      </div>
      <ConditionsNote {...conditions} level={2} />
      {action.kind === "paused" ? (
        <PausedNotice text={action.text} link={action.link} />
      ) : (
        <ButtonLink href={action.href}>{action.label}</ButtonLink>
      )}
      <GalleryGrid images={gallery} />
    </article>
  );
}
