import { Heading } from "../atoms/heading";
import { GalleryGrid } from "./gallery-grid";

/** Structural props: plain strings, no module types. */
export interface ProjectSectionProps {
  heading: string;
  title: string;
  description: string;
  images: {
    id: string;
    src: string;
    alt: string;
    width: number;
    height: number;
  }[];
}

/** The period project of a taller: an `h2` section with an `h3` title. */
export function ProjectSection({
  heading,
  title,
  description,
  images,
}: ProjectSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <Heading level={2}>{heading}</Heading>
      {title ? (
        <Heading level={3} size="h3">
          {title}
        </Heading>
      ) : null}
      {description ? (
        <p className="max-w-prose whitespace-pre-line text-ink-700">
          {description}
        </p>
      ) : null}
      <GalleryGrid images={images} />
    </section>
  );
}
