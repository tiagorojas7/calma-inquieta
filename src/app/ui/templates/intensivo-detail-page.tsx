import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Image } from "../atoms/image";
import { Pill } from "../atoms/pill";
import { microcopy } from "../microcopy";
import { BookingSummary } from "../molecules/booking-summary";
import { Breadcrumb } from "../molecules/breadcrumb";
import { ConditionsNote } from "../molecules/conditions-note";
import { PausedNotice } from "../molecules/paused-notice";
import { PricingSummary } from "../molecules/pricing-summary";
import { StickyAction } from "../molecules/sticky-action";
import { TeacherBlock } from "../molecules/teacher-block";
import { TimePill } from "../molecules/time-pill";
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
  /** What a workshop is, shown once in the header. */
  oneDay: string;
  image: DetailImage;
  dateLine: string;
  duration: string;
  timeRange: string;
  description: string;
  teacher?: { heading: string; name: string; bioLine?: string };
  price: { label: string; amount: string };
  deposit: { label: string; amount: string };
  /** Remaining amount once the reservation amount is paid. */
  balance?: { label: string; amount: string };
  seats?: string;
  materialsBadge?: string;
  conditions: { label: string; policyText: string; minSeats: string };
  gallery: (DetailImage & { id: string })[];
  /** A discreet text link for questions, only beside a reservation action. */
  doubts?: { href: string; label: string };
  action:
    | { kind: "inquiry"; href: string; label: string }
    | { kind: "reserve"; href: string; label: string }
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
  oneDay,
  image,
  dateLine,
  duration,
  timeRange,
  description,
  teacher,
  price,
  deposit,
  balance,
  seats,
  materialsBadge,
  conditions,
  gallery,
  doubts,
  action,
}: IntensivoDetailProps) {
  return (
    <article className="flex flex-col gap-10 pt-page-top pb-section">
      <Breadcrumb {...breadcrumb} />
      <header className="flex flex-col gap-3">
        <Heading level={1}>{name}</Heading>
        <p className="font-display text-xl italic text-ink-900">{dateLine}</p>
        <div className="flex flex-wrap items-center gap-2">
          <TimePill>{timeRange}</TimePill>
          <TimePill>{duration}</TimePill>
          {materialsBadge ? <Pill>{materialsBadge}</Pill> : null}
          {seats ? <Pill>{seats}</Pill> : null}
        </div>
        <p className="max-w-prose text-ink-700">{oneDay}</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <BookingSummary>
          <PricingSummary
            total={price}
            reservation={deposit}
            {...(balance ? { balance } : {})}
          />
          {action.kind === "paused" ? (
            <PausedNotice text={action.text} link={action.link} />
          ) : (
            <ButtonLink
              href={action.href}
              variant={action.kind === "reserve" ? "success" : "primary"}
            >
              {action.label}
            </ButtonLink>
          )}
          {doubts && action.kind !== "paused" ? (
            <a
              href={doubts.href}
              className="min-h-11 text-center text-clay-800 underline underline-offset-4"
            >
              {doubts.label}
            </a>
          ) : null}
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
          <ConditionsNote {...conditions} level={2} />
          {gallery.length ? (
            <section className="flex flex-col gap-4">
              <Heading level={2}>{microcopy.gallery}</Heading>
              <GalleryGrid images={gallery} />
            </section>
          ) : null}
        </div>
      </div>
      {action.kind !== "paused" ? (
        <StickyAction
          href={action.href}
          label={action.label}
          variant={action.kind === "reserve" ? "success" : "primary"}
        />
      ) : null}
    </article>
  );
}
