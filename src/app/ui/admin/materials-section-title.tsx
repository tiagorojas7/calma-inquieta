import { Heading } from "../atoms/heading";

/**
 * A section heading with how many things are in it, so the owner sees at a
 * glance what needs her. The count sits beside the heading, so the heading
 * keeps its own name.
 */
export function MaterialsSectionTitle({
  id,
  title,
  count,
}: {
  id: string;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Heading level={2} id={id}>
        {title}
      </Heading>
      <span
        data-count=""
        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-pill bg-sand-200 px-3 text-base font-bold text-ink-900"
      >
        {count}
      </span>
    </div>
  );
}
