import { Heading } from "../atoms/heading";

export function TeacherBlock({
  heading,
  name,
  bioLine,
}: {
  heading: string;
  name: string;
  bioLine?: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md bg-blush-100 p-6">
      <Heading level={2}>{heading}</Heading>
      <p className="font-display text-h3 font-semibold text-ink-900">{name}</p>
      {bioLine ? <p className="text-ink-700">{bioLine}</p> : null}
    </section>
  );
}
